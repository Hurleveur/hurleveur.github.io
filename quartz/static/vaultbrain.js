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
      // ellipse, not circle: the canvas is wide, use the width
      const hub = hubs[n.folder] || { ax: 0, ay: 0 }
      return [W / 2 + hub.ax * W * 0.3, H / 2 + hub.ay * H * 0.46]
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
        // section stars are anchors: stiff spring holds them on the lobe ring
        const k = n.hub ? 0.03 : 0.004
        n.vx += (hx - n.x) * k
        n.vy += (hy - n.y) * k
        // ponytail: O(n²) repulsion — fine below ~500 notes, quadtree if it chugs
        nodes.forEach((m) => {
          if (m === n) return
          const dx = n.x - m.x, dy = n.y - m.y, d2 = dx * dx + dy * dy
          if (d2 < 2200 && d2 > 0) {
            // big stars carve out more space than dust
            const f = m.hub ? 12 : 3
            n.vx += (dx / d2) * f
            n.vy += (dy / d2) * f
          }
        })
        n.vx *= 0.92
        n.vy *= 0.92
        n.x += n.vx
        n.y += n.vy
        // keep the cloud inside the canvas — in mini mode the box IS the
        // image's brain region, so overspill breaks the illusion. Soft spring,
        // not a hard clamp: a clamp piles nodes into a visible rim ring.
        // ellipse sits well inside the canvas: node glows reach ~4x node radius,
        // and anything past the canvas edge clips to a hard bright rectangle
        const ex = (n.x - W / 2) / (W * 0.38)
        const ey = (n.y - H / 2) / (H * 0.36)
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
        cv.style.cursor = mini ? "pointer" : "default"
      }
    }
    function onClick() {
      if (hovered) window.location.href = "/" + hovered.slug
      else if (mini) window.location.href = "/brain"
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
        const big = n.hub || n.hubWeight >= 2
        const pulse = big ? 1 + Math.sin(t * (n.hub ? 1.2 : 2) + i) * (n.hub ? 0.05 : 0.08) : 1
        const glowR = n.r * (n.hub ? 3 : 4) * pulse
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR)
        g.addColorStop(0, n.color)
        g.addColorStop(1, "transparent")
        ctx.globalAlpha = n.hub ? 0.4 : big ? 0.3 : 0.2
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(n.x, n.y, glowR, 0, 7)
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.fillStyle = n.color
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r * pulse, 0, 7)
        ctx.fill()
        // only section stars get names; note titles live in the hover tip
        if (n.hub && !mini) {
          ctx.textAlign = "center"
          ctx.font = "600 13px IBM Plex Sans, sans-serif"
          ctx.fillStyle = "rgba(223,227,242,.92)"
          ctx.fillText(n.name.toUpperCase(), n.x, n.y - n.r - 16)
          ctx.font = "400 10px IBM Plex Sans, sans-serif"
          ctx.fillStyle = "rgba(139,147,184,.9)"
          ctx.fillText(counts[n.folder] + (counts[n.folder] === 1 ? " note" : " notes"), n.x, n.y - n.r - 4)
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

  // brain legend: one entry per real top-level folder present in the published
  // set, colored the same way the graph colors its nodes — no fixed category list.
  async function initLegend() {
    const legend = document.getElementById("vb-legend")
    if (!legend || legend.dataset.vbDone) return
    legend.dataset.vbDone = "1"
    let data
    try {
      data = await fetch("/static/contentIndex.json").then((r) => r.json())
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
      data = await fetch("/static/contentIndex.json").then((r) => r.json())
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

  // observatory drawer: the brain page hides the nav for full-width sky;
  // this ☰ button slides the left sidebar in and out (CSS in custom.scss)
  function initNavToggle() {
    const isBrain = document.body.dataset.slug === "brain"
    let btn = document.getElementById("vb-nav-btn")
    if (!btn) {
      if (!isBrain) return
      btn = document.createElement("button")
      btn.id = "vb-nav-btn"
      btn.type = "button"
      btn.textContent = "☰"
      btn.setAttribute("aria-label", "Toggle navigation")
      btn.addEventListener("click", () => {
        const on = document.body.classList.toggle("show-nav")
        btn.classList.toggle("on", on)
      })
      document.body.appendChild(btn)
    }
    btn.style.display = isBrain ? "" : "none"
    if (!isBrain) document.body.classList.remove("show-nav")
  }

  if (!window.__vaultbrainWired) {
    window.__vaultbrainWired = true
    document.addEventListener("nav", () => {
      if (cleanup) cleanup()
      init()
      initLegend()
      initDoors()
      initShelf()
      initQuotes()
      initAudio()
      initNavToggle()
    })
  }
  init()
  initLegend()
  initDoors()
  initShelf()
  initQuotes()
  initAudio()
  initNavToggle()
})()
