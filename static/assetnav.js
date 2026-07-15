/* Loci asset nav — injected into published raw html files by the Assets
   emitter so they aren't dead ends. A fixed ☰ opens a drawer (closed by
   default) with the whole site tree from contentIndex + assetIndex.
   Raw pages carry arbitrary CSS, so everything is scoped under #an-* ids
   and styled from this file alone. */
(function () {
  "use strict"

  // same palette + hash as vaultbrain.js folderColor — keep in sync by hand
  const PALETTE = ["#9b7ede", "#d4a94e", "#6ab7e0", "#ef7b6d", "#7fb069", "#4ecdc4", "#e0a1c9", "#8fa6d4"]
  function folderColor(folder) {
    let h = 0
    for (let i = 0; i < folder.length; i++) h = (h * 31 + folder.charCodeAt(i)) >>> 0
    return PALETTE[h % PALETTE.length]
  }

  const css = `
:host{all:initial}
#an-btn{position:fixed;top:1rem;left:1rem;z-index:2147483646;width:2.4rem;height:2.4rem;
  border-radius:50%;border:1px solid rgba(201,164,92,.55);background:rgba(25,23,19,.85);
  color:#c9a45c;font:1rem/1 system-ui,sans-serif;cursor:pointer;padding:0}
#an-btn:hover{background:#c9a45c;color:#191713}
#an-drawer{position:fixed;top:0;left:0;bottom:0;width:270px;max-width:80vw;z-index:2147483645;
  background:rgba(25,23,19,.96);color:#e6e1d4;overflow-y:auto;box-sizing:border-box;
  padding:3.6rem 1.2rem 2rem;font:.85rem/1.5 system-ui,sans-serif;
  transform:translateX(-100%);transition:transform .25s ease;text-align:left}
#an-drawer.open{transform:none;box-shadow:0 0 40px rgba(0,0,0,.5)}
#an-drawer a{display:block;color:#beb7a4;text-decoration:none;padding:.14rem 0;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#an-drawer a:hover{color:#c9a45c}
#an-drawer .an-home{color:#c9a45c;font-size:.95rem;margin-bottom:.8rem}
#an-drawer h3{font:600 .68rem/1 system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;
  margin:1.1rem 0 .3rem;color:var(--fc,#c9a45c)}
`

  async function build() {
    // shadow root: the host page carries arbitrary CSS (animations, resets)
    // that would restyle the drawer — isolate both ways
    const host = document.createElement("div")
    host.id = "an-host"
    const root = host.attachShadow({ mode: "open" })
    const style = document.createElement("style")
    style.textContent = css
    root.appendChild(style)

    const drawer = document.createElement("nav")
    drawer.id = "an-drawer"
    drawer.setAttribute("aria-label", "Site navigation")
    const home = document.createElement("a")
    home.className = "an-home"
    home.href = "/"
    home.textContent = "⌂ Loci"
    drawer.appendChild(home)

    const btn = document.createElement("button")
    btn.id = "an-btn"
    btn.type = "button"
    btn.textContent = "☰"
    btn.setAttribute("aria-label", "Open site navigation")
    btn.addEventListener("click", () => drawer.classList.toggle("open"))
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") drawer.classList.remove("open")
    })

    root.append(btn, drawer)
    document.body.appendChild(host)

    // site tree: notes + published assets, grouped by top-level folder
    let data = {}
    try {
      data = await fetch("/static/contentIndex.json").then((r) => r.json())
    } catch (e) {}
    try {
      const assets = await fetch("/static/assetIndex.json").then((r) => r.json())
      for (const a of assets) if (!data[a.slug]) data[a.slug] = { title: a.title }
    } catch (e) {}

    const groups = {}
    for (const slug of Object.keys(data)) {
      if (slug.startsWith("tags/") || slug === "index") continue
      const folder = slug.includes("/") ? slug.split("/")[0] : "~"
      ;(groups[folder] = groups[folder] || []).push(slug)
    }
    for (const folder of Object.keys(groups).sort()) {
      const h = document.createElement("h3")
      h.textContent = folder === "~" ? "root" : folder.replace(/-/g, " ")
      if (folder !== "~") h.style.setProperty("--fc", folderColor(folder))
      drawer.appendChild(h)
      for (const slug of groups[folder].sort()) {
        if (slug.endsWith("/index")) continue
        const a = document.createElement("a")
        a.href = "/" + slug
        a.textContent = data[slug].title || slug
        drawer.appendChild(a)
      }
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build)
  else build()
})()
