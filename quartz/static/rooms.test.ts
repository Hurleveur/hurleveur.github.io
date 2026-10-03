import test, { describe } from "node:test"
import assert from "node:assert"
import { readFileSync } from "fs"
import { join } from "path"

// initRooms() builds the arched doors on two pages from three pieces that no
// build step or type check ties together: a container attribute written in
// markdown, a selector written in JS, and an ordering rule inside one async
// function. Break any of them and the rooms just quietly stop appearing, or
// appear twice.

const here = join(import.meta.dirname, "..")
const repo = join(here, "..")
const js = readFileSync(join(here, "static/vaultbrain.js"), "utf8")
const indexMd = readFileSync(join(repo, "content/index.md"), "utf8")

const initRooms = js.slice(
  js.indexOf("async function initRooms()"),
  js.indexOf("async function initRandomNote()"),
)
const initVaultIntro = js.slice(
  js.indexOf("async function initVaultIntro()"),
  js.indexOf("async function initRooms()"),
)

describe("the rooms", () => {
  test("both halves cut the map at the same heading", () => {
    // initVaultIntro shows Vault Map down to its rooms section and initRooms
    // replaces the link line under that same heading. Both find it by the id
    // Quartz slugs from the heading text, so if one is ever pointed at a
    // different anchor the home page silently shows the wrong slice of the
    // note and the doors silently stop replacing anything.
    assert.match(
      initVaultIntro,
      /"the-rooms"/,
      "initVaultIntro no longer splits the note at the rooms heading",
    )
    assert.match(
      initRooms,
      /"the-rooms"/,
      "initRooms no longer finds the rooms heading, so the link line is never replaced",
    )
  })

  test("the Palace teaser still cuts at two blocks, behind Read more", () => {
    // every other section of the note renders plainly. If the teaser map grows
    // a second entry, or the button stops being built, part of the map either
    // disappears from the home page or arrives already spent. (e7856abc read
    // this cut as the reason a line added to the note never showed and deleted
    // it outright — it wasn't: see the next test for what actually dropped it.)
    const teaser = js.slice(
      js.indexOf("const INTRO_TEASER"),
      js.indexOf("async function initVaultIntro"),
    )
    assert.match(teaser, /\{ palace: 2 \}/, "the Palace teaser no longer cuts at two blocks")
    assert.match(initVaultIntro, /"Read more"/, "the Read more control is gone")
    assert.match(
      initVaultIntro,
      /\^H\[1-6\]\$/,
      "initVaultIntro no longer groups the note by its own headings",
    )
  })

  test("every block past the teaser lands inside the one fold, any node type", () => {
    // This runs the real grouping + cut code (not a regex) against six fake
    // blocks — five paragraphs and a trailing collapsible callout — and checks
    // every one from the third on ends up a child of the single
    // .vault-intro-rest div. The callout case is the one that actually broke:
    // a collapsible callout used to flush the running section and split off
    // into its OWN top-level, separately-collapsed <details> before the cut
    // ever saw it, so a credit line written as a callout past the teaser
    // rendered, but behind a second, disconnected toggle nobody associates
    // with "Read more" — easy to read as "never showed".
    const cutMatch = js.match(/const INTRO_TEASER = \{ palace: (\d+) \}/)
    assert.ok(cutMatch, "INTRO_TEASER's shape changed — update this test's cut value")
    const cut = Number(cutMatch[1])

    const code = js.slice(
      js.indexOf("// group the note by heading."),
      js.indexOf("    box.replaceChildren()"),
    )

    // the smallest fake DOM the sliced code actually calls into: tagName, id,
    // textContent, matches(), querySelector(), append/appendChild.
    class FakeEl {
      tagName: string
      id = ""
      _text = ""
      classes = new Set<string>()
      children: FakeEl[] = []
      q: Record<string, FakeEl | undefined> = {}
      constructor(tag: string) {
        this.tagName = tag.toUpperCase()
      }
      get textContent() {
        return this._text
      }
      set textContent(v: string) {
        this._text = v
      }
      matches(sel: string) {
        return (
          sel === "blockquote.callout.is-collapsible" &&
          this.tagName === "BLOCKQUOTE" &&
          this.classes.has("callout") &&
          this.classes.has("is-collapsible")
        )
      }
      querySelector(sel: string) {
        return this.q[sel] ?? null
      }
      appendChild(el: FakeEl) {
        this.children.push(el)
        return el
      }
      append(...els: FakeEl[]) {
        this.children.push(...els)
      }
      addEventListener() {
        // the "Read more" click handler — structure is what this test checks
      }
    }

    const fakeDocument = { createElement: (tag: string) => new FakeEl(tag) }
    const p = (text: string) => {
      const e = new FakeEl("p")
      e.textContent = text
      return e
    }

    const heading = new FakeEl("h2")
    heading.id = "palace"
    heading.textContent = "Palace"

    const title = new FakeEl("span")
    title.textContent = "How this vault is put together"
    const content = new FakeEl("div")
    content.children = [p("inside the callout")]
    const callout = new FakeEl("blockquote")
    callout.classes.add("callout")
    callout.classes.add("is-collapsible")
    callout.q = { ".callout-title-inner": title, ".callout-content": content }

    const tmp = {
      children: [heading, p("one"), p("two"), p("three"), p("four"), p("five"), callout],
    }

    const run = new Function("document", "tmp", "INTRO_TEASER", code + "\nreturn { sections, put }")
    const { sections, put } = run(fakeDocument, tmp, { palace: cut })
    const palace = sections.find((s: { id: string }) => s.id === "palace")
    assert.ok(palace, "the fake note produced no Palace section")
    assert.equal(
      palace.nodes.length,
      6,
      "five paragraphs plus the callout should all be one section's nodes",
    )

    const box = fakeDocument.createElement("div")
    put(box, palace)

    const rest = box.children.find((c: FakeEl) => (c as any).className === "vault-intro-rest")
    assert.ok(rest, "no .vault-intro-rest was built — the teaser stopped folding")
    assert.equal((rest as any).hidden, true, "the fold's rest div isn't hidden by default")
    assert.equal(
      rest.children.length,
      palace.nodes.length - cut,
      "not every block past the teaser landed inside the fold",
    )
    const foldedCallout = rest.children[rest.children.length - 1]
    assert.equal(
      foldedCallout.tagName,
      "DETAILS",
      "the callout past the teaser escaped into its own fold instead of this one",
    )
  })

  test("the collapsible callout is rebuilt as a fold", () => {
    // Quartz's callout script binds on the nav event, so a callout injected
    // afterwards renders but never opens. Rebuilding it as <details> is what
    // makes "How this vault is put together" clickable at all.
    assert.match(
      initVaultIntro,
      /blockquote\.callout\.is-collapsible/,
      "initVaultIntro no longer recognises the note's callout",
    )
    assert.match(
      initVaultIntro,
      /createElement\("details"\)/,
      "the callout is no longer rebuilt as a <details> — it will never toggle",
    )
  })

  test("the home page container and the selector still name each other", () => {
    assert.match(
      indexMd,
      /data-vb-doors/,
      "content/index.md lost its door container — the home page rooms have nowhere to render",
    )
    assert.match(
      initRooms,
      /\[data-vb-doors\]/,
      "initRooms no longer queries the attribute index.md writes, so it finds no home",
    )
    // the sections after the rooms render below the doors, into their own box
    assert.match(
      indexMd,
      /id="vault-outro"/,
      "content/index.md lost #vault-outro — Start here and the callout have nowhere to land",
    )
    assert.match(
      initVaultIntro,
      /"vault-outro"/,
      "initVaultIntro no longer fills the box below the doors",
    )
  })

  test("containers are claimed before the index is awaited", () => {
    // the bootstrap fires initRooms twice on a first load (the direct call and
    // the "nav" event). Both run their synchronous half before either await
    // resolves, so a guard set after the await lets both runs through and every
    // door is built twice.
    const claim = initRooms.indexOf('dataset.vbDone = "1"')
    const await_ = initRooms.indexOf("await loadIndex()")
    assert.ok(claim > -1, "initRooms no longer marks its containers as claimed")
    assert.ok(await_ > -1, "initRooms no longer loads the content index")
    assert.ok(
      claim < await_,
      "the vbDone guard moved after the await — two racing runs will each build a full set of doors",
    )
  })

  test("a door reaches its room, not the note that shadows its name", () => {
    // /meaning/ by construction, never a wikilink: `[[Meaning]]` resolves to
    // whichever Meaning.md the shortest-path resolver picks, which is not the
    // folder note.
    assert.match(
      initRooms,
      /enter\.href = "\/" \+ folder \+ "\/"/,
      "the Enter link no longer points straight at the folder page",
    )
  })
})

// The rooms are listed root -> crown wherever they appear — the frieze along
// the rotunda and the doors under the hero both sort through chakraSort. The
// order is the vault's own scheme, not a count or an alphabet, and nothing but
// this test notices when a sort call drifts back to the old counts comparator.
describe("chakra order", () => {
  const chakraSrc = js.slice(js.indexOf("const COLORS = {"), js.indexOf("function folderColor("))
  const chakraSort = new Function(chakraSrc + "; return chakraSort")() as (
    a: string,
    b: string,
  ) => number

  test("the seven run root to crown, strangers after them", () => {
    const order = ["Meaning", "zebra", "Alignment", "Work", "Attachments", "Friends"].sort(
      chakraSort,
    )
    assert.deepEqual(order, ["Alignment", "Work", "Friends", "Meaning", "Attachments", "zebra"])
  })

  test("both listings sort through it, not by note count", () => {
    assert.equal(
      (js.match(/Object\.keys\(counts\)\.sort\(chakraSort\)/g) || []).length,
      2,
      "the frieze or the doors stopped sorting by chakra order",
    )
  })
})
