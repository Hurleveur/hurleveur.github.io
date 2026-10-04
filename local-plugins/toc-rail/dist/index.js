// src/util/lang.ts
function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

// src/components/scripts/tocRail.inline.ts
var tocRail_inline_default = 'function d(r){let o=Array.from(r.querySelectorAll(".toc-rail-item > a")).map(e=>{let t=e.getAttribute("data-for"),n=t&&document.getElementById(t);return n?{link:e,heading:n}:null}).filter(e=>e!==null);if(o.length===0)return;let a=document.querySelector(".sidebar.left")?.getBoundingClientRect().height||43,c=new IntersectionObserver(e=>{for(let t of e){if(!t.isIntersecting)continue;let n=o.find(i=>i.heading===t.target);if(n){for(let{link:i}of o)i.classList.remove("active");n.link.classList.add("active")}}},{rootMargin:`-${a+8}px 0px -80% 0px`,threshold:0});for(let{heading:e}of o)c.observe(e);window.addCleanup(()=>c.disconnect())}function l(){let r=Array.from(document.getElementsByClassName("toc-rail"));for(let s of r)d(s)}document.addEventListener("nav",l);document.addEventListener("render",l);\n';

// src/components/styles/tocRail.scss
var tocRail_default = ".toc-rail {\n  display: none;\n}\n\n@media all and (min-width: 1411px) {\n  body.nav-off .toc-rail {\n    display: block;\n    position: fixed;\n    top: var(--topbar-h, 2.7rem);\n    left: 0;\n    bottom: 0;\n    width: var(--sidebar-w, 240px);\n    box-sizing: border-box;\n    overflow-y: auto;\n    padding: 1.2rem 1rem 1.2rem 1.4rem;\n  }\n}\n.toc-rail-list {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  display: flex;\n  flex-direction: column;\n  gap: 0.35rem;\n}\n\n.toc-rail-item > a {\n  display: block;\n  color: var(--gray);\n  font-family: var(--bodyFont);\n  font-size: 0.8rem;\n  line-height: 1.3;\n  text-decoration: none;\n  overflow-wrap: break-word;\n  transition: color 0.15s ease;\n}\n.toc-rail-item > a:hover {\n  color: var(--darkgray);\n}\n.toc-rail-item > a.active {\n  color: var(--darkgray);\n}\n.toc-rail-item.depth-0 > a {\n  padding-left: calc(0 * 0.7rem);\n}\n.toc-rail-item.depth-1 > a {\n  padding-left: calc(1 * 0.7rem);\n}\n.toc-rail-item.depth-2 > a {\n  padding-left: calc(2 * 0.7rem);\n}\n.toc-rail-item.depth-3 > a {\n  padding-left: calc(3 * 0.7rem);\n}\n.toc-rail-item.depth-4 > a {\n  padding-left: calc(4 * 0.7rem);\n}\n.toc-rail-item.depth-5 > a {\n  padding-left: calc(5 * 0.7rem);\n}";
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
  if (!toc || toc.length < 3) {
    return null;
  }
  return /* @__PURE__ */ u2("nav", { class: classNames(displayClass, "toc-rail"), "aria-label": "Table of contents", children: /* @__PURE__ */ u2("ul", { class: "toc-rail-list", children: toc.map((entry) => /* @__PURE__ */ u2("li", { class: `toc-rail-item depth-${entry.depth}`, children: /* @__PURE__ */ u2("a", { href: `#${entry.slug}`, "data-for": entry.slug, children: entry.text }) }, entry.slug)) }) });
};
TocRail.afterDOMLoaded = tocRail_inline_default;
TocRail.css = tocRail_default;
var TocRail_default = (() => TocRail);

export { TocRail_default as TocRail };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map