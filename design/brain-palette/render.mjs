// Renders the vault brain under each palette/star-drawing variant, without
// touching the repo: vaultbrain.js is rewritten in flight per variant.
// Needs the dev server on :8050 and playwright-core (npm i --no-save playwright-core).
// Run from the repo root: node design/brain-palette/render.mjs [variant ...], then
// sheets.py. Variants 0-5 patch vaultbrain.js as it stood before any of them
// shipped (BASE); 6-pearls is the reverted pearl drawing (3d788793), unpatched;
// 7+ patch the working tree (LIVE), i.e. the shipped lit core.
import { chromium } from "playwright-core"
import fs from "fs"
import path from "path"
import { execFileSync } from "child_process"

const HERE = path.dirname(new URL(import.meta.url).pathname)
const OUT = path.join(HERE, "renders")
fs.mkdirSync(OUT, { recursive: true })
const BASE = execFileSync("git", ["show", "7589b1f1:quartz/static/vaultbrain.js"], { encoding: "utf8" })
const LIVE = fs.readFileSync(path.join(HERE, "../../quartz/static/vaultbrain.js"), "utf8")
const PEARLS = execFileSync("git", ["show", "3d788793:quartz/static/vaultbrain.js"], { encoding: "utf8" })

const PIGMENT = ["#b8513f", "#c47a3c", "#c9a24a", "#6e9468", "#4f7aa6", "#53579a", "#86679f"]
const STARLIGHT = ["#e39a8a", "#e8b48a", "#e6cf8f", "#a9c79a", "#93bcd9", "#9aa3dc", "#bba4dc"]
const GILDED = ["#c8705a", "#cf8f58", "#d4b060", "#93a66f", "#7f9fb0", "#7f7fae", "#a283a8"]
// lit core: white-hot centre fading to the hue at the rim
const CORE = `{ const cg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * pulse * 1.15); cg.addColorStop(0, lighten(col, 0.7)); cg.addColorStop(0.45, lighten(col, 0.25)); cg.addColorStop(1, col); ctx.fillStyle = cg }`
// ember: near-white star, the room's hue survives only in the halo
const EMBER = `{ const cg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * pulse * 1.1); cg.addColorStop(0, "#fffaf0"); cg.addColorStop(0.6, lighten(col, 0.7)); cg.addColorStop(1, lighten(col, 0.35)); ctx.fillStyle = cg }`
// lit core v2, patched over the shipped lit core. The star block runs from the
// day/night branch to the disc's arc; each replacement sets fillStyle and
// opens the path itself, the shipped ctx.fill() follows.
const STAR_BLOCK = /if \(sky\.day\) ctx\.fillStyle = col[\s\S]*?ctx\.arc\(n\.x, n\.y, n\.r \* pulse \* \(n\.hub \? 1 \+ 0\.15 \* lit : 1\), 0, 7\)/
const RR = "const rr = n.r * pulse * (n.hub ? 1 + 0.15 * lit : 1)\n"
// no disc edge: a white point that falls off through the hue to nothing
const SOFT = RR + `if (sky.day) ctx.fillStyle = col
  else { const cg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, rr * 1.5); cg.addColorStop(0, "#fffaf2"); cg.addColorStop(0.15, lighten(col, 0.7)); cg.addColorStop(0.45, col); cg.addColorStop(1, col + "00"); ctx.fillStyle = cg }
  ctx.beginPath(); ctx.arc(n.x, n.y, sky.day ? rr : rr * 1.5, 0, 7)`
// faint four-point diffraction spikes on the room hubs, drawn before the core
const SPIKES = `if (!sky.day && n.hub) { const L = rr * 5; ctx.save(); ctx.globalAlpha = 0.35 * dim; ctx.strokeStyle = lighten(col, 0.5); ctx.lineWidth = 0.6 / view.s
  for (const [dx, dy] of [[1, 0], [0, 1]]) { const sg = ctx.createLinearGradient(n.x - dx * L, n.y - dy * L, n.x + dx * L, n.y + dy * L); sg.addColorStop(0, col + "00"); sg.addColorStop(0.5, lighten(col, 0.6)); sg.addColorStop(1, col + "00"); ctx.strokeStyle = sg; ctx.beginPath(); ctx.moveTo(n.x - dx * L, n.y - dy * L); ctx.lineTo(n.x + dx * L, n.y + dy * L); ctx.stroke() }
  ctx.restore(); ctx.globalAlpha = dim }\n`
// obsidian: a dark glass fleck, the room's hue only as a sheen at its edge
const OBSIDIAN = RR + `{ const og = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, rr * 1.2); og.addColorStop(0, "#14121a"); og.addColorStop(0.55, "#1d1a24"); og.addColorStop(0.8, lighten(col, 0.2)); og.addColorStop(1, col + "00"); ctx.fillStyle = og }
  ctx.beginPath(); ctx.arc(n.x, n.y, rr * 1.2, 0, 7)`
const BLOOM = (js) => js.replace("ctx.fillStyle = g\n", 'ctx.fillStyle = g\n        if (!sky.day) ctx.globalCompositeOperation = "lighter"\n')
  .replace(/(ctx\.arc\(n\.x, n\.y, glowR, 0, 7\)\n\s*ctx\.fill\(\)\n)/, '$1        ctx.globalCompositeOperation = "source-over"\n')
const star = (code) => (js) => { if (!STAR_BLOCK.test(js)) throw new Error("star block not found"); return js.replace(STAR_BLOCK, code) }

const VARIANTS = {
  "0-current": {},
  "1-pigment": { p: PIGMENT },
  "2-starlight": { p: STARLIGHT, star: CORE },
  "3-pigment-core": { p: PIGMENT, star: CORE },
  "4-gilded": { p: GILDED, star: CORE },
  "5-ember": { p: GILDED, star: EMBER },
  "6-pearls": { pearls: true },
  "7-soft-core": { live: star(SOFT) },
  "8-soft-bloom": { live: (js) => BLOOM(star(SOFT)(js)) },
  "9-soft-spikes": { live: (js) => BLOOM(star(RR + SPIKES + SOFT.slice(RR.length))(js)) },
  "10-obsidian": { live: star(OBSIDIAN) },
}
const VIEWS = [
  ["phone-home", 390, 844, true, "dark", "/", { x: 0, y: 250, width: 390, height: 420 }],
  ["side-dark", 1600, 900, false, "dark", "/library/", { x: 1200, y: 40, width: 400, height: 320 }],
  ["side-light", 1600, 900, false, "light", "/library/", { x: 1200, y: 40, width: 400, height: 320 }],
  ["obs-dark", 1600, 900, false, "dark", "/", null],
  ["obs-light", 1600, 900, false, "light", "/", null],
]

const pal = (a) =>
  `const COLORS = { alignment: "${a[0]}", travel: "${a[1]}", work: "${a[2]}", friends: "${a[3]}", shared: "${a[4]}", library: "${a[5]}", meaning: "${a[6]}" }\n  const _OLD = {`
const pw = process.env.HOME + "/.cache/ms-playwright"
const shell = fs.readdirSync(pw).find((d) => d.startsWith("chromium_headless_shell"))
const b = await chromium.launch({
  executablePath: `${pw}/${shell}/chrome-headless-shell-linux64/chrome-headless-shell`,
  args: ["--no-sandbox"], // a browser under ~/.cache has no AppArmor profile
})
const only = process.argv.slice(2)
for (const [name, v] of Object.entries(VARIANTS)) {
  if (only.length && !only.includes(name)) continue
  let js = v.live ? v.live(LIVE) : v.pearls ? PEARLS : BASE
  if (v.p) js = js.replace("const COLORS = {", pal(v.p))
  if (v.star) js = js.replace(/ctx\.fillStyle = col\n/, v.star + "\n")
  for (const [tag, w, h, mobile, theme, url, clip] of VIEWS) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, colorScheme: theme })
    await ctx.addInitScript((t) => localStorage.setItem("theme", t), theme)
    await ctx.route(/vaultbrain\.js/, (r) => r.fulfill({ contentType: "application/javascript", body: js }))
    const p = await ctx.newPage()
    await p.goto("http://localhost:8050" + url, { waitUntil: "networkidle" })
    await p.waitForTimeout(2500)
    if (tag.startsWith("obs-")) {
      await p.evaluate(() => document.getElementById("vb-expand").click())
      await p.waitForTimeout(4000)
    }
    await p.screenshot({ path: `${OUT}/${tag}-${name}.png`, ...(clip ? { clip } : {}) })
    await ctx.close()
  }
}
await b.close()
