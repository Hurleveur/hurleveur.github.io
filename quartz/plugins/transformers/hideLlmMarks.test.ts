import test, { describe } from "node:test"
import assert from "node:assert"
import { Element, Root } from "hast"
import { VFile } from "vfile"
import { HideLlmMarks, isLlmTag, isTagOnlyParagraph } from "./hideLlmMarks"

const tagLink = (tag: string): Element => ({
  type: "element",
  tagName: "a",
  properties: { href: `./tags/${tag}`, className: ["internal", "tag-link"] },
  children: [{ type: "text", value: `#${tag}` }],
})

const run = (tree: Root, frontmatter: Record<string, unknown>) => {
  const file = new VFile("")
  file.data.frontmatter = frontmatter as never
  const plugin = (
    HideLlmMarks().htmlPlugins!({} as never)[0] as () => (t: Root, f: VFile) => void
  )()
  plugin(tree, file)
  return file.data.frontmatter as Record<string, unknown>
}

describe("isLlmTag", () => {
  test("matches both spellings and the nested confidence form", () => {
    for (const t of ["llm-written", "llmwritten", "llm-written/85", "#llm-written/85"]) {
      assert.strictEqual(isLlmTag(t), true, t)
    }
  })
  test("leaves unrelated tags alone", () => {
    for (const t of ["llm", "written", "llm-writing", "rules"]) {
      assert.strictEqual(isLlmTag(t), false, t)
    }
  })
})

describe("isTagOnlyParagraph", () => {
  test("a paragraph of nothing but tag links", () => {
    const p: Element = {
      type: "element",
      tagName: "p",
      properties: {},
      children: [tagLink("rules"), { type: "text", value: " " }, tagLink("llm-written/85")],
    }
    assert.strictEqual(isTagOnlyParagraph(p), true)
  })
  test("prose that happens to contain a tag link is not one", () => {
    const p: Element = {
      type: "element",
      tagName: "p",
      properties: {},
      children: [{ type: "text", value: "use " }, tagLink("llm-written")],
    }
    assert.strictEqual(isTagOnlyParagraph(p), false)
  })
})

describe("HideLlmMarks", () => {
  test("strips the tag from frontmatter and the generated-* keys", () => {
    const fm = run(
      { type: "root", children: [] },
      {
        tags: ["rules", "llm-written", "llm-written/85", "website"],
        "generated-by": "claude-opus-5",
        "generated-at": "2026-09-08",
        title: "Chakras",
      },
    )
    assert.deepStrictEqual(fm.tags, ["rules", "website"])
    assert.strictEqual("generated-by" in fm, false)
    assert.strictEqual("generated-at" in fm, false)
    assert.strictEqual(fm.title, "Chakras")
  })

  test("drops the mark from a tag-only line but keeps the other tags", () => {
    const p: Element = {
      type: "element",
      tagName: "p",
      properties: {},
      children: [tagLink("rules"), tagLink("llm-written/85")],
    }
    run({ type: "root", children: [p] }, {})
    assert.deepStrictEqual(
      p.children.map((c) => (c as Element).properties!.href),
      ["./tags/rules"],
    )
  })

  test("a tag written inside a sentence keeps its words but loses its link", () => {
    const p: Element = {
      type: "element",
      tagName: "p",
      properties: {},
      children: [{ type: "text", value: "agents add " }, tagLink("llm-written")],
    }
    run({ type: "root", children: [p] }, {})
    assert.deepStrictEqual(p.children, [
      { type: "text", value: "agents add " },
      { type: "text", value: "#llm-written" },
    ])
  })

  test("a tag-only line keeps the tags around the one it drops", () => {
    const p: Element = {
      type: "element",
      tagName: "p",
      properties: {},
      children: [tagLink("rules"), tagLink("llm-written/85"), tagLink("website")],
    }
    run({ type: "root", children: [p] }, {})
    assert.deepStrictEqual(
      p.children.map((c) => (c as Element).properties!.href),
      ["./tags/rules", "./tags/website"],
    )
  })
})
