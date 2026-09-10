import test, { describe } from "node:test"
import assert from "node:assert"
import { readFileSync } from "fs"
import { join } from "path"

// The rotunda hero puts two layers on the same pixels: the room names carved
// on the entablature (an SVG spanning the whole band) and the brain canvas
// (a positioned box in the middle of it). A word that reaches into the
// canvas is only clickable because the frieze sits above it and hands the
// pointer back for its glyphs alone — remove any part of that and the words
// under the canvas silently open /brain instead of their room, which no
// build step or type check would notice.
//
// Positions are in the rotunda.png viewBox, 1252x428 image px.
const BAND_W = 1252

const here = join(import.meta.dirname, "..")
const js = readFileSync(join(here, "static/vaultbrain.js"), "utf8")
const scss = readFileSync(join(here, "styles/custom.scss"), "utf8")

// everything between `.frieze {` and the `#vault-brain {` rule after it
const friezeRules = scss.slice(scss.indexOf(".frieze {"), scss.indexOf("#vault-brain {"))
const brainRules = scss.slice(scss.indexOf("#vault-brain {"))

function zIndex(block: string, what: string) {
  const m = block.match(/z-index:\s*(\d+)/)
  assert.ok(m, `${what} no longer declares a z-index`)
  return Number(m![1])
}

describe("rotunda frieze over the brain canvas", () => {
  test("the frieze stacks above the canvas", () => {
    assert.ok(
      zIndex(friezeRules, ".frieze") > zIndex(brainRules, "#vault-brain"),
      "the canvas is on top of the room names, so it takes their clicks",
    )
  })

  test("the frieze is pointer-transparent except on its words", () => {
    assert.match(
      friezeRules,
      /pointer-events:\s*none/,
      ".frieze must let the pointer through, or it covers the whole band and kills the brain click",
    )
    assert.match(
      friezeRules,
      /pointer-events:\s*auto/,
      ".frieze-word must take the pointer back, or no room name is clickable at all",
    )
  })

  test("each side of the band runs left to right and stays on the image", () => {
    const m = js.match(/const SIDES = \[\{ x0: (\d+), x1: (\d+) \}, \{ x0: (\d+), x1: (\d+) \}\]/)
    assert.ok(m, "vaultbrain.js no longer declares SIDES in the expected shape")
    const [, ...n] = m!.map(Number)
    for (const [x0, x1] of [
      [n[0], n[1]],
      [n[2], n[3]],
    ]) {
      assert.ok(x0 < x1, `frieze side ${x0}-${x1} is inverted`)
      assert.ok(x0 >= 0 && x1 <= BAND_W, `frieze side ${x0}-${x1} leaves the image`)
    }
  })
})

// Touch hover is a hair-trigger: a finger landing dispatches pointermove before
// pointerdown, so gating it wrong either flashes a preview on every tap or (the
// regression this guards) kills the drag preview on phones entirely. Neither
// shows up in a build, and neither is reachable from a desktop browser.
describe("touch preview on the canvas", () => {
  const onMove = js.slice(js.indexOf("function onMove(e) {"), js.indexOf("function onClick(e) {"))
  const onClick = js.slice(js.indexOf("function onClick(e) {"), js.indexOf("function onWheel(e) {"))

  test("a touch previews only once it has travelled past the slop", () => {
    assert.match(onMove, /touchDrag\.moved/, "onMove no longer tracks whether the finger moved")
    assert.match(onMove, /TOUCH_SLOP/, "onMove no longer measures the contact's travel")
    assert.doesNotMatch(
      onMove,
      /pointerType === "touch"\) return/,
      "onMove is back to refusing touch hover outright — the phone preview is dead",
    )
  })

  test("the click ending a preview drag does not navigate", () => {
    assert.match(
      onClick,
      /touchDrag && touchDrag\.moved/,
      "a dragged preview now ends in a navigation the finger never asked for",
    )
  })
})
