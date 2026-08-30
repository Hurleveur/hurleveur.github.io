import { FilePath, joinSegments, slugifyFilePath } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import { ProcessedContent } from "../vfile"
import { BuildCtx } from "../../util/ctx"
import path from "path"
import fs from "fs"

// Emits static/categoryIndex.json ({ folderSlug: [{slug, title}] }) — the
// generalisation of the old per-category special cases. A note's `categories`
// frontmatter puts it INSIDE any published folder of that name, on top of the
// folder it physically lives in: a book note under alignment/ carrying
// [[Library]] joins /library, a guide anywhere joins /work/guides. The folder
// must already exist in the published output; a category with no matching
// folder (Movies, Shows, "Steph Ango") is ignored, so nothing appears unasked.
//
// Consumed client-side, because a note has exactly one slug and every server
// surface keys off slug prefix: quartz/static/vaultbrain.js merges it into the
// folder listing page, local-plugins/explorer into the sidebar trie. Only
// published content is scanned, so private notes never leak.

// `origin` is the folder the note really lives in, in vault spelling
// ("Work/System Setup"), so a listed member can say where it came from
export type CategoryFile = { slug: string; title: string; origin: string; categories: string[] }
export type CategoryMember = { slug: string; title: string; origin: string }

// A categories entry is a wikilink or bare name: "[[Library]]",
// "[[Books.base#Author]]", "[[Guides|the guides]]", "Quotes". Reduce it to the
// folder-name slug so matching is case- and space-insensitive.
//
// Only the last path segment counts. A folder note has to be linked by its full
// path — `markdownLinkResolution: shortest` cannot find "[[Clippings]]" because
// `Shared/Clippings/Clippings.md` slugs to "shared/clippings/index" — so the
// vault writes "[[Shared/Clippings/Clippings|Clippings]]". Slugifying the whole
// path gives "shared/clippings/index", which matches no folder name and silently
// dropped every note in that form from its category.
export function categorySlug(raw: string): string {
  const name = raw.replace(/^\[\[/, "").replace(/\]\]$/, "").split(/[#|]/)[0].trim()
  const leaf = name.split("/").filter(Boolean).pop() ?? ""
  return leaf ? slugifyFilePath(leaf as FilePath, true) : ""
}

export function categoriesOf(data: any): string[] {
  const cats = data?.frontmatter?.categories
  if (!cats) return []
  const list = Array.isArray(cats) ? cats : [cats]
  return [...new Set(list.map((c) => categorySlug(String(c))).filter(Boolean))]
}

export function buildCategoryIndex(files: CategoryFile[]): Record<string, CategoryMember[]> {
  // every folder that actually exists in the output, indexed by its last
  // segment — "guides" -> ["work/guides"], "library" -> ["library"]
  const foldersByName = new Map<string, Set<string>>()
  for (const file of files) {
    const parts = file.slug.split("/")
    for (let i = 0; i < parts.length - 1; i++) {
      const name = parts[i]
      if (!foldersByName.has(name)) foldersByName.set(name, new Set())
      foldersByName.get(name)!.add(parts.slice(0, i + 1).join("/"))
    }
  }

  const index: Record<string, CategoryMember[]> = {}
  for (const file of files) {
    for (const category of file.categories) {
      for (const folder of foldersByName.get(category) ?? []) {
        // already under it — the folder page and the trie list it natively
        if (file.slug.startsWith(folder + "/")) continue
        ;(index[folder] ??= []).push({
          slug: file.slug,
          title: file.title,
          origin: file.origin,
        })
      }
    }
  }
  for (const members of Object.values(index)) members.sort((a, b) => a.slug.localeCompare(b.slug))
  return index
}

async function build(ctx: BuildCtx, content: ProcessedContent[]): Promise<FilePath> {
  const files: CategoryFile[] = []
  for (const [, vfile] of content) {
    const slug = vfile.data.slug as string | undefined
    if (!slug) continue
    const relativePath = vfile.data.relativePath as string | undefined
    const dir = path.dirname(relativePath ?? slug)
    files.push({
      slug,
      title: (vfile.data.frontmatter?.title as string | undefined) ?? slug,
      origin: dir === "." ? "" : dir,
      categories: categoriesOf(vfile.data),
    })
  }
  const dest = joinSegments(ctx.argv.output, "static", "categoryIndex.json") as FilePath
  await fs.promises.mkdir(path.dirname(dest), { recursive: true })
  await fs.promises.writeFile(dest, JSON.stringify(buildCategoryIndex(files)))
  return dest
}

export const Categories: QuartzEmitterPlugin = () => {
  return {
    name: "Categories",
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
