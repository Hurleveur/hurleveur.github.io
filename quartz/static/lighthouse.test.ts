import { readFileSync, statSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import test from "node:test"
import assert from "node:assert"

// What a Lighthouse pass bought, kept from sliding back: none of it fails a
// build or a typecheck, the page just quietly gets slower or harder to read.
const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, "../..")
const js = readFileSync(join(here, "vaultbrain.js"), "utf8")
const home = readFileSync(join(root, "content/index.md"), "utf8")

const body = (name: string, next: string) => {
  const from = js.indexOf(`function ${name}(`)
  const to = js.indexOf(next, from)
  assert.ok(from > -1 && to > from, `can't find ${name} in vaultbrain.js`)
  return js.slice(from, to)
}

test("lighthouse", async (t) => {
  await t.test("the brain's loop stops once nothing moves", () => {
    assert.match(js, /if \(onScreen && !resting\) raf = requestAnimationFrame\(draw\)/)
    assert.match(js, /resting = heat < REST_HEAT && hlLeft < 0\.01 && !hovered/)
    // heat's floor has to sit under the threshold, or the loop never rests
    const floor = +js.match(/heat = Math\.max\(heat \* Math\.pow\(0\.997, dt\), ([\d.]+)\)/)![1]
    const rest = +js.match(/const REST_HEAT = ([\d.]+)/)![1]
    assert.ok(floor < rest, `heat floor ${floor} never reaches REST_HEAT ${rest}`)
  })

  await t.test("everything that changes the picture wakes it", () => {
    // a rested canvas repaints nothing: a theme flip or a tour step that
    // misses wake() leaves the old picture standing
    const wakers = [body("size", "function paintStars"), js.slice(js.indexOf("const onHl = (e)"))]
    wakers.push(body("onTheme", 'document.addEventListener("themechange", onTheme)'))
    for (const w of wakers) assert.match(w.slice(0, 900), /\bwake\(\)/)
    assert.match(js, /WAKE_EVENTS = \["pointermove", "pointerdown", "wheel"\]/)
    assert.match(js, /wrap\.addEventListener\(ev, wake/)
    assert.match(js, /wrap\.removeEventListener\(ev, wake\)/)
  })

  await t.test("a slow device takes one sim step a frame, not a catch-up burst", () => {
    assert.match(js, /acc = Math\.min\(acc \+ dt, 1\)/)
  })

  await t.test("SoundCloud loads only for someone who asks for music", () => {
    const init = body("initAudio", "// folder pages are built")
    assert.doesNotMatch(init, /soundcloud\.com\/player|createElement\("iframe"\)/)
    assert.match(init, /if \(sessionStorage\.getItem\("vb-audio-on"\)\) loadWidget\(btn\)/)
    const hey = body("playHeyYou", "// the widget ignores auto_play")
    assert.match(hey, /loadWidget\(btn\)/, "the easter egg needs the widget too")
  })

  await t.test("the page's one contentIndex parse is shared and stays clean", () => {
    assert.doesNotMatch(js, /fetch\("\/static\/contentIndex\.json"\)/)
    assert.match(js, /const data = \{ \.\.\.\(await fetchData\) \}/)
  })

  await t.test("the Cormorant sheet stays off", () => {
    const config = readFileSync(join(root, "quartz.config.yaml"), "utf8")
    assert.match(config, /fontOrigin: local/)
  })

  await t.test("the avatar is sized for the card", () => {
    const src = home.match(/class="whoami-avatar" src="([^"]+)"/)![1]
    assert.equal(src, "/static/bh-profile.webp")
    assert.ok(statSync(join(here, "bh-profile.webp")).size < 30_000)
  })

  await t.test("a button's visible text is part of its accessible name", () => {
    const buttons = [
      ...home.matchAll(/<button[^>]*aria-label="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g),
    ]
    assert.ok(buttons.length > 0, "no labelled button left on the home page")
    for (const [, label, inner] of buttons) {
      const seen = inner
        .replace(/<span[^>]*aria-hidden[^>]*>.*?<\/span>/g, "")
        .replace(/<[^>]+>/g, " ")
      for (const word of seen.trim().split(/\s+/).filter(Boolean)) {
        assert.ok(label.toLowerCase().includes(word.toLowerCase()), `"${label}" lacks "${word}"`)
      }
    }
  })

  await t.test("day text colours hold AA on the page and on a link's tint", () => {
    const scss = readFileSync(join(here, "../styles/custom.scss"), "utf8")
    const day = scss.match(/\nbody \{([\s\S]*?)\n\}/)![1]
    const linear = (hex: string) =>
      [1, 3, 5]
        .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    const lum = (hex: string) => {
      const [r, g, b] = linear(hex)
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const ratio = (a: string, b: string) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
      return (hi + 0.05) / (lo + 0.05)
    }
    const page = day.match(/--light: (#\w+)/)![1]
    const shades = ["--gray", "--secondary", "--tertiary"].map(
      (v) => day.match(new RegExp(`${v}: (#\\w+)`))![1],
    )
    assert.equal(shades.length, 3)
    for (const fg of shades) {
      assert.ok(ratio(fg, page) >= 4.5, `${fg} on ${page}`)
    }
    // the tinted pill behind an unread link, as Lighthouse computed it
    const gold = day.match(/--secondary: (#\w+)/)![1]
    assert.ok(ratio(gold, "#ece6d9") >= 4.5, `${gold} on the link tint`)
  })

  await t.test("text holds AA on the marble's strongest vein, day and night", () => {
    const scss = readFileSync(join(here, "../styles/custom.scss"), "utf8")
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5]
        .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const ratio = (a: string, b: string) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
      return (hi + 0.05) / (lo + 0.05)
    }
    const over = (top: number[], a: number, under: number[]) =>
      "#" +
      under
        .map((u, i) =>
          Math.round(u * (1 - a) + top[i] * a)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")
    const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
    // a vein at full strength is its colour at the rect's opacity over --light:
    // the darkest point of the day page, the lightest of the night one
    const themes = [
      ["day", /\nbody \{([\s\S]*?)\n\}/],
      ["night", /\n\[saved-theme="dark"\] body \{([\s\S]*?)\n\}/],
    ] as const
    for (const [name, block] of themes) {
      const vars = scss.match(block)![1]
      const get = (v: string) => vars.match(new RegExp(`${v}: (#\\w+)`))![1]
      const svg = readFileSync(join(here, `marble-${name}.svg`), "utf8")
      const vein = svg
        .match(/id="vein"[\s\S]*?values="0 0 0 0 ([\d.]+)  0 0 0 0 ([\d.]+)  0 0 0 0 ([\d.]+) /)!
        .slice(1)
        .map((v) => Number(v) * 255)
      const opacity = Number(svg.match(/url\(#vein\)" opacity="([\d.]+)"/)![1])
      const stone = over(vein, opacity, rgb(get("--light")))
      for (const fg of ["--gray", "--tertiary", "--secondary"].map(get)) {
        assert.ok(ratio(fg, stone) >= 4.5, `${name}: ${fg} on the strongest vein ${stone}`)
      }
      const [r, g, b, a] = vars
        .match(/--highlight: rgba\(([^)]*)\)/)![1]
        .split(",")
        .map(Number)
      const tint = over([r, g, b], a, rgb(stone))
      const gold = get("--secondary")
      assert.ok(ratio(gold, tint) >= 4.5, `${name}: ${gold} on a link's tint over a vein ${tint}`)
    }
  })

  await t.test("a visited link changes ink and shape, not lightness", () => {
    const scss = readFileSync(join(here, "../styles/custom.scss"), "utf8")
    const seen = scss.match(/a\.internal\.vb-seen \{([\s\S]*?)\n\}/)![1]
    assert.match(seen, /color: var\(--gray\)/) // --gray is held to AA above
    assert.match(seen, /background-color: transparent/)
    assert.match(seen, /underline dotted/)
  })

  await t.test("aria-expanded lives on the explorer's buttons", () => {
    const src = readFileSync(
      join(root, "local-plugins/explorer/src/components/scripts/explorer.inline.ts"),
      "utf8",
    )
    assert.doesNotMatch(src, /(nearestExplorer|\bexplorer)\.setAttribute\("aria-expanded"/)
  })
})
