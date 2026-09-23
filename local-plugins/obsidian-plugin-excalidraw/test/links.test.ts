import { describe, it, expect } from "vitest";
import type { QuartzPluginData } from "@quartz-community/types";
import { drawingLinks } from "../src/links";
import type { ExcalidrawData } from "../src/types";

// LOCI PATCH: the graph connects a drawing only through these links.
describe("drawingLinks", () => {
  it("links published targets from element links and text, never unpublished ones", () => {
    const data = {
      elements: [
        { id: "a", type: "embeddable", link: "[[Tasks]]" },
        { id: "b", type: "text", rawText: "see [[AGENTS]] and [[Private note]]" },
        { id: "c", type: "rectangle", link: "[[Life structure]]" },
      ],
    } as unknown as ExcalidrawData;
    const published = [
      { slug: "alignment/tasks" },
      { slug: "agents" },
      { slug: "alignment/life-structure/index" },
    ] as QuartzPluginData[];

    expect(drawingLinks(data, published).sort()).toEqual([
      "agents",
      "alignment/life-structure/",
      "alignment/tasks",
    ]);
  });
});
