import test, { describe } from "node:test"
import assert from "node:assert"
import { readFileSync } from "fs"
import { join } from "path"

// The explorer has two sort functions and only one of them ever runs. The
// component serialises its own defaultOptions.sortFn into data-data-fns and the
// inline script rebuilds it with new Function(), so the defaultSortFn sitting
// in the inline script is dead code on every page that renders the component.
// Ordering rules written there look right in the diff and change nothing on the
// site — which is exactly how the chakra order shipped once without taking.
const fork = join(import.meta.dirname, "../../local-plugins/explorer")
const component = readFileSync(join(fork, "src/components/Explorer.tsx"), "utf8")
const inline = readFileSync(join(fork, "src/components/scripts/explorer.inline.ts"), "utf8")
const dist = readFileSync(join(fork, "dist/index.js"), "utf8")

const CHAKRA = ["alignment", "travel", "work", "friends", "shared", "library", "meaning"]

describe("explorer chakra order", () => {
  test("the order lives in the sortFn that is actually serialised", () => {
    const sortFn = component.slice(
      component.indexOf("sortFn: (a: FileTrieNode, b: FileTrieNode) => {"),
      component.indexOf("filterFn: (node: FileTrieNode)"),
    )
    assert.ok(sortFn.length > 0, "Explorer.tsx no longer defines a default sortFn")
    for (const room of CHAKRA) {
      assert.match(sortFn, new RegExp(`"${room}"`), `the sortFn no longer names ${room}`)
    }
    assert.match(
      component,
      /sortFn: opts\.sortFn\?\.toString\(\)/,
      "the component stopped serialising its sortFn — the browser would fall back to the inline default",
    )
  })

  test("the serialised function closes over nothing", () => {
    // it is rebuilt with new Function() in the browser, so a reference to any
    // module-level constant throws there and the explorer silently stops sorting
    const sortFn = component.slice(
      component.indexOf("sortFn: (a: FileTrieNode, b: FileTrieNode) => {"),
      component.indexOf("filterFn: (node: FileTrieNode)"),
    )
    assert.match(sortFn, /const chakra = \[/, "the chakra order moved out of the function body")
  })

  test("dist carries the rebuilt component", () => {
    // dist/index.js is what the site loads; forgetting `npm run build` in the
    // fork ships the old order no matter what src says
    for (const room of CHAKRA) {
      assert.match(dist, new RegExp(`"${room}"`), `dist was not rebuilt — it does not name ${room}`)
    }
  })

  test("the inline script still takes its sortFn from the component", () => {
    assert.match(
      inline,
      /parsed\.sortFn/,
      "the inline script no longer reads the serialised sortFn, so the component's order is ignored",
    )
  })
})
