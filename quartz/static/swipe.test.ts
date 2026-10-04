import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import test, { describe } from "node:test"
import assert from "node:assert"

// Phone edge-swipe for the explorer drawer, native-app style. The decision
// is pulled out of the touch glue into a pure function (swipeDrawerDecision)
// so it can be exercised here without a browser; initSwipeDrawer in
// vaultbrain.js is what actually reads touch points and replays the ☰ click
// — this only covers the gesture math (distance, angle, edge zone, open vs
// closed).
const here = dirname(fileURLToPath(import.meta.url))
const js = readFileSync(join(here, "vaultbrain.js"), "utf8")

const src = js.slice(js.indexOf("const SWIPE_MIN_DIST"), js.indexOf("function initSwipeDrawer"))
const decide = new Function(`${src}; return swipeDrawerDecision`)() as (
  startX: number,
  dx: number,
  dy: number,
  explorerOpen: boolean,
) => "open" | "close" | null

describe("swipeDrawerDecision", () => {
  test("a short drag never counts, open or closed", () => {
    assert.equal(decide(10, 40, 0, false), null) // dx below the 60px floor
    assert.equal(decide(10, -40, 0, true), null)
  })

  test("a mostly-vertical drag is left to the page scroll", () => {
    assert.equal(decide(10, 70, 80, false), null) // dy >= dx: not dominantly horizontal
    assert.equal(decide(10, -70, -80, true), null)
  })

  test("swipe right from the left edge opens it when closed", () => {
    assert.equal(decide(10, 70, 0, false), "open")
    assert.equal(decide(119, 70, 0, false), "open") // just inside the 120px edge zone
  })

  test("swipe right starting past the edge zone does nothing when closed", () => {
    assert.equal(decide(200, 70, 0, false), null)
  })

  test("swipe left never opens a closed drawer", () => {
    assert.equal(decide(10, -70, 0, false), null)
  })

  test("swipe left closes it when open, from anywhere", () => {
    assert.equal(decide(10, -70, 0, true), "close")
    assert.equal(decide(300, -70, 0, true), "close") // no edge-zone requirement to close
  })

  test("swipe right does nothing while already open", () => {
    assert.equal(decide(10, 70, 0, true), null)
  })
})

// the right drawer mirrors it: open from the right edge, close by swiping back
const side = new Function(`${src}; return swipeSideDecision`)() as (
  startX: number,
  dx: number,
  dy: number,
  sideOpen: boolean,
  width: number,
) => "open" | "close" | null

describe("swipeSideDecision", () => {
  test("swipe left from the right edge opens it", () => {
    assert.equal(side(380, -70, 0, false, 400), "open")
    assert.equal(side(281, -70, 0, false, 400), "open") // just inside the 120px edge zone
  })

  test("swipe left from mid-screen does nothing", () => {
    assert.equal(side(200, -70, 0, false, 400), null)
  })

  test("short or vertical drags never count", () => {
    assert.equal(side(380, -40, 0, false, 400), null)
    assert.equal(side(380, -70, 80, false, 400), null)
  })

  test("swipe right closes it when open, from anywhere", () => {
    assert.equal(side(50, 70, 0, true, 400), "close")
    assert.equal(side(50, -70, 0, true, 400), null)
  })
})
