// node --test scripts/drop-bad-frontmatter.test.mjs
import test from "node:test"
import assert from "node:assert"
import { frontmatterError } from "./drop-bad-frontmatter.mjs"

test("the note that failed the 2026-10-14 deploy is caught", () => {
  const raw =
    "---\npublish: false\ndescription: What the prospecting jobs found for me: news and finds\n---\nbody\n"
  assert.match(frontmatterError(raw), /bad indentation|Nested mappings|mapping/i)
})

test("valid, quoted and missing frontmatter all pass", () => {
  assert.strictEqual(frontmatterError('---\npublish: true\ndescription: "a: b"\n---\nbody'), null)
  assert.strictEqual(frontmatterError("---\npublish: true\n---"), null)
  assert.strictEqual(frontmatterError("no frontmatter here"), null)
})

test("duplicate keys are caught, as js-yaml rejects them", () => {
  assert.notStrictEqual(frontmatterError("---\npublish: true\npublish: false\n---\n"), null)
})
