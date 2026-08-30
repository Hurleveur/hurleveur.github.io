import { FilePath, joinSegments, slugifyFilePath } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import { ProcessedContent } from "../vfile"
import { BuildCtx } from "../../util/ctx"
import path from "path"
import fs from "fs"

// Emits static/quotes.json ([text, source, url?]) for the palace quote slab;
// url (the note's slug) is only set for lines carrying an inline #quote tag
// (individual quotes), not for dash-only lines from dedicated quote files.
// (quartz/static/vaultbrain.js). A line is a quote when it carries an inline
// #quote / #quotes tag (anywhere in the vault), or it starts with "- " inside a
// "quote file" — filename like Quotes.md, or categories: Quotes — so such a
// file can mix prose with dashed quote lines. Deliberately NOT frontmatter
// tags: obsidian-flavored-markdown merges every inline #tag into
// frontmatter.tags, so a single #quote-tagged line would flip the whole file
// into quote-file mode and leak its unrelated dash lines too.
// Source is the note's folder, e.g. content/Website/quotes.md -> "from website".
// Only published content is scanned, so private vault quotes never leak.

export function isQuoteFile(filePath: string, data: any): boolean {
  const cats = data.frontmatter?.categories ?? []
  const catStr = Array.isArray(cats) ? cats.join(" ") : String(cats)
  return /quotes?/i.test(path.basename(filePath, ".md")) || /quotes/i.test(catStr)
}

// strip leading list/blockquote markers, the #quote tag, and trailing #tags
function clean(line: string): string {
  return line
    .replace(/^\s*[-*>]\s+/, "")
    .replace(/#quote\S*/gi, "")
    .replace(/\s+#[\w/-]+\b/g, "")
    .trim()
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ESCAPES[c]!)

// A quote line can carry wikilinks — half the ones in the vault are a sentence
// plus "[[On the shortness of time]]", and a few are nothing but the link. The
// slab set them with textContent, so they showed as literal [[brackets]] and
// went nowhere. Resolve them here, where the slug list exists, and the client
// can set innerHTML on text that is already escaped.
//
// Resolution mirrors markdownLinkResolution: shortest — the exact slug, then
// the "<slug>/index" spelling a folder note takes, then any slug ending in
// either. An unresolvable link degrades to its label as plain text.
export function linkify(text: string, slugs: string[]): string {
  const out: string[] = []
  let last = 0
  for (const m of text.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const at = m.index ?? 0
    out.push(esc(text.slice(last, at)))
    last = at + m[0].length
    const [target, alias] = (m[1] ?? "").split("|")
    const name = ((target ?? "").split("#")[0] ?? "").trim()
    const wanted = slugifyFilePath(name as FilePath) as string
    const asIndex = `${wanted}/index`
    const hit =
      slugs.find((s) => s === wanted || s === asIndex) ??
      slugs.find((s) => s.endsWith(`/${wanted}`) || s.endsWith(`/${asIndex}`))
    const label = esc((alias ?? name).trim())
    out.push(hit ? `<a href="/${hit}">${label}</a>` : label)
  }
  out.push(esc(text.slice(last)))
  return out.join("")
}

// tagged = line carried an inline #quote tag (an individual quote, links back
// to its note); dash-only lines from quote files stay unlinked
export function extract(
  raw: string,
  quoteFile: boolean,
  source: string,
): [string, string, boolean][] {
  const body = raw.replace(/^---\n[\s\S]*?\n---\n?/, "")
  const out: [string, string, boolean][] = []
  let inCode = false
  for (const line of body.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inCode = !inCode
      continue
    }
    if (inCode) continue
    const hasTag = /#quotes?\b/i.test(line)
    const isDash = quoteFile && /^\s*-\s+/.test(line)
    if (!hasTag && !isDash) continue
    const text = clean(line)
    if (text) out.push([text, source, hasTag])
  }
  return out
}

async function build(ctx: BuildCtx, content: ProcessedContent[]): Promise<FilePath> {
  const quotes: [string, string, string?][] = []
  const slugs = content
    .map(([, v]) => v.data.slug as string | undefined)
    .filter(Boolean) as string[]
  for (const [, vfile] of content) {
    // filePath is the full openable path; relativePath is relative to content/
    const filePath = vfile.data.filePath as string | undefined
    const relPath = (vfile.data.relativePath as string | undefined) ?? filePath
    if (!filePath || !relPath?.endsWith(".md")) continue
    const dir = path.dirname(relPath)
    const source = "from " + (dir === "." ? "loci" : path.basename(dir)).toLowerCase()
    let raw: string
    try {
      raw = await fs.promises.readFile(filePath, "utf8")
    } catch {
      continue
    }
    const url = "/" + ((vfile.data.slug as string | undefined) ?? "")
    for (const [text, src, tagged] of extract(raw, isQuoteFile(relPath, vfile.data), source)) {
      const html = linkify(text, slugs)
      quotes.push(tagged ? [html, src, url] : [html, src])
    }
  }
  const dest = joinSegments(ctx.argv.output, "static", "quotes.json") as FilePath
  await fs.promises.mkdir(path.dirname(dest), { recursive: true })
  await fs.promises.writeFile(dest, JSON.stringify(quotes))
  return dest
}

export const Quotes: QuartzEmitterPlugin = () => {
  return {
    name: "Quotes",
    async *emit(ctx, content) {
      yield build(ctx, content)
    },
    async *partialEmit(ctx, content, _resources, changeEvents) {
      if (changeEvents.some((e) => path.extname(e.path) === ".md")) {
        yield build(ctx, content)
      }
    },
  }
}
