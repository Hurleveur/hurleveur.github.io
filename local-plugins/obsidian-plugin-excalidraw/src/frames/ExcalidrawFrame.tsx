import type { PageFrame, PageFrameProps } from "@quartz-community/types";
import type { ComponentChildren } from "preact";

export const ExcalidrawFrame: PageFrame = {
  name: "excalidraw",
  // LOCI PATCH: this used to force the whole page (.page[data-frame=excalidraw],
  // #quartz-body, .excalidraw-frame) to a full-bleed 100vh single-column grid so
  // the drawing filled the viewport on load. That's what made the drawing "not
  // sized to the page" for a reader who just wanted to read it: the canvas took
  // over the whole screen, wheel-scroll got hijacked into zoom, and text read at
  // whatever scale the full viewport happened to produce. The drawing now renders
  // as a normal, responsive element in the standard content column (ExcalidrawBody's
  // .excalidraw-view), and full-screen pan/zoom lives in a native <dialog> opened
  // from its ⤢ button — the dialog is promoted to the top layer by showModal(), so it sizes
  // against the real viewport on its own (see excalidraw.scss's .excalidraw-dialog)
  // without needing this frame to carve out 100vh. No frame-level CSS override
  // is needed any more; the sidebar toggle below is already position:fixed.
  render({ componentData, pageBody: Content, left }: PageFrameProps): unknown {
    const renderSlot = (Component: (props: typeof componentData) => unknown): ComponentChildren =>
      Component(componentData) as ComponentChildren;
    return (
      <div class="center excalidraw-frame">
        <button class="excalidraw-sidebar-toggle" type="button" aria-label="Toggle sidebar">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="excalidraw-sidebar-icon-open"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="excalidraw-sidebar-icon-close"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <aside class="excalidraw-sidebar">
          {left.map((BodyComponent) => renderSlot(BodyComponent))}
        </aside>
        <div class="excalidraw-stage">{renderSlot(Content)}</div>
      </div>
    );
  },
};
