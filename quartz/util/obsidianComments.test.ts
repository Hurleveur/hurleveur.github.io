import test, { describe } from "node:test"
import assert from "node:assert"
import { stripObsidianComments } from "./obsidianComments"

describe("stripObsidianComments", () => {
  test("a closed inline comment is removed, text rejoins with nothing in between", () => {
    assert.strictEqual(stripObsidianComments("fo%%secret%%o"), "foo")
  })

  test("a closed multi-line block comment is removed", () => {
    assert.strictEqual(
      stripObsidianComments("before\n%%\nsecret line one\nsecret line two\n%%\nafter"),
      "before\n\nafter",
    )
  })

  test("an unclosed %% hides everything after it to the end of the file", () => {
    assert.strictEqual(
      stripObsidianComments("visible text %% secret, never closed"),
      "visible text ",
    )
  })

  test("an unclosed %% starting its own paragraph still truncates to EOF", () => {
    assert.strictEqual(
      stripObsidianComments("before\n\n%%\nnever closed\nmore secret"),
      "before\n\n",
    )
  })

  test("%% inside a fenced code block is literal, not a comment delimiter", () => {
    const src = "text\n```\ncode with %% inside\n```\nmore text"
    assert.strictEqual(stripObsidianComments(src), src)
  })

  test("%% inside inline code is literal", () => {
    const src = "see `100%%` done"
    assert.strictEqual(stripObsidianComments(src), src)
  })

  test("frontmatter is never scanned for %%", () => {
    const src = "---\ntitle: 100%% done\n---\nbody %%hidden%% end"
    assert.strictEqual(stripObsidianComments(src), "---\ntitle: 100%% done\n---\nbody  end")
  })

  test("no %% at all is a no-op", () => {
    assert.strictEqual(
      stripObsidianComments("plain text, nothing hidden"),
      "plain text, nothing hidden",
    )
  })

  test("two closed comments in sequence both disappear", () => {
    assert.strictEqual(stripObsidianComments("a%%x%%b%%y%%c"), "abc")
  })
})
