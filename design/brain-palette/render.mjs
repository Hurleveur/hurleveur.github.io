// Renders the vault brain under each palette/star-drawing variant, without
// touching the repo: vaultbrain.js is rewritten in flight per variant.
// Needs the dev server on :8050 and playwright-core (npm i --no-save playwright-core).
// Run from the repo root: node design/brain-palette/render.mjs, then sheets.py.
import { chromium } from "playwright-core"
import fs from "fs"
import path from "path"

const HERE = path.dirname(new URL(import.meta.url).pathname)
const OUT = path.join(HERE, "renders")
fs.mkdirSync(OUT, { recursive: true })
const SRC = fs.readFileSync(path.join(HERE, "../../quartz/static/vaultbrain.js"), "utf8")

const PIGMENT = ["#b8513f", "#c47a3c", "#c9a24a", "#6e9468", "#4f7aa6", "#53579a", "#86679f"]
const STARLIGHT = ["#e39a8a", "#e8b48a", "#e6cf8f", "#a9c79a", "#93bcd9", "#9aa3dc", "#bba4dc"]
const GILDED = ["#c8705a", "#cf8f58", "#d4b060", "#93a66f", "#7f9fb0", "#7f7fae", "#a283a8"]
// lit core: white-hot centre fading to the hue at the rim
const CORE = `{ const cg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * pulse * 1.15); cg.addColorStop(0, lighten(col, 0.7)); cg.addColorStop(0.45, lighten(col, 0.25)); cg.addColorStop(1, col); ctx.fillStyle = cg }`
// ember: near-white star, the room's hue survives only in the halo
const EMBER = `{ const cg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * pulse * 1.1); cg.addColorStop(0, "#fffaf0"); cg.addColorStop(0.6, lighten(col, 0.7)); cg.addColorStop(1, lighten(col, 0.35)); ctx.fillStyle = cg }`
const VARIANTS = {
  "0-current": {},
  "1-pigment": { p: PIGMENT },
  "2-starlight": { p: STARLIGHT, star: CORE },
  "3-pigment-core": { p: PIGMENT, star: CORE },
  "4-gilded": { p: GILDED, star: CORE },
  "5-ember": { p: GILDED, star: EMBER },
}
const VIEWS = [
  ["phone-home", 390, 844, true, "dark", "/", { x: 0, y: 250, width: 390, height: 420 }],
  ["side-dark", 1600, 900, false, "dark", "/library/", { x: 1200, y: 40, width: 400, height: 320 }],
  ["side-light", 1600, 900, false, "light", "/library/", { x: 1200, y: 40, width: 400, height: 320 }],
  ["obs-dark", 1600, 900, false, "dark", "/", null],
]

const pal = (a) =>
  `const COLORS = { alignment: "${a[0]}", travel: "${a[1]}", work: "${a[2]}", friends: "${a[3]}", shared: "${a[4]}", library: "${a[5]}", meaning: "${a[6]}" }\n  const _OLD = {`
const pw = process.env.HOME + "/.cache/ms-playwright"
const shell = fs.readdirSync(pw).find((d) => d.startsWith("chromium_headless_shell"))
const b = await chromium.launch({
  executablePath: `${pw}/${shell}/chrome-headless-shell-linux64/chrome-headless-shell`,
  args: ["--no-sandbox"], // a browser under ~/.cache has no AppArmor profile
})
for (const [name, v] of Object.entries(VARIANTS)) {
  let js = SRC
  if (v.p) js = js.replace("const COLORS = {", pal(v.p))
  if (v.star) js = js.replace(/ctx\.fillStyle = col\n/, v.star + "\n")
  for (const [tag, w, h, mobile, theme, url, clip] of VIEWS) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, colorScheme: theme })
    await ctx.addInitScript((t) => localStorage.setItem("theme", t), theme)
    await ctx.route(/vaultbrain\.js/, (r) => r.fulfill({ contentType: "application/javascript", body: js }))
    const p = await ctx.newPage()
    await p.goto("http://localhost:8050" + url, { waitUntil: "networkidle" })
    await p.waitForTimeout(2500)
    if (tag === "obs-dark") {
      await p.evaluate(() => document.getElementById("vb-expand").click())
      await p.waitForTimeout(4000)
    }
    await p.screenshot({ path: `${OUT}/${tag}-${name}.png`, ...(clip ? { clip } : {}) })
    await ctx.close()
  }
}
await b.close()
