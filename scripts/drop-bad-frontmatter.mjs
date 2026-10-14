#!/usr/bin/env node
// Removes every note from content/ whose YAML frontmatter does not parse, and
// prints one line per note removed. One bad note, published or not, otherwise
// fails the whole Quartz build (note-properties throws), so a single unquoted
// ": " in an AI-written description used to cost the day's deploy.
//
// Removing is safe: content/ is a throwaway rsync copy, and a note that is not
// there cannot publish. The vault keeps the note; deploy.sh tells Alexandre.
//
// Usage: node scripts/drop-bad-frontmatter.mjs <content-dir>

import fs from "node:fs"
import path from "node:path"
import YAML from "yaml"

// Same block note-properties reads: frontmatter must open the file.
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/

// shortcut: parses with `yaml` (a direct dependency), while Quartz uses
// js-yaml; both reject the real failures seen so far (bad indentation,
// duplicate keys). Upgrade if a note ever passes here and still fails the build.
export function frontmatterError(raw) {
  const m = FRONTMATTER.exec(raw)
  if (!m) return null
  try {
    YAML.parse(m[1], { logLevel: "error" })
    return null
  } catch (e) {
    return e.message.split("\n")[0]
  }
}

function walkMd(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walkMd(p))
    else if (e.isFile() && e.name.endsWith(".md")) out.push(p)
  }
  return out
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const contentDir = path.resolve(process.argv[2])
  for (const file of walkMd(contentDir)) {
    const err = frontmatterError(fs.readFileSync(file, "utf8"))
    if (err === null) continue
    fs.unlinkSync(file)
    console.log(`${path.relative(contentDir, file)}: ${err}`)
  }
}
