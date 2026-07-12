/* Loci vault brain — canvas constellation fed by the build's contentIndex.json.
   Nodes = published notes, edges = real wikilinks, colors = top-level folder.
   Re-inits on Quartz's SPA "nav" event; nothing here is arranged by hand. */
(function () {
  "use strict"

  // top-level folder -> branch color. Unmapped folders fall back to a stable
  // hash pick from the palette; never hardcode note names.
  const BRANCH_COLORS = {
    spiritual: "#9b7ede",
    experiences: "#d4a94e",
    thinking: "#6ab7e0",
    connection: "#ef7b6d",
    feelings: "#7fb069",
    mindset: "#4ecdc4",
  }
  const FOLDER_BRANCH = {
    books: "thinking",
    guides: "thinking",
    meaning: "spiritual",
    travel: "experiences",
    friends: "connection",
    music: "feelings",
    website: "mindset",
  }
  const PALETTE = Object.values(BRANCH_COLORS)

  function folderColor(folder) {
    const mapped = FOLDER_BRANCH[folder.toLowerCase()]
    if (mapped) return BRANCH_COLORS[mapped]
    let h = 0
    for (let i = 0; i < folder.length; i++) h = (h * 31 + folder.charCodeAt(i)) >>> 0
    return PALETTE[h % PALETTE.length]
  }

  let cleanup = null

  async function init() {
    const wrap = document.getElementById("vault-brain")
    if (!wrap || wrap.dataset.vbActive) return
    wrap.dataset.vbActive = "1"

    const cv = document.getElementById("vb-graph")
    const starsCv = document.getElementById("vb-stars")
    const tip = document.getElementById("vb-tip")
    const ctx = cv.getContext("2d")
    const sctx = starsCv.getContext("2d")
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches

    let data
    try {
      data = await fetch("/static/contentIndex.json").then((r) => r.json())
    } catch (e) {
      console.error("vaultbrain: could not load contentIndex.json", e)
      return
    }

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
    folders.forEach((f, i) => {
      const angle = (i / folders.length) * Math.PI * 2 - Math.PI / 2
      hubs[f] = { ax: Math.cos(angle), ay: Math.sin(angle) * 0.72 }
    })

    const nodes = slugs.map((slug) => {
      const folder = slug.includes("/") ? slug.split("/")[0] : "~"
      return {
        slug,
        label: data[slug].title || slug,
        folder,
        color: folder === "~" ? "#dfe3f2" : folderColor(folder),
        r: Math.min(3 + Math.sqrt(backlinks[slug] || 0) * 2, 11),
        hubWeight: backlinks[slug] || 0,
        x: 0, y: 0, vx: 0, vy: 0,
      }
    })
    const bySlug = {}
    nodes.forEach((n) => (bySlug[n.slug] = n))

    const links = []
    for (const slug of slugs) {
      for (const l of data[slug].links || []) {
        if (bySlug[l] && l !== slug) links.push([bySlug[slug], bySlug[l]])
      }
    }

    let W, H, dpr
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
    }

    function paintStars() {
      sctx.clearRect(0, 0, W, H)
      for (let i = 0; i < 160; i++) {
        sctx.globalAlpha = Math.random() * 0.5 + 0.1
        sctx.fillStyle = "#dfe3f2"
        sctx.beginPath()
        sctx.arc(Math.random() * W, Math.random() * H, Math.random() * 1.1 + 0.2, 0, 7)
        sctx.fill()
      }
      sctx.globalAlpha = 1
    }

    function homeOf(n) {
      const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.3
      const hub = hubs[n.folder] || { ax: 0, ay: 0 }
      return [cx + hub.ax * R, cy + hub.ay * R]
    }

    function initPositions() {
      nodes.forEach((n) => {
        const [hx, hy] = homeOf(n)
        n.x = hx + (Math.random() - 0.5) * 140
        n.y = hy + (Math.random() - 0.5) * 140
      })
    }

    function step() {
      nodes.forEach((n) => {
        const [hx, hy] = homeOf(n)
        n.vx += (hx - n.x) * 0.004
        n.vy += (hy - n.y) * 0.004
        // ponytail: O(n²) repulsion — fine below ~500 notes, quadtree if it chugs
        nodes.forEach((m) => {
          if (m === n) return
          const dx = n.x - m.x, dy = n.y - m.y, d2 = dx * dx + dy * dy
          if (d2 < 2200 && d2 > 0) {
            n.vx += (dx / d2) * 3
            n.vy += (dy / d2) * 3
          }
        })
        n.vx *= 0.92
        n.vy *= 0.92
        n.x += n.vx
        n.y += n.vy
      })
      // links pull their ends together a little
      links.forEach(([a, b]) => {
        const dx = b.x - a.x, dy = b.y - a.y
        a.vx += dx * 0.0006; a.vy += dy * 0.0006
        b.vx -= dx * 0.0006; b.vy -= dy * 0.0006
      })
    }

    let hovered = null
    function onMove(e) {
      const rect = cv.getBoundingClientRect()
      const x = e.clientX - rect.left, y = e.clientY - rect.top
      hovered = null
      for (const n of nodes) {
        if ((n.x - x) ** 2 + (n.y - y) ** 2 < (n.r + 8) ** 2) {
          hovered = n
          break
        }
      }
      if (hovered) {
        tip.textContent = hovered.label
        tip.style.left = hovered.x + "px"
        tip.style.top = hovered.y + "px"
        tip.style.opacity = 1
        cv.style.cursor = "pointer"
      } else {
        tip.style.opacity = 0
        cv.style.cursor = "default"
      }
    }
    function onClick() {
      if (hovered) window.location.href = "/" + hovered.slug
    }

    let t = 0
    let raf = 0
    function draw() {
      ctx.clearRect(0, 0, W, H)
      t += 0.008
      links.forEach(([a, b]) => {
        ctx.strokeStyle = "rgba(223,227,242,.14)"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      })
      nodes.forEach((n, i) => {
        const big = n.hubWeight >= 2
        const pulse = big ? 1 + Math.sin(t * 2 + i) * 0.08 : 1
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 4 * pulse)
        g.addColorStop(0, n.color)
        g.addColorStop(1, "transparent")
        ctx.globalAlpha = big ? 0.35 : 0.22
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r * 4 * pulse, 0, 7)
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.fillStyle = n.color
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r * pulse, 0, 7)
        ctx.fill()
        if (big) {
          ctx.font = "600 11px IBM Plex Sans, sans-serif"
          ctx.fillStyle = "rgba(223,227,242,.85)"
          ctx.textAlign = "center"
          ctx.fillText(n.label.toUpperCase(), n.x, n.y - n.r - 10)
        }
      })
      if (!reduceMotion) {
        step()
        raf = requestAnimationFrame(draw)
      }
    }

    cv.addEventListener("pointermove", onMove)
    cv.addEventListener("click", onClick)
    window.addEventListener("resize", size)

    size()
    initPositions()
    if (reduceMotion) for (let i = 0; i < 300; i++) step()
    draw()

    cleanup = () => {
      cancelAnimationFrame(raf)
      cv.removeEventListener("pointermove", onMove)
      cv.removeEventListener("click", onClick)
      window.removeEventListener("resize", size)
      delete wrap.dataset.vbActive
      cleanup = null
    }
    if (window.addCleanup) window.addCleanup(cleanup)
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

  if (!window.__vaultbrainWired) {
    window.__vaultbrainWired = true
    document.addEventListener("nav", () => {
      if (cleanup) cleanup()
      init()
      initShelf()
    })
  }
  init()
  initShelf()
})()
