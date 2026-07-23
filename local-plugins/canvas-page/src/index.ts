export { CanvasPage } from "./pageType";
export { default as CanvasBody } from "./components/CanvasBody";
export { CanvasFrame } from "./frames/CanvasFrame";

export type { CanvasPageOptions } from "./types";

export type {
  CanvasData,
  CanvasNode,
  CanvasTextNode,
  CanvasFileNode,
  CanvasLinkNode,
  CanvasGroupNode,
  CanvasEdge,
  CanvasColor,
  CanvasSide,
  CanvasEnd,
  CanvasBackgroundStyle,
} from "./types";

export type {
  QuartzComponent,
  QuartzComponentProps,
  QuartzComponentConstructor,
  QuartzPageTypePlugin,
  QuartzPageTypePluginInstance,
  PageMatcher,
  PageGenerator,
  VirtualPage,
} from "@quartz-community/types";
