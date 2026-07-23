import { describe, it, expect, vi } from "vitest";
import { createCtx } from "./helpers";
import { CanvasPage } from "../src/pageType";
import type { CanvasData } from "../src/types";
import type {
  ProcessedContent,
  FullSlug,
  FilePath,
  QuartzPluginData,
} from "@quartz-community/types";
import type { Root as HastRoot } from "hast";
import { resolveEmbeddedHtml } from "../src/components/CanvasBody";

const sampleCanvas: CanvasData = {
  nodes: [
    { id: "1", type: "text", x: 0, y: 0, width: 200, height: 100, text: "Hello" },
    { id: "2", type: "file", x: 300, y: 0, width: 200, height: 100, file: "notes/test.md" },
  ],
  edges: [{ id: "e1", fromNode: "1", toNode: "2", toEnd: "arrow" }],
};

vi.mock("fs", () => ({
  readFileSync: vi.fn(() => JSON.stringify(sampleCanvas)),
}));

describe("CanvasPage", () => {
  const plugin = CanvasPage();

  it("has correct name and layout", () => {
    expect(plugin.name).toBe("CanvasPage");
    expect(plugin.layout).toBe("canvas");
    expect(plugin.priority).toBe(20);
  });

  it("matches pages with canvasData in fileData", () => {
    const cfg = {} as Parameters<typeof plugin.match>[0]["cfg"];
    const withCanvas = { canvasData: sampleCanvas } as Parameters<
      typeof plugin.match
    >[0]["fileData"];
    const withoutCanvas = {} as Parameters<typeof plugin.match>[0]["fileData"];

    expect(plugin.match({ slug: "my-canvas" as FullSlug, fileData: withCanvas, cfg })).toBe(true);
    expect(plugin.match({ slug: "regular-page" as FullSlug, fileData: withoutCanvas, cfg })).toBe(
      false,
    );
  });

  it("declares .canvas fileExtensions", () => {
    expect(plugin.fileExtensions).toEqual([".canvas"]);
  });

  it("generates virtual pages from .canvas files", () => {
    const ctx = createCtx({
      allFiles: ["notes/project.canvas" as FilePath, "readme.md" as FilePath],
    });

    const content: ProcessedContent[] = [];
    const cfg = ctx.cfg.configuration;

    const pages = plugin.generate!({ content, cfg, ctx });

    expect(pages).toHaveLength(1);
    expect(pages[0]!.slug).toBe("notes/project.canvas");
    expect(pages[0]!.title).toBe("project");
    expect(pages[0]!.data).toHaveProperty("canvasData");
  });

  it("keeps the .canvas extension in virtual page slugs", () => {
    const ctx = createCtx({
      allFiles: ["maps/Team Board.canvas" as FilePath],
    });

    const content: ProcessedContent[] = [];
    const cfg = ctx.cfg.configuration;

    const pages = plugin.generate!({ content, cfg, ctx });

    expect(pages).toHaveLength(1);
    expect(pages[0]!.slug).toBe("maps/team-board.canvas");
    expect(pages[0]!.slug.endsWith(".canvas")).toBe(true);
  });

  it("normalizes spaces to hyphens and lowercases canvas slugs", () => {
    const ctx = createCtx({
      allFiles: ["Study Notes/Concept Civic Board.canvas" as FilePath],
    });

    const content: ProcessedContent[] = [];
    const cfg = ctx.cfg.configuration;

    const pages = plugin.generate!({ content, cfg, ctx });

    expect(pages).toHaveLength(1);
    expect(pages[0]!.slug).toBe("study-notes/concept-civic-board.canvas");
    expect(pages[0]!.title).toBe("Concept Civic Board");
  });

  describe("embedded content resolution", () => {
    const buildHtmlAstWithRelativeLink = (href: string): HastRoot => ({
      type: "root",
      children: [
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [
            {
              type: "element",
              tagName: "a",
              properties: { href },
              children: [{ type: "text", value: "link" }],
            },
          ],
        },
      ],
    });

    it("rebases relative hrefs inside embedded htmlAst to the canvas page's slug", () => {
      const canvasSlug = "canvas.canvas" as FullSlug;
      const sourceSlug = "plugins/canvaspage" as FullSlug;
      const allFiles: QuartzPluginData[] = [
        {
          slug: sourceSlug,
          htmlAst: buildHtmlAstWithRelativeLink("../layout"),
        } as unknown as QuartzPluginData,
      ];

      const embedded = resolveEmbeddedHtml(sourceSlug, canvasSlug, allFiles);
      expect(embedded).toBeTruthy();

      const m = embedded!.match(/href="([^"]+)"/);
      expect(m).toBeTruthy();
      const href = m![1]!;
      const resolved = new URL(href, `https://example.com/${canvasSlug}`).pathname;
      expect(resolved).toBe("/layout");
    });

    it("leaves absolute URLs in embedded htmlAst untouched", () => {
      const canvasSlug = "canvas.canvas" as FullSlug;
      const sourceSlug = "plugins/canvaspage" as FullSlug;
      const allFiles: QuartzPluginData[] = [
        {
          slug: sourceSlug,
          htmlAst: buildHtmlAstWithRelativeLink("https://example.com/external"),
        } as unknown as QuartzPluginData,
      ];

      const embedded = resolveEmbeddedHtml(sourceSlug, canvasSlug, allFiles);
      expect(embedded).toContain('href="https://example.com/external"');
    });

    it("resolves virtual pages by stripping file extension from slug", () => {
      const canvasSlug = "canvas.canvas" as FullSlug;
      const fileSlug = "untitled.base" as FullSlug;
      const allFiles: QuartzPluginData[] = [
        {
          slug: "untitled" as FullSlug,
          htmlAst: buildHtmlAstWithRelativeLink("./other"),
        } as unknown as QuartzPluginData,
      ];

      const embedded = resolveEmbeddedHtml(fileSlug, canvasSlug, allFiles);
      expect(embedded).toBeTruthy();
      expect(embedded).toContain("other");
    });

    it("returns undefined when page is not found", () => {
      const embedded = resolveEmbeddedHtml(
        "nonexistent" as FullSlug,
        "canvas.canvas" as FullSlug,
        [],
      );
      expect(embedded).toBeUndefined();
    });

    it("returns undefined when page has no htmlAst", () => {
      const allFiles: QuartzPluginData[] = [
        { slug: "test" as FullSlug } as unknown as QuartzPluginData,
      ];
      const embedded = resolveEmbeddedHtml(
        "test" as FullSlug,
        "canvas.canvas" as FullSlug,
        allFiles,
      );
      expect(embedded).toBeUndefined();
    });

    it("returns undefined for circular embed (self-reference)", () => {
      const canvasSlug = "my.canvas" as FullSlug;
      const allFiles: QuartzPluginData[] = [
        {
          slug: canvasSlug,
          htmlAst: buildHtmlAstWithRelativeLink("./test"),
        } as unknown as QuartzPluginData,
      ];
      const visited = new Set<string>([canvasSlug]);
      const embedded = resolveEmbeddedHtml(canvasSlug, canvasSlug, allFiles, undefined, visited);
      expect(embedded).toBeUndefined();
    });

    it("returns undefined when visited set blocks a canvas-in-canvas cycle", () => {
      const canvasA = "a.canvas" as FullSlug;
      const canvasB = "b.canvas" as FullSlug;
      const allFiles: QuartzPluginData[] = [
        {
          slug: canvasB,
          htmlAst: buildHtmlAstWithRelativeLink("./x"),
        } as unknown as QuartzPluginData,
      ];
      const visited = new Set<string>([canvasA, canvasB]);
      const embedded = resolveEmbeddedHtml(canvasB, canvasA, allFiles, undefined, visited);
      expect(embedded).toBeUndefined();
    });

    it("extracts header section via #heading subpath", () => {
      const htmlAst: HastRoot = {
        type: "root",
        children: [
          {
            type: "element",
            tagName: "h2",
            properties: { id: "intro" },
            children: [{ type: "text", value: "Intro" }],
          },
          {
            type: "element",
            tagName: "p",
            properties: {},
            children: [{ type: "text", value: "Intro content" }],
          },
          {
            type: "element",
            tagName: "h2",
            properties: { id: "details" },
            children: [{ type: "text", value: "Details" }],
          },
          {
            type: "element",
            tagName: "p",
            properties: {},
            children: [{ type: "text", value: "Details content" }],
          },
        ],
      };

      const allFiles: QuartzPluginData[] = [
        { slug: "doc" as FullSlug, htmlAst } as unknown as QuartzPluginData,
      ];

      const embedded = resolveEmbeddedHtml(
        "doc" as FullSlug,
        "canvas.canvas" as FullSlug,
        allFiles,
        "#intro",
      );
      expect(embedded).toBeTruthy();
      expect(embedded).toContain("Intro content");
      expect(embedded).not.toContain("Details content");
    });

    it("extracts block via #^blockid subpath", () => {
      const htmlAst: HastRoot = { type: "root", children: [] };
      const blocks: Record<string, import("hast").Element> = {
        myblock: {
          type: "element",
          tagName: "p",
          properties: {},
          children: [{ type: "text", value: "Block content here" }],
        },
      };

      const allFiles: QuartzPluginData[] = [
        { slug: "doc" as FullSlug, htmlAst, blocks } as unknown as QuartzPluginData,
      ];

      const embedded = resolveEmbeddedHtml(
        "doc" as FullSlug,
        "canvas.canvas" as FullSlug,
        allFiles,
        "#^myblock",
      );
      expect(embedded).toBeTruthy();
      expect(embedded).toContain("Block content here");
    });

    it("filters bases view via #view-name subpath", () => {
      const htmlAst: HastRoot = {
        type: "root",
        children: [
          {
            type: "element",
            tagName: "div",
            properties: { className: ["bases-view-container"] },
            children: [
              {
                type: "element",
                tagName: "div",
                properties: { className: ["bases-view"], dataViewType: "table" },
                children: [{ type: "text", value: "Table view" }],
              },
              {
                type: "element",
                tagName: "div",
                properties: { className: ["bases-view"], dataViewType: "list" },
                children: [{ type: "text", value: "List view" }],
              },
            ],
          },
        ],
      };

      const allFiles: QuartzPluginData[] = [
        { slug: "mybase" as FullSlug, htmlAst, basesData: {} } as unknown as QuartzPluginData,
      ];

      const embedded = resolveEmbeddedHtml(
        "mybase" as FullSlug,
        "canvas.canvas" as FullSlug,
        allFiles,
        "#list",
      );
      expect(embedded).toBeTruthy();
      expect(embedded).toContain("List view");
      expect(embedded).not.toContain("Table view");
    });

    it("returns undefined for non-existent heading subpath", () => {
      const htmlAst: HastRoot = {
        type: "root",
        children: [
          {
            type: "element",
            tagName: "h2",
            properties: { id: "intro" },
            children: [{ type: "text", value: "Intro" }],
          },
        ],
      };

      const allFiles: QuartzPluginData[] = [
        { slug: "doc" as FullSlug, htmlAst } as unknown as QuartzPluginData,
      ];

      const embedded = resolveEmbeddedHtml(
        "doc" as FullSlug,
        "canvas.canvas" as FullSlug,
        allFiles,
        "#nonexistent",
      );
      expect(embedded).toBeUndefined();
    });

    it("returns undefined for non-existent bases view subpath", () => {
      const htmlAst: HastRoot = {
        type: "root",
        children: [
          {
            type: "element",
            tagName: "div",
            properties: { className: ["bases-view-container"] },
            children: [
              {
                type: "element",
                tagName: "div",
                properties: { className: ["bases-view"], dataViewType: "table" },
                children: [{ type: "text", value: "Table view" }],
              },
            ],
          },
        ],
      };

      const allFiles: QuartzPluginData[] = [
        { slug: "mybase" as FullSlug, htmlAst, basesData: {} } as unknown as QuartzPluginData,
      ];

      const embedded = resolveEmbeddedHtml(
        "mybase" as FullSlug,
        "canvas.canvas" as FullSlug,
        allFiles,
        "#gallery",
      );
      expect(embedded).toBeUndefined();
    });
  });
});
