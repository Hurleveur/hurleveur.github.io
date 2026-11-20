// One capture in the site's night theme, for capture.sh: the theme lives in
// localStorage (darkmode.inline.ts reads it before first paint), which a plain
// `chromium --screenshot` cannot set. Waits in real time, not virtual time: the
// rotunda's brain settles over seconds, and the fonts and index load after.
// usage: node capture-night.mjs <url> <out.png>
import { spawn } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const [url, out] = process.argv.slice(2)
const SETTLE_MS = 8000
const profile = mkdtempSync(join(tmpdir(), "capture-"))
const chrome = spawn("chromium", [
  "--headless=new",
  "--no-sandbox",
  "--hide-scrollbars",
  "--mute-audio",
  `--user-data-dir=${profile}`,
  "--window-size=1440,900",
  "--remote-debugging-port=0",
  "about:blank",
])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

try {
  // chromium prints its DevTools endpoint on stderr once it listens
  const browserWs = await new Promise((resolve, reject) => {
    let err = ""
    chrome.stderr.on("data", (d) => {
      err += d
      const m = err.match(/DevTools listening on (ws:\/\/\S+)/)
      if (m) resolve(m[1])
    })
    chrome.on("exit", () => reject(new Error(`chromium exited: ${err}`)))
  })
  const port = new URL(browserWs).port
  // the list also holds chromium's built-in extension pages, which never paint
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const page = targets.find((t) => t.type === "page")
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener("open", r, { once: true }))

  let id = 0
  const pending = new Map()
  const waiters = new Map()
  ws.addEventListener("message", ({ data }) => {
    const msg = JSON.parse(data)
    if (msg.id) pending.get(msg.id)?.(msg)
    else waiters.get(msg.method)?.(msg.params)
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id
      pending.set(n, (m) => (m.error ? reject(new Error(m.error.message)) : resolve(m.result)))
      ws.send(JSON.stringify({ id: n, method, params }))
    })
  const once = (method) => new Promise((r) => waiters.set(method, r))

  await send("Page.enable")
  // reduced motion keeps the rotunda's idle tour off, which otherwise shoots
  // one room lit and its description half typed out over the dome
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  })
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `localStorage.setItem("theme", "dark")`,
  })
  const loaded = once("Page.loadEventFired")
  await send("Page.navigate", { url })
  await loaded
  await send("Runtime.evaluate", { expression: "document.fonts.ready", awaitPromise: true })
  await sleep(SETTLE_MS)
  const { data } = await send("Page.captureScreenshot", { format: "png" })
  writeFileSync(out, Buffer.from(data, "base64"))
  ws.close()
} finally {
  chrome.kill()
  rmSync(profile, { recursive: true, force: true })
}
