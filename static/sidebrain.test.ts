import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import test from "node:test"
import assert from "node:assert"

// The side brain is DOM the build never sees — vaultbrain.js injects it into
// the right column at runtime. Nothing typechecks it, so these are the two
// seams that fail silently: the mode gate and the plugin it replaces.
const here = dirname(fileURLToPath(import.meta.url))
const js = readFileSync(join(here, "vaultbrain.js"), "utf8")
const config = readFileSync(join(here, "../../quartz.config.yaml"), "utf8")

test("side brain", async (t) => {
  await t.test("leaves the page scrolling under it", () => {
    // wheel-zoom in a 380px panel would eat the scroll of every note page
    assert.ok(
      /if \(!mini && !side\) \{\s*\n\s*cv\.addEventListener\("wheel"/.test(js),
      "wheel/pan is no longer gated on !side — the side brain now steals page scroll",
    )
  })

  await t.test("never doubles the rotunda on the home page", () => {
    assert.match(js, /document\.body\.dataset\.slug === "index"\) return/)
  })

  await t.test("the panel's height rule cannot outrank the overlay", () => {
    // #vb-side #vault-brain is two ids; .vb-expanded is one id + one class, so
    // without the :not() the expanded overlay keeps the panel's 380px box
    const scss = readFileSync(join(here, "../styles/custom.scss"), "utf8")
    assert.match(scss, /#vb-side \{[\s\S]*?#vault-brain:not\(\.vb-expanded\)/)
  })

  await t.test("✦ on a phone or tablet note page opens the drawer, not the overlay", () => {
    // the drawer's mini map is the way in; ✦ jumping straight to the whole
    // vault read as the drawer having been replaced by the observatory
    const click = js.match(/btn\.id = "vb-brain-btn"[\s\S]*?toggleExpand\(wrap, btn\)/)?.[0] ?? ""
    assert.match(click, /if \(!wide\(\) && document\.getElementById\("vb-side"\)\)[\s\S]*?setSideDrawer\(/)
    // and the drawer itself spans the same widths (custom.scss, not just $mobile)
    const scss = readFileSync(join(here, "../styles/custom.scss"), "utf8")
    assert.match(scss, /@media all and not \(\$desktop\) \{\s*body:not\(\[data-slug="index"\]\) #quartz-body \.sidebar\.right \{\s*--side-w/)
  })

  await t.test("⤢ in the phone drawer stays a corner button", () => {
    // the phone entrance rule sets left/bottom/transform; without the reset the
    // drawer's button spans from its top/right insets to those
    const scss = readFileSync(join(here, "../styles/custom.scss"), "utf8")
    const rule = scss.match(/#vb-side #vb-expand \{([\s\S]*?)\n\}/)?.[1] ?? ""
    for (const decl of ["left: auto", "bottom: auto", "transform: none"]) {
      assert.ok(rule.includes(decl), `#vb-side #vb-expand lacks ${decl}`)
    }
  })

  await t.test("a hover in the neighbourhood lights stars, not a section", () => {
    // hlEmit lights a whole room; inside a neighbourhood that is most of the
    // panel, so the hover path must skip it there and light by adjacency
    assert.match(js, /if \(!local && target !== hlFolder\) hlEmit/)
    assert.match(js, /const near = hovered \? adj\.get\(hovered\)/)
  })

  await t.test("a room never washes out, its notes do", () => {
    const src = js.match(/const isRoom = \(path\) => (\/.+\/)\.test\(path\)/)
    assert.ok(src, "isRoom is gone — the main categories dim once visited again")
    const isRoom = (p: string) => new Function(`return ${src![1]}`)().test(p)
    for (const p of ["/work/", "work/", "work/index", "/travel/index", "/", ""]) assert.ok(isRoom(p), p)
    for (const p of ["/work", "/work/note", "work/sub/", "about"]) assert.ok(!isRoom(p), p)
    // "./work" is a room too, but the link can't say so: the store never keeps one
    assert.match(js, /isRoom\(location\.pathname\) \? seen\.delete\(here\) : seen\.add\(here\)/)
  })

  await t.test("links that arrive after the first paint still grey", () => {
    // the home intro, outro, whoami card and a folder's guests are fetched,
    // so the paint on nav has already run when their links land
    const after = (fn: string, call: string) => {
      const from = js.indexOf(`function ${fn}(`)
      const to = js.indexOf("\n  }\n", from)
      assert.ok(from > -1 && js.slice(from, to).includes(call), `${fn} never calls ${call}`)
    }
    after("initVaultIntro", "paintSeenLinks(tmp)")
    after("initWhoami", "paintSeenLinks(tmp)")
    after("initFolderAssets", "paintSeenLinks(ul)")
    // a heading anchor points at the page being read, which is always "seen"
    assert.match(js, /path !== location\.pathname && !isRoom\(path\)/)
  })

  await t.test("✦ off keeps the map and sends the shelf to the page foot", () => {
    // everything but #vb-side leaves the column, and it runs on every nav,
    // since the SPA morph refills the column from the new page
    assert.match(js, /foot\.append\(\.\.\.\[\.\.\.rail\.children\]\.filter\(\(el\) => el\.id !== "vb-side"\)\)/)
    assert.match(js, /initFolderRail\(\)\n\s*placeShelf\(\)/)
    // the brain itself is never gated on ✦ any more
    assert.doesNotMatch(js, /function initSideBrain[\s\S]{0,500}brain-off/)
  })

  await t.test("the observatory opened from a page shows the whole vault, you in it", () => {
    // local is decided by side alone, which toggleExpand drops; the page's ring
    // must survive that drop through vbFrom, or the full sky loses "you are here"
    assert.match(js, /if \(side\) \{\s*\n\s*const near = new Set\(\)/)
    assert.match(js, /const fromPage = side \|\| wrap\.dataset\.vbFrom === "side"/)
  })

  await t.test("the graph plugin it replaces stays off", () => {
    const block = config.slice(config.indexOf("quartz-community/graph"))
    assert.match(block.slice(0, 120), /enabled: false/)
  })
})

// Task 2: "seen" is a bare localStorage read/write with no server behind it —
// private mode and blocked site data throw on both, and the brain (this
// panel included) still has to render with no stored value at all.
test("seen-page tracking", async (t) => {
  await t.test("a blocked localStorage read still yields a usable set", () => {
    const loadSeen = js.slice(
      js.indexOf("function loadSeen() {"),
      js.indexOf("function markSeen() {"),
    )
    assert.match(loadSeen, /try \{/, "loadSeen no longer guards the localStorage read")
    assert.match(
      loadSeen,
      /catch \(e\) \{\s*\n\s*return new Set\(\)/,
      "loadSeen's catch no longer falls back to an empty set",
    )
  })

  await t.test("a blocked localStorage write is swallowed, not thrown", () => {
    const markSeen = js.slice(
      js.indexOf("function markSeen() {"),
      js.indexOf("function paintSeenLinks() {"),
    )
    assert.match(markSeen, /try \{/, "markSeen no longer guards the localStorage write")
    assert.match(markSeen, /catch \(e\) \{/, "markSeen's write can throw uncaught in private mode")
  })

  await t.test("a seen star desaturates instead of gaining a second color system", () => {
    // reuses n.color/desat rather than a parallel "seen palette" — one hue per
    // note, dimmed, so an unseen star still pops next to it
    // (ink is n.color, darkened on the day rotunda: still the note's own hue)
    assert.match(js, /const ink = mini && sky\.day \? darken\(n\.color, [\d.]+\) : n\.color/)
    assert.match(js, /const col = n\.seen \? desat\(ink, [\d.]+\) : ink/)
  })
})

// the "Walk on" doors at a note's foot (initNearby) pick from nearby(): run the
// real function out of the source, the way rotunda.test.ts runs widestLine
test("a note's nearby doors", async (t) => {
  const src = js.slice(js.indexOf("function nearby"), js.indexOf("// canvas has no ellipsis"))
  const nearby = new Function(`${src}; return nearby`)() as (
    data: Record<string, { links?: string[] }>,
    me: string,
    max: number,
    rand?: () => number,
  ) => string[]
  const data = {
    index: { links: ["work/a"] },
    "work/index": { links: [] },
    "work/a": { links: ["work/a", "tags/x", "friends/b", "missing/c", "index"] },
    "friends/b": { links: ["work/a"] },
    "travel/d": { links: ["work/a"] },
    "work/e": { links: [] },
    "work/sub/f": { links: [] },
    "tags/x": { links: [] },
  }

  await t.test("links out first, then links in, then shelf-mates", () => {
    assert.deepStrictEqual(nearby(data, "work/a", 9), ["friends/b", "travel/d", "work/e"])
  })

  await t.test("never itself, home, a tag page, a folder note or a deeper shelf", () => {
    const picks = nearby(data, "work/a", 9)
    for (const s of ["work/a", "index", "tags/x", "work/index", "work/sub/f", "missing/c"])
      assert.ok(!picks.includes(s), s)
  })

  await t.test("stops at max, and a top-level note has no shelf", () => {
    assert.deepStrictEqual(nearby(data, "work/a", 2), ["friends/b", "travel/d"])
    assert.deepStrictEqual(nearby({ solo: { links: [] }, other: { links: [] } }, "solo", 3), [])
  })

  await t.test("drawn at random within a tier, never across tiers", () => {
    const many = {
      ...data,
      "work/a": { links: ["friends/b", "travel/d", "work/e"] },
      "friends/g": { links: ["work/a"] },
    }
    const first = nearby(many, "work/a", 3, () => 0.999)
    const other = nearby(many, "work/a", 3, () => 0)
    assert.deepStrictEqual(first, ["friends/b", "travel/d", "work/e"])
    assert.notDeepStrictEqual(other, first)
    assert.deepStrictEqual([...other].sort(), [...first].sort())
    // a backlink only fills what the links leave
    assert.ok(!nearby(many, "work/a", 3, () => 0).includes("friends/g"))
  })

  await t.test("a carved room walks on to its frieze neighbours, round the ring", () => {
    const hall = {
      ...data,
      "alignment/index": { links: ["work/a"] },
      "meaning/index": {},
      "travel/index": {},
    }
    assert.deepStrictEqual(nearby(hall, "work/index", 3), ["alignment/index", "travel/index"])
    assert.deepStrictEqual(nearby(hall, "alignment/index", 3), ["meaning/index", "work/index"])
    // an unpublished neighbour is skipped, a deeper folder note keeps the note rule
    assert.deepStrictEqual(nearby(data, "work/index", 3), [])
    assert.deepStrictEqual(nearby(hall, "work/sub/index", 3), ["work/sub/f"])
  })

  await t.test("runs on every note page, after anything fetched lands", () => {
    assert.equal(
      js.match(/^\s*initNearby\(\)$/gm)?.length,
      2,
      "initNearby must run on load and on nav",
    )
  })
})

test("a preview takes its own room's colour", () => {
  // the hook is a window global between two scripts; rename either side and every
  // preview silently falls back to the page's room colour
  const popover = readFileSync(join(here, "../components/scripts/popover.inline.ts"), "utf8")
  assert.match(js, /window\.vbRoomColor = folderColor/)
  assert.match(popover, /window\.vbRoomColor\(room\)/)
  assert.match(popover, /querySelector<HTMLElement>\("\.room-plaque"\)\?\.dataset\.room/)
})

test("the note's date reaches the side panel's caption", () => {
  // the fork renders the date hidden and vaultbrain.js copies it; rename either
  // side and the date silently vanishes from every page
  const meta = readFileSync(
    join(here, "../../local-plugins/content-meta/src/components/ContentMeta.tsx"),
    "utf8",
  )
  assert.match(meta, /<p class="note-date">\{dated\}<\/p>/)
  assert.match(js, /querySelector\("\.page-header \.note-date time"\)/)
})
