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

// Phones have no hover, so a touch has to fake one: any contact sticks the
// highlight to the nearest star and it stays stuck until the next touch moves
// it, because pointerleave fires on finger-lift same as it would for a mouse
// and would otherwise wipe the highlight the instant the tap ends. None of
// this shows up in a build, and none of it is reachable from a desktop browser.
describe("touch sticks the hover instead of navigating", () => {
  const onMove = js.slice(js.indexOf("function onMove(e) {"), js.indexOf("function onClick(e) {"))
  const onClick = js.slice(js.indexOf("function onClick(e) {"), js.indexOf("function onWheel(e) {"))
  const onLeave = js.slice(
    js.indexOf("function onLeave(e) {"),
    js.indexOf('cv.addEventListener("pointerdown", onTouchDown)'),
  )
  const onTouchDown = js.slice(
    js.indexOf("function onTouchDown(e) {"),
    js.indexOf("function onMove(e) {"),
  )

  test("any contact resolves to the nearest star, not an exact hit", () => {
    assert.match(
      onMove,
      /hovered = e\.pointerType === "touch" \? nearestNode\(x, y\) : nodeAt\(e\)/,
      "onMove no longer gives touch the always-resolves nearestNode pick",
    )
  })

  test("a bare tap sticks the hover immediately, not only after a drag", () => {
    assert.match(
      onTouchDown,
      /if \(e\.pointerType === "touch"\) onMove\(e\)/,
      "pointerdown no longer picks a star on contact — a stationary tap would show nothing",
    )
  })

  test("lifting the finger does not clear the stuck hover", () => {
    assert.match(
      onLeave,
      /pointerType === "touch"\) return/,
      "onLeave clears touch's hover on pointerleave — the stick breaks the instant the tap ends",
    )
  })

  test("the canvas never navigates from a touch", () => {
    assert.match(
      onClick,
      /if \(e\.pointerType === "touch"\) return/,
      "onClick can still navigate from a touch — that's the star, not the label, opening the page",
    )
  })
})

// The hovered-room description is one box in two places: a slab over the mini
// brain on the home page, and the same element centred on a full-screen brain
// in the observatory. Its width is capped in rem, so without a viewport term in
// that cap the phone observatory renders it wider than the screen — a full-bleed
// bar with its text cut off at both edges, which is what the last two attempts
// at this box left behind.
describe("the room description fits the screen", () => {
  const descRules = scss.slice(scss.indexOf("#vb-desc {"), scss.indexOf("@keyframes vb-desc-in"))

  test("the width cap is bounded by the viewport, not by rem alone", () => {
    const cap = descRules.match(/max-width:\s*([^;]+);/)
    assert.ok(cap, "#vb-desc no longer caps its width at all")
    assert.match(
      cap![1],
      /100vw/,
      "the cap dropped its viewport term — on a phone the slab is wider than the screen again",
    )
  })
})
