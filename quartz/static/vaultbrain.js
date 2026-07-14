/* Loci vault brain — canvas constellation fed by the build's contentIndex.json.
   Nodes = published notes, edges = real wikilinks, colors = top-level folder.
   Re-inits on Quartz's SPA "nav" event; nothing here is arranged by hand. */
(function () {
  "use strict"

  // top-level folder -> color. Categories are whatever folders actually exist
  // in the vault; every folder gets a stable hash-picked color, none hardcoded.
  const PALETTE = ["#9b7ede", "#d4a94e", "#6ab7e0", "#ef7b6d", "#7fb069", "#4ecdc4", "#e0a1c9", "#8fa6d4"]

  function folderColor(folder) {
    let h = 0
    for (let i = 0; i < folder.length; i++) h = (h * 31 + folder.charCodeAt(i)) >>> 0
    return PALETTE[h % PALETTE.length]
  }

  // frieze ↔ brain highlight bus: hovering a frieze word lights that section's
  // stars, hovering a star lights its frieze word. detail = folder or null.
  function hlEmit(folder) {
    window.dispatchEvent(new CustomEvent("vb-folder-hl", { detail: folder }))
  }

  // canvas colors follow the theme: Quartz's darkmode script stamps saved-theme
  // on <html> and fires "themechange". Day = ink on pale sky, night = starlight.
  // The home rotunda mini brain sits on the dark dome image — always night there.
  function skyColors(mini) {
    const day = !mini && document.documentElement.getAttribute("saved-theme") === "light"
    return day
      ? {
          star: "#333c5c",
          link: "rgba(51,60,92,.18)",
          label: "rgba(32,39,65,.92)",
          sub: "rgba(95,107,142,.95)",
          root: "#5f6b8e",
        }
      : {
          star: "#dfe3f2",
          link: "rgba(223,227,242,.14)",
          label: "rgba(223,227,242,.92)",
          sub: "rgba(139,147,184,.9)",
          root: "#dfe3f2",
        }
  }

  // contentIndex knows notes; assetIndex (Assets emitter) knows published
  // html/pdf. Merge so the map, legend, doors and folder pages see both.
  async function loadIndex() {
    const data = await fetch("/static/contentIndex.json").then((r) => r.json())
    try {
      const assets = await fetch("/static/assetIndex.json").then((r) => r.json())
      for (const a of assets) {
        if (!data[a.slug]) data[a.slug] = { title: a.title, links: [], asset: true }
      }
    } catch (e) {
      /* no published assets */
    }
    return data
  }

  // per-world ambience: slug prefix -> track in /static/audio/<name>.mp3.
  // First matching prefix wins; "" is the fallback. Edit this list to choose
  // which room gets which tone — tracks are plain mp3 files, swap freely.
  const AMBIENCE = [
    ["books", "library"],
    ["brain", "space"],
    ["meaning", "meaning"],
    ["travel", "travel"],
    ["friends", "friends"],
    ["", "palace"],
  ]

  let cleanup = null

  async function init() {
    const wrap = document.getElementById("vault-brain")
    if (!wrap || wrap.dataset.vbActive) return
    wrap.dataset.vbActive = "1"
    // mini mode (home-page rotunda): no labels, whole canvas is a door to /brain
    const mini = !!wrap.dataset.mini

    const cv = document.getElementById("vb-graph")
    const starsCv = document.getElementById("vb-stars")
    const tip = document.getElementById("vb-tip")
    const ctx = cv.getContext("2d")
    const sctx = starsCv.getContext("2d")
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches

    let data
    try {
      data = await loadIndex()
    } catch (e) {
      console.error("vaultbrain: could not load contentIndex.json", e)
      return
    }
    let sky = skyColors(mini)

    // tag pages are generated indexes, not notes — they'd swamp the constellation as fake hubs
    const slugs = Object.keys(data).filter((s) => !s.startsWith("tags/") && s !== "tags/index")
    const backlinks = {}
    for (const slug of slugs) {
      for (const l of data[slug].links || []) {
        backlinks[l] = (backlinks[l] || 0) + 1
      }
    }

    // group notes by top-level folder; folder hubs sit on a brain-lobe ellipse
    const folders = [...new Set(slugs.map((s) => (s.includes("/") ? s.split("/")[0] : "~")))]
    const hubs = {}
    // sections ring the sky; loose root notes gather in the middle
    const ring = folders.filter((f) => f !== "~")
    ring.forEach((f, i) => {
      const angle = (i / ring.length) * Math.PI * 2 - Math.PI / 2
      hubs[f] = { ax: Math.cos(angle), ay: Math.sin(angle) * 0.72 }
    })
    hubs["~"] = { ax: 0, ay: 0 }

    const nodes = slugs.map((slug) => {
      const folder = slug.includes("/") ? slug.split("/")[0] : "~"
      return {
        slug,
        label: data[slug].title || slug,
        folder,
        color: folder === "~" ? sky.root : folderColor(folder),
        r: mini
          ? Math.min(1.5 + Math.sqrt(backlinks[slug] || 0) * 0.8, 4)
          : Math.min(2 + Math.sqrt(backlinks[slug] || 0) * 1.1, 5.5),
        hubWeight: backlinks[slug] || 0,
        x: 0, y: 0, vx: 0, vy: 0,
      }
    })
    const bySlug = {}
    nodes.forEach((n) => (bySlug[n.slug] = n))

    // section stars: one big labeled node per folder, sized by note count;
    // notes are the small dust clustered around it. Click opens the folder page.
    const counts = {}
    slugs.forEach((s) => {
      const f = s.includes("/") ? s.split("/")[0] : "~"
      counts[f] = (counts[f] || 0) + 1
    })
    folders.forEach((f) => {
      if (f === "~") return
      nodes.push({
        slug: f + "/",
        hub: true,
        name: f.replace(/-/g, " "),
        label: f.replace(/-/g, " ") + " · " + counts[f] + " notes",
        folder: f,
        color: folderColor(f),
        r: (mini ? 4 : 9) + Math.sqrt(counts[f]) * (mini ? 0.5 : 1.2),
        hubWeight: 0,
        x: 0, y: 0, vx: 0, vy: 0,
      })
    })

    const links = []
    for (const slug of slugs) {
      for (const l of data[slug].links || []) {
        if (bySlug[l] && l !== slug) links.push([bySlug[slug], bySlug[l]])
      }
    }

    let W, H, dpr
    // zoom/pan viewport (full mode only): screen = world * s + offset
    const view = { s: 1, x: 0, y: 0 }
    function clampView() {
      view.s = Math.min(8, Math.max(1, view.s))
      view.x = Math.min(0, Math.max(W - W * view.s, view.x))
      view.y = Math.min(0, Math.max(H - H * view.s, view.y))
    }
    function toWorld(px, py) {
      return [(px - view.x) / view.s, (py - view.y) / view.s]
    }
    function size() {
      dpr = window.devicePixelRatio || 1
      W = wrap.clientWidth
      H = wrap.clientHeight
      ;[cv, starsCv].forEach((c) => {
        c.width = W * dpr
        c.height = H * dpr
        c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0)
      })
      paintStars()
      clampView()
      heat = Math.max(heat, 0.6) // rewarm the sim so the sky re-settles to the new size
    }

    function paintStars() {
      sctx.clearRect(0, 0, W, H)
      for (let i = 0; i < 160; i++) {
        sctx.globalAlpha = Math.random() * 0.5 + 0.1
        sctx.fillStyle = sky.star
        sctx.beginPath()
        sctx.arc(Math.random() * W, Math.random() * H, Math.random() * 1.1 + 0.2, 0, 7)
        sctx.fill()
      }
      sctx.globalAlpha = 1
    }

    function homeOf(n) {
      // ellipse, not circle: the canvas is wide, use the width.
      // mini: the canvas IS the image's brain — spread wider to fill it
      const hub = hubs[n.folder] || { ax: 0, ay: 0 }
      return [W / 2 + hub.ax * W * (mini ? 0.32 : 0.24), H / 2 + hub.ay * H * 0.4]
    }

    function initPositions() {
      nodes.forEach((n) => {
        const [hx, hy] = homeOf(n)
        if (n.hub) {
          n.x = hx
          n.y = hy
          return
        }
        const spread = Math.min(140, W * 0.3)
        n.x = hx + (Math.random() - 0.5) * spread
        n.y = hy + (Math.random() - 0.5) * spread
      })
    }

    function step() {
      nodes.forEach((n) => {
        const [hx, hy] = homeOf(n)
        // section stars are anchors: stiff spring holds them on the lobe ring;
        // notes pull in tight so each section reads as one dense cluster
        const k = n.hub ? 0.03 : 0.01
        n.vx += (hx - n.x) * k
        n.vy += (hy - n.y) * k
        // ponytail: O(n²) repulsion — fine below ~500 notes, quadtree if it chugs
        nodes.forEach((m) => {
          if (m === n) return
          const dx = n.x - m.x, dy = n.y - m.y, d2 = dx * dx + dy * dy
          if (d2 < 1600 && d2 > 0) {
            // big stars carve out more space than dust
            const f = m.hub ? 12 : 2
            n.vx += (dx / d2) * f
            n.vy += (dy / d2) * f
          }
        })
        n.vx *= 0.92
        n.vy *= 0.92
        // heat scales motion, not forces: the sky cools into an ever-slower drift
        n.x += n.vx * heat
        n.y += n.vy * heat
        // keep the cloud inside the canvas — in mini mode the box IS the
        // image's brain region, so overspill breaks the illusion. Soft spring,
        // not a hard clamp: a clamp piles nodes into a visible rim ring.
        // ellipse sits well inside the canvas: node glows reach ~4x node radius,
        // and anything past the canvas edge clips to a hard bright rectangle
        const ex = (n.x - W / 2) / (W * (mini ? 0.44 : 0.38))
        const ey = (n.y - H / 2) / (H * (mini ? 0.42 : 0.36))
        const d = ex * ex + ey * ey
        if (d > 1) {
          n.vx += (W / 2 - n.x) * 0.06 * (d - 1)
          n.vy += (H / 2 - n.y) * 0.06 * (d - 1)
        }
      })
      // links pull their ends together a little
      links.forEach(([a, b]) => {
        const dx = b.x - a.x, dy = b.y - a.y
        a.vx += dx * 0.0006; a.vy += dy * 0.0006
        b.vx -= dx * 0.0006; b.vy -= dy * 0.0006
      })
    }

    let hovered = null
    // section under highlight (from a hovered star here or a frieze word)
    let hlFolder = null
    const onHl = (e) => {
      hlFolder = e.detail
      if (reduceMotion) draw()
    }
    window.addEventListener("vb-folder-hl", onHl)
    function onMove(e) {
      const rect = cv.getBoundingClientRect()
      const [x, y] = toWorld(e.clientX - rect.left, e.clientY - rect.top)
      hovered = null
      for (const n of nodes) {
        if ((n.x - x) ** 2 + (n.y - y) ** 2 < (n.r + 8 / view.s) ** 2) {
          hovered = n
          break
        }
      }
      const hf = hovered && hovered.folder !== "~" ? hovered.folder : null
      if (hf !== hlFolder) hlEmit(hf)
      if (hovered) {
        tip.textContent = hovered.label
        tip.style.left = hovered.x * view.s + view.x + "px"
        tip.style.top = hovered.y * view.s + view.y + "px"
        tip.style.opacity = 1
        cv.style.cursor = "pointer"
      } else {
        tip.style.opacity = 0
        cv.style.cursor = mini ? "pointer" : "default"
      }
    }
    function onClick() {
      if (dragged) return // pan release, not a pick
      if (hovered) window.location.href = "/" + hovered.slug
      else if (mini) window.location.href = "/brain"
    }

    // wheel zooms toward the cursor; drag pans when zoomed in. Full mode only —
    // the home rotunda must keep normal page scroll.
    function onWheel(e) {
      e.preventDefault()
      const rect = cv.getBoundingClientRect()
      const px = e.clientX - rect.left, py = e.clientY - rect.top
      const [wx, wy] = toWorld(px, py)
      view.s *= Math.exp(-e.deltaY * 0.0012)
      view.s = Math.min(8, Math.max(1, view.s))
      view.x = px - wx * view.s
      view.y = py - wy * view.s
      clampView()
      onMove(e) // re-aim the hover under the new view
    }
    let dragged = false
    let dragFrom = null
    function onDown(e) {
      dragFrom = { px: e.clientX, py: e.clientY, vx: view.x, vy: view.y }
      dragged = false
    }
    function onDrag(e) {
      if (!dragFrom) return
      const dx = e.clientX - dragFrom.px, dy = e.clientY - dragFrom.py
      if (dx * dx + dy * dy > 16) dragged = true
      if (dragged) {
        view.x = dragFrom.vx + dx
        view.y = dragFrom.vy + dy
        clampView()
        tip.style.opacity = 0
      }
    }
    function onUp() {
      dragFrom = null
    }

    let t = 0
    let raf = 0
    // stars drift into place then cool to a faint perpetual drift — never a hard freeze
    let heat = 1
    function draw() {
      ctx.clearRect(0, 0, W, H)
      t += 0.008
      ctx.save()
      ctx.translate(view.x, view.y)
      ctx.scale(view.s, view.s)
      links.forEach(([a, b]) => {
        ctx.globalAlpha = !hlFolder || (a.folder === hlFolder && b.folder === hlFolder) ? 1 : 0.15
        ctx.strokeStyle = sky.link
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      })
      ctx.globalAlpha = 1
      nodes.forEach((n, i) => {
        // highlighted section burns brighter, the rest of the sky recedes
        const lit = hlFolder && n.folder === hlFolder
        const dim = !hlFolder || lit ? 1 : 0.15
        const big = n.hub || n.hubWeight >= 2
        const pulse = big ? 1 + Math.sin(t * (n.hub ? 1.2 : 2) + i) * (n.hub ? 0.05 : 0.08) : 1
        const glowR = n.r * (n.hub ? 3 : 4) * pulse * (lit ? 1.5 : 1)
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR)
        g.addColorStop(0, n.color)
        g.addColorStop(1, "transparent")
        ctx.globalAlpha = Math.min(1, (n.hub ? 0.4 : big ? 0.3 : 0.2) * dim * (lit ? 1.8 : 1))
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(n.x, n.y, glowR, 0, 7)
        ctx.fill()
        ctx.globalAlpha = dim
        ctx.fillStyle = n.color
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r * pulse * (lit && n.hub ? 1.15 : 1), 0, 7)
        ctx.fill()
        ctx.globalAlpha = 1
        // only section stars get names; note titles live in the hover tip
        if (n.hub && !mini) {
          ctx.textAlign = "center"
          ctx.font = "600 13px IBM Plex Sans, sans-serif"
          ctx.fillStyle = sky.label
          ctx.fillText(n.name.toUpperCase(), n.x, n.y - n.r - 16)
          ctx.font = "400 10px IBM Plex Sans, sans-serif"
          ctx.fillStyle = sky.sub
          ctx.fillText(counts[n.folder] + (counts[n.folder] === 1 ? " note" : " notes"), n.x, n.y - n.r - 4)
        }
      })
      ctx.restore()
      if (!reduceMotion) {
        step()
        heat = Math.max(heat * 0.997, 0.04)
        raf = requestAnimationFrame(draw)
      }
    }

    // theme toggle flips the sky between day ink and night starlight
    function onTheme() {
      sky = skyColors(mini)
      paintStars()
      nodes.forEach((n) => {
        if (n.folder === "~" && !n.hub) n.color = sky.root
      })
      if (reduceMotion) draw()
    }
    document.addEventListener("themechange", onTheme)

    function onLeave() {
      hovered = null
      tip.style.opacity = 0
      if (hlFolder) hlEmit(null)
    }
    cv.addEventListener("pointermove", onMove)
    cv.addEventListener("pointerleave", onLeave)
    cv.addEventListener("click", onClick)
    if (!mini) {
      cv.addEventListener("wheel", onWheel, { passive: false })
      cv.addEventListener("pointerdown", onDown)
      cv.addEventListener("pointermove", onDrag)
      window.addEventListener("pointerup", onUp)
    }
    // observe the wrapper, not the window: the explorer toggle resizes the
    // grid column without firing a window resize, and the sim must follow
    const ro = new ResizeObserver(size)
    ro.observe(wrap)

    size()
    initPositions()
    if (reduceMotion) for (let i = 0; i < 300; i++) step()
    draw()

    cleanup = () => {
      cancelAnimationFrame(raf)
      document.removeEventListener("themechange", onTheme)
      window.removeEventListener("vb-folder-hl", onHl)
      cv.removeEventListener("pointermove", onMove)
      cv.removeEventListener("pointerleave", onLeave)
      cv.removeEventListener("click", onClick)
      if (!mini) {
        cv.removeEventListener("wheel", onWheel)
        cv.removeEventListener("pointerdown", onDown)
        cv.removeEventListener("pointermove", onDrag)
        window.removeEventListener("pointerup", onUp)
      }
      ro.disconnect()
      delete wrap.dataset.vbActive
      cleanup = null
    }
    if (window.addCleanup) window.addCleanup(cleanup)
  }

  // brain legend: one entry per real top-level folder present in the published
  // set, colored the same way the graph colors its nodes — no fixed category list.
  async function initLegend() {
    const legend = document.getElementById("vb-legend")
    if (!legend || legend.dataset.vbDone) return
    legend.dataset.vbDone = "1"
    let data
    try {
      data = await loadIndex()
    } catch (e) {
      return
    }
    const slugs = Object.keys(data).filter((s) => !s.startsWith("tags/") && s !== "tags/index")
    const counts = {}
    for (const slug of slugs) {
      const folder = slug.includes("/") ? slug.split("/")[0] : "~"
      counts[folder] = (counts[folder] || 0) + 1
    }
    Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .forEach((folder) => {
        const span = document.createElement("span")
        span.style.setProperty("--dot", folderColor(folder))
        span.textContent = folder === "~" ? "root" : folder
        legend.appendChild(span)
      })
  }

  // home-page doors: one arched portal per real top-level folder, colored like
  // the constellation, counts live from the index — never a hand-kept list
  async function initDoors() {
    const row = document.getElementById("vb-doors")
    if (!row || row.dataset.vbDone) return
    row.dataset.vbDone = "1"
    let data
    try {
      data = await loadIndex()
    } catch (e) {
      return
    }
    const counts = {}
    for (const slug of Object.keys(data)) {
      if (slug.startsWith("tags/") || !slug.includes("/")) continue
      const folder = slug.split("/")[0]
      counts[folder] = (counts[folder] || 0) + 1
    }
    Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .forEach((folder) => {
        const a = document.createElement("a")
        a.className = "door"
        a.href = "/" + folder + "/"
        a.style.setProperty("--tint", folderColor(folder))
        const name = document.createElement("span")
        name.className = "name"
        name.textContent = folder.replace(/-/g, " ")
        const count = document.createElement("span")
        count.className = "count"
        count.textContent = counts[folder] + (counts[folder] === 1 ? " note" : " notes")
        a.append(name, count)
        row.appendChild(a)
      })

    // frieze: room names carved along the rotunda entablature, where the
    // baked pseudo-latin used to run (inpainted out of rotunda.png). SVG
    // textPath on the entablature arc, fitted to the image's carve line;
    // the brain image occludes the middle, so the rooms split left/right.
    const frieze = document.getElementById("vb-frieze")
    if (frieze && !frieze.dataset.vbDone) {
      frieze.dataset.vbDone = "1"
      const NS = "http://www.w3.org/2000/svg"
      const svg = document.createElementNS(NS, "svg")
      svg.setAttribute("viewBox", "0 0 1252 428")
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet")
      // words sit on the entablature band ellipse (fitted to the carve line,
      // image coords) and rotate with its tangent — exaggerated toward the
      // edges where the band turns hard, true-to-tangent beside the brain
      const CX = 630, CY = -372, RX = 800, RY = 688
      const bandS = (x) => Math.sqrt(1 - ((x - CX) / RX) ** 2)
      const bandY = (x) => CY + RY * bandS(x)
      const bandDeg = (x) => {
        const u = Math.abs(x - CX) / 570 // 0 at the brain, 1 at the image edge
        return (
          (Math.atan((-RY * (x - CX)) / (RX * RX * bandS(x))) * 180 / Math.PI) *
          (0.85 + 0.5 * u * u)
        )
      }
      const folders = Object.keys(counts).sort((a, b) => counts[b] - counts[a])
      const half = Math.ceil(folders.length / 2)
      // per-side x ranges, stopping short of the brain canvas box (x 426-851)
      // where it would swallow the clicks
      ;[[folders.slice(0, half), 60, 420], [folders.slice(half), 856, 1165]].forEach(
        ([list, x0, x1]) => {
          list.forEach((folder, i) => {
            // the last word of each side sat a touch low on the stone;
            // lift it one word-height, and nudge the left one off the brain
            const last = i === list.length - 1
            const x = x0 + ((i + 0.5) / list.length) * (x1 - x0) + (last && x0 < CX ? 15 : 0)
            const y = bandY(x) - (last ? 13 : 0)
            const text = document.createElementNS(NS, "text")
            text.setAttribute("text-anchor", "middle")
            text.setAttribute(
              "transform",
              `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${bandDeg(x).toFixed(1)})`,
            )
            const a = document.createElementNS(NS, "a")
            a.setAttribute("href", "/" + folder + "/")
            a.setAttribute("class", "frieze-word")
            a.dataset.folder = folder
            a.style.setProperty("--tint", folderColor(folder))
            a.textContent = folder.replace(/-/g, " ")
            a.addEventListener("pointerenter", () => hlEmit(folder))
            a.addEventListener("pointerleave", () => hlEmit(null))
            text.appendChild(a)
            svg.appendChild(text)
          })
        },
      )
      frieze.appendChild(svg)
      // the brain echoes back: hovering a section star lights its word
      const onHl = (e) => {
        svg
          .querySelectorAll(".frieze-word")
          .forEach((w) => w.classList.toggle("hl", w.dataset.folder === e.detail))
      }
      window.addEventListener("vb-folder-hl", onHl)
      if (window.addCleanup) window.addCleanup(() => window.removeEventListener("vb-folder-hl", onHl))
    }
  }

  // library shelf: one spine per published book note, built from the same index
  const CLOTHS = ["#3f5240", "#5a3f24", "#4a3550", "#2f4858", "#6e3b2c", "#41474e", "#7a5c2e", "#35524a"]
  async function initShelf() {
    const shelf = document.getElementById("vb-shelf")
    if (!shelf || shelf.dataset.vbDone) return
    shelf.dataset.vbDone = "1"
    let data
    try {
      data = await fetch("/static/contentIndex.json").then((r) => r.json())
    } catch (e) {
      return
    }
    const books = Object.keys(data)
      .filter((s) => s.startsWith("books/") && s !== "books/index")
      .sort()
    let h = 0
    for (const slug of books) {
      const a = document.createElement("a")
      a.className = "spine"
      a.href = "/" + slug
      const t = data[slug].title || slug
      a.textContent = t.length > 42 ? t.slice(0, 40) + "…" : t
      a.title = t
      h = (h * 31 + slug.length + slug.charCodeAt(0)) % CLOTHS.length
      a.style.setProperty("--cloth", CLOTHS[h])
      shelf.appendChild(a)
    }
  }

  // palace quote slab: rotate through the hall of quotes
  const QUOTES = [
    ["How others treat you is not a reflection of who you are. How you treat others is.", "from the hall of quotes"],
    ["Be a seeker of silence first, for therein lies the truth.", "from the hall of quotes"],
    ["Dum spiro spero — while I breathe, I hope.", "from the latin inscriptions"],
    ["Nobody is paying as much attention to you as you are.", "from the hall of quotes"],
    ["The internet is the largest database. Please don’t pollute it.", "from guardians of knowledge"],
    ["Solvitur ambulando — it is solved by walking.", "from the latin inscriptions"],
    ["There isn’t so much to think about really. Just be, feel and do.", "from the hall of quotes"],
  ]
  function initQuotes() {
    const q = document.getElementById("rotating-quote")
    const src = document.getElementById("quote-source")
    if (!q || q.dataset.vbDone) return
    q.dataset.vbDone = "1"
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let i = 0
    const timer = setInterval(() => {
      if (!q.isConnected) return clearInterval(timer)
      q.style.opacity = 0
      setTimeout(() => {
        i = (i + 1) % QUOTES.length
        q.textContent = QUOTES[i][0]
        src.textContent = QUOTES[i][1]
        q.style.opacity = 1
      }, 600)
    }, 7000)
  }

  // room ambience: every page has a matching tone (AMBIENCE map above); one
  // toggle, no autoplay ever — user gesture starts it. Button + audio live on
  // <body> (outside Quartz's swapped content) so playback survives SPA nav;
  // crossing into another room swaps the track and each room resumes where it left off.
  function setAudioLabel(btn) {
    btn.textContent = btn._audio.paused ? "♪ play the room" : "♪ hush"
    btn.classList.toggle("on", !btn._audio.paused)
  }

  function initAudio() {
    const slug = document.body.dataset.slug || ""
    const track = AMBIENCE.find(([p]) => slug.startsWith(p))[1]
    let btn = document.getElementById("vb-audio-btn")
    if (!btn) {
      btn = document.createElement("button")
      btn.id = "vb-audio-btn"
      btn.type = "button"
      const audio = new Audio()
      audio.loop = true
      btn._audio = audio
      audio.addEventListener("play", () => setAudioLabel(btn))
      audio.addEventListener("pause", () => setAudioLabel(btn))
      btn.addEventListener("click", () => {
        if (audio.paused) {
          sessionStorage.setItem("vb-audio-on", "1")
          audio.play().catch(() => sessionStorage.removeItem("vb-audio-on"))
        } else {
          sessionStorage.removeItem("vb-audio-on")
          sessionStorage.setItem("vb-audio-t:" + btn._track, audio.currentTime)
          audio.pause()
        }
      })
      document.body.appendChild(btn)
    }
    const audio = btn._audio
    if (btn._track !== track) {
      if (!audio.paused) sessionStorage.setItem("vb-audio-t:" + btn._track, audio.currentTime)
      btn._track = track
      audio.src = "/static/audio/" + track + ".mp3"
      audio.currentTime = +sessionStorage.getItem("vb-audio-t:" + track) || 0
      // resume mid-session (SPA nav); browsers allow play() after a prior
      // gesture, and the catch covers fresh page loads where they don't
      if (sessionStorage.getItem("vb-audio-on")) audio.play().catch(() => {})
    }
    setAudioLabel(btn)
  }

  // folder pages are built from markdown only; append the published html/pdf
  // assets so e.g. /guides doesn't say "0 items" while the explorer lists its pdf
  async function initFolderAssets() {
    const listing = document.querySelector(".page-listing")
    const slug = document.body.dataset.slug || ""
    if (!listing || !slug.endsWith("/index") || listing.dataset.vbAssets) return
    listing.dataset.vbAssets = "1"
    let assets
    try {
      assets = await fetch("/static/assetIndex.json").then((r) => r.json())
    } catch (e) {
      return
    }
    const folder = slug.slice(0, -"index".length)
    const mine = assets.filter(
      (a) => a.slug.startsWith(folder) && !a.slug.slice(folder.length).includes("/"),
    )
    const ul = listing.querySelector("ul.section-ul")
    if (!mine.length || !ul) return
    for (const a of mine) {
      const li = document.createElement("li")
      li.className = "section-li"
      li.innerHTML = '<div class="section"><p class="meta"></p><div class="desc"><h3></h3></div></div>'
      const link = document.createElement("a")
      link.className = "internal"
      link.href = "/" + a.slug
      link.textContent = a.title
      // raw html/pdf aren't quartz pages — full page load, not SPA swap
      link.dataset.routerIgnore = ""
      li.querySelector("h3").appendChild(link)
      ul.appendChild(li)
    }
    // "N items under this folder" — bump the count to include the assets
    const p = listing.querySelector("p")
    if (p) p.textContent = p.textContent.replace(/\d+/, (n) => +n + mine.length)
  }

  // explorer width: drag grip on the sidebar's right edge sets --sidebar-w
  // (base.scss), persisted across pages and visits
  function initSidebarResize() {
    const saved = +localStorage.getItem("vb-sidebar-w")
    if (saved) document.documentElement.style.setProperty("--sidebar-w", saved + "px")
    const sb = document.querySelector(".sidebar.left")
    if (!sb || document.getElementById("vb-resize")) return
    const grip = document.createElement("div")
    grip.id = "vb-resize"
    grip.setAttribute("aria-hidden", "true")
    sb.appendChild(grip)
    // listeners go on window, not the grip: the grip shifts under the cursor
    // mid-drag and pointer capture is unreliable across browsers/inputs
    grip.addEventListener("pointerdown", (e) => {
      e.preventDefault()
      const left = sb.getBoundingClientRect().left
      const move = (ev) => {
        const w = Math.round(Math.min(Math.max(ev.clientX - left, 180), innerWidth * 0.4))
        document.documentElement.style.setProperty("--sidebar-w", w + "px")
        localStorage.setItem("vb-sidebar-w", w)
      }
      const up = () => {
        window.removeEventListener("pointermove", move)
        window.removeEventListener("pointerup", up)
        document.body.style.userSelect = ""
      }
      document.body.style.userSelect = "none"
      window.addEventListener("pointermove", move)
      window.addEventListener("pointerup", up)
    })
  }

  // explorer toggle: ☰ on every page collapses the left sidebar column and
  // the layout reflows into its space (CSS body.nav-off in custom.scss).
  // Choice persists across pages and visits.
  function initNavToggle() {
    // home is a hall, not a document: explorer always starts closed there.
    // Leaving home to a note re-runs this (nav event) and the stored
    // preference (default: open) takes over.
    const off =
      document.body.dataset.slug === "index" || localStorage.getItem("vb-nav-off") === "1"
    document.body.classList.toggle("nav-off", off)
    let btn = document.getElementById("vb-nav-btn")
    if (!btn) {
      btn = document.createElement("button")
      btn.id = "vb-nav-btn"
      btn.type = "button"
      btn.textContent = "☰"
      btn.setAttribute("aria-label", "Toggle explorer")
      btn.addEventListener("click", () => {
        const nowOff = document.body.classList.toggle("nav-off")
        localStorage.setItem("vb-nav-off", nowOff ? "1" : "")
        btn.classList.toggle("on", !nowOff)
      })
      document.body.appendChild(btn)
    }
    btn.classList.toggle("on", !off)
  }

  if (!window.__vaultbrainWired) {
    window.__vaultbrainWired = true
    document.addEventListener("nav", () => {
      if (cleanup) cleanup()
      initNavToggle()
      initSidebarResize()
      init()
      initLegend()
      initDoors()
      initShelf()
      initQuotes()
      initAudio()
      initFolderAssets()
    })
  }
  initNavToggle()
  initSidebarResize()
  init()
  initLegend()
  initDoors()
  initShelf()
  initQuotes()
  initAudio()
  initFolderAssets()
})()
