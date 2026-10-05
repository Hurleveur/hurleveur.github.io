import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import test, { describe } from "node:test"
import assert from "node:assert"

// The phone top bar hides on scroll-down and reappears on scroll-up
// (LessWrong's header pattern). The decision is pulled out of the DOM glue
// into a pure function (topbarScrollDecision) so it can be exercised here
// without a browser; custom.scss and the "blocked" guard in
// initTopbarScroll are what actually keep it off-screen or pinned open —
// this only covers the math.
const here = dirname(fileURLToPath(import.meta.url))
const js = readFileSync(join(here, "vaultbrain.js"), "utf8")
const scss = readFileSync(join(here, "../styles/custom.scss"), "utf8")

const src = js.slice(js.indexOf("function topbarScrollDecision"), js.indexOf("let tbPrevY"))
const decide = new Function(`${src}; return topbarScrollDecision`)() as (
  prevY: number,
  y: number,
  hidden: boolean,
  barH: number,
) => boolean

describe("topbarScrollDecision", () => {
  test("never hides within the bar's own height of the top", () => {
    assert.equal(
      decide(0, 10, true, 48),
      false,
      "hidden state should not survive a scroll back near the top",
    )
    assert.equal(decide(0, 47, false, 48), false)
  })

  test("scrolling down past the threshold hides it", () => {
    assert.equal(decide(100, 120, false, 48), true) // dy = 20 > 8
  })

  test("scrolling up past the threshold shows it", () => {
    assert.equal(decide(120, 100, true, 48), false) // dy = -20 < -8
  })

  test("inside the dead zone it keeps whatever state it already had", () => {
    assert.equal(decide(100, 105, false, 48), false) // dy = 5
    assert.equal(decide(100, 105, true, 48), true) // dy = 5
    assert.equal(decide(105, 100, false, 48), false) // dy = -5
    assert.equal(decide(105, 100, true, 48), true) // dy = -5
  })
})

describe("topbar scroll anchor", () => {
  const anchorSrc = js.slice(js.indexOf("function topbarScrollDecision"), js.indexOf("let tbPrevY"))
  const [decideA, anchor] = new Function(
    `${anchorSrc}; return [topbarScrollDecision, topbarScrollAnchor]`,
  )() as [typeof decide, (prevY: number, y: number, barH: number) => number]

  test("a slow drag up (3px a frame) still brings the bar back", () => {
    let prev = 500
    let hidden = true
    for (let y = 497; y >= 470; y -= 3) {
      hidden = decideA(prev, y, hidden, 48)
      prev = anchor(prev, y, 48)
    }
    assert.equal(hidden, false, "per-frame deltas under the threshold must accumulate")
  })
})

describe("phone top bar CSS seams", () => {
  const mobileBlock = scss.slice(
    scss.indexOf("@media all and ($mobile) {\n  #quartz-body .sidebar.left {"),
    scss.indexOf("/* category guests:"),
  )

  test("the bar is sticky on phone, or hide/show has nothing to reappear into", () => {
    assert.match(mobileBlock, /position:\s*sticky/)
  })

  test("the hide class actually moves the bar off-screen", () => {
    assert.match(
      mobileBlock,
      /body\.topbar-hidden #quartz-body \.sidebar\.left \{\s*\n\s*transform:\s*translateY\(-100%\)/,
    )
  })

  test("the slide respects prefers-reduced-motion", () => {
    assert.match(
      mobileBlock,
      /prefers-reduced-motion:\s*reduce\)\s*\{\s*\n\s*#quartz-body \.sidebar\.left \{\s*\n\s*transition:\s*none/,
    )
  })
})
