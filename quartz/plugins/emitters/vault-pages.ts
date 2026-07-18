import { FilePath, joinSegments } from "../../util/path"
import { htmlToJsx } from "../../util/jsx"
import { QuartzEmitterPlugin } from "../types"
import { ProcessedContent } from "../vfile"
import { BuildCtx } from "../../util/ctx"
import { render } from "preact-render-to-string"
import path from "path"
import fs from "fs"

// Emits static/help.json and static/whoami.json — the rendered HTML body of
// content/Help.md and content/woami.md — so the taskbar help popover and the
// homepage whoami card can show live vault content instead of a copy baked
// into index.md. Both source notes publish unlisted (off nav/graph, still
// reachable by direct URL); editing either and rebuilding updates both spots.
const TARGETS: Record<string, string> = {
  "Help.md": "help.json",
  "woami.md": "whoami.json",
}

async function build(ctx: BuildCtx, content: ProcessedContent[]): Promise<FilePath[]> {
  const dests: FilePath[] = []
  for (const [htmlRoot, vfile] of content) {
    const relPath = vfile.data.relativePath as string | undefined
    const filePath = vfile.data.filePath as string | undefined
    if (!relPath || !filePath) continue
    const outName = TARGETS[relPath]
    if (!outName) continue

    const jsx = htmlToJsx(filePath as FilePath, htmlRoot)
    const html = jsx ? render(jsx) : ""

    const dest = joinSegments(ctx.argv.output, "static", outName) as FilePath
    await fs.promises.mkdir(path.dirname(dest), { recursive: true })
    await fs.promises.writeFile(dest, JSON.stringify({ html }))
    dests.push(dest)
  }
  return dests
}

export const VaultPages: QuartzEmitterPlugin = () => {
  return {
    name: "VaultPages",
    async *emit(ctx, content) {
      for (const dest of await build(ctx, content)) yield dest
    },
    async *partialEmit(ctx, content, _resources, changeEvents) {
      if (changeEvents.some((e) => path.extname(e.path) === ".md")) {
        for (const dest of await build(ctx, content)) yield dest
      }
    },
  }
}
