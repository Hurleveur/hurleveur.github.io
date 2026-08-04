import test, { describe } from "node:test"
import assert from "node:assert"
import { buildCategoryIndex, categoriesOf, categorySlug, CategoryFile } from "./categories"

describe("categorySlug", () => {
  test("strips wikilink brackets", () => {
    assert.strictEqual(categorySlug("[[Library]]"), "library")
  })

  test("drops the anchor and the alias", () => {
    assert.strictEqual(categorySlug("[[Podcast episodes.base#Show]]"), "podcast-episodes")
    assert.strictEqual(categorySlug("[[Guides|the guides]]"), "guides")
  })

  test("normalises case and spaces on a bare name", () => {
    assert.strictEqual(categorySlug("Podcast episodes"), "podcast-episodes")
  })

  test("empty for junk", () => {
    assert.strictEqual(categorySlug("[[]]"), "")
  })
})

describe("categoriesOf", () => {
  test("reads a list, a scalar, and nothing", () => {
    assert.deepStrictEqual(categoriesOf({ frontmatter: { categories: ["[[Library]]"] } }), [
      "library",
    ])
    assert.deepStrictEqual(categoriesOf({ frontmatter: { categories: "Quotes" } }), ["quotes"])
    assert.deepStrictEqual(categoriesOf({ frontmatter: {} }), [])
  })

  test("dedupes so a doubled category doesn't double the listing", () => {
    assert.deepStrictEqual(
      categoriesOf({ frontmatter: { categories: ["[[Library]]", "library"] } }),
      ["library"],
    )
  })
})

describe("buildCategoryIndex", () => {
  const files: CategoryFile[] = [
    {
      slug: "library/the-alchemist",
      title: "The Alchemist",
      origin: "Library",
      categories: ["library"],
    },
    {
      slug: "alignment/atomic-habits",
      title: "Atomic Habits",
      origin: "Alignment",
      categories: ["library"],
    },
    { slug: "work/guides/coding", title: "Coding", origin: "Work/Guides", categories: [] },
    { slug: "work/lean-startup", title: "Lean Startup", origin: "Work", categories: ["guides"] },
    { slug: "shared/dune", title: "Dune", origin: "Shared", categories: ["movies"] },
  ]

  test("a note joins a folder named after its category, tagged with where it lives", () => {
    assert.deepStrictEqual(buildCategoryIndex(files)["library"], [
      { slug: "alignment/atomic-habits", title: "Atomic Habits", origin: "Alignment" },
    ])
  })

  test("matches a nested folder by its last segment", () => {
    assert.deepStrictEqual(buildCategoryIndex(files)["work/guides"], [
      { slug: "work/lean-startup", title: "Lean Startup", origin: "Work" },
    ])
  })

  test("a note already inside the folder is not listed twice", () => {
    const members = buildCategoryIndex(files)["library"] ?? []
    assert.ok(!members.some((m) => m.slug === "library/the-alchemist"))
  })

  test("a category with no matching folder creates nothing", () => {
    assert.strictEqual(buildCategoryIndex(files)["movies"], undefined)
  })
})
