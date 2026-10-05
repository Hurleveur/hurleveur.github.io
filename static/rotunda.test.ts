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

  test("a finger on empty sky lets go of the stuck star", () => {
    const src = js.slice(js.indexOf("const TOUCH_REACH"), js.indexOf("// Task 1: a touch device"))
    const make = (s: number) =>
      new Function("nodes", "view", `${src}; return nearestNode`)(
        [
          { x: 0, y: 0, r: 5 },
          { x: 100, y: 0, r: 5 },
        ],
        { s },
      ) as (x: number, y: number) => { x: number } | null
    assert.equal(make(1)(60, 0)?.x, 100, "a touch between stars picks the closer one")
    assert.equal(make(1)(0, 44)?.x, 0, "a touch just off a star's edge still picks it")
    assert.equal(make(1)(0, 60), null, "a touch far from every star still sticks one")
    // reach is in screen px: zoomed in 2x, 30 world px off the edge is 60 on screen
    assert.equal(
      make(2)(0, 35),
      null,
      "reach ignores zoom — a zoomed-in finger reaches further than it looks",
    )
  })

  test("empty sky does not light a room for touch", () => {
    assert.match(
      onMove,
      /if \(!hf && e\.pointerType !== "touch"\)/,
      "touch falls back to the area circles — a room lit from empty sky never clears",
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

// One slab for the whole sentence, as wide as its longest line. CSS cannot
// size a block to that — a wrapped box is exactly the width it was given, so
// every room used to render the same cap-wide bar. showDesc() measures the
// wrap instead, over a rect per word (inline-block words never merge into one
// line box, and a word mid-rise sits a few px off its neighbours' top).
describe("the description slab is as wide as its longest line", () => {
  // run the real function out of the source, the way the explorer's
  // data-fns are rebuilt — nothing in this file is a module
  const src = js.slice(js.indexOf("function widestLine"), js.indexOf("function folderColor"))
  const widestLine = new Function(`${src}; return widestLine`)() as (
    rects: { top: number; left: number; right: number; width: number }[],
  ) => number
  const rect = (top: number, left: number, right: number) => ({
    top,
    left,
    right,
    width: right - left,
  })

  test("takes the widest line, not the sum of the words", () => {
    const widest = widestLine([
      rect(0, 100, 180), // line 1: 100 -> 300
      rect(0, 186, 300),
      rect(24, 120, 280), // line 2: 120 -> 280, the shorter one
    ])
    assert.equal(widest, 200)
  })

  test("a word mid-rise still counts as part of its line", () => {
    // the per-word animation lifts a word 5px; grouping by exact top would
    // read it as a line of its own and size the slab to that one word
    const widest = widestLine([rect(0, 100, 180), rect(5, 186, 300), rect(24, 120, 280)])
    assert.equal(widest, 200)
  })

  test("nothing laid out measures 0, so the cap is left alone", () => {
    // the band is display:none on a phone: every rect is empty
    assert.equal(widestLine([]), 0)
    assert.equal(widestLine([rect(0, 0, 0)]), 0)
  })
})
