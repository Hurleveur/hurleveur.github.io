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

  test("only the Palace prose hides behind Read more", () => {
    // every other section of the note renders plainly. If the teaser map grows
    // a second entry, or the button stops being built, part of the map either
    // disappears from the home page or arrives already spent.
    const teaser = js.slice(js.indexOf("const INTRO_TEASER"), js.indexOf("async function initVaultIntro"))
    assert.match(teaser, /\{ palace: 2 \}/, "the Palace teaser no longer cuts at two blocks")
    assert.match(initVaultIntro, /"Read more"/, "the Read more control is gone")
    assert.match(
      initVaultIntro,
      /\^H\[1-6\]\$/,
      "initVaultIntro no longer groups the note by its own headings",
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
