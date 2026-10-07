import test, { describe } from "node:test"
import assert from "node:assert"
import { HideCommentTail } from "./hideCommentTail"
import { BuildCtx } from "../../util/ctx"

describe("HideCommentTail", () => {
  test("textTransform truncates an unclosed %% to EOF, even mid-paragraph", () => {
    const plugin = HideCommentTail()
    const src = "Some words. %% never closed, keep going"
    const out = plugin.textTransform!({} as BuildCtx, src)
    assert.strictEqual(out, "Some words. ")
  })

  test("a closed inline comment is also gone from the raw text", () => {
    const plugin = HideCommentTail()
    const out = plugin.textTransform!({} as BuildCtx, "fo%%secret%%o")
    assert.strictEqual(out, "foo")
  })
})
