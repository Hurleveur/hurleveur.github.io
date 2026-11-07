import test, { describe } from "node:test"
import assert from "node:assert"
import { Element, ElementContent, Root } from "hast"
import { InscribeQuotes } from "./inscribeQuotes"

const tag = (name: string): Element => ({
  type: "element",
  tagName: "a",
  properties: { href: `../../tags/${name}`, className: ["tag-link", "internal"] },
  children: [{ type: "text", value: name }],
})
const br = (): Element => ({ type: "element", tagName: "br", properties: {}, children: [] })
const txt = (value: string): ElementContent => ({ type: "text", value })
const para = (...children: ElementContent[]): Element => ({
  type: "element",
  tagName: "p",
  properties: {},
  children,
})

const run = (p: Element) => {
  const tree: Root = { type: "root", children: [p] }
  const plugin = (InscribeQuotes().htmlPlugins!({} as never)[0] as () => (t: Root) => void)()
  plugin(tree)
  return p.children
}
// the paragraph as a compact string: text as-is, <br> as |, the span as [...]
const shape = (kids: ElementContent[]): string =>
  kids
    .map((k) =>
      k.type === "text"
        ? k.value
        : k.type === "element" && k.tagName === "br"
          ? "|"
          : k.type === "element" && k.tagName === "span"
            ? `[${shape(k.children)}]`
            : k.type === "element"
              ? `#${(k.children[0] as { value: string }).value}`
              : "",
    )
    .join("")

describe("InscribeQuotes", () => {
  test("a #quote line inside a paragraph becomes one span; its tag and <br> go", () => {
    const p = para(
      txt("Our brain"),
      br(),
      txt("\nUse attention to change your system. "),
      tag("quote"),
      br(),
      txt("\nSo this means"),
    )
    assert.strictEqual(
      shape(run(p)),
      "Our brain|[Use attention to change your system.]\nSo this means",
    )
  })

  test("a paragraph that is all quote is wrapped whole", () => {
    const p = para(txt("“Be one.” - Marcus Aurelius "), tag("quote"))
    assert.strictEqual(shape(run(p)), "[“Be one.” - Marcus Aurelius]")
  })

  test("the line keeps its own links, and loses only the quote tag", () => {
    const link: Element = { ...tag("x"), properties: { href: "../poems", className: ["internal"] } }
    const p = para(txt("I used to write "), link, txt(" now. "), tag("quotes"))
    assert.strictEqual(shape(run(p)), "[I used to write #x now.]")
  })

  test("other tags, look-alike tags and a bare tag line are left alone", () => {
    for (const p of [
      para(txt("An opinion. "), tag("opinion")),
      para(txt("Quoted. "), tag("quoted")),
      para(txt("Above"), br(), txt("\n"), tag("quote")),
    ]) {
      const before = shape(p.children)
      assert.strictEqual(shape(run(p)), before)
    }
  })
})
