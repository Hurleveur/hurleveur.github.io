import test, { describe } from "node:test"
import assert from "node:assert"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { Element, Root } from "hast"
import { VFile } from "vfile"
import { BuildCtx } from "../../util/ctx"
import { HidePrivateLinks, isPublished, privatePageSpan } from "./hidePrivateLinks"

const internalLink = (slug: string, text: string): Element => ({
  type: "element",
  tagName: "a",
  properties: { href: `./${slug}`, className: ["internal", "internal-link"], "data-slug": slug },
  children: [{ type: "text", value: text }],
})

async function makeVault(files: Record<string, string>): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loci-hide-private-"))
  for (const [name, content] of Object.entries(files)) {
    await fs.writeFile(path.join(dir, name), content)
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

async function run(directory: string, tree: Root): Promise<void> {
  const plugin = HidePrivateLinks().htmlPlugins!(stubCtx(directory))[0] as () => (
    t: Root,
    f: VFile,
  ) => Promise<void>
  await plugin()(tree, new VFile(""))
}

describe("isPublished", () => {
  test("true and the string \"true\" both count", () => {
    assert.strictEqual(isPublished("---\npublish: true\n---\nbody"), true)
    assert.strictEqual(isPublished('---\npublish: "true"\n---\nbody'), true)
  })
  test("missing, false, or no frontmatter at all do not", () => {
    assert.strictEqual(isPublished("---\ntitle: x\n---\nbody"), false)
    assert.strictEqual(isPublished("---\npublish: false\n---\nbody"), false)
    assert.strictEqual(isPublished("just a body, no frontmatter"), false)
  })
})

describe("privatePageSpan", () => {
  test("carries only the literal text, no attributes", () => {
    const span = privatePageSpan()
    assert.strictEqual(span.tagName, "span")
    assert.deepStrictEqual(span.children, [{ type: "text", value: "private page" }])
    assert.deepStrictEqual(Object.keys(span.properties!), ["className"])
  })
})

describe("HidePrivateLinks", () => {
  test("a link into an unpublished note is replaced with the private-page span, name gone from the tree", async () => {
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
    await run(dir, tree)

    const replaced = p.children[0] as Element
    assert.strictEqual(replaced.tagName, "span")
    assert.deepStrictEqual((replaced.properties as Record<string, unknown>).className, [
      "private-page",
    ])
    assert.strictEqual((replaced as Element).properties?.href, undefined)
    assert.strictEqual((replaced as Element).properties?.["data-slug"], undefined)

    const serialized = JSON.stringify(tree)
    assert.ok(!serialized.includes("Secret"), "private note's name must not survive in the tree")
    assert.ok(!serialized.includes("secret-diary"), "private note's slug must not survive")
    assert.ok(serialized.includes("private page"))
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
