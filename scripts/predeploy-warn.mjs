#!/usr/bin/env node
// Pre-deploy content check: scans content/ for things worth a human's eyes
// before it goes to gh-pages — unfinished notes, leaked names of people who
// opted out, secret-shaped strings, and notes now rendered as a "private"
// marker (see quartz/plugins/transformers/hidePrivateLinks.ts).
//
// WARN ONLY. Never exits non-zero on a finding — deploy.sh calls this as
// `<script> || true` and nothing here may change the deploy's outcome.
//
// Usage: node scripts/predeploy-warn.mjs [content-dir]  (default: ./content
// next to this script's repo root).

import fs from "node:fs"
import path from "node:path"
import YAML from "yaml"

const scriptDir = path.dirname(new URL(import.meta.url).pathname)
const contentDir = path.resolve(process.argv[2] || path.join(scriptDir, "..", "content"))

// Same gate as hidePrivateLinks.ts's isPublished() — kept in sync by hand
// since pulling that module in means pulling in the whole quartz/hast graph
// for a shell-invoked warn-only script.
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

function readFrontmatter(raw) {
  const m = FRONTMATTER.exec(raw)
  if (!m) return { fm: {}, fmLineCount: 0, body: raw }
  let fm = {}
  try {
    fm = YAML.parse(m[1], { logLevel: "error" }) || {}
  } catch {
    fm = {}
  }
  return { fm, fmLineCount: m[0].split("\n").length - 1, body: raw.slice(m[0].length) }
}

function isPublished(fm) {
  return fm?.publish === true || fm?.publish === "true"
}

function walkMd(dir) {
  let out = []
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walkMd(p))
    else if (e.isFile() && e.name.endsWith(".md")) out.push(p)
  }
  return out
}

// Blank out %%...%% comments (unclosed -> to EOF) and fenced code blocks,
// keeping line numbers intact (same newline count back out), since neither
// ever publishes and shouldn't trigger any check below.
function stripNonPublishing(text) {
  const blank = (m) => "\n".repeat((m.match(/\n/g) || []).length)
  text = text.replace(/%%[\s\S]*?%%/g, blank)
  text = text.replace(/%%[\s\S]*$/, blank)
  text = text.replace(/^([ \t]{0,3})(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\2[ \t]*$/gm, blank)
  return text
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// mtime is a bare link target: strip [[ ]], a trailing |alias, and a #heading.
function wikilinkTargets(text) {
  const out = []
  const re = /\[\[([^\]|#]+)/g
  let m
  while ((m = re.exec(text))) out.push({ target: m[1].trim(), index: m.index })
  return out
}

function lineAt(text, index) {
  return text.slice(0, index).split("\n").length
}

const UNFINISHED_MARKERS = [
  { name: "tag #Unfinished", re: /#unfinished\b/i },
  { name: "tag #incomplete", re: /#incomplete\b/i },
  { name: "tag #todo", re: /#todo\b/i },
  { name: 'text "(Draft)"', re: /\(draft\)/i },
]

const SECRET_PATTERNS = [
  { name: "sk- API key", re: /sk-[A-Za-z0-9_-]{20,}/ },
  { name: "GitHub token", re: /(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/ },
  { name: "AWS access key", re: /AKIA[0-9A-Z]{16}/ },
  { name: "Slack-style token", re: /xox[bp]-[A-Za-z0-9-]+/ },
  { name: "PEM private key block", re: /-----BEGIN [^-]*PRIVATE KEY-----/ },
  { name: "api_key/token/secret/password assignment", re: /(api[_-]?key|token|secret|password)\s*[:=]\s*\S{8,}/i },
]

function main() {
  const allFiles = walkMd(contentDir)
  const parsed = allFiles.map((file) => {
    const raw = fs.readFileSync(file, "utf8")
    const { fm, fmLineCount, body } = readFrontmatter(raw)
    const stripped = stripNonPublishing(raw)
    return { file, rel: path.relative(contentDir, file), fm, fmLineCount, published: isPublished(fm), stripped, bodyLen: body.length }
  })

  const published = parsed.filter((p) => p.published)

  // check 2 setup: private people names (>=4 chars) from content/Friends/People/**
  const peopleDir = path.join(contentDir, "Friends", "People")
  const privateNames = walkMd(peopleDir)
    .map((f) => {
      const raw = fs.readFileSync(f, "utf8")
      const { fm } = readFrontmatter(raw)
      return { name: path.basename(f, ".md"), published: isPublished(fm) }
    })
    .filter((p) => !p.published && p.name.length >= 4)

  // index for check 4: resolve a wikilink target to a file, by vault-relative
  // path or by basename (Obsidian's own fallback when no path is given).
  const byRelNoExt = new Map() // lowercase rel path w/o .md -> parsed
  const byBasename = new Map() // lowercase basename w/o .md -> [parsed]
  for (const p of parsed) {
    const relNoExt = p.rel.replace(/\.md$/, "")
    byRelNoExt.set(relNoExt.toLowerCase(), p)
    const base = path.basename(relNoExt).toLowerCase()
    if (!byBasename.has(base)) byBasename.set(base, [])
    byBasename.get(base).push(p)
  }
  function resolveLink(target) {
    const clean = target.replace(/^\.?\//, "")
    const byPath = byRelNoExt.get(clean.toLowerCase())
    if (byPath) return byPath
    const candidates = byBasename.get(path.basename(clean).toLowerCase())
    return candidates && candidates.length === 1 ? candidates[0] : candidates?.[0]
  }

  const warnings = []
  const privateLinkCounts = new Map() // target rel path -> count
  let privateLinkTotal = 0

  for (const p of published) {
    const strippedLines = p.stripped.split("\n")
    const bodyLines = strippedLines.slice(p.fmLineCount)
    const bodyText = bodyLines.join("\n")

    // check 1: unfinished markers, line by line in the body.
    bodyLines.forEach((line, i) => {
      for (const marker of UNFINISHED_MARKERS) {
        if (marker.re.test(line)) {
          warnings.push(`[unfinished] ${p.rel}:${p.fmLineCount + i + 1}: ${marker.name}`)
        }
      }
    })
    // check 1: near-empty body.
    const nonWhitespace = bodyText.replace(/\s/g, "")
    if (nonWhitespace.length < 20) {
      warnings.push(`[unfinished] ${p.rel}:${p.fmLineCount + 1}: near-empty body (${nonWhitespace.length} non-whitespace chars)`)
    }

    // check 2: private people names, anywhere in the stripped file (frontmatter included).
    for (const { name } of privateNames) {
      const re = new RegExp(`\\b${escapeRegex(name)}\\b`)
      strippedLines.forEach((line, i) => {
        if (re.test(line)) {
          warnings.push(`[private-name] ${p.rel}:${i + 1}: mentions private name "${name}"`)
        }
      })
    }

    // check 3: secret-shaped strings, anywhere in the stripped file. Never
    // print the matched value — only file:line + pattern name.
    strippedLines.forEach((line, i) => {
      for (const pat of SECRET_PATTERNS) {
        if (pat.re.test(line)) {
          warnings.push(`[secret] ${p.rel}:${i + 1}: possible ${pat.name}`)
        }
      }
    })

    // check 4: wikilinks to notes that exist but aren't publish: true.
    for (const { target } of wikilinkTargets(p.stripped)) {
      const resolved = resolveLink(target)
      if (resolved && resolved !== p && !resolved.published) {
        privateLinkTotal++
        privateLinkCounts.set(resolved.rel, (privateLinkCounts.get(resolved.rel) || 0) + 1)
      }
    }
  }

  console.log("predeploy warnings:")
  for (const w of warnings) console.log(w)

  if (privateLinkTotal > 0) {
    const top = [...privateLinkCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    console.log(`[private-links] ${privateLinkTotal} wikilink(s) from published notes point to non-published notes (now rendered as a "private" marker)`)
    for (const [rel, count] of top) console.log(`  ${count}x  ${rel}`)
  }

  console.log(`predeploy warnings: ${warnings.length} found`)
}

main()
