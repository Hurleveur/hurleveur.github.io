import { Root, Element, ElementContent } from "hast"
import { visit, SKIP } from "unist-util-visit"
import { QuartzTransformerPlugin } from "../types"
import { tagOfLink } from "./hideLlmMarks"

// The vault marks a line worth keeping with an inline #quote at its end (the same
// tags the Quotes emitter collects for the home slab). On the page that line is set
// apart as an inscription: its words are wrapped in one span.inscribed that custom.scss
// sets as a block, and the tag goes, since the setting already says "quote". Hard line
// breaks put every line of a paragraph in one <p> between <br>s, so the line is the run
// since the last <br>.
const QUOTE_TAG = /^quotes?(\/|$)/

const isBr = (n: ElementContent) => n.type === "element" && n.tagName === "br"
const isBlank = (n: ElementContent) => n.type === "text" && n.value.trim() === ""

export const InscribeQuotes: QuartzTransformerPlugin = () => ({
  name: "InscribeQuotes",
  htmlPlugins() {
    return [
      () => (tree: Root) => {
        visit(tree, "element", (node: Element, index, parent) => {
          if (node.tagName !== "a" || !QUOTE_TAG.test(tagOfLink(node) ?? "")) return
          const p = parent as Element | undefined
          if (!p || index === undefined || !["p", "li"].includes(p.tagName)) return
          const kids = p.children
          let start = index
          while (start > 0 && !isBr(kids[start - 1]!)) start--
          const line = kids.slice(start, index)
          // a bare tag on a line of its own marks nothing
          if (line.every(isBlank)) return
          // the block ends the line itself, so the <br> after the tag would leave a gap
          let end = index + 1
          while (end < kids.length && isBlank(kids[end]!)) end++
          if (end < kids.length && isBr(kids[end]!)) end++
          else end = index + 1
          const first = line[0]
          if (first?.type === "text") line[0] = { ...first, value: first.value.trimStart() }
          const last = line[line.length - 1]
          if (last?.type === "text")
            line[line.length - 1] = { ...last, value: last.value.trimEnd() }
          const span: Element = {
            type: "element",
            tagName: "span",
            properties: { className: ["inscribed"] },
            children: line,
          }
          kids.splice(start, end - start, span)
          return [SKIP, start + 1]
        })
      },
    ]
  },
})
