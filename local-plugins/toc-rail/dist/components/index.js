// src/util/lang.ts
function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

// src/components/scripts/tocRail.inline.ts
var tocRail_inline_default = 'function E(o){let e=document.querySelector(".center");if(!e)return;let a=e.getBoundingClientRect().left,s=document.querySelector(".explorer")?.getBoundingClientRect(),r=!document.body.classList.contains("nav-off")&&!!s&&s.width>100&&s.right<=a&&s?s.right:0,t=a-r;o.style.left=`${r}px`,o.style.width=`${Math.max(0,t)}px`,o.classList.toggle("toc-rail-off",t<8);let d=t<170;o.classList.toggle("toc-rail-narrow",d),o.style.setProperty("--rail-x",`${d?Math.round(t/2):17}px`);let m=Array.from(o.querySelectorAll(".toc-rail-item")),w=document.documentElement.scrollHeight,i=m.map(n=>{let c=n.dataset.for,l=c?document.getElementById(c):null;return l?l.getBoundingClientRect().top+window.scrollY:0});return m.forEach((n,c)=>{let l=i[c+1]??w;n.style.flexGrow=String(Math.max(0,l-(i[c]??0))/w)}),i}function L(){let o=Array.from(document.getElementsByClassName("toc-rail"));for(let e of o){document.body.appendChild(e);let a=E(e)??[],s=Array.from(e.querySelectorAll(".toc-rail-item")),u=e.querySelector(".toc-rail-progress"),r=()=>{let n=document.documentElement.scrollHeight;u&&(u.style.top=`${window.scrollY/n*100}%`,u.style.height=`${window.innerHeight/n*100}%`);let c=window.scrollY+window.innerHeight*.2,l=0;a.forEach((f,g)=>{f<=c&&(l=g)}),s.forEach((f,g)=>f.classList.toggle("active",g===l))},t=()=>{a=E(e)??[],r()};r();let d=new MutationObserver(t);d.observe(document.body,{attributes:!0,attributeFilter:["class"]});let m=window.setTimeout(t,1500),w=n=>{e.classList.contains("toc-rail-narrow")&&n.target.closest("a")&&(document.activeElement?.blur(),e.classList.add("toc-rail-shut"))},i=()=>e.classList.remove("toc-rail-shut");e.addEventListener("click",w),e.addEventListener("pointerdown",i),e.addEventListener("pointerleave",i),window.addEventListener("scroll",r,{passive:!0}),window.addEventListener("resize",t),window.addCleanup(()=>{e.remove(),d.disconnect(),window.clearTimeout(m),window.removeEventListener("scroll",r),window.removeEventListener("resize",t)})}}document.addEventListener("nav",L);\n';

// src/components/styles/tocRail.scss
var tocRail_default = '.toc-rail {\n  position: fixed;\n  top: var(--topbar-h, 2.7rem);\n  bottom: 0;\n  left: 0;\n  z-index: 6;\n  display: flex;\n  padding: 1.4rem 0 1.4rem var(--rail-x, 17px);\n  outline: none;\n  box-sizing: border-box;\n  font-family: var(--bodyFont);\n}\n.toc-rail.toc-rail-off {\n  display: none;\n}\n\n.toc-rail-line {\n  position: relative;\n  flex: none;\n  width: 1px;\n  background: var(--lightgray);\n}\n\n.toc-rail-progress {\n  position: absolute;\n  left: 0;\n  width: 1px;\n  background: var(--darkgray);\n}\n\n.toc-rail-list {\n  list-style: none;\n  margin: 0 0 0 -4px;\n  padding: 0;\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  min-width: 0;\n}\n\n.toc-rail-item {\n  flex: 0 1 0%;\n  min-height: 0;\n  margin: 0;\n  position: relative;\n  padding-left: 14px;\n}\n.toc-rail-item::before {\n  content: "";\n  position: absolute;\n  left: 1px;\n  top: 0.55em;\n  width: 7px;\n  height: 1px;\n  background: var(--gray);\n}\n.toc-rail-item > a {\n  display: block;\n  color: var(--gray);\n  font-size: 0.78rem;\n  line-height: 1.3;\n  padding: 0.1rem 0.75rem 0.25rem 0;\n  text-decoration: none;\n  overflow-wrap: break-word;\n  opacity: 0;\n  transition: opacity 0.25s, color 0.15s;\n}\n.toc-rail-item > a:hover {\n  color: var(--darkgray);\n}\n.toc-rail-item.active > a {\n  color: var(--darkgray);\n}\n.toc-rail-item.active::before {\n  background: var(--darkgray);\n}\n.toc-rail-item.depth-2 > a {\n  padding-left: calc(1 * 0.75rem);\n}\n.toc-rail-item.depth-3 > a {\n  padding-left: calc(2 * 0.75rem);\n}\n.toc-rail-item.depth-4 > a {\n  padding-left: calc(3 * 0.75rem);\n}\n.toc-rail-item.depth-5 > a {\n  padding-left: calc(4 * 0.75rem);\n}\n.toc-rail-item.depth-6 > a {\n  padding-left: calc(5 * 0.75rem);\n}\n\n.toc-rail-title::before {\n  display: none;\n}\n.toc-rail-title > a {\n  font-family: var(--headerFont);\n  font-size: 0.9rem;\n  font-weight: 600;\n  padding-bottom: 0.6rem;\n}\n\n.toc-rail:hover .toc-rail-item > a,\n.toc-rail:focus-within .toc-rail-item > a {\n  opacity: 1;\n}\n\n.toc-rail.toc-rail-narrow .toc-rail-list {\n  position: absolute;\n  top: 1.4rem;\n  bottom: 1.4rem;\n  left: calc(var(--rail-x, 17px) - 4px);\n  width: 260px;\n  margin: 0;\n  pointer-events: none;\n  transition: background 0.25s, box-shadow 0.25s;\n}\n\n.toc-rail.toc-rail-narrow:hover .toc-rail-list,\n.toc-rail.toc-rail-narrow:focus-within .toc-rail-list {\n  pointer-events: auto;\n  background: var(--light);\n  box-shadow: 4px 0 12px rgba(0, 0, 0, 0.08);\n}\n\n.toc-rail.toc-rail-narrow.toc-rail-shut .toc-rail-list {\n  pointer-events: none;\n  background: none;\n  box-shadow: none;\n}\n.toc-rail.toc-rail-narrow.toc-rail-shut .toc-rail-item > a {\n  opacity: 0;\n}';
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
  const title = fileData?.frontmatter?.title ?? "";
  return /* @__PURE__ */ u2("nav", { class: classNames(displayClass, "toc-rail"), "aria-label": "Table of contents", tabindex: -1, children: [
    /* @__PURE__ */ u2("div", { class: "toc-rail-line", children: /* @__PURE__ */ u2("div", { class: "toc-rail-progress" }) }),
    /* @__PURE__ */ u2("ol", { class: "toc-rail-list", children: [
      /* @__PURE__ */ u2("li", { class: "toc-rail-item toc-rail-title", "data-for": "", children: /* @__PURE__ */ u2("a", { href: "#", children: title }) }),
      toc.map((entry) => /* @__PURE__ */ u2("li", { class: `toc-rail-item depth-${entry.depth}`, "data-for": entry.slug, children: /* @__PURE__ */ u2("a", { href: `#${entry.slug}`, "data-for": entry.slug, children: entry.text }) }, entry.slug))
    ] })
  ] });
};
TocRail.afterDOMLoaded = tocRail_inline_default;
TocRail.css = tocRail_default;
var TocRail_default = (() => TocRail);

export { TocRail_default as TocRail };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map