import { FilePath, joinSegments, slugifyFilePath } from "../../util/path"
import { QuartzEmitterPlugin, QuartzPageTypePluginInstance } from "../types"
import path from "path"
import fs from "fs"
import { minimatch } from "minimatch"
import { glob } from "../../util/glob"
import { Argv, BuildCtx } from "../../util/ctx"
import { QuartzConfig } from "../../cfg"

// content/ mirrors the whole private vault; non-md files can't carry the
// publish:true frontmatter that gates everything else, so they publish only if
// allowlisted in publish-exceptions.txt (site root). Missing file = publish nothing.
const EXCEPTIONS_FILE = "publish-exceptions.txt"

function loadAllowlist(): string[] {
  try {
    return fs
      .readFileSync(EXCEPTIONS_FILE, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
  } catch {
    return []
  }
}

function isAllowed(fp: string, allowlist: string[]): boolean {
  return allowlist.some((pattern) => minimatch(fp, pattern))
}

// page-like assets (html/pdf) don't appear in the content index, so the
// Explorer can't list them; publish their listing separately for it. Images
// stay out — they'd flood the tree.
const ASSET_INDEX_EXTS = new Set([".html", ".pdf"])

async function emitAssetIndex(argv: Argv, fps: FilePath[]): Promise<FilePath> {
  const entries = fps
    .filter((fp) => ASSET_INDEX_EXTS.has(path.extname(fp).toLowerCase()))
    .map((fp) => {
      // slugifyFilePath strips .html (clean URL, server resolves it) and keeps .pdf
      const slug = slugifyFilePath(fp) as string
      return { slug, title: path.basename(fp, path.extname(fp)), filePath: fp }
    })
  const dest = joinSegments(argv.output, "static", "assetIndex.json") as FilePath
  await fs.promises.mkdir(path.dirname(dest), { recursive: true })
  await fs.promises.writeFile(dest, JSON.stringify(entries))
  return dest
}

function getPageTypeExtensions(ctx: BuildCtx): Set<string> {
  const extensions = new Set<string>()
  const pageTypes = (ctx.cfg.plugins.pageTypes ?? []) as unknown as QuartzPageTypePluginInstance[]
  for (const pt of pageTypes) {
    if (pt.fileExtensions) {
      for (const ext of pt.fileExtensions) {
        extensions.add(ext)
      }
    }
  }
  return extensions
}

const filesToCopy = async (argv: Argv, cfg: QuartzConfig, excludeExtensions: Set<string>) => {
  const excludePatterns = ["**/*.md", ...cfg.configuration.ignorePatterns]
  for (const ext of excludeExtensions) {
    excludePatterns.push(`**/*${ext}`)
  }
  return await glob("**", argv.directory, excludePatterns)
}

// raw html assets have no site chrome — inject the assetnav drawer
// (quartz/static/assetnav.js) so they keep a door back into the site
const NAV_TAG = `<script defer src="/static/assetnav.js"></script>`

// html keeps its extension on disk: static hosts (GitHub Pages) serve
// extensionless files as application/octet-stream (browser downloads them),
// but resolve the clean URL /foo from foo.html themselves
const outputName = (fp: FilePath): string => {
  const name = slugifyFilePath(fp) as string
  return path.extname(fp).toLowerCase() === ".html" ? name + ".html" : name
}

const copyFile = async (argv: Argv, fp: FilePath) => {
  const src = joinSegments(argv.directory, fp) as FilePath

  const dest = joinSegments(argv.output, outputName(fp)) as FilePath

  const dir = path.dirname(dest) as FilePath
  await fs.promises.mkdir(dir, { recursive: true })

  if (path.extname(fp).toLowerCase() === ".html") {
    let html = await fs.promises.readFile(src, "utf8")
    html = html.includes("</body>") ? html.replace("</body>", `${NAV_TAG}</body>`) : html + NAV_TAG
    await fs.promises.writeFile(dest, html)
  } else {
    await fs.promises.copyFile(src, dest)
  }
  return dest
}

export const Assets: QuartzEmitterPlugin = () => {
  return {
    name: "Assets",
    async *emit(ctx) {
      const excludeExtensions = getPageTypeExtensions(ctx)
      const allowlist = loadAllowlist()
      const fps = (await filesToCopy(ctx.argv, ctx.cfg, excludeExtensions)).filter((fp) =>
        isAllowed(fp, allowlist),
      )
      for (const fp of fps) {
        yield copyFile(ctx.argv, fp)
      }
      yield emitAssetIndex(ctx.argv, fps)
    },
    async *partialEmit(ctx, _content, _resources, changeEvents) {
      const excludeExtensions = getPageTypeExtensions(ctx)
      const allowlist = loadAllowlist()
      let touched = false
      for (const changeEvent of changeEvents) {
        const ext = path.extname(changeEvent.path)
        if (ext === ".md" || excludeExtensions.has(ext)) continue
        if (!isAllowed(changeEvent.path, allowlist)) continue
        touched = true

        if (changeEvent.type === "add" || changeEvent.type === "change") {
          yield copyFile(ctx.argv, changeEvent.path)
        } else if (changeEvent.type === "delete") {
          const dest = joinSegments(ctx.argv.output, outputName(changeEvent.path)) as FilePath
          await fs.promises.unlink(dest)
        }
      }
      if (touched) {
        const fps = (await filesToCopy(ctx.argv, ctx.cfg, excludeExtensions)).filter((fp) =>
          isAllowed(fp, allowlist),
        )
        yield emitAssetIndex(ctx.argv, fps)
      }
    },
  }
}
