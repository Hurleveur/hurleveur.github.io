import { createRequire } from 'module';

createRequire(import.meta.url);
var l;
l = { __e: function(n2, l2, u3, t2) {
  for (var i2, o2, r2; l2 = l2.__; ) if ((i2 = l2.__c) && !i2.__) try {
    if ((o2 = i2.constructor) && null != o2.getDerivedStateFromError && (i2.setState(o2.getDerivedStateFromError(n2)), r2 = i2.__d), null != i2.componentDidCatch && (i2.componentDidCatch(n2, t2 || {}), r2 = i2.__d), r2) return i2.__E = i2;
  } catch (l3) {
    n2 = l3;
  }
  throw n2;
} }, "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout;

// node_modules/preact/jsx-runtime/dist/jsxRuntime.mjs
var f2 = 0;
function u2(e2, t2, n2, o2, i2, u3) {
  t2 || (t2 = {});
  var a2, c2, p2 = t2;
  if ("ref" in p2) for (c2 in p2 = {}, t2) "ref" == c2 ? a2 = t2[c2] : p2[c2] = t2[c2];
  var l2 = { type: e2, props: p2, key: n2, ref: a2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f2, __i: -1, __u: 0, __source: i2, __self: u3 };
  if ("function" == typeof e2 && (a2 = e2.defaultProps)) for (c2 in a2) void 0 === p2[c2] && (p2[c2] = a2[c2]);
  return l.vnode && l.vnode(l2), l2;
}

// src/frames/ExcalidrawFrame.tsx
var ExcalidrawFrame = {
  name: "excalidraw",
  // LOCI PATCH: this used to force the whole page (.page[data-frame=excalidraw],
  // #quartz-body, .excalidraw-frame) to a full-bleed 100vh single-column grid so
  // the drawing filled the viewport on load. That's what made the drawing "not
  // sized to the page" for a reader who just wanted to read it: the canvas took
  // over the whole screen, wheel-scroll got hijacked into zoom, and text read at
  // whatever scale the full viewport happened to produce. The drawing now renders
  // as a normal, responsive element in the standard content column (ExcalidrawBody's
  // .excalidraw-thumb), and full-screen pan/zoom lives in a native <dialog> opened
  // on click — the dialog is promoted to the top layer by showModal(), so it sizes
  // against the real viewport on its own (see excalidraw.scss's .excalidraw-dialog)
  // without needing this frame to carve out 100vh. No frame-level CSS override
  // is needed any more; the sidebar toggle below is already position:fixed.
  render({ componentData, pageBody: Content, left }) {
    const renderSlot = (Component) => Component(componentData);
    return /* @__PURE__ */ u2("div", { class: "center excalidraw-frame", children: [
      /* @__PURE__ */ u2("button", { class: "excalidraw-sidebar-toggle", type: "button", "aria-label": "Toggle sidebar", children: [
        /* @__PURE__ */ u2(
          "svg",
          {
            xmlns: "http://www.w3.org/2000/svg",
            width: "16",
            height: "16",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            class: "excalidraw-sidebar-icon-open",
            children: [
              /* @__PURE__ */ u2("line", { x1: "3", y1: "6", x2: "21", y2: "6" }),
              /* @__PURE__ */ u2("line", { x1: "3", y1: "12", x2: "21", y2: "12" }),
              /* @__PURE__ */ u2("line", { x1: "3", y1: "18", x2: "21", y2: "18" })
            ]
          }
        ),
        /* @__PURE__ */ u2(
          "svg",
          {
            xmlns: "http://www.w3.org/2000/svg",
            width: "16",
            height: "16",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            class: "excalidraw-sidebar-icon-close",
            children: [
              /* @__PURE__ */ u2("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
              /* @__PURE__ */ u2("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ u2("aside", { class: "excalidraw-sidebar", children: left.map((BodyComponent) => renderSlot(BodyComponent)) }),
      /* @__PURE__ */ u2("div", { class: "excalidraw-stage", children: renderSlot(Content) })
    ] });
  }
};

export { ExcalidrawFrame };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map