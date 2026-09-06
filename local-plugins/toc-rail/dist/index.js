// src/util/lang.ts
function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

// src/components/scripts/tocRail.inline.ts
var tocRail_inline_default = 'function s(e){if(e.target.closest("a")){this.classList.contains("expanded")||(e.preventDefault(),this.classList.add("expanded"));return}this.classList.toggle("expanded")}function i(e){let t=document.getElementsByClassName("toc-rail");for(let n of t)n.contains(e.target)||n.classList.remove("expanded")}function a(){let e=Array.from(document.getElementsByClassName("toc-rail"));for(let t of e)t.addEventListener("click",s),window.addCleanup(()=>t.removeEventListener("click",s));document.addEventListener("click",i),window.addCleanup(()=>document.removeEventListener("click",i))}document.addEventListener("nav",a);document.addEventListener("render",a);\n';

// src/components/styles/tocRail.scss
var tocRail_default = ".toc-rail {\n  position: fixed;\n  top: 6rem;\n  left: 0;\n  z-index: 20;\n  max-height: calc(100vh - 8rem);\n  overflow: hidden;\n  width: 14px;\n  background: var(--light);\n  border-right: 1px solid var(--lightgray);\n  border-radius: 0 6px 6px 0;\n  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);\n  transition: width 0.2s ease;\n}\n.toc-rail:hover, .toc-rail.expanded {\n  width: min(320px, 70vw);\n  overflow-y: auto;\n}\n@media all and (max-width: 600px) {\n  .toc-rail:hover, .toc-rail.expanded {\n    width: min(260px, 80vw);\n  }\n}\n\n.toc-rail-list {\n  list-style: none;\n  margin: 0;\n  padding: 0.5rem 0;\n  display: flex;\n  flex-direction: column;\n  gap: 0.15rem;\n}\n\n.toc-rail-item > a {\n  display: flex;\n  align-items: center;\n  gap: 0.6rem;\n  padding: 0.15rem 0.35rem;\n  white-space: nowrap;\n  color: var(--darkgray);\n}\n.toc-rail-item > a:hover {\n  color: var(--secondary);\n}\n.toc-rail-item.depth-0 > a {\n  padding-left: calc(0.35rem + 0 * 0.75rem);\n}\n.toc-rail-item.depth-1 > a {\n  padding-left: calc(0.35rem + 1 * 0.75rem);\n}\n.toc-rail-item.depth-2 > a {\n  padding-left: calc(0.35rem + 2 * 0.75rem);\n}\n.toc-rail-item.depth-3 > a {\n  padding-left: calc(0.35rem + 3 * 0.75rem);\n}\n.toc-rail-item.depth-4 > a {\n  padding-left: calc(0.35rem + 4 * 0.75rem);\n}\n.toc-rail-item.depth-5 > a {\n  padding-left: calc(0.35rem + 5 * 0.75rem);\n}\n\n.toc-rail-tick {\n  flex-shrink: 0;\n  width: 8px;\n  height: 2px;\n  border-radius: 1px;\n  background: var(--gray);\n}\n\n.toc-rail-label {\n  opacity: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  font-size: 0.85rem;\n  transition: opacity 0.15s ease;\n}\n\n.toc-rail:hover .toc-rail-label,\n.toc-rail.expanded .toc-rail-label {\n  opacity: 1;\n}";
var l;
l = { __e: function(n2, l2, u3, t2) {
  for (var i2, r2, o2; l2 = l2.__; ) if ((i2 = l2.__c) && !i2.__) try {
    if ((r2 = i2.constructor) && null != r2.getDerivedStateFromError && (i2.setState(r2.getDerivedStateFromError(n2)), o2 = i2.__d), null != i2.componentDidCatch && (i2.componentDidCatch(n2, t2 || {}), o2 = i2.__d), o2) return i2.__E = i2;
  } catch (l3) {
    n2 = l3;
  }
  throw n2;
} }, "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, Math.random().toString(8);

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

// src/components/TocRail.tsx
var TocRail = ({ displayClass, fileData }) => {
  const toc = fileData?.toc;
  if (!toc || toc.length === 0) {
    return null;
  }
  return /* @__PURE__ */ u2("nav", { class: classNames(displayClass, "toc-rail"), "aria-label": "Table of contents", children: /* @__PURE__ */ u2("ul", { class: "toc-rail-list", children: toc.map((entry) => /* @__PURE__ */ u2("li", { class: `toc-rail-item depth-${entry.depth}`, children: /* @__PURE__ */ u2("a", { href: `#${entry.slug}`, "data-for": entry.slug, children: [
    /* @__PURE__ */ u2("span", { class: "toc-rail-tick" }),
    /* @__PURE__ */ u2("span", { class: "toc-rail-label", children: entry.text })
  ] }) }, entry.slug)) }) });
};
TocRail.afterDOMLoaded = tocRail_inline_default;
TocRail.css = tocRail_default;
var TocRail_default = (() => TocRail);

export { TocRail_default as TocRail };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map