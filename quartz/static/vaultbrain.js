/* Loci vault brain — canvas constellation fed by the build's contentIndex.json.
   Nodes = published notes, edges = real wikilinks, colors = top-level folder.
   Re-inits on Quartz's SPA "nav" event; nothing here is arranged by hand. */
(function () {
  "use strict"

  // top-level folder -> color. Known sections get a hand-picked, fitting hue
  // (keyed by lowercase folder slug) so no two neighbours collide; any folder
  // not listed falls back to a stable hash pick from the palette.
  const PALETTE = ["#9b7ede", "#d4a94e", "#6ab7e0", "#ef7b6d", "#7fb069", "#4ecdc4", "#e0a1c9", "#8fa6d4"]
  // chakra scheme, root -> crown: red · orange · yellow · green · blue · indigo · violet
  const COLORS = {
    alignement: "#e05a5a", // root — grounding / foundation
    travel: "#ef8b4e",     // sacral — experience / exploration
    work: "#e8c14e",       // solar plexus — will / action
    friends: "#7fb069",    // heart — connection
    shared: "#6ab7e0",     // throat — media / communication (tv + clippings)
    library: "#6a5acd",    // third eye — knowledge / insight
    meaning: "#9b7ede",    // crown — purpose / spirit
  }

  function folderColor(folder) {
    const key = folder.toLowerCase()
    if (COLORS[key]) return COLORS[key]
    let h = 0
    for (let i = 0; i < folder.length; i++) h = (h * 31 + folder.charCodeAt(i)) >>> 0
    return PALETTE[h % PALETTE.length]
  }

  // lerp a hex toward white by t (0..1) — lighten while keeping the hue.
  function lighten(hex, t) {
    const n = parseInt(hex.slice(1), 16)
    const r = n >> 16, g = (n >> 8) & 255, b = n & 255
    const f = (v) => Math.round(v + (255 - v) * t)
    return "#" + [f(r), f(g), f(b)].map((x) => x.toString(16).padStart(2, "0")).join("")
  }

  // note color = its section's chakra hue, tinted lighter by sub-folder so
  // sub-groups read by shade. Section stars/legend keep the base hue (sub=null).
  // Tint step comes from the sub-folder's sorted position within its section
  // (not a free hash) so two sub-folders never collide on the same shade. The
  // tints pop on the dark constellation and hold their hue on the pale day sky.
  // ponytail: 7 distinct steps, wraps past 7 sub-folders in one section.
  const TINTS = [0.24, 0.12, 0.33, 0.06, 0.42, 0.18, 0.3]

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

  // per-world ambience: slug prefix -> SoundCloud track URL, played through
  // an offscreen widget iframe. First matching prefix wins; "" is the
  // fallback.
  const AMBIENCE = [
    ["friends", "https://soundcloud.com/nicolas-peyrac/il-suffirait"],
    ["movie-serie", "https://soundcloud.com/eurythmics-official/sweet-dreams-are-made-of-3"],
    ["work", "https://soundcloud.com/thomash_voodoohop/rachel-tobac-security-hackers-and-password"],
    ["website", "https://soundcloud.com/madonna/la-isla-bonita"],
    ["clippings", "https://soundcloud.com/michelberger/le-paradis-blanc"],
    ["travel", "https://soundcloud.com/eaglesofficial/eagles-hotel-california"],
    ["guides", "https://soundcloud.com/wednesdayaddams-music/paint-it-black"],
    ["meaning", "https://soundcloud.com/pepsofficial/liberta-1"],
    ["alignement", "https://soundcloud.com/imaginedragons/natural"],
    ["", "https://soundcloud.com/paolo-nutini/iron-sky"],
  ]

  let cleanup = null

  async function init() {
    const wrap = document.getElementById("vault-brain")
    if (!wrap || wrap.dataset.vbActive) return
    wrap.dataset.vbActive = "1"
    // mini mode (home-page rotunda): no labels, whole canvas is a door to /brain
    const mini = !!wrap.dataset.mini
    // the observatory spreads the constellation wider than the tight rotunda
    // brain so notes and labels stay legible at the zoomed-out overview
    const spread = mini ? 1 : 1.8
    const repelRange = mini ? 1600 : 3000
    // phones: the observatory is a ~400px-wide sky — shrink stars (and their
    // glows, which follow r) so the labels and caption aren't drowned in glow
    const rs = mini ? 1 : Math.max(0.55, Math.min(1, wrap.clientWidth / 1100))

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
    // sub-folder -> stable tint slot within its section (sorted so slots don't
    // shuffle between builds); feeds the per-note shade in the nodes map below.
    const subSets = {}
    slugs.forEach((s) => {
      const p = s.split("/")
      if (p.length > 2) (subSets[p[0]] || (subSets[p[0]] = new Set())).add(p[1])
    })
    const subTint = {}
    // each sub-folder also gets a home offset — a unit vector fanned around the
    // section hub by its sorted slot — so its notes clump in their own corner of
    // the lobe instead of smearing across the whole section (see homeOf).
    const subOff = {}
    for (const f in subSets) {
      const subs = [...subSets[f]].sort()
      subs.forEach((s, i) => {
        subTint[f + "/" + s] = TINTS[i % TINTS.length]
        const a = (i / subs.length) * Math.PI * 2
        subOff[f + "/" + s] = [Math.cos(a), Math.sin(a)]
      })
    }
    const hubs = {}
    // sections ring the sky; loose root notes gather in the middle
    const ring = folders.filter((f) => f !== "~")
    ring.forEach((f, i) => {
      const angle = (i / ring.length) * Math.PI * 2 - Math.PI / 2
      hubs[f] = { ax: Math.cos(angle), ay: Math.sin(angle) * 0.72 }
    })
    hubs["~"] = { ax: 0, ay: 0 }

    const nodes = slugs.map((slug) => {
      const parts = slug.split("/")
      const folder = parts.length > 1 ? parts[0] : "~"
      // sub-folder = first segment under the section (folder/sub/.../note);
      // notes sitting directly in the section (folder/note) have none.
      const sub = parts.length > 2 ? parts[1] : null
      const base = folder === "~" ? sky.root : folderColor(folder)
      return {
        slug,
        label: data[slug].title || slug,
        folder,
        sub,
        color: sub ? lighten(base, subTint[folder + "/" + sub]) : base,
        r: mini
          ? Math.min(1.5 + Math.sqrt(backlinks[slug] || 0) * 0.8, 4)
          : Math.min(2 + Math.sqrt(backlinks[slug] || 0) * 1.1, 5.5) * rs,
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
        r: ((mini ? 4 : 9) + Math.sqrt(counts[f]) * (mini ? 0.5 : 1.2)) * rs,
        hubWeight: 0,
        x: 0, y: 0, vx: 0, vy: 0,
      })
    })

    // hub per folder — used both to draw section stars and to hit-test the
    // brain "areas": the circle around a hub that selects its section on hover
    const hubByFolder = {}
    nodes.forEach((n) => {
      if (n.hub) hubByFolder[n.folder] = n
    })
    // central cluster = root notes (the main pages); give it a selectable area
    // centred on the canvas, not tied to any section star. lets hovering the
    // white central notes select the centre instead of a ring section.
    const centerHub = nodes.some((n) => n.folder === "~" && !n.hub)
      ? (hubByFolder["~"] = { folder: "~", x: 0, y: 0, areaR: 0 })
      : null

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
      let hx = W / 2 + hub.ax * W * (mini ? 0.32 : 0.3)
      let hy = H / 2 + hub.ay * H * (mini ? 0.4 : 0.46)
      // sub-folder notes home to a spot offset from the section hub so each
      // sub-folder settles as its own clump; hubs and no-sub notes sit at core.
      const off = !n.hub && n.sub && subOff[n.folder + "/" + n.sub]
      if (off) {
        const R = Math.min(W, H) * (mini ? 0.1 : 0.085)
        hx += off[0] * R
        hy += off[1] * R
      }
      return [hx, hy]
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
          if (d2 < repelRange && d2 > 0) {
            // big stars carve out more space than dust; spread pushes the
            // observatory's clusters apart so the overview reads clearly
            const f = (m.hub ? 12 : 2) * spread
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
        const ex = (n.x - W / 2) / (W * (mini ? 0.44 : 0.47))
        const ey = (n.y - H / 2) / (H * (mini ? 0.42 : 0.45))
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
      // each area = a circle reaching just past its farthest note, so hovering
      // the cluster (not only a star) selects it. the centre cluster claims the
      // canvas middle so the white main-page notes never trip a ring section.
      if (centerHub) { centerHub.x = W / 2; centerHub.y = H / 2 }
      for (const f in hubByFolder) hubByFolder[f].areaR = 0
      nodes.forEach((n) => {
        if (n.hub) return
        const h = hubByFolder[n.folder]
        if (!h) return
        const d = Math.hypot(n.x - h.x, n.y - h.y) + n.r
        if (d > h.areaR) h.areaR = d
      })
      for (const f in hubByFolder) {
        const h = hubByFolder[f]
        h.areaR = Math.max(h.areaR * 1.3, 70)
      }
    }

    let hovered = null
    // section under highlight (from a hovered star here or a frieze word)
    let hlFolder = null
    const onHl = (e) => {
      hlFolder = e.detail
      if (reduceMotion) draw()
    }
    window.addEventListener("vb-folder-hl", onHl)
    // coarse pointers (touch) get a fatter hit circle than a mouse needs
    const slop = matchMedia("(pointer: coarse)").matches ? 16 : 8
    function nodeAt(e) {
      const rect = cv.getBoundingClientRect()
      const [x, y] = toWorld(e.clientX - rect.left, e.clientY - rect.top)
      for (const n of nodes) {
        if ((n.x - x) ** 2 + (n.y - y) ** 2 < (n.r + slop / view.s) ** 2) return n
      }
      return null
    }
    function onMove(e) {
      const rect = cv.getBoundingClientRect()
      const [x, y] = toWorld(e.clientX - rect.left, e.clientY - rect.top)
      hovered = nodeAt(e)
      // select an area when the pointer is on a star OR anywhere inside its
      // circle; overlapping areas (incl. the centre) resolve to the nearest hub
      let hf = hovered ? hovered.folder : null
      if (!hf) {
        let best = Infinity
        for (const f in hubByFolder) {
          const h = hubByFolder[f]
          const d = Math.hypot(h.x - x, h.y - y)
          if (d < (h.areaR || 0) && d < best) { best = d; hf = f }
        }
      }
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
    function onClick(e) {
      if (dragged) return // pan release, not a pick
      // hit-test the click's own coords: on touch, pointerleave fires before
      // click and clears `hovered`, and a stationary tap never fires pointermove
      const hit = nodeAt(e)
      if (hit) window.location.href = "/" + hit.slug
      else if (mini) document.getElementById("vb-expand")?.click()
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
    // active pointers by id: one drags/pans, two pinch-zoom around their midpoint
    const ptrs = new Map()
    let pinch = null // { d: start finger gap, s: start view.s }
    function onDown(e) {
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
      dragFrom = { px: e.clientX, py: e.clientY, vx: view.x, vy: view.y }
      dragged = false
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()]
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: view.s }
        dragged = true // a two-finger gesture is never a tap
      }
    }
    function onDrag(e) {
      if (!ptrs.has(e.pointerId)) return
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (ptrs.size >= 2 && pinch) {
        const [a, b] = [...ptrs.values()]
        const rect = cv.getBoundingClientRect()
        const mx = (a.x + b.x) / 2 - rect.left, my = (a.y + b.y) / 2 - rect.top
        const [wx, wy] = toWorld(mx, my)
        view.s = Math.min(8, Math.max(1, (pinch.s * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d))
        view.x = mx - wx * view.s
        view.y = my - wy * view.s
        clampView()
        tip.style.opacity = 0
        dragged = true
        return
      }
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
    function onUp(e) {
      if (e) ptrs.delete(e.pointerId)
      if (ptrs.size < 2) pinch = null
      // dropped from pinch to one finger: re-anchor the pan to it, not stale coords
      if (ptrs.size === 1) {
        const [p] = [...ptrs.values()]
        dragFrom = { px: p.x, py: p.y, vx: view.x, vy: view.y }
      } else if (ptrs.size === 0) {
        dragFrom = null
      }
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
      cv.addEventListener("pointercancel", onUp)
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
        cv.removeEventListener("pointercancel", onUp)
        window.removeEventListener("pointerup", onUp)
      }
      ro.disconnect()
      delete wrap.dataset.vbActive
      cleanup = null
    }
    if (window.addCleanup) window.addCleanup(cleanup)
  }

  // legend: one entry per real top-level folder in the published set, colored
  // the same way the graph colors its nodes — no fixed category list. Built into
  // the overlay chrome each time the observatory opens.
  async function buildLegend(legend) {
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

  // expand the home rotunda brain into a full-screen observatory overlay — the
  // same init() re-runs in full (non-mini) mode over the whole viewport. No new
  // page: caption, legend and the ✕ are injected into the wrapper, torn down on
  // close. Esc and the ✕ both close; a node click SPA-navigates (nav clears it).
  function toggleExpand(wrap, btn) {
    const opening = !wrap.classList.contains("vb-expanded")
    if (cleanup) cleanup() // tear the running sim down before switching modes
    if (opening) {
      wrap.classList.add("vb-expanded")
      document.body.classList.add("vb-open")
      delete wrap.dataset.mini
      buildOverlayChrome(wrap, btn)
    } else {
      wrap.classList.remove("vb-expanded")
      document.body.classList.remove("vb-open")
      wrap.dataset.mini = "1"
      wrap.querySelectorAll(".brain-caption, .brain-legend, #vb-collapse").forEach((el) => el.remove())
    }
    if (btn) btn.setAttribute("aria-expanded", opening ? "true" : "false")
    init() // rebuild in the new mode
    initAudio() // re-sync toggle; per-room tracks swap here if configured
  }

  function buildOverlayChrome(wrap, btn) {
    if (wrap.querySelector(".brain-caption")) return
    const cap = document.createElement("div")
    cap.className = "brain-caption"
    cap.innerHTML =
      "<h1>The Observatory</h1><p>Every note is a star; every link a thread. This view rebuilds itself from the vault on each publish — nothing here is arranged by hand.</p>"
    const legend = document.createElement("div")
    legend.className = "brain-legend"
    legend.id = "vb-legend"
    const close = document.createElement("button")
    close.type = "button"
    close.id = "vb-collapse"
    close.setAttribute("aria-label", "Close the observatory")
    close.textContent = "✕"
    close.addEventListener("click", () => toggleExpand(wrap, btn))
    wrap.append(cap, legend, close)
    buildLegend(legend)
  }

  function initExpand() {
    const btn = document.getElementById("vb-expand")
    const wrap = document.getElementById("vault-brain")
    if (!btn || !wrap || btn.dataset.vbDone) return
    btn.dataset.vbDone = "1"
    btn.addEventListener("click", () => toggleExpand(wrap, btn))
    const onKey = (e) => {
      if (e.key === "Escape" && wrap.classList.contains("vb-expanded")) toggleExpand(wrap, btn)
    }
    document.addEventListener("keydown", onKey)
    if (window.addCleanup) window.addCleanup(() => document.removeEventListener("keydown", onKey))
  }

  // rotunda frieze: one room name per real top-level folder, colored like
  // the constellation, counts live from the index — never a hand-kept list
  async function initFrieze() {
    const frieze = document.getElementById("vb-frieze")
    if (!frieze || frieze.dataset.vbDone) return
    // set before the await — initial load fires both the direct call and "nav"
    frieze.dataset.vbDone = "1"
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
    // words carved along the rotunda entablature, where the baked
    // pseudo-latin used to run (inpainted out of rotunda.png). SVG
    // textPath on the entablature arc, fitted to the image's carve line;
    // the brain image occludes the middle, so the rooms split left/right.
    {
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
      // manual pixel overrides, keyed by folder slug — x/y/deg are viewBox px
      // (0 0 1252 428), same space as the math below. Any field can be left
      // out to keep the computed default for just that field. Empty by
      // default: the band formula above positions everything until a room
      // needs a hand-placed nudge.
      const FRIEZE_OVERRIDES = {}
      const folders = Object.keys(counts).sort((a, b) => counts[b] - counts[a])
      const half = Math.ceil(folders.length / 2)
      const WORD_GAP = 2 // min gap between adjacent word boxes, viewBox px
      const EDGE_LIFT = 27.5 // px the outermost word is raised above the ellipse
      const EDGE_ROT_BOOST = 0.15 // extra rotation fraction for the outermost word
      // attach before measuring: getComputedTextLength needs a laid-out tree
      frieze.appendChild(svg)
      // per-side x ranges, stopping short of the brain canvas box (x 426-851)
      // where it would swallow the clicks
      ;[[folders.slice(0, half), 85, 420], [folders.slice(half), 856, 1140]].forEach(
        ([list, x0, x1]) => {
          const leftSide = x0 < CX
          const words = list.map((folder) => {
            const text = document.createElementNS(NS, "text")
            text.setAttribute("text-anchor", "middle")
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
            return { folder, text, a }
          })
          // measure actual glyph widths (only possible once attached to the
          // DOM) so long words get real room instead of a fixed index slot
          const widths = words.map((w) => w.text.getComputedTextLength())
          const span = widths.reduce((s, w) => s + w, 0) + WORD_GAP * (words.length - 1)
          const scale = Math.min(1, (x1 - x0) / (span || 1))
          let cursor = x0 + Math.max(0, (x1 - x0 - span * scale) / 2)
          words.forEach(({ folder, text }, i) => {
            const w = widths[i] * scale
            const x = cursor + w / 2
            cursor += w + WORD_GAP * scale
            // the outermost two words per side sit right where the band
            // ducks behind the columns and the ellipse model undershoots
            // the real curve there — pull just those up/around faster
            const outerRank = leftSide ? i : words.length - 1 - i
            const edgeBoost = outerRank === 0 ? 1 : outerRank === 1 ? 0.35 : 0
            // half a line-height back down for the outermost two — the edge
            // lift above overshoots by a hair right at the two end words
            const outerDrop = outerRank <= 1 ? 6 : 0
            const o = FRIEZE_OVERRIDES[folder] || {}
            const fx = o.x ?? x
            const fy = o.y ?? bandY(x) - edgeBoost * EDGE_LIFT + outerDrop
            const fdeg = o.deg ?? bandDeg(x) * (1 + edgeBoost * EDGE_ROT_BOOST)
            text.setAttribute(
              "transform",
              `translate(${fx.toFixed(1)} ${fy.toFixed(1)}) rotate(${fdeg.toFixed(1)})`,
            )
          })
        },
      )
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

  // library shelf: one spine per published Library-category note (build-emitted
  // static/library.json = [{slug, title}]). Category, not folder, is the signal
  // so book notes filed anywhere in the vault shelve alongside books/.
  const CLOTHS = ["#3f5240", "#5a3f24", "#4a3550", "#2f4858", "#6e3b2c", "#41474e", "#7a5c2e", "#35524a"]
  async function initShelf() {
    const shelf = document.getElementById("vb-shelf")
    if (!shelf || shelf.dataset.vbDone) return
    shelf.dataset.vbDone = "1"
    let books
    try {
      books = await fetch("/static/library.json").then((r) => r.json())
    } catch (e) {
      return
    }
    let h = 0
    for (const { slug, title } of books) {
      const a = document.createElement("a")
      a.className = "spine internal"
      a.href = "/" + slug
      const t = title || slug
      a.textContent = t.length > 42 ? t.slice(0, 40) + "…" : t
      a.title = t
      h = (h * 31 + slug.length + slug.charCodeAt(0)) % CLOTHS.length
      a.style.setProperty("--cloth", CLOTHS[h])
      shelf.appendChild(a)
    }
    // spines built after popover.inline's setupPopovers already scanned the DOM;
    // re-fire render so it binds hover-preview handlers to the new a.internal links
    document.dispatchEvent(new CustomEvent("render"))
  }

  // palace quote slab: rotate through quotes.json (built by scripts/quotes.mjs
  // from #quote lines + dashed lines in quote files). Each entry is
  // [text, source, url?]; source is the note's folder, e.g. "from website",
  // and url (only set for individual inline-tagged quotes, not quote files)
  // points at the note the quote came from.
  async function initQuotes() {
    const q = document.getElementById("rotating-quote")
    const src = document.getElementById("quote-source")
    if (!q || q.dataset.vbDone) return
    q.dataset.vbDone = "1"
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let QUOTES
    try {
      QUOTES = await fetch("/static/quotes.json").then((r) => r.json())
    } catch (e) {
      return
    }
    if (!QUOTES.length) return

    let i = 0
    const timer = setInterval(() => {
      if (!q.isConnected) return clearInterval(timer)
      q.style.opacity = 0
      setTimeout(() => {
        i = (i + 1) % QUOTES.length
        const [text, from, url] = QUOTES[i]
        q.textContent = text
        if (url) {
          const a = document.createElement("a")
          a.href = url
          a.textContent = from
          src.replaceChildren(a)
        } else {
          src.textContent = from
        }
        q.style.opacity = 1
      }, 600)
    }, 7000)
  }

  // taskbar help icon: sits beside darkmode/reader-mode in the toolbar (found
  // via .darkmode's flex-component parent, since the toolbar has no id of its
  // own). The toolbar is rebuilt on every SPA nav, so the button is re-created
  // each time; the popover panel lives on <body> (survives nav) and its
  // content is fetched from static/help.json (built from content/Help.md by
  // the VaultPages emitter) once, on first open.
  let helpHtml = null
  function initHelp() {
    const darkBtn = document.querySelector(".darkmode")
    const toolbar = darkBtn?.closest(".flex-component")
    if (!toolbar) return

    let panel = document.getElementById("vb-help-panel")
    if (!panel) {
      panel = document.createElement("div")
      panel.id = "vb-help-panel"
      panel.hidden = true
      document.body.appendChild(panel)

      const onOutside = (e) => {
        if (!panel.hidden && !panel.contains(e.target) && e.target.id !== "vb-help-btn") {
          panel.hidden = true
        }
      }
      const onKey = (e) => {
        if (e.key === "Escape" && !panel.hidden) panel.hidden = true
      }
      document.addEventListener("pointerdown", onOutside)
      document.addEventListener("keydown", onKey)
      if (window.addCleanup) {
        window.addCleanup(() => {
          document.removeEventListener("pointerdown", onOutside)
          document.removeEventListener("keydown", onKey)
        })
      }
    }

    if (toolbar.querySelector("#vb-help-btn")) return
    const wrap = document.createElement("div")
    const btn = document.createElement("button")
    btn.id = "vb-help-btn"
    btn.type = "button"
    btn.textContent = "?"
    btn.setAttribute("aria-label", "Help")
    btn.addEventListener("click", async () => {
      if (!panel.hidden) {
        panel.hidden = true
        return
      }
      if (helpHtml === null) {
        try {
          const data = await fetch("/static/help.json").then((r) => r.json())
          helpHtml = data.html || ""
        } catch (e) {
          helpHtml = "<p>Couldn't load help.</p>"
        }
        panel.innerHTML = helpHtml
      }
      panel.hidden = false
    })
    wrap.appendChild(btn)
    toolbar.appendChild(wrap)
  }

  // homepage whoami card: avatar + live text from content/woami.md, via
  // static/whoami.json (built by the VaultPages emitter). Teaser is the first
  // paragraph; "Read more" swaps in the full rendered note, inline, no nav.
  async function initWhoami() {
    const body = document.getElementById("whoami-body")
    const more = document.getElementById("whoami-more")
    if (!body || body.dataset.vbDone) return
    body.dataset.vbDone = "1"

    let data
    try {
      data = await fetch("/static/whoami.json").then((r) => r.json())
    } catch (e) {
      return
    }
    const html = data.html || ""
    const tmp = document.createElement("div")
    tmp.innerHTML = html
    const firstPara = tmp.querySelector("p")

    // wrap the "Hey there stranger" opener in a clickable span (clones into both
    // teaser and full views); one delegated listener plays the easter-egg track
    if (firstPara) {
      for (const node of firstPara.childNodes) {
        if (node.nodeType !== 3) continue
        const i = node.nodeValue.indexOf("Hey there stranger")
        if (i < 0) continue
        const rest = node.splitText(i)
        rest.splitText("Hey there stranger".length)
        const span = document.createElement("span")
        span.className = "whoami-hey"
        span.title = "♪ hey you"
        span.textContent = rest.nodeValue
        rest.replaceWith(span)
        break
      }
    }
    body.addEventListener("click", (e) => {
      if (e.target.closest(".whoami-hey")) playHeyYou()
    })

    // easter egg: each click feeds the black hole (avatar grows + accretion
    // glow); past the event horizon it collapses back to a point and resets
    const avatar = document.querySelector(".whoami-avatar")
    if (avatar && !avatar.dataset.vbBh) {
      avatar.dataset.vbBh = "1"
      let step = 0
      avatar.addEventListener("click", () => {
        if (step >= 5) {
          // event horizon reached: collapse to a point, then spring back
          step = 0
          avatar.style.setProperty("--bh", 0)
          avatar.classList.add("collapsing")
          setTimeout(() => avatar.classList.remove("collapsing"), 250)
        } else {
          step++
          avatar.style.setProperty("--bh", step)
        }
      })
    }

    if (firstPara && tmp.children.length > 1) {
      const teaser = [firstPara.cloneNode(true)]
      const full = [...tmp.children]
      body.replaceChildren(...teaser)
      more.hidden = false
      let expanded = false
      more.addEventListener("click", () => {
        expanded = !expanded
        body.replaceChildren(...(expanded ? full : teaser))
        more.textContent = expanded ? "Read less" : "Read more"
      })
    } else {
      body.innerHTML = html
    }
  }

  // whoami card: "surprise me" link to a random published note, from the same
  // contentIndex.json as the shelf/graph. Excludes empty notes (folder/tag
  // index pages have no content) and anything tagged #unfinished. Reroll
  // swaps the link without a page nav.
  async function initRandomNote() {
    const el = document.getElementById("whoami-random")
    if (!el || el.dataset.vbDone) return
    el.dataset.vbDone = "1"

    let data
    try {
      data = await fetch("/static/contentIndex.json").then((r) => r.json())
    } catch (e) {
      return
    }
    const pool = Object.entries(data).filter(
      ([, v]) => v.content && v.content.trim() && !(v.tags || []).includes("unfinished"),
    )
    if (!pool.length) return

    const render = () => {
      const [slug, v] = pool[Math.floor(Math.random() * pool.length)]
      el.replaceChildren()
      const a = document.createElement("a")
      a.href = "/" + slug
      a.textContent = v.title || slug
      const dice = document.createElement("button")
      dice.type = "button"
      dice.className = "whoami-reroll"
      dice.setAttribute("aria-label", "Show another random note")
      dice.textContent = "🎲"
      dice.addEventListener("click", (e) => {
        e.preventDefault()
        render()
      })
      el.append("Random note: ", a, dice)
    }
    render()
  }

  // room ambience: real music via an offscreen SoundCloud widget (AMBIENCE
  // map above); one toggle, no autoplay ever — user gesture starts it.
  // Button + iframe live on <body> (outside Quartz's swapped content) so
  // playback survives SPA nav; crossing into a room with its own track swaps
  // it and each track resumes where it left off.
  function setAudioLabel(btn) {
    btn.textContent = btn._paused ? "♪ play the room" : "♪ hush"
    btn.classList.toggle("on", !btn._paused)
    // mini-player slides in while the room is playing (CSS #vb-audio-frame)
    document.getElementById("vb-audio-frame")?.classList.toggle("on", !btn._paused)
  }

  // main page swaps its track by theme: daylight gets Imagine, night keeps
  // the Iron Sky fallback everyone else gets. The official Lennon master is
  // geo-locked by the estate on SoundCloud, so this is a cover instead.
  const HOME_DAY_TRACK = "https://soundcloud.com/cardell/imagine-remastered"

  // easter egg: clicking "Hey there stranger" on the home whoami card plays
  // Pink Floyd's "Hey You" through the same shared widget the room toggle uses.
  const HEY_YOU_TRACK = "https://soundcloud.com/yousefhisham/hey-you-pink-floyd"
  function playHeyYou() {
    const btn = document.getElementById("vb-audio-btn")
    if (!btn || !btn._widget) return
    btn._track = HEY_YOU_TRACK
    btn._resume = 0
    sessionStorage.setItem("vb-audio-on", "1")
    btn._widget.load(HEY_YOU_TRACK, { auto_play: true, show_artwork: false })
  }

  function initAudio() {
    const slug = document.body.dataset.slug || ""
    const day = document.documentElement.getAttribute("saved-theme") === "light"
    const track =
      slug === "index" && day ? HOME_DAY_TRACK : AMBIENCE.find(([p]) => slug.startsWith(p))[1]
    let btn = document.getElementById("vb-audio-btn")
    if (!btn) {
      const iframe = document.createElement("iframe")
      iframe.id = "vb-audio-frame"
      // encrypted-media is required: major-label tracks (policy MONETIZE)
      // stream via DRM — without it the widget fires PLAY then PAUSE at 0
      iframe.allow = "autoplay; encrypted-media"
      iframe.src =
        "https://w.soundcloud.com/player/?url=" +
        encodeURIComponent(track) +
        "&auto_play=false&show_artwork=false"
      document.body.appendChild(iframe)

      btn = document.createElement("button")
      btn.id = "vb-audio-btn"
      btn.type = "button"
      btn._track = track
      btn._paused = true
      btn.addEventListener("click", () => {
        if (!btn._widget) return // widget script still loading
        btn._paused ? (sessionStorage.setItem("vb-audio-on", "1"), btn._widget.play())
          : (sessionStorage.removeItem("vb-audio-on"), btn._widget.pause())
      })
      document.body.appendChild(btn)

      const script = document.createElement("script")
      script.src = "https://w.soundcloud.com/player/api.js"
      script.onload = () => {
        const w = SC.Widget(iframe)
        btn._widget = w
        w.bind(SC.Widget.Events.READY, () => {
          // resume is applied on PLAY: seekTo before playback starts is ignored
          btn._resume = +sessionStorage.getItem("vb-audio-t:" + btn._track) || 0
          // mid-session reload with music on: try to pick back up; if the
          // browser blocks it (no gesture yet) PLAY never fires, label stays
          if (sessionStorage.getItem("vb-audio-on")) w.play()
        })
        w.bind(SC.Widget.Events.PLAY, () => {
          if (btn._resume) w.seekTo(btn._resume)
          btn._resume = 0
          btn._paused = false
          setAudioLabel(btn)
        })
        w.bind(SC.Widget.Events.PAUSE, () => {
          btn._paused = true
          setAudioLabel(btn)
        })
        w.bind(SC.Widget.Events.FINISH, () => {
          // loop the room
          w.seekTo(0)
          w.play()
        })
        w.bind(SC.Widget.Events.PLAY_PROGRESS, (e) => {
          sessionStorage.setItem("vb-audio-t:" + btn._track, Math.floor(e.currentPosition))
        })
      }
      document.head.appendChild(script)
    }
    if (btn._track !== track && btn._widget) {
      btn._track = track
      btn._widget.load(track, {
        auto_play: !!sessionStorage.getItem("vb-audio-on"),
        show_artwork: false,
        callback: () => {
          btn._resume = +sessionStorage.getItem("vb-audio-t:" + track) || 0
        },
      })
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
    // the grip lives on the fixed explorer panel, not the top bar
    const panel = document.querySelector(".sidebar.left .explorer")
    if (!panel || document.getElementById("vb-resize")) return
    const grip = document.createElement("div")
    grip.id = "vb-resize"
    grip.setAttribute("aria-hidden", "true")
    panel.appendChild(grip)
    // listeners go on window, not the grip: the grip shifts under the cursor
    // mid-drag and pointer capture is unreliable across browsers/inputs
    grip.addEventListener("pointerdown", (e) => {
      e.preventDefault()
      const left = panel.getBoundingClientRect().left
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

  // explorer toggle: ☰ in the top bar hides the fixed explorer panel and
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
      // first slot of the top bar; body fallback keeps the toggle alive on
      // pages without a left sidebar
      const bar = document.querySelector(".sidebar.left")
      ;(bar || document.body).prepend(btn)
    }
    btn.classList.toggle("on", !off)
  }

  if (!window.__vaultbrainWired) {
    window.__vaultbrainWired = true
    // home's track depends on day/night, so a toggle mid-visit must re-pick it
    document.addEventListener("themechange", initAudio)
    document.addEventListener("nav", () => {
      if (cleanup) cleanup()
      document.body.classList.remove("vb-open") // overlay can't survive a page swap
      initNavToggle()
      initSidebarResize()
      init()
      initExpand()
      initFrieze()
      initShelf()
      initQuotes()
      initHelp()
      initWhoami()
      initRandomNote()
      initAudio()
      initFolderAssets()
    })
  }
  initNavToggle()
  initSidebarResize()
  init()
  initExpand()
  initFrieze()
  initShelf()
  initQuotes()
  initHelp()
  initWhoami()
  initRandomNote()
  initAudio()
  initFolderAssets()
})()
