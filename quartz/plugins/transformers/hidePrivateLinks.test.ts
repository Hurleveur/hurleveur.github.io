import test, { describe } from "node:test"
import assert from "node:assert"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { Element, Root } from "hast"
import { VFile } from "vfile"
import { BuildCtx } from "../../util/ctx"
import { SimpleSlug } from "../../util/path"
import {
  HidePrivateLinks,
  isPublished,
  privacyMarker,
  PRIVATE_MARKER_CLASS,
  PRIVATE_MARKER_TEXT,
} from "./hidePrivateLinks"

const internalLink = (slug: string, text: string, aliased = false): Element => ({
  type: "element",
  tagName: "a",
  properties: {
    href: `./${slug}`,
    className: aliased ? ["internal", "internal-link", "alias"] : ["internal", "internal-link"],
    "data-slug": slug,
  },
  children: [{ type: "text", value: text }],
})

// Mirrors what rehype-raw actually produces for OFM's transclude HTML string:
// "data-*" attributes parsed off raw HTML text come out camelCased.
const transclude = (slug: string, alias = ""): Element => ({
  type: "element",
  tagName: "blockquote",
  properties: {
    className: ["transclude"],
    dataUrl: slug,
    dataBlock: "",
    dataEmbedAlias: alias,
  },
  children: [
    {
      type: "element",
      tagName: "a",
      properties: { href: `./${slug}`, className: ["transclude-inner"] },
      children: [{ type: "text", value: `Transclude of ${slug}` }],
    },
  ],
})

async function makeVault(files: Record<string, string>): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loci-hide-private-"))
  for (const [name, content] of Object.entries(files)) {
    const full = path.join(dir, name)
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, content)
  }
  return dir
}

function stubCtx(directory: string): BuildCtx {
  return {
    buildId: "test",
    argv: { directory, verbose: false, output: "", serve: false, watch: false, port: 0, wsPort: 0 },
    cfg: { configuration: { ignorePatterns: [] } } as unknown as BuildCtx["cfg"],
    allSlugs: [],
    allFiles: [],
    incremental: false,
    virtualPages: [],
  } as BuildCtx
}

async function run(directory: string, tree: Root, file: VFile = new VFile("")): Promise<VFile> {
  const plugin = HidePrivateLinks().htmlPlugins!(stubCtx(directory))[0] as () => (
    t: Root,
    f: VFile,
  ) => Promise<void>
  await plugin()(tree, file)
  return file
}

describe("isPublished", () => {
  test('true and the string "true" both count', () => {
    assert.strictEqual(isPublished("---\npublish: true\n---\nbody"), true)
    assert.strictEqual(isPublished('---\npublish: "true"\n---\nbody'), true)
  })
  test("missing, false, or no frontmatter at all do not", () => {
    assert.strictEqual(isPublished("---\ntitle: x\n---\nbody"), false)
    assert.strictEqual(isPublished("---\npublish: false\n---\nbody"), false)
    assert.strictEqual(isPublished("just a body, no frontmatter"), false)
  })
})

describe("privacyMarker", () => {
  test("carries only the literal text, no attributes", () => {
    const span = privacyMarker()
    assert.strictEqual(span.tagName, "span")
    assert.deepStrictEqual(span.children, [{ type: "text", value: PRIVATE_MARKER_TEXT }])
    assert.deepStrictEqual(span.properties, { className: [PRIVATE_MARKER_CLASS] })
  })
})

describe("HidePrivateLinks — unaliased link", () => {
  test("a link into an unpublished note is replaced with the marker, name gone from the tree", async () => {
    const dir = await makeVault({
      "Public.md": "---\npublish: true\n---\nlinks to [[Secret Diary]]",
      "Secret Diary.md": "---\ntitle: Secret Diary\n---\nnever published",
    })
    const p: Element = {
      type: "element",
      tagName: "p",
      properties: {},
      children: [internalLink("secret-diary", "Secret Diary")],
    }
    const tree: Root = { type: "root", children: [p] }
    const file = new VFile("---\npublish: true\n---\nlinks to [[Secret Diary]]")
    await run(dir, tree, file)

    const replaced = p.children[0] as Element
    assert.strictEqual(replaced.tagName, "span")
    assert.deepStrictEqual((replaced.properties as Record<string, unknown>).className, [
      PRIVATE_MARKER_CLASS,
    ])
    assert.strictEqual(replaced.properties?.href, undefined)
    assert.strictEqual(replaced.properties?.["data-slug"], undefined)

    const serialized = JSON.stringify(tree)
    assert.ok(!serialized.includes("Secret"), "private note's name must not survive in the tree")
    assert.ok(!serialized.includes("secret-diary"), "private note's slug must not survive")
    assert.ok(serialized.includes(PRIVATE_MARKER_TEXT))
  })

  test("a link into a published note is left completely untouched", async () => {
    const dir = await makeVault({
      "Public.md": "---\npublish: true\n---\nlinks to [[Other]]",
      "Other.md": "---\npublish: true\n---\nalso public",
    })
    const original = internalLink("other", "Other")
    const p: Element = { type: "element", tagName: "p", properties: {}, children: [original] }
    const tree: Root = { type: "root", children: [p] }
    await run(dir, tree)
    assert.strictEqual(p.children[0], original)
  })

  test("a link whose slug matches no markdown file at all (folder/tag/asset page) is left untouched", async () => {
    const dir = await makeVault({
      "Public.md": "---\npublish: true\n---\nlinks to a tag",
    })
    const original = internalLink("tags/rules", "#rules")
    const p: Element = { type: "element", tagName: "p", properties: {}, children: [original] }
    const tree: Root = { type: "root", children: [p] }
    await run(dir, tree)
    assert.strictEqual(p.children[0], original)
  })

  test("a link with no data-slug (external, anchor) is left untouched", async () => {
    const dir = await makeVault({ "Public.md": "---\npublish: true\n---\nexternal" })
    const original: Element = {
      type: "element",
      tagName: "a",
      properties: { href: "https://example.com", className: ["external"] },
      children: [{ type: "text", value: "example" }],
    }
    const p: Element = { type: "element", tagName: "p", properties: {}, children: [original] }
    const tree: Root = { type: "root", children: [p] }
    await run(dir, tree)
    assert.strictEqual(p.children[0], original)
  })
})

describe("HidePrivateLinks — aliased link", () => {
  test("keeps the alias words as plain text, drops the link and the target name", async () => {
    const dir = await makeVault({
      "Public.md": "---\npublish: true\n---\nsee [[Women/dating|dating]]",
      "Women/dating.md": "---\ntitle: dating\n---\nnever published",
    })
    const p: Element = {
      type: "element",
      tagName: "p",
      properties: {},
      children: [internalLink("women/dating", "dating", true)],
    }
    const tree: Root = { type: "root", children: [p] }
    const file = new VFile("---\npublish: true\n---\nsee [[Women/dating|dating]]")
    await run(dir, tree, file)

    // "dating" is also the literal suffix of "women/dating" — proof this
    // isn't using a slug/text suffix check (which would call it unaliased).
    assert.deepStrictEqual(p.children[0], { type: "text", value: "dating" })
    const serialized = JSON.stringify(tree)
    assert.ok(!serialized.includes("women/dating"))
  })
})

describe("HidePrivateLinks — embed", () => {
  test("a transclude of an unpublished note is replaced wholesale, data-url gone", async () => {
    const dir = await makeVault({
      "Public.md": "---\npublish: true\n---\n![[Secret Diary]]",
      "Secret Diary.md": "---\ntitle: Secret Diary\n---\nnever published",
    })
    const bq = transclude("secret-diary")
    const tree: Root = { type: "root", children: [bq] }
    await run(dir, tree)

    const replaced = tree.children[0] as Element
    assert.strictEqual(replaced.tagName, "span")
    const serialized = JSON.stringify(tree)
    assert.ok(!serialized.includes("secret-diary"))
    assert.ok(!serialized.includes("Secret Diary"))
  })

  test("a transclude of a published note is left untouched", async () => {
    const dir = await makeVault({
      "Public.md": "---\npublish: true\n---\n![[Other]]",
      "Other.md": "---\npublish: true\n---\nalso public",
    })
    const bq = transclude("other")
    const tree: Root = { type: "root", children: [bq] }
    await run(dir, tree)
    assert.strictEqual(tree.children[0], bq)
  })
})

describe("HidePrivateLinks — file.data.links", () => {
  test("a private target is dropped from the outgoing link list", async () => {
    const dir = await makeVault({
      "Public.md": "---\npublish: true\n---\nlinks to [[Secret Diary]] and [[Other]]",
      "Secret Diary.md": "---\ntitle: Secret Diary\n---\nnever published",
      "Other.md": "---\npublish: true\n---\nalso public",
    })
    const tree: Root = { type: "root", children: [] }
    const file = new VFile("")
    file.data.links = ["secret-diary", "other"] as SimpleSlug[]
    await run(dir, tree, file)
    assert.deepStrictEqual(file.data.links, ["other"])
  })
})
