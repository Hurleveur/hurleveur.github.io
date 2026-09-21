import { Root, Element } from "hast"
import { visit, SKIP } from "unist-util-visit"
import { VFile } from "vfile"
import YAML from "yaml"
import fs from "fs/promises"
import path from "path"
import { QuartzTransformerPlugin } from "../types"
import { BuildCtx } from "../../util/ctx"
import { FilePath, FullSlug, slugifyFilePath } from "../../util/path"
import { glob } from "../../util/glob"

// Markdown publishes on `publish: true` frontmatter (ExplicitPublish, a filter
// plugin, is the actual gate — see CLAUDE.md's Publishing gates section). A
// published note can still wikilink an unpublished one; crawl-links resolves
// that into a plain, clickable internal link whose visible text is the
// private note's title, leaking its name onto the public site. This
// transformer is registered as a *post*-transformer (config-loader.ts) so it
// runs after crawl-links has stamped every internal link with the `data-slug`
// it resolved to — the exact same resolution crawl-links itself uses,
// whatever markdownLinkResolution strategy is configured — rather than
// re-deriving link resolution here.
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/

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
 */
async function noteSlugs(
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

/** No href, no title, no data attribute, no alt text — just the literal words. */
export function privatePageSpan(): Element {
  return {
    type: "element",
    tagName: "span",
    properties: { className: ["private-page"] },
    children: [{ type: "text", value: "private page" }],
  }
}

export const HidePrivateLinks: QuartzTransformerPlugin = () => ({
  name: "HidePrivateLinks",
  htmlPlugins(ctx: BuildCtx) {
    const slugsPromise = noteSlugs(ctx)
    return [
      () => async (tree: Root, _file: VFile) => {
        const { all, published } = await slugsPromise
        visit(tree, "element", (node: Element, index, parent) => {
          if (node.tagName !== "a" || !parent || index === undefined) return
          const slug = node.properties?.["data-slug"] as FullSlug | undefined
          if (!slug || !all.has(slug) || published.has(slug)) return
          parent.children[index] = privatePageSpan()
          return SKIP
        })
      },
    ]
  },
})
