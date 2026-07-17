import { FilePath, joinSegments } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import { ProcessedContent } from "../vfile"
import { BuildCtx } from "../../util/ctx"
import path from "path"
import fs from "fs"

// Emits static/quotes.json ([text, source]) for the palace quote slab
// (quartz/static/vaultbrain.js). A line is a quote when it carries an inline
// #quote / #quotes tag (anywhere in the vault), or it starts with "- " inside a
// "quote file" — filename like Quotes.md, frontmatter tags: quote/quotes, or
// categories: Quotes — so such a file can mix prose with dashed quote lines.
// Source is the note's folder, e.g. content/Website/quotes.md -> "from website".
// Only published content is scanned, so private vault quotes never leak.

function isQuoteFile(filePath: string, data: any): boolean {
  const tags: string[] = data.frontmatter?.tags ?? data.tags ?? []
  const cats = data.frontmatter?.categories ?? []
  const catStr = Array.isArray(cats) ? cats.join(" ") : String(cats)
  return (
    /quotes?/i.test(path.basename(filePath, ".md")) ||
    tags.some((t) => /^quotes?$/i.test(t)) ||
    /quotes/i.test(catStr)
  )
}

// strip leading list/blockquote markers, the #quote tag, and trailing #tags
function clean(line: string): string {
  return line
    .replace(/^\s*[-*>]\s+/, "")
    .replace(/#quote\S*/gi, "")
    .replace(/\s+#[\w/-]+\b/g, "")
    .trim()
}

function extract(raw: string, quoteFile: boolean, source: string): [string, string][] {
  const body = raw.replace(/^---\n[\s\S]*?\n---\n?/, "")
  const out: [string, string][] = []
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
    if (text) out.push([text, source])
  }
  return out
}

async function build(ctx: BuildCtx, content: ProcessedContent[]): Promise<FilePath> {
  const quotes: [string, string][] = []
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
    quotes.push(...extract(raw, isQuoteFile(relPath, vfile.data), source))
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
