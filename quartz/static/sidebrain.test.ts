import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import test from "node:test"
import assert from "node:assert"

// The side brain is DOM the build never sees — vaultbrain.js injects it into
// the right column at runtime. Nothing typechecks it, so these are the two
// seams that fail silently: the mode gate and the plugin it replaces.
const here = dirname(fileURLToPath(import.meta.url))
const js = readFileSync(join(here, "vaultbrain.js"), "utf8")
const config = readFileSync(join(here, "../../quartz.config.yaml"), "utf8")

test("side brain", async (t) => {
  await t.test("leaves the page scrolling under it", () => {
    // wheel-zoom in a 380px panel would eat the scroll of every note page
    assert.ok(
      /if \(!mini && !side\) \{\s*\n\s*cv\.addEventListener\("wheel"/.test(js),
      "wheel/pan is no longer gated on !side — the side brain now steals page scroll",
    )
  })

  await t.test("never doubles the rotunda on the home page", () => {
    assert.match(js, /document\.body\.dataset\.slug === "index"\) return/)
  })

  await t.test("the panel's height rule cannot outrank the overlay", () => {
    // #vb-side #vault-brain is two ids; .vb-expanded is one id + one class, so
    // without the :not() the expanded overlay keeps the panel's 380px box
    const scss = readFileSync(join(here, "../styles/custom.scss"), "utf8")
    assert.match(scss, /#vb-side \{[\s\S]*?#vault-brain:not\(\.vb-expanded\)/)
  })

  await t.test("a hover in the neighbourhood lights stars, not a section", () => {
    // hlEmit lights a whole room; inside a neighbourhood that is most of the
    // panel, so the hover path must skip it there and light by adjacency
    assert.match(js, /if \(!local && target !== hlFolder\) hlEmit/)
    assert.match(js, /const near = hovered \? adj\.get\(hovered\)/)
  })

  await t.test("✦ off takes the whole column, listing included", () => {
    const scss = readFileSync(join(here, "../styles/custom.scss"), "utf8")
    assert.match(scss, /\.brain-off #quartz-body \{[\s\S]*?\.sidebar\.right \{\s*display: none/)
    // the listing hides only because it lives in the column: a brain-off gate
    // in initFolderRail would leave it showing under the page
    assert.doesNotMatch(js, /function initFolderRail[\s\S]{0,300}brain-off/)
  })

  await t.test("the graph plugin it replaces stays off", () => {
    const block = config.slice(config.indexOf("quartz-community/graph"))
    assert.match(block.slice(0, 120), /enabled: false/)
  })
})
