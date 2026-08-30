import test, { describe } from "node:test"
import assert from "node:assert"
import { isQuoteFile, extract, linkify } from "./quotes"

describe("isQuoteFile", () => {
  test("frontmatter tags polluted by an inline #quote tag do NOT mark the whole file", () => {
    // obsidian-flavored-markdown merges every inline #tag into frontmatter.tags,
    // so a note with a single #quote-tagged line ends up with tags: ["quote"]
    // even though it was never meant to be a dedicated quote file.
    const data = { frontmatter: { categories: ["[[Alignment]]"], tags: ["quote"] } }
    assert.strictEqual(isQuoteFile("How ai should be used.md", data), false)
  })

  test("categories: Quotes marks the file", () => {
    const data = { frontmatter: { categories: ["Quotes"] } }
    assert.strictEqual(isQuoteFile("some-note.md", data), true)
  })

  test("filename containing quote(s) marks the file", () => {
    assert.strictEqual(isQuoteFile("Quotes.md", { frontmatter: {} }), true)
  })

  test("plain note is not a quote file", () => {
    assert.strictEqual(isQuoteFile("some-note.md", { frontmatter: {} }), false)
  })
})

describe("extract", () => {
  test("a dash line in a non-quote file is not extracted, even with a #quote line elsewhere", () => {
    const raw = [
      "Be proud to do things yourself. #quote",
      "",
      "To get a grasp on the bigger picture:",
      "- https://ai-2040.com/",
    ].join("\n")
    const out = extract(raw, false, "from alignment")
    assert.deepStrictEqual(out, [["Be proud to do things yourself.", "from alignment", true]])
  })

  test("dash lines in an actual quote file are extracted unlinked", () => {
    const raw = "- first quote\n- second quote"
    const out = extract(raw, true, "from quotes")
    assert.deepStrictEqual(out, [
      ["first quote", "from quotes", false],
      ["second quote", "from quotes", false],
    ])
  })
})

describe("linkify", () => {
  const slugs = ["meaning/on-the-shortness-of-time", "website/website/index", "religion"]

  test("a wikilink in the quote becomes a link to the note", () => {
    assert.strictEqual(
      linkify("Read [[On the shortness of time]]", slugs),
      'Read <a href="/meaning/on-the-shortness-of-time">On the shortness of time</a>',
    )
  })

  test("an alias is the label, the target is the href", () => {
    assert.strictEqual(linkify("[[religion|faith]]", slugs), '<a href="/religion">faith</a>')
  })

  test("a folder note resolves through its /index slug", () => {
    assert.strictEqual(
      linkify("[[Website]]", slugs),
      '<a href="/website/website/index">Website</a>',
    )
  })

  test("an unresolvable link degrades to plain text, and text is escaped", () => {
    assert.strictEqual(linkify("a < b and [[No such note]]", slugs), "a &lt; b and No such note")
  })
})
