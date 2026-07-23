export type {
  BuildCtx,
  FullSlug,
  FilePath,
  ProcessedContent,
  QuartzPluginData,
  PageMatcher,
  PageGenerator,
  VirtualPage,
  QuartzPageTypePlugin,
  QuartzPageTypePluginInstance,
  QuartzComponent,
  QuartzComponentProps,
  QuartzComponentConstructor,
  GlobalConfiguration,
} from "@quartz-community/types";

// ============================================================================
// JSON Canvas Spec 1.0 Types
// https://jsoncanvas.org/spec/1.0/
// ============================================================================

/**
 * Preset color values (1-6) or hex color strings (#RRGGBB).
 * Presets: 1=red, 2=orange, 3=yellow, 4=green, 5=cyan, 6=purple
 */
export type CanvasColor = "1" | "2" | "3" | "4" | "5" | "6" | `#${string}`;

/** Side of a node where an edge connects */
export type CanvasSide = "top" | "right" | "bottom" | "left";

/** End shape of an edge endpoint */
export type CanvasEnd = "none" | "arrow";

/** Background style for group nodes */
export type CanvasBackgroundStyle = "cover" | "ratio" | "repeat";

// ============================================================================
// Node Types
// ============================================================================

/** Common properties shared by all node types */
interface CanvasNodeBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: CanvasColor;
}

/** Text node — contains Markdown text */
export interface CanvasTextNode extends CanvasNodeBase {
  type: "text";
  text: string;
}

/** File node — references a file in the vault */
export interface CanvasFileNode extends CanvasNodeBase {
  type: "file";
  file: string;
  subpath?: string;
}

/** Link node — references an external URL */
export interface CanvasLinkNode extends CanvasNodeBase {
  type: "link";
  url: string;
}

/** Group node — visual grouping container */
export interface CanvasGroupNode extends CanvasNodeBase {
  type: "group";
  label?: string;
  background?: string;
  backgroundStyle?: CanvasBackgroundStyle;
}

/** Union of all node types */
export type CanvasNode = CanvasTextNode | CanvasFileNode | CanvasLinkNode | CanvasGroupNode;

// ============================================================================
// Edge Types
// ============================================================================

/** A connection between two nodes */
export interface CanvasEdge {
  id: string;
  fromNode: string;
  fromSide?: CanvasSide;
  fromEnd?: CanvasEnd;
  toNode: string;
  toSide?: CanvasSide;
  toEnd?: CanvasEnd;
  color?: CanvasColor;
  label?: string;
}

// ============================================================================
// Canvas Document
// ============================================================================

/** Top-level JSON Canvas document structure */
export interface CanvasData {
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
}

// ============================================================================
// Plugin Options
// ============================================================================

export interface CanvasPageOptions {
  /** Enable pan/zoom interaction on the canvas. Default: true */
  enableInteraction?: boolean;
  /** Initial zoom level. Default: 1 */
  initialZoom?: number;
  /** Minimum zoom level. Default: 0.1 */
  minZoom?: number;
  /** Maximum zoom level. Default: 5 */
  maxZoom?: number;
}

/** Preset color map: preset number → CSS color value */
export const CANVAS_PRESET_COLORS: Record<string, string> = {
  "1": "#fb464c",
  "2": "#e9973f",
  "3": "#e0de71",
  "4": "#44cf6e",
  "5": "#53dfdd",
  "6": "#a882ff",
};
