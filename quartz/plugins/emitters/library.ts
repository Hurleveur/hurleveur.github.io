import { FilePath, joinSegments } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import { ProcessedContent } from "../vfile"
import { BuildCtx } from "../../util/ctx"
import path from "path"
import fs from "fs"

// Emits static/library.json ([{slug, title, topic?, toRead?}]) for the library shelf spines
// (quartz/static/vaultbrain.js). A note joins the shelf when its frontmatter
// categories includes Library (the [[Library]] wikilink) — regardless of
// folder, so book notes living under alignment/, work/, website/, etc. shelve
// alongside the books/ folder. Category, not folder prefix, is the signal:
// contentIndex can't tell a frontmatter category from a stray body [[Library]]
// link (both land in `links`), so we read frontmatter here instead.
// Only published content is scanned, so private vault books never leak.

function isLibrary(data: any): boolean {
  const cats = data.frontmatter?.categories ?? []
  const catStr = Array.isArray(cats) ? cats.join(" ") : String(cats)
  return /\blibrary\b/i.test(catStr)
}

// topics tags too generic to tell one book's subject from another's
const GENERIC_TOPICS = new Set(["Nonfiction", "Fiction", "Classics", "Audiobook"])

// first topics entry that isn't a generic umbrella tag, e.g. picks "Psychology"
// over "Nonfiction" so spines colored by subject actually vary
function primaryTopic(data: any): string | undefined {
  const topics = data.frontmatter?.topics
  if (!Array.isArray(topics)) return undefined
  return topics.find((t) => !GENERIC_TOPICS.has(t)) ?? topics[0]
}

// not-yet-finished: to-read or currently reading, both get the same ribbon
function isUnread(data: any): boolean {
  const tags = data.frontmatter?.tags ?? []
  const tagList = Array.isArray(tags) ? tags : [tags]
  return tagList.includes("to-read") || tagList.includes("reading")
}

async function build(ctx: BuildCtx, content: ProcessedContent[]): Promise<FilePath> {
  const books: { slug: string; title: string; topic?: string; toRead?: boolean }[] = []
  for (const [, vfile] of content) {
    if (!isLibrary(vfile.data)) continue
    const slug = vfile.data.slug as string | undefined
    if (!slug) continue
    const title = (vfile.data.frontmatter?.title as string | undefined) ?? slug
    const topic = primaryTopic(vfile.data)
    const toRead = isUnread(vfile.data)
    books.push({ slug, title, ...(topic ? { topic } : {}), ...(toRead ? { toRead } : {}) })
  }
  books.sort((a, b) => a.slug.localeCompare(b.slug))
  const dest = joinSegments(ctx.argv.output, "static", "library.json") as FilePath
  await fs.promises.mkdir(path.dirname(dest), { recursive: true })
  await fs.promises.writeFile(dest, JSON.stringify(books))
  return dest
}

export const Library: QuartzEmitterPlugin = () => {
  return {
    name: "Library",
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
