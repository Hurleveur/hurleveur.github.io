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

  await t.test("the graph plugin it replaces stays off", () => {
    const block = config.slice(config.indexOf("quartz-community/graph"))
    assert.match(block.slice(0, 120), /enabled: false/)
  })
})
