// src/util/lang.ts
function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

// src/components/scripts/tocRail.inline.ts
var tocRail_inline_default = 'function i(){let e=document.querySelector(".center");if(!e)return;let n=window.innerWidth-e.getBoundingClientRect().left+12;document.documentElement.style.setProperty("--toc-rail-right",`${n}px`)}function s(e){if(e.target.closest("a")){this.classList.contains("expanded")||(e.preventDefault(),this.classList.add("expanded"));return}this.classList.toggle("expanded")}function o(e){let t=document.getElementsByClassName("toc-rail");for(let n of t)n.contains(e.target)||n.classList.remove("expanded")}function a(){let e=Array.from(document.getElementsByClassName("toc-rail"));for(let t of e)t.addEventListener("click",s),window.addCleanup(()=>t.removeEventListener("click",s));document.addEventListener("click",o),window.addCleanup(()=>document.removeEventListener("click",o)),i(),window.addEventListener("resize",i),window.addCleanup(()=>window.removeEventListener("resize",i))}document.addEventListener("nav",a);document.addEventListener("render",a);\n';

// src/components/styles/tocRail.scss
var tocRail_default = `@charset "UTF-8";
.toc-rail {
  position: fixed;
  top: 6rem;
  left: 0;
  z-index: 20;
  max-height: calc(100vh - 8rem);
  overflow: hidden;
  width: 14px;
  background: var(--light);
  border-right: 1px solid var(--lightgray);
  border-radius: 0 6px 6px 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  transition: width 0.2s ease;
}
.toc-rail:hover, .toc-rail.expanded {
  width: min(320px, 70vw);
  overflow-y: auto;
}
@media all and (max-width: 600px) {
  .toc-rail:hover, .toc-rail.expanded {
    width: min(260px, 80vw);
  }
}

.toc-rail-list {
  list-style: none;
  margin: 0;
  padding: 0.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.toc-rail-item > a {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.15rem 0.35rem;
  white-space: nowrap;
  color: var(--darkgray);
}
.toc-rail-item > a:hover {
  color: var(--secondary);
}
.toc-rail-item.depth-0 > a {
  padding-left: calc(0.35rem + 0 * 0.75rem);
}
.toc-rail-item.depth-1 > a {
  padding-left: calc(0.35rem + 1 * 0.75rem);
}
.toc-rail-item.depth-2 > a {
  padding-left: calc(0.35rem + 2 * 0.75rem);
}
.toc-rail-item.depth-3 > a {
  padding-left: calc(0.35rem + 3 * 0.75rem);
}
.toc-rail-item.depth-4 > a {
  padding-left: calc(0.35rem + 4 * 0.75rem);
}
.toc-rail-item.depth-5 > a {
  padding-left: calc(0.35rem + 5 * 0.75rem);
}

.toc-rail-tick {
  flex-shrink: 0;
  width: 8px;
  height: 2px;
  border-radius: 1px;
  background: var(--gray);
}

.toc-rail-label {
  opacity: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.85rem;
  transition: opacity 0.15s ease;
}

.toc-rail:hover .toc-rail-label,
.toc-rail.expanded .toc-rail-label {
  opacity: 1;
}

/* LOCI PATCH (whole block) \u2014 Desktop (LessWrong-style): the viewport-edge strip above is a mobile/tablet
   fallback. Here the rail instead sits right beside the text, and the whole
   left margin \u2014 not just the 14px tick column \u2014 reveals it on hover, so the
   pointer doesn't have to land exactly on a dash.
   1200px mirrors quartz/styles/variables.scss's $desktop; this fork builds
   standalone and can't import that partial, so it's duplicated as a literal. */
@media all and (min-width: 1200px) {
  .toc-rail {
    top: var(--topbar-h, 2.7rem);
    bottom: 0;
    left: 0;
    right: var(--toc-rail-right, 240px);
    width: auto;
    max-height: none;
    overflow: visible;
    background: none;
    border-right: none;
    border-radius: 0;
    box-shadow: none;
    transition: none;
  }
  .toc-rail:hover, .toc-rail.expanded {
    width: auto;
    overflow: visible;
  }
  body:not(.nav-off) .toc-rail {
    left: var(--sidebar-w, 240px);
  }
  .toc-rail-list {
    position: absolute;
    top: calc(6rem - var(--topbar-h, 2.7rem));
    right: 0;
    max-height: calc(100% - 4rem);
    width: 14px;
    overflow: hidden;
    overflow-y: auto;
    padding: 0.5rem 0;
    background: var(--light);
    border-left: 1px solid var(--lightgray);
    border-radius: 6px 0 0 6px;
    box-shadow: -1px 0 4px rgba(0, 0, 0, 0.08);
    transition: width 0.2s ease 0.2s;
    gap: 0.225rem;
    z-index: 10;
  }
  .toc-rail:hover .toc-rail-list,
  .toc-rail.expanded .toc-rail-list,
  .toc-rail:focus-within .toc-rail-list {
    width: min(320px, 70vw);
    transition-delay: 0s;
  }
  .toc-rail-label {
    transition: opacity 0.15s ease 0.2s;
  }
  .toc-rail:hover .toc-rail-label,
  .toc-rail.expanded .toc-rail-label,
  .toc-rail:focus-within .toc-rail-label {
    opacity: 1;
    transition-delay: 0s;
  }
  .toc-rail-item > a {
    padding-top: 0.225rem;
    padding-bottom: 0.225rem;
  }
}`;
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