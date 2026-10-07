import { Root, Element } from "hast"
import { visit, SKIP } from "unist-util-visit"
import { VFile } from "vfile"
import YAML from "yaml"
import fs from "fs/promises"
import path from "path"
import { QuartzTransformerPlugin } from "../types"
import { BuildCtx } from "../../util/ctx"
import { FilePath, FullSlug, SimpleSlug, slugifyFilePath, simplifySlug } from "../../util/path"
import { glob } from "../../util/glob"

// Markdown publishes on `publish: true` frontmatter (ExplicitPublish, a filter
// plugin, is the actual gate — see CLAUDE.md's Publishing gates section). A
// published note can still wikilink, alias-link, or embed an unpublished one;
// crawl-links resolves a wikilink into a plain, clickable internal link whose
// visible text is the private note's title, and ObsidianFlavoredMarkdown
// turns a note embed into a `blockquote.transclude` carrying the raw target
// slug as a `data-url` attribute (parsed into hast as `dataUrl`, camelCased
// by rehype-raw like every other "data-*" attribute coming off raw HTML text)
// — either way the private note's name or path
// leaks onto the public site. This transformer is registered as a
// *post*-transformer (config-loader.ts), spliced in right after crawl-links
// rather than appended at the very end, so it runs after crawl-links has
// stamped every internal link with the `data-slug` it resolved to — the exact
// same resolution crawl-links itself uses, whatever markdownLinkResolution
// strategy is configured — but before Description (and anything else that
// snapshots the note's rendered text) can read the leak into
// contentIndex.json, the RSS feed, or an og-image.
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/

/** The marker a stripped private link/embed renders as — see custom.scss's base partial. */
export const PRIVATE_MARKER_TEXT = "private"
export const PRIVATE_MARKER_CLASS = "private-link"

export function isPublished(raw: string): boolean {
  const match = FRONTMATTER.exec(raw.trim())
  if (!match) return false
  try {
    const fm = YAML.parse(match[1]) as Record<string, unknown> | null
    return fm?.publish === true || fm?.publish === "true"
  } catch {
    return false
  }
}

/**
 * Every markdown file's slug, split into published vs. all. A slug present in
 * neither set isn't backed by a note at all (a folder/tag/index page, or an
 * asset gated separately by publish-exceptions.txt) and must be left alone.
 *
 * Exported so other raw-text readers that resolve wikilinks independently of
 * the main HAST pipeline (quotes.ts) can apply the same private/missing
 * distinction instead of re-deriving it.
 */
export async function noteSlugs(
  ctx: BuildCtx,
): Promise<{ all: Set<FullSlug>; published: Set<FullSlug> }> {
  const files = await glob("**/*.md", ctx.argv.directory, ctx.cfg.configuration.ignorePatterns)
  const all = new Set<FullSlug>()
  const published = new Set<FullSlug>()
  await Promise.all(
    files.map(async (fp) => {
      const slug = slugifyFilePath(fp as FilePath)
      all.add(slug)
      let raw: string
      try {
        raw = await fs.readFile(path.join(ctx.argv.directory, fp), "utf-8")
      } catch {
        return
      }
      if (isPublished(raw)) published.add(slug)
    }),
  )
  return { all, published }
}

/** No href, no title, no data attribute, no alt text — just the literal marker. */
export function privacyMarker(): Element {
  return {
    type: "element",
    tagName: "span",
    properties: { className: [PRIVATE_MARKER_CLASS] },
    children: [{ type: "text", value: PRIVATE_MARKER_TEXT }],
  }
}

/**
 * Was a given link written as `[[target|alias]]`? The rendered HTML can't
 * say on its own — crawl-links' "alias" CSS class means only "visible text
 * != href", which is true for almost every wikilink whether or not it used
 * a pipe (the href is a slug, the text is a human-readable title). And a
 * slug/text comparison doesn't work either: an alias can legitimately equal
 * the target's own last path segment (`[[Women/dating|dating]]` — "dating"
 * is also the suffix of "women/dating"), which a suffix check would wrongly
 * call "not aliased". The one place the pipe is still visible is the note's
 * own raw text, so read it from there.
 *
 * A file can link the same private target more than once with different
 * alias status, so this isn't a single lookup: `aliasQueues` builds, once
 * per file, an in-document-order queue of alias-flags per raw typed path;
 * `wasAliased` resolves a link's slug against those keys (exactly, or by
 * the same shortest-path suffix matching quotes.ts's resolveSlug uses for a
 * folder note) and shifts the next flag off — correct as long as `<a>`
 * elements for a given slug are visited in the same order their wikilinks
 * appear in the source, which holds since nothing reorders links.
 */
const WIKILINK = /\[\[([^\]|]+)(\|[^\]]*)?\]\]/g
const FRONTMATTER_BLOCK = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/

function aliasQueues(raw: string): Map<string, boolean[]> {
  const body = raw.replace(FRONTMATTER_BLOCK, "")
  const queues = new Map<string, boolean[]>()
  for (const m of body.matchAll(WIKILINK)) {
    const name = (m[1] ?? "").split("#")[0].trim()
    const wanted = slugifyFilePath(name as FilePath) as string
    const q = queues.get(wanted)
    if (q) q.push(m[2] !== undefined)
    else queues.set(wanted, [m[2] !== undefined])
  }
  return queues
}

function wasAliased(queues: Map<string, boolean[]>, targetSlug: string): boolean {
  for (const [wanted, q] of queues) {
    if (q.length === 0) continue
    if (targetSlug === wanted || targetSlug.endsWith(`/${wanted}`)) return q.shift()!
  }
  // No raw occurrence matched (shouldn't happen — crawl-links resolved this
  // data-slug from some wikilink in this same file) — default to hiding the
  // name rather than risking a leak.
  return false
}

/** A wikilink anchor always carries exactly one text child (ObsidianFlavoredMarkdown). */
function anchorText(node: Element): string {
  return node.children.map((c) => (c.type === "text" ? c.value : "")).join("")
}

export const HidePrivateLinks: QuartzTransformerPlugin = () => ({
  name: "HidePrivateLinks",
  htmlPlugins(ctx: BuildCtx) {
    const slugsPromise = noteSlugs(ctx)
    return [
      () => async (tree: Root, file: VFile) => {
        const { all, published } = await slugsPromise
        const isPrivate = (slug: string | undefined): boolean =>
          !!slug && all.has(slug as FullSlug) && !published.has(slug as FullSlug)
        // file.value is still this note's raw (comment-stripped) markdown —
        // untouched by the mdast/hast stages that ran to get here.
        const queues = aliasQueues((file.value ?? "").toString())

        visit(tree, "element", (node: Element, index, parent) => {
          if (!parent || index === undefined) return

          // A note embed (`![[Private note]]`) becomes a transclude
          // blockquote whose `data-url` carries the raw target slug —
          // crawl-links never touches this attribute, so it isn't covered by
          // the `data-slug` check below. The whole blockquote is replaced
          // (not just its inner link) so the slug can't survive as an
          // attribute on anything left behind.
          if (node.tagName === "blockquote") {
            const classes = node.properties?.className
            if (!Array.isArray(classes) || !classes.includes("transclude")) return
            // This blockquote came from a raw HTML string (ObsidianFlavoredMarkdown's
            // transclude output) parsed by rehype-raw, which camelCases "data-*"
            // HTML attributes the way renderPage.tsx's own `el.properties.dataBlock`
            // read already assumes — so it's `dataUrl` here, not the literal
            // "data-url" that crawl-links uses for its own, hand-set properties.
            if (!isPrivate(node.properties?.dataUrl as string | undefined)) return
            parent.children[index] = privacyMarker()
            return SKIP
          }

          if (node.tagName !== "a") return
          const slug = node.properties?.["data-slug"] as string | undefined
          if (!isPrivate(slug)) return

          if (wasAliased(queues, slug!)) {
            // His own prose — keep the alias words, drop only the link and
            // the target it would have revealed.
            parent.children[index] = { type: "text", value: anchorText(node) }
          } else {
            parent.children[index] = privacyMarker()
          }
          return SKIP
        })

        // crawl-links recorded every outgoing slug — link and embed targets
        // alike — into file.data.links before this plugin could see it.
        // contentIndex.json's `links` field feeds the side-brain graph and
        // the backlinks panel, so a private target left in there still names
        // the note even with its visible link gone.
        const links = file.data.links as SimpleSlug[] | undefined
        if (links && links.length > 0) {
          const privateSimple = new Set<SimpleSlug>()
          for (const slug of all) {
            if (!published.has(slug)) privateSimple.add(simplifySlug(slug))
          }
          file.data.links = links.filter((l) => !privateSimple.has(l))
        }
      },
    ]
  },
})
