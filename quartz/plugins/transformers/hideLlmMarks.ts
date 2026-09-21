import { Root, Element } from "hast"
import { visit, SKIP } from "unist-util-visit"
import { QuartzTransformerPlugin } from "../types"
import { VFile } from "vfile"

// The vault marks agent-written notes two ways (see the vault's Frontmatter.md):
// a `#llm-written[/confidence]` tag and the `generated-by/at/confidence` keys.
// Both are vault bookkeeping — the public site must not carry them.
const LLM_TAG = /^llm-?written(\/|$)/
const GENERATED_KEY = /^generated-/

export function isLlmTag(tag: string): boolean {
  return LLM_TAG.test(tag.replace(/^#/, ""))
}

/** A paragraph that is nothing but tag links — the mark line at the foot of a note. */
export function isTagOnlyParagraph(node: Element): boolean {
  if (node.tagName !== "p") return false
  const kids = node.children.filter((c) => !(c.type === "text" && c.value.trim() === ""))
  return (
    kids.length > 0 &&
    kids.every(
      (c) =>
        c.type === "element" &&
        c.tagName === "a" &&
        String(c.properties?.className ?? "").includes("tag-link"),
    )
  )
}

/** The anchor's own words — a tag link only ever holds one text child. */
function linkText(node: Element): string {
  return node.children.map((c) => (c.type === "text" ? c.value : "")).join("")
}

function tagOfLink(node: Element): string | undefined {
  if (node.tagName !== "a") return undefined
  const href = String(node.properties?.href ?? "")
  const m = href.match(/tags\/(.+)$/)
  return m?.[1]
}

export const HideLlmMarks: QuartzTransformerPlugin = () => ({
  name: "HideLlmMarks",
  htmlPlugins() {
    return [
      () => (tree: Root, file: VFile) => {
        const frontmatter = file.data.frontmatter as Record<string, unknown> | undefined
        if (frontmatter) {
          for (const key of Object.keys(frontmatter)) {
            if (GENERATED_KEY.test(key)) delete frontmatter[key]
          }
          const tags = frontmatter.tags
          if (Array.isArray(tags)) {
            frontmatter.tags = tags.filter((t) => typeof t !== "string" || !isLlmTag(t))
          }
        }

        // A standalone mark line is dropped whole; the same tag inside a sentence (the
        // vault's rule notes explain the convention) keeps its words but loses its link,
        // since the tag page it pointed at no longer gets emitted.
        visit(tree, "element", (node: Element, index, parent) => {
          if (node.tagName !== "a" || !isLlmTag(tagOfLink(node) ?? "")) return
          if (!parent || index === undefined) return
          if (isTagOnlyParagraph(parent as Element)) {
            parent.children.splice(index, 1)
            return [SKIP, index]
          }
          parent.children[index] = { type: "text", value: linkText(node) }
          return [SKIP, index + 1]
        })
      },
    ]
  },
})
