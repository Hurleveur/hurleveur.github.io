import test, { describe } from "node:test"
import assert from "node:assert"
import { readFileSync } from "fs"
import { join } from "path"

// The rotunda hero has two things fitted by eye to a painted image and so
// spread across two files: the mini-brain box (custom.scss) and the frieze
// band the room names ride (vaultbrain.js). They have to agree — the words
// must stop short of the brain canvas, which sits above them and swallows
// the clicks. Nothing else notices when one of the two drifts.
//
// Both are expressed against the rotunda.png viewBox, 1252x428 image px.
const BAND_W = 1252

const here = join(import.meta.dirname, "..")
const js = readFileSync(join(here, "static/vaultbrain.js"), "utf8")
const scss = readFileSync(join(here, "styles/custom.scss"), "utf8")

function brainBoxPx() {
  // the inset rule inside .rotunda-band { #vault-brain { … } }
  const block = scss.slice(scss.indexOf("#vault-brain {"))
  const pct = (prop: string) => {
    const m = block.match(new RegExp(`\\b${prop}:\\s*([\\d.]+)%`))
    assert.ok(m, `#vault-brain is missing a ${prop} percentage`)
    return parseFloat(m![1])
  }
  return { left: (pct("left") / 100) * BAND_W, right: BAND_W - (pct("right") / 100) * BAND_W }
}

function friezeSides() {
  const m = js.match(/const SIDES = \[\{ x0: (\d+), x1: (\d+) \}, \{ x0: (\d+), x1: (\d+) \}\]/)
  assert.ok(m, "vaultbrain.js no longer declares SIDES in the expected shape")
  const [, a, b, c, d] = m!.map(Number)
  return [
    { x0: a, x1: b },
    { x0: c, x1: d },
  ]
}

describe("rotunda frieze vs brain box", () => {
  test("room names clear the brain canvas on both sides", () => {
    const brain = brainBoxPx()
    const [left, right] = friezeSides()
    assert.ok(
      left.x1 <= brain.left,
      `left room names run to ${left.x1}px, under the brain box starting at ${brain.left.toFixed(0)}px`,
    )
    assert.ok(
      right.x0 >= brain.right,
      `right room names start at ${right.x0}px, under the brain box ending at ${brain.right.toFixed(0)}px`,
    )
  })

  test("each side runs left to right and stays on the image", () => {
    for (const s of friezeSides()) {
      assert.ok(s.x0 < s.x1, `frieze side ${JSON.stringify(s)} is inverted`)
      assert.ok(s.x0 >= 0 && s.x1 <= BAND_W, `frieze side ${JSON.stringify(s)} leaves the image`)
    }
  })
})
