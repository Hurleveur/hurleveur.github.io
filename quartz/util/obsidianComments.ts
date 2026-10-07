// Obsidian hides `%%...%%` from a rendered note; an opening `%%` with no
// closing `%%` hides everything after it to the end of the file. The vault's
// OFM pipeline (remark-obsidian) already gets the closed case right for the
// main page tree, but only recognises the unclosed-to-EOF case when the `%%`
// opens a block (start of a line after a blank line) — one opened mid-
// paragraph falls through as literal text instead. And any reader that
// bypasses the markdown pipeline entirely to scan a note's raw text (e.g. the
// quotes emitter) gets no comment handling at all. This is the one place
// both forms are implemented, so every raw-text reader agrees with Obsidian.
//
// `%%` inside a fenced code block or inline code span is literal, never a
// comment delimiter, so those spans are masked out (same length, so string
// indices into the original text stay valid) before pairing markers.

const FENCE = /^([ \t]*)(`{3,}|~{3,})/
const FRONTMATTER = /^(---\r?\n[\s\S]*?\r?\n---\r?\n?)/

function maskCode(body: string): string {
  const lines = body.split("\n")
  let fenceChar: string | null = null
  let fenceLen = 0
  const masked = lines.map((line) => {
    const m = FENCE.exec(line)
    if (fenceChar) {
      if (m && m[2]!.startsWith(fenceChar) && m[2]!.length >= fenceLen) {
        fenceChar = null
      }
      return " ".repeat(line.length)
    }
    if (m) {
      fenceChar = m[2]![0]!
      fenceLen = m[2]!.length
      return " ".repeat(line.length)
    }
    return line.replace(/`[^`\n]*`/g, (span) => " ".repeat(span.length))
  })
  return masked.join("\n")
}

/**
 * Removes every closed `%%...%%` span and, when the last marker is left
 * unpaired, truncates the raw text from that opening `%%` to the end —
 * exactly what Obsidian renders. `%%` inside code is ignored. Frontmatter is
 * never scanned.
 */
export function stripObsidianComments(raw: string): string {
  const fmMatch = FRONTMATTER.exec(raw)
  const front = fmMatch ? fmMatch[1]! : ""
  const body = raw.slice(front.length)

  const masked = maskCode(body)
  const marks: number[] = []
  for (let i = 0; i < masked.length - 1; i++) {
    if (masked[i] === "%" && masked[i + 1] === "%") {
      marks.push(i)
      i++
    }
  }
  if (marks.length === 0) return raw

  let result = ""
  let cursor = 0
  for (let i = 0; i + 1 < marks.length; i += 2) {
    result += body.slice(cursor, marks[i])
    cursor = marks[i + 1]! + 2
  }
  if (marks.length % 2 === 1) {
    result += body.slice(cursor, marks[marks.length - 1])
  } else {
    result += body.slice(cursor)
  }
  return front + result
}
