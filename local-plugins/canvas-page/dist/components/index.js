var __defProp = Object.defineProperty;
var __export = (target, all2) => {
  for (var name in all2)
    __defProp(target, name, { get: all2[name], enumerable: true });
};

// node_modules/@quartz-community/utils/dist/path.js
function isRelativeURL(s2) {
  const validStart = /^\.{1,2}/.test(s2);
  const validEnding = !endsWith(s2, "index");
  return validStart && validEnding && ![".md", ".html"].includes(getFileExtension(s2) ?? "");
}
function simplifySlug(fp) {
  const res = stripSlashes(trimSuffix(fp, "index"), true);
  return res.length === 0 ? "/" : res;
}
function slugifyFilePath(fp, excludeExt) {
  fp = stripSlashes(fp);
  const ext = getFileExtension(fp);
  const withoutFileExt = fp.replace(new RegExp(ext + "$"), "");
  const finalExt = [".md", ".html", void 0].includes(ext) ? "" : ext;
  let slug2 = _sluggify(withoutFileExt);
  if (endsWith(slug2, "_index")) {
    slug2 = slug2.replace(/_index$/, "index");
  }
  const segments = slug2.split("/");
  if (segments.length >= 2 && segments[segments.length - 1] === segments[segments.length - 2]) {
    segments[segments.length - 1] = "index";
    slug2 = segments.join("/");
  }
  return slug2 + (finalExt ?? "");
}
function joinSegments(...args) {
  if (args.length === 0) {
    return "";
  }
  let joined = args.filter((segment) => segment !== "" && segment !== "/").map((segment) => stripSlashes(segment)).join("/");
  const first = args[0];
  const last = args[args.length - 1];
  if (first?.startsWith("/")) {
    joined = "/" + joined;
  }
  if (last?.endsWith("/")) {
    joined = joined + "/";
  }
  return joined;
}
function endsWith(s2, suffix) {
  return s2 === suffix || s2.endsWith("/" + suffix);
}
function trimSuffix(s2, suffix) {
  if (endsWith(s2, suffix)) {
    s2 = s2.slice(0, -suffix.length);
  }
  return s2;
}
function stripSlashes(s2, onlyStripPrefix) {
  if (s2.startsWith("/")) {
    s2 = s2.substring(1);
  }
  if (!onlyStripPrefix && s2.endsWith("/")) {
    s2 = s2.slice(0, -1);
  }
  return s2;
}
function getFileExtension(s2) {
  return s2.match(/\.[A-Za-z0-9]+$/)?.[0];
}
function pathToRoot(slug2) {
  let rootPath = slug2.split("/").filter((x2) => x2 !== "").slice(0, -1).map((_2) => "..").join("/");
  if (rootPath.length === 0) {
    rootPath = ".";
  }
  return rootPath;
}
function resolveRelative(current, target) {
  const res = joinSegments(pathToRoot(current), simplifySlug(target));
  return res;
}
function slugifyPath(s2) {
  return s2.split("/").map(
    (segment) => segment.replace(/\s/g, "-").replace(/&/g, "-and-").replace(/%/g, "-percent").replace(/\?/g, "").replace(/#/g, "").replace(/[<>:"|*]/g, "").toLowerCase()
  ).join("/").replace(/\/$/, "");
}
function normalizeHastElement(rawEl, curBase, newBase) {
  const el = structuredClone(rawEl);
  _rebaseHastElement(el, "src", curBase, newBase);
  _rebaseHastElement(el, "href", curBase, newBase);
  if (el.children) {
    el.children = el.children.map(
      (child) => child.type === "element" ? normalizeHastElement(child, curBase, newBase) : child
    );
  }
  return el;
}
function _rebaseHastElement(el, attr, curBase, newBase) {
  const value = el.properties?.[attr];
  if (value === void 0 || value === null) return;
  const href = String(value);
  if (!isRelativeURL(href)) return;
  el.properties[attr] = joinSegments(resolveRelative(curBase, newBase), "..", href);
}
function _sluggify(s2) {
  return slugifyPath(s2);
}

// node_modules/html-void-elements/index.js
var htmlVoidElements = [
  "area",
  "base",
  "basefont",
  "bgsound",
  "br",
  "col",
  "command",
  "embed",
  "frame",
  "hr",
  "image",
  "img",
  "input",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
];

// node_modules/property-information/lib/util/schema.js
var Schema = class {
  /**
   * @param {SchemaType['property']} property
   *   Property.
   * @param {SchemaType['normal']} normal
   *   Normal.
   * @param {Space | undefined} [space]
   *   Space.
   * @returns
   *   Schema.
   */
  constructor(property, normal, space) {
    this.normal = normal;
    this.property = property;
    if (space) {
      this.space = space;
    }
  }
};
Schema.prototype.normal = {};
Schema.prototype.property = {};
Schema.prototype.space = void 0;

// node_modules/property-information/lib/util/merge.js
function merge(definitions, space) {
  const property = {};
  const normal = {};
  for (const definition of definitions) {
    Object.assign(property, definition.property);
    Object.assign(normal, definition.normal);
  }
  return new Schema(property, normal, space);
}

// node_modules/property-information/lib/normalize.js
function normalize(value) {
  return value.toLowerCase();
}

// node_modules/property-information/lib/util/info.js
var Info = class {
  /**
   * @param {string} property
   *   Property.
   * @param {string} attribute
   *   Attribute.
   * @returns
   *   Info.
   */
  constructor(property, attribute) {
    this.attribute = attribute;
    this.property = property;
  }
};
Info.prototype.attribute = "";
Info.prototype.booleanish = false;
Info.prototype.boolean = false;
Info.prototype.commaOrSpaceSeparated = false;
Info.prototype.commaSeparated = false;
Info.prototype.defined = false;
Info.prototype.mustUseProperty = false;
Info.prototype.number = false;
Info.prototype.overloadedBoolean = false;
Info.prototype.property = "";
Info.prototype.spaceSeparated = false;
Info.prototype.space = void 0;

// node_modules/property-information/lib/util/types.js
var types_exports = {};
__export(types_exports, {
  boolean: () => boolean,
  booleanish: () => booleanish,
  commaOrSpaceSeparated: () => commaOrSpaceSeparated,
  commaSeparated: () => commaSeparated,
  number: () => number,
  overloadedBoolean: () => overloadedBoolean,
  spaceSeparated: () => spaceSeparated
});
var powers = 0;
var boolean = increment();
var booleanish = increment();
var overloadedBoolean = increment();
var number = increment();
var spaceSeparated = increment();
var commaSeparated = increment();
var commaOrSpaceSeparated = increment();
function increment() {
  return 2 ** ++powers;
}

// node_modules/property-information/lib/util/defined-info.js
var checks = (
  /** @type {ReadonlyArray<keyof typeof types>} */
  Object.keys(types_exports)
);
var DefinedInfo = class extends Info {
  /**
   * @constructor
   * @param {string} property
   *   Property.
   * @param {string} attribute
   *   Attribute.
   * @param {number | null | undefined} [mask]
   *   Mask.
   * @param {Space | undefined} [space]
   *   Space.
   * @returns
   *   Info.
   */
  constructor(property, attribute, mask, space) {
    let index = -1;
    super(property, attribute);
    mark(this, "space", space);
    if (typeof mask === "number") {
      while (++index < checks.length) {
        const check = checks[index];
        mark(this, checks[index], (mask & types_exports[check]) === types_exports[check]);
      }
    }
  }
};
DefinedInfo.prototype.defined = true;
function mark(values, key2, value) {
  if (value) {
    values[key2] = value;
  }
}

// node_modules/property-information/lib/util/create.js
function create(definition) {
  const properties = {};
  const normals = {};
  for (const [property, value] of Object.entries(definition.properties)) {
    const info = new DefinedInfo(
      property,
      definition.transform(definition.attributes || {}, property),
      value,
      definition.space
    );
    if (definition.mustUseProperty && definition.mustUseProperty.includes(property)) {
      info.mustUseProperty = true;
    }
    properties[property] = info;
    normals[normalize(property)] = property;
    normals[normalize(info.attribute)] = property;
  }
  return new Schema(properties, normals, definition.space);
}

// node_modules/property-information/lib/aria.js
var aria = create({
  properties: {
    ariaActiveDescendant: null,
    ariaAtomic: booleanish,
    ariaAutoComplete: null,
    ariaBusy: booleanish,
    ariaChecked: booleanish,
    ariaColCount: number,
    ariaColIndex: number,
    ariaColSpan: number,
    ariaControls: spaceSeparated,
    ariaCurrent: null,
    ariaDescribedBy: spaceSeparated,
    ariaDetails: null,
    ariaDisabled: booleanish,
    ariaDropEffect: spaceSeparated,
    ariaErrorMessage: null,
    ariaExpanded: booleanish,
    ariaFlowTo: spaceSeparated,
    ariaGrabbed: booleanish,
    ariaHasPopup: null,
    ariaHidden: booleanish,
    ariaInvalid: null,
    ariaKeyShortcuts: null,
    ariaLabel: null,
    ariaLabelledBy: spaceSeparated,
    ariaLevel: number,
    ariaLive: null,
    ariaModal: booleanish,
    ariaMultiLine: booleanish,
    ariaMultiSelectable: booleanish,
    ariaOrientation: null,
    ariaOwns: spaceSeparated,
    ariaPlaceholder: null,
    ariaPosInSet: number,
    ariaPressed: booleanish,
    ariaReadOnly: booleanish,
    ariaRelevant: null,
    ariaRequired: booleanish,
    ariaRoleDescription: spaceSeparated,
    ariaRowCount: number,
    ariaRowIndex: number,
    ariaRowSpan: number,
    ariaSelected: booleanish,
    ariaSetSize: number,
    ariaSort: null,
    ariaValueMax: number,
    ariaValueMin: number,
    ariaValueNow: number,
    ariaValueText: null,
    role: null
  },
  transform(_2, property) {
    return property === "role" ? property : "aria-" + property.slice(4).toLowerCase();
  }
});

// node_modules/property-information/lib/util/case-sensitive-transform.js
function caseSensitiveTransform(attributes, attribute) {
  return attribute in attributes ? attributes[attribute] : attribute;
}

// node_modules/property-information/lib/util/case-insensitive-transform.js
function caseInsensitiveTransform(attributes, property) {
  return caseSensitiveTransform(attributes, property.toLowerCase());
}

// node_modules/property-information/lib/html.js
var html = create({
  attributes: {
    acceptcharset: "accept-charset",
    classname: "class",
    htmlfor: "for",
    httpequiv: "http-equiv"
  },
  mustUseProperty: ["checked", "multiple", "muted", "selected"],
  properties: {
    // Standard Properties.
    abbr: null,
    accept: commaSeparated,
    acceptCharset: spaceSeparated,
    accessKey: spaceSeparated,
    action: null,
    allow: null,
    allowFullScreen: boolean,
    allowPaymentRequest: boolean,
    allowUserMedia: boolean,
    alt: null,
    as: null,
    async: boolean,
    autoCapitalize: null,
    autoComplete: spaceSeparated,
    autoFocus: boolean,
    autoPlay: boolean,
    blocking: spaceSeparated,
    capture: null,
    charSet: null,
    checked: boolean,
    cite: null,
    className: spaceSeparated,
    cols: number,
    colSpan: null,
    content: null,
    contentEditable: booleanish,
    controls: boolean,
    controlsList: spaceSeparated,
    coords: number | commaSeparated,
    crossOrigin: null,
    data: null,
    dateTime: null,
    decoding: null,
    default: boolean,
    defer: boolean,
    dir: null,
    dirName: null,
    disabled: boolean,
    download: overloadedBoolean,
    draggable: booleanish,
    encType: null,
    enterKeyHint: null,
    fetchPriority: null,
    form: null,
    formAction: null,
    formEncType: null,
    formMethod: null,
    formNoValidate: boolean,
    formTarget: null,
    headers: spaceSeparated,
    height: number,
    hidden: overloadedBoolean,
    high: number,
    href: null,
    hrefLang: null,
    htmlFor: spaceSeparated,
    httpEquiv: spaceSeparated,
    id: null,
    imageSizes: null,
    imageSrcSet: null,
    inert: boolean,
    inputMode: null,
    integrity: null,
    is: null,
    isMap: boolean,
    itemId: null,
    itemProp: spaceSeparated,
    itemRef: spaceSeparated,
    itemScope: boolean,
    itemType: spaceSeparated,
    kind: null,
    label: null,
    lang: null,
    language: null,
    list: null,
    loading: null,
    loop: boolean,
    low: number,
    manifest: null,
    max: null,
    maxLength: number,
    media: null,
    method: null,
    min: null,
    minLength: number,
    multiple: boolean,
    muted: boolean,
    name: null,
    nonce: null,
    noModule: boolean,
    noValidate: boolean,
    onAbort: null,
    onAfterPrint: null,
    onAuxClick: null,
    onBeforeMatch: null,
    onBeforePrint: null,
    onBeforeToggle: null,
    onBeforeUnload: null,
    onBlur: null,
    onCancel: null,
    onCanPlay: null,
    onCanPlayThrough: null,
    onChange: null,
    onClick: null,
    onClose: null,
    onContextLost: null,
    onContextMenu: null,
    onContextRestored: null,
    onCopy: null,
    onCueChange: null,
    onCut: null,
    onDblClick: null,
    onDrag: null,
    onDragEnd: null,
    onDragEnter: null,
    onDragExit: null,
    onDragLeave: null,
    onDragOver: null,
    onDragStart: null,
    onDrop: null,
    onDurationChange: null,
    onEmptied: null,
    onEnded: null,
    onError: null,
    onFocus: null,
    onFormData: null,
    onHashChange: null,
    onInput: null,
    onInvalid: null,
    onKeyDown: null,
    onKeyPress: null,
    onKeyUp: null,
    onLanguageChange: null,
    onLoad: null,
    onLoadedData: null,
    onLoadedMetadata: null,
    onLoadEnd: null,
    onLoadStart: null,
    onMessage: null,
    onMessageError: null,
    onMouseDown: null,
    onMouseEnter: null,
    onMouseLeave: null,
    onMouseMove: null,
    onMouseOut: null,
    onMouseOver: null,
    onMouseUp: null,
    onOffline: null,
    onOnline: null,
    onPageHide: null,
    onPageShow: null,
    onPaste: null,
    onPause: null,
    onPlay: null,
    onPlaying: null,
    onPopState: null,
    onProgress: null,
    onRateChange: null,
    onRejectionHandled: null,
    onReset: null,
    onResize: null,
    onScroll: null,
    onScrollEnd: null,
    onSecurityPolicyViolation: null,
    onSeeked: null,
    onSeeking: null,
    onSelect: null,
    onSlotChange: null,
    onStalled: null,
    onStorage: null,
    onSubmit: null,
    onSuspend: null,
    onTimeUpdate: null,
    onToggle: null,
    onUnhandledRejection: null,
    onUnload: null,
    onVolumeChange: null,
    onWaiting: null,
    onWheel: null,
    open: boolean,
    optimum: number,
    pattern: null,
    ping: spaceSeparated,
    placeholder: null,
    playsInline: boolean,
    popover: null,
    popoverTarget: null,
    popoverTargetAction: null,
    poster: null,
    preload: null,
    readOnly: boolean,
    referrerPolicy: null,
    rel: spaceSeparated,
    required: boolean,
    reversed: boolean,
    rows: number,
    rowSpan: number,
    sandbox: spaceSeparated,
    scope: null,
    scoped: boolean,
    seamless: boolean,
    selected: boolean,
    shadowRootClonable: boolean,
    shadowRootDelegatesFocus: boolean,
    shadowRootMode: null,
    shape: null,
    size: number,
    sizes: null,
    slot: null,
    span: number,
    spellCheck: booleanish,
    src: null,
    srcDoc: null,
    srcLang: null,
    srcSet: null,
    start: number,
    step: null,
    style: null,
    tabIndex: number,
    target: null,
    title: null,
    translate: null,
    type: null,
    typeMustMatch: boolean,
    useMap: null,
    value: booleanish,
    width: number,
    wrap: null,
    writingSuggestions: null,
    // Legacy.
    // See: https://html.spec.whatwg.org/#other-elements,-attributes-and-apis
    align: null,
    // Several. Use CSS `text-align` instead,
    aLink: null,
    // `<body>`. Use CSS `a:active {color}` instead
    archive: spaceSeparated,
    // `<object>`. List of URIs to archives
    axis: null,
    // `<td>` and `<th>`. Use `scope` on `<th>`
    background: null,
    // `<body>`. Use CSS `background-image` instead
    bgColor: null,
    // `<body>` and table elements. Use CSS `background-color` instead
    border: number,
    // `<table>`. Use CSS `border-width` instead,
    borderColor: null,
    // `<table>`. Use CSS `border-color` instead,
    bottomMargin: number,
    // `<body>`
    cellPadding: null,
    // `<table>`
    cellSpacing: null,
    // `<table>`
    char: null,
    // Several table elements. When `align=char`, sets the character to align on
    charOff: null,
    // Several table elements. When `char`, offsets the alignment
    classId: null,
    // `<object>`
    clear: null,
    // `<br>`. Use CSS `clear` instead
    code: null,
    // `<object>`
    codeBase: null,
    // `<object>`
    codeType: null,
    // `<object>`
    color: null,
    // `<font>` and `<hr>`. Use CSS instead
    compact: boolean,
    // Lists. Use CSS to reduce space between items instead
    declare: boolean,
    // `<object>`
    event: null,
    // `<script>`
    face: null,
    // `<font>`. Use CSS instead
    frame: null,
    // `<table>`
    frameBorder: null,
    // `<iframe>`. Use CSS `border` instead
    hSpace: number,
    // `<img>` and `<object>`
    leftMargin: number,
    // `<body>`
    link: null,
    // `<body>`. Use CSS `a:link {color: *}` instead
    longDesc: null,
    // `<frame>`, `<iframe>`, and `<img>`. Use an `<a>`
    lowSrc: null,
    // `<img>`. Use a `<picture>`
    marginHeight: number,
    // `<body>`
    marginWidth: number,
    // `<body>`
    noResize: boolean,
    // `<frame>`
    noHref: boolean,
    // `<area>`. Use no href instead of an explicit `nohref`
    noShade: boolean,
    // `<hr>`. Use background-color and height instead of borders
    noWrap: boolean,
    // `<td>` and `<th>`
    object: null,
    // `<applet>`
    profile: null,
    // `<head>`
    prompt: null,
    // `<isindex>`
    rev: null,
    // `<link>`
    rightMargin: number,
    // `<body>`
    rules: null,
    // `<table>`
    scheme: null,
    // `<meta>`
    scrolling: booleanish,
    // `<frame>`. Use overflow in the child context
    standby: null,
    // `<object>`
    summary: null,
    // `<table>`
    text: null,
    // `<body>`. Use CSS `color` instead
    topMargin: number,
    // `<body>`
    valueType: null,
    // `<param>`
    version: null,
    // `<html>`. Use a doctype.
    vAlign: null,
    // Several. Use CSS `vertical-align` instead
    vLink: null,
    // `<body>`. Use CSS `a:visited {color}` instead
    vSpace: number,
    // `<img>` and `<object>`
    // Non-standard Properties.
    allowTransparency: null,
    autoCorrect: null,
    autoSave: null,
    disablePictureInPicture: boolean,
    disableRemotePlayback: boolean,
    prefix: null,
    property: null,
    results: number,
    security: null,
    unselectable: null
  },
  space: "html",
  transform: caseInsensitiveTransform
});

// node_modules/property-information/lib/svg.js
var svg = create({
  attributes: {
    accentHeight: "accent-height",
    alignmentBaseline: "alignment-baseline",
    arabicForm: "arabic-form",
    baselineShift: "baseline-shift",
    capHeight: "cap-height",
    className: "class",
    clipPath: "clip-path",
    clipRule: "clip-rule",
    colorInterpolation: "color-interpolation",
    colorInterpolationFilters: "color-interpolation-filters",
    colorProfile: "color-profile",
    colorRendering: "color-rendering",
    crossOrigin: "crossorigin",
    dataType: "datatype",
    dominantBaseline: "dominant-baseline",
    enableBackground: "enable-background",
    fillOpacity: "fill-opacity",
    fillRule: "fill-rule",
    floodColor: "flood-color",
    floodOpacity: "flood-opacity",
    fontFamily: "font-family",
    fontSize: "font-size",
    fontSizeAdjust: "font-size-adjust",
    fontStretch: "font-stretch",
    fontStyle: "font-style",
    fontVariant: "font-variant",
    fontWeight: "font-weight",
    glyphName: "glyph-name",
    glyphOrientationHorizontal: "glyph-orientation-horizontal",
    glyphOrientationVertical: "glyph-orientation-vertical",
    hrefLang: "hreflang",
    horizAdvX: "horiz-adv-x",
    horizOriginX: "horiz-origin-x",
    horizOriginY: "horiz-origin-y",
    imageRendering: "image-rendering",
    letterSpacing: "letter-spacing",
    lightingColor: "lighting-color",
    markerEnd: "marker-end",
    markerMid: "marker-mid",
    markerStart: "marker-start",
    navDown: "nav-down",
    navDownLeft: "nav-down-left",
    navDownRight: "nav-down-right",
    navLeft: "nav-left",
    navNext: "nav-next",
    navPrev: "nav-prev",
    navRight: "nav-right",
    navUp: "nav-up",
    navUpLeft: "nav-up-left",
    navUpRight: "nav-up-right",
    onAbort: "onabort",
    onActivate: "onactivate",
    onAfterPrint: "onafterprint",
    onBeforePrint: "onbeforeprint",
    onBegin: "onbegin",
    onCancel: "oncancel",
    onCanPlay: "oncanplay",
    onCanPlayThrough: "oncanplaythrough",
    onChange: "onchange",
    onClick: "onclick",
    onClose: "onclose",
    onCopy: "oncopy",
    onCueChange: "oncuechange",
    onCut: "oncut",
    onDblClick: "ondblclick",
    onDrag: "ondrag",
    onDragEnd: "ondragend",
    onDragEnter: "ondragenter",
    onDragExit: "ondragexit",
    onDragLeave: "ondragleave",
    onDragOver: "ondragover",
    onDragStart: "ondragstart",
    onDrop: "ondrop",
    onDurationChange: "ondurationchange",
    onEmptied: "onemptied",
    onEnd: "onend",
    onEnded: "onended",
    onError: "onerror",
    onFocus: "onfocus",
    onFocusIn: "onfocusin",
    onFocusOut: "onfocusout",
    onHashChange: "onhashchange",
    onInput: "oninput",
    onInvalid: "oninvalid",
    onKeyDown: "onkeydown",
    onKeyPress: "onkeypress",
    onKeyUp: "onkeyup",
    onLoad: "onload",
    onLoadedData: "onloadeddata",
    onLoadedMetadata: "onloadedmetadata",
    onLoadStart: "onloadstart",
    onMessage: "onmessage",
    onMouseDown: "onmousedown",
    onMouseEnter: "onmouseenter",
    onMouseLeave: "onmouseleave",
    onMouseMove: "onmousemove",
    onMouseOut: "onmouseout",
    onMouseOver: "onmouseover",
    onMouseUp: "onmouseup",
    onMouseWheel: "onmousewheel",
    onOffline: "onoffline",
    onOnline: "ononline",
    onPageHide: "onpagehide",
    onPageShow: "onpageshow",
    onPaste: "onpaste",
    onPause: "onpause",
    onPlay: "onplay",
    onPlaying: "onplaying",
    onPopState: "onpopstate",
    onProgress: "onprogress",
    onRateChange: "onratechange",
    onRepeat: "onrepeat",
    onReset: "onreset",
    onResize: "onresize",
    onScroll: "onscroll",
    onSeeked: "onseeked",
    onSeeking: "onseeking",
    onSelect: "onselect",
    onShow: "onshow",
    onStalled: "onstalled",
    onStorage: "onstorage",
    onSubmit: "onsubmit",
    onSuspend: "onsuspend",
    onTimeUpdate: "ontimeupdate",
    onToggle: "ontoggle",
    onUnload: "onunload",
    onVolumeChange: "onvolumechange",
    onWaiting: "onwaiting",
    onZoom: "onzoom",
    overlinePosition: "overline-position",
    overlineThickness: "overline-thickness",
    paintOrder: "paint-order",
    panose1: "panose-1",
    pointerEvents: "pointer-events",
    referrerPolicy: "referrerpolicy",
    renderingIntent: "rendering-intent",
    shapeRendering: "shape-rendering",
    stopColor: "stop-color",
    stopOpacity: "stop-opacity",
    strikethroughPosition: "strikethrough-position",
    strikethroughThickness: "strikethrough-thickness",
    strokeDashArray: "stroke-dasharray",
    strokeDashOffset: "stroke-dashoffset",
    strokeLineCap: "stroke-linecap",
    strokeLineJoin: "stroke-linejoin",
    strokeMiterLimit: "stroke-miterlimit",
    strokeOpacity: "stroke-opacity",
    strokeWidth: "stroke-width",
    tabIndex: "tabindex",
    textAnchor: "text-anchor",
    textDecoration: "text-decoration",
    textRendering: "text-rendering",
    transformOrigin: "transform-origin",
    typeOf: "typeof",
    underlinePosition: "underline-position",
    underlineThickness: "underline-thickness",
    unicodeBidi: "unicode-bidi",
    unicodeRange: "unicode-range",
    unitsPerEm: "units-per-em",
    vAlphabetic: "v-alphabetic",
    vHanging: "v-hanging",
    vIdeographic: "v-ideographic",
    vMathematical: "v-mathematical",
    vectorEffect: "vector-effect",
    vertAdvY: "vert-adv-y",
    vertOriginX: "vert-origin-x",
    vertOriginY: "vert-origin-y",
    wordSpacing: "word-spacing",
    writingMode: "writing-mode",
    xHeight: "x-height",
    // These were camelcased in Tiny. Now lowercased in SVG 2
    playbackOrder: "playbackorder",
    timelineBegin: "timelinebegin"
  },
  properties: {
    about: commaOrSpaceSeparated,
    accentHeight: number,
    accumulate: null,
    additive: null,
    alignmentBaseline: null,
    alphabetic: number,
    amplitude: number,
    arabicForm: null,
    ascent: number,
    attributeName: null,
    attributeType: null,
    azimuth: number,
    bandwidth: null,
    baselineShift: null,
    baseFrequency: null,
    baseProfile: null,
    bbox: null,
    begin: null,
    bias: number,
    by: null,
    calcMode: null,
    capHeight: number,
    className: spaceSeparated,
    clip: null,
    clipPath: null,
    clipPathUnits: null,
    clipRule: null,
    color: null,
    colorInterpolation: null,
    colorInterpolationFilters: null,
    colorProfile: null,
    colorRendering: null,
    content: null,
    contentScriptType: null,
    contentStyleType: null,
    crossOrigin: null,
    cursor: null,
    cx: null,
    cy: null,
    d: null,
    dataType: null,
    defaultAction: null,
    descent: number,
    diffuseConstant: number,
    direction: null,
    display: null,
    dur: null,
    divisor: number,
    dominantBaseline: null,
    download: boolean,
    dx: null,
    dy: null,
    edgeMode: null,
    editable: null,
    elevation: number,
    enableBackground: null,
    end: null,
    event: null,
    exponent: number,
    externalResourcesRequired: null,
    fill: null,
    fillOpacity: number,
    fillRule: null,
    filter: null,
    filterRes: null,
    filterUnits: null,
    floodColor: null,
    floodOpacity: null,
    focusable: null,
    focusHighlight: null,
    fontFamily: null,
    fontSize: null,
    fontSizeAdjust: null,
    fontStretch: null,
    fontStyle: null,
    fontVariant: null,
    fontWeight: null,
    format: null,
    fr: null,
    from: null,
    fx: null,
    fy: null,
    g1: commaSeparated,
    g2: commaSeparated,
    glyphName: commaSeparated,
    glyphOrientationHorizontal: null,
    glyphOrientationVertical: null,
    glyphRef: null,
    gradientTransform: null,
    gradientUnits: null,
    handler: null,
    hanging: number,
    hatchContentUnits: null,
    hatchUnits: null,
    height: null,
    href: null,
    hrefLang: null,
    horizAdvX: number,
    horizOriginX: number,
    horizOriginY: number,
    id: null,
    ideographic: number,
    imageRendering: null,
    initialVisibility: null,
    in: null,
    in2: null,
    intercept: number,
    k: number,
    k1: number,
    k2: number,
    k3: number,
    k4: number,
    kernelMatrix: commaOrSpaceSeparated,
    kernelUnitLength: null,
    keyPoints: null,
    // SEMI_COLON_SEPARATED
    keySplines: null,
    // SEMI_COLON_SEPARATED
    keyTimes: null,
    // SEMI_COLON_SEPARATED
    kerning: null,
    lang: null,
    lengthAdjust: null,
    letterSpacing: null,
    lightingColor: null,
    limitingConeAngle: number,
    local: null,
    markerEnd: null,
    markerMid: null,
    markerStart: null,
    markerHeight: null,
    markerUnits: null,
    markerWidth: null,
    mask: null,
    maskContentUnits: null,
    maskUnits: null,
    mathematical: null,
    max: null,
    media: null,
    mediaCharacterEncoding: null,
    mediaContentEncodings: null,
    mediaSize: number,
    mediaTime: null,
    method: null,
    min: null,
    mode: null,
    name: null,
    navDown: null,
    navDownLeft: null,
    navDownRight: null,
    navLeft: null,
    navNext: null,
    navPrev: null,
    navRight: null,
    navUp: null,
    navUpLeft: null,
    navUpRight: null,
    numOctaves: null,
    observer: null,
    offset: null,
    onAbort: null,
    onActivate: null,
    onAfterPrint: null,
    onBeforePrint: null,
    onBegin: null,
    onCancel: null,
    onCanPlay: null,
    onCanPlayThrough: null,
    onChange: null,
    onClick: null,
    onClose: null,
    onCopy: null,
    onCueChange: null,
    onCut: null,
    onDblClick: null,
    onDrag: null,
    onDragEnd: null,
    onDragEnter: null,
    onDragExit: null,
    onDragLeave: null,
    onDragOver: null,
    onDragStart: null,
    onDrop: null,
    onDurationChange: null,
    onEmptied: null,
    onEnd: null,
    onEnded: null,
    onError: null,
    onFocus: null,
    onFocusIn: null,
    onFocusOut: null,
    onHashChange: null,
    onInput: null,
    onInvalid: null,
    onKeyDown: null,
    onKeyPress: null,
    onKeyUp: null,
    onLoad: null,
    onLoadedData: null,
    onLoadedMetadata: null,
    onLoadStart: null,
    onMessage: null,
    onMouseDown: null,
    onMouseEnter: null,
    onMouseLeave: null,
    onMouseMove: null,
    onMouseOut: null,
    onMouseOver: null,
    onMouseUp: null,
    onMouseWheel: null,
    onOffline: null,
    onOnline: null,
    onPageHide: null,
    onPageShow: null,
    onPaste: null,
    onPause: null,
    onPlay: null,
    onPlaying: null,
    onPopState: null,
    onProgress: null,
    onRateChange: null,
    onRepeat: null,
    onReset: null,
    onResize: null,
    onScroll: null,
    onSeeked: null,
    onSeeking: null,
    onSelect: null,
    onShow: null,
    onStalled: null,
    onStorage: null,
    onSubmit: null,
    onSuspend: null,
    onTimeUpdate: null,
    onToggle: null,
    onUnload: null,
    onVolumeChange: null,
    onWaiting: null,
    onZoom: null,
    opacity: null,
    operator: null,
    order: null,
    orient: null,
    orientation: null,
    origin: null,
    overflow: null,
    overlay: null,
    overlinePosition: number,
    overlineThickness: number,
    paintOrder: null,
    panose1: null,
    path: null,
    pathLength: number,
    patternContentUnits: null,
    patternTransform: null,
    patternUnits: null,
    phase: null,
    ping: spaceSeparated,
    pitch: null,
    playbackOrder: null,
    pointerEvents: null,
    points: null,
    pointsAtX: number,
    pointsAtY: number,
    pointsAtZ: number,
    preserveAlpha: null,
    preserveAspectRatio: null,
    primitiveUnits: null,
    propagate: null,
    property: commaOrSpaceSeparated,
    r: null,
    radius: null,
    referrerPolicy: null,
    refX: null,
    refY: null,
    rel: commaOrSpaceSeparated,
    rev: commaOrSpaceSeparated,
    renderingIntent: null,
    repeatCount: null,
    repeatDur: null,
    requiredExtensions: commaOrSpaceSeparated,
    requiredFeatures: commaOrSpaceSeparated,
    requiredFonts: commaOrSpaceSeparated,
    requiredFormats: commaOrSpaceSeparated,
    resource: null,
    restart: null,
    result: null,
    rotate: null,
    rx: null,
    ry: null,
    scale: null,
    seed: null,
    shapeRendering: null,
    side: null,
    slope: null,
    snapshotTime: null,
    specularConstant: number,
    specularExponent: number,
    spreadMethod: null,
    spacing: null,
    startOffset: null,
    stdDeviation: null,
    stemh: null,
    stemv: null,
    stitchTiles: null,
    stopColor: null,
    stopOpacity: null,
    strikethroughPosition: number,
    strikethroughThickness: number,
    string: null,
    stroke: null,
    strokeDashArray: commaOrSpaceSeparated,
    strokeDashOffset: null,
    strokeLineCap: null,
    strokeLineJoin: null,
    strokeMiterLimit: number,
    strokeOpacity: number,
    strokeWidth: null,
    style: null,
    surfaceScale: number,
    syncBehavior: null,
    syncBehaviorDefault: null,
    syncMaster: null,
    syncTolerance: null,
    syncToleranceDefault: null,
    systemLanguage: commaOrSpaceSeparated,
    tabIndex: number,
    tableValues: null,
    target: null,
    targetX: number,
    targetY: number,
    textAnchor: null,
    textDecoration: null,
    textRendering: null,
    textLength: null,
    timelineBegin: null,
    title: null,
    transformBehavior: null,
    type: null,
    typeOf: commaOrSpaceSeparated,
    to: null,
    transform: null,
    transformOrigin: null,
    u1: null,
    u2: null,
    underlinePosition: number,
    underlineThickness: number,
    unicode: null,
    unicodeBidi: null,
    unicodeRange: null,
    unitsPerEm: number,
    values: null,
    vAlphabetic: number,
    vMathematical: number,
    vectorEffect: null,
    vHanging: number,
    vIdeographic: number,
    version: null,
    vertAdvY: number,
    vertOriginX: number,
    vertOriginY: number,
    viewBox: null,
    viewTarget: null,
    visibility: null,
    width: null,
    widths: null,
    wordSpacing: null,
    writingMode: null,
    x: null,
    x1: null,
    x2: null,
    xChannelSelector: null,
    xHeight: number,
    y: null,
    y1: null,
    y2: null,
    yChannelSelector: null,
    z: null,
    zoomAndPan: null
  },
  space: "svg",
  transform: caseSensitiveTransform
});

// node_modules/property-information/lib/xlink.js
var xlink = create({
  properties: {
    xLinkActuate: null,
    xLinkArcRole: null,
    xLinkHref: null,
    xLinkRole: null,
    xLinkShow: null,
    xLinkTitle: null,
    xLinkType: null
  },
  space: "xlink",
  transform(_2, property) {
    return "xlink:" + property.slice(5).toLowerCase();
  }
});

// node_modules/property-information/lib/xmlns.js
var xmlns = create({
  attributes: { xmlnsxlink: "xmlns:xlink" },
  properties: { xmlnsXLink: null, xmlns: null },
  space: "xmlns",
  transform: caseInsensitiveTransform
});

// node_modules/property-information/lib/xml.js
var xml = create({
  properties: { xmlBase: null, xmlLang: null, xmlSpace: null },
  space: "xml",
  transform(_2, property) {
    return "xml:" + property.slice(3).toLowerCase();
  }
});

// node_modules/property-information/lib/find.js
var cap = /[A-Z]/g;
var dash = /-[a-z]/g;
var valid = /^data[-\w.:]+$/i;
function find(schema, value) {
  const normal = normalize(value);
  let property = value;
  let Type = Info;
  if (normal in schema.normal) {
    return schema.property[schema.normal[normal]];
  }
  if (normal.length > 4 && normal.slice(0, 4) === "data" && valid.test(value)) {
    if (value.charAt(4) === "-") {
      const rest = value.slice(5).replace(dash, camelcase);
      property = "data" + rest.charAt(0).toUpperCase() + rest.slice(1);
    } else {
      const rest = value.slice(4);
      if (!dash.test(rest)) {
        let dashes = rest.replace(cap, kebab);
        if (dashes.charAt(0) !== "-") {
          dashes = "-" + dashes;
        }
        value = "data" + dashes;
      }
    }
    Type = DefinedInfo;
  }
  return new Type(property, value);
}
function kebab($0) {
  return "-" + $0.toLowerCase();
}
function camelcase($0) {
  return $0.charAt(1).toUpperCase();
}

// node_modules/property-information/index.js
var html2 = merge([aria, html, xlink, xmlns, xml], "html");
var svg2 = merge([aria, svg, xlink, xmlns, xml], "svg");

// node_modules/zwitch/index.js
var own2 = {}.hasOwnProperty;
function zwitch(key2, options) {
  const settings = options || {};
  function one2(value, ...parameters) {
    let fn = one2.invalid;
    const handlers = one2.handlers;
    if (value && own2.call(value, key2)) {
      const id = String(value[key2]);
      fn = own2.call(handlers, id) ? handlers[id] : one2.unknown;
    }
    if (fn) {
      return fn.call(this, value, ...parameters);
    }
  }
  one2.handlers = settings.handlers || {};
  one2.invalid = settings.invalid;
  one2.unknown = settings.unknown;
  return one2;
}

// node_modules/stringify-entities/lib/core.js
var defaultSubsetRegex = /["&'<>`]/g;
var surrogatePairsRegex = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
var controlCharactersRegex = (
  // eslint-disable-next-line no-control-regex, unicorn/no-hex-escape
  /[\x01-\t\v\f\x0E-\x1F\x7F\x81\x8D\x8F\x90\x9D\xA0-\uFFFF]/g
);
var regexEscapeRegex = /[|\\{}()[\]^$+*?.]/g;
var subsetToRegexCache = /* @__PURE__ */ new WeakMap();
function core(value, options) {
  value = value.replace(
    options.subset ? charactersToExpressionCached(options.subset) : defaultSubsetRegex,
    basic
  );
  if (options.subset || options.escapeOnly) {
    return value;
  }
  return value.replace(surrogatePairsRegex, surrogate).replace(controlCharactersRegex, basic);
  function surrogate(pair, index, all2) {
    return options.format(
      (pair.charCodeAt(0) - 55296) * 1024 + pair.charCodeAt(1) - 56320 + 65536,
      all2.charCodeAt(index + 2),
      options
    );
  }
  function basic(character, index, all2) {
    return options.format(
      character.charCodeAt(0),
      all2.charCodeAt(index + 1),
      options
    );
  }
}
function charactersToExpressionCached(subset) {
  let cached = subsetToRegexCache.get(subset);
  if (!cached) {
    cached = charactersToExpression(subset);
    subsetToRegexCache.set(subset, cached);
  }
  return cached;
}
function charactersToExpression(subset) {
  const groups = [];
  let index = -1;
  while (++index < subset.length) {
    groups.push(subset[index].replace(regexEscapeRegex, "\\$&"));
  }
  return new RegExp("(?:" + groups.join("|") + ")", "g");
}

// node_modules/stringify-entities/lib/util/to-hexadecimal.js
var hexadecimalRegex = /[\dA-Fa-f]/;
function toHexadecimal(code, next, omit) {
  const value = "&#x" + code.toString(16).toUpperCase();
  return omit && next && !hexadecimalRegex.test(String.fromCharCode(next)) ? value : value + ";";
}

// node_modules/stringify-entities/lib/util/to-decimal.js
var decimalRegex = /\d/;
function toDecimal(code, next, omit) {
  const value = "&#" + String(code);
  return omit && next && !decimalRegex.test(String.fromCharCode(next)) ? value : value + ";";
}

// node_modules/character-entities-legacy/index.js
var characterEntitiesLegacy = [
  "AElig",
  "AMP",
  "Aacute",
  "Acirc",
  "Agrave",
  "Aring",
  "Atilde",
  "Auml",
  "COPY",
  "Ccedil",
  "ETH",
  "Eacute",
  "Ecirc",
  "Egrave",
  "Euml",
  "GT",
  "Iacute",
  "Icirc",
  "Igrave",
  "Iuml",
  "LT",
  "Ntilde",
  "Oacute",
  "Ocirc",
  "Ograve",
  "Oslash",
  "Otilde",
  "Ouml",
  "QUOT",
  "REG",
  "THORN",
  "Uacute",
  "Ucirc",
  "Ugrave",
  "Uuml",
  "Yacute",
  "aacute",
  "acirc",
  "acute",
  "aelig",
  "agrave",
  "amp",
  "aring",
  "atilde",
  "auml",
  "brvbar",
  "ccedil",
  "cedil",
  "cent",
  "copy",
  "curren",
  "deg",
  "divide",
  "eacute",
  "ecirc",
  "egrave",
  "eth",
  "euml",
  "frac12",
  "frac14",
  "frac34",
  "gt",
  "iacute",
  "icirc",
  "iexcl",
  "igrave",
  "iquest",
  "iuml",
  "laquo",
  "lt",
  "macr",
  "micro",
  "middot",
  "nbsp",
  "not",
  "ntilde",
  "oacute",
  "ocirc",
  "ograve",
  "ordf",
  "ordm",
  "oslash",
  "otilde",
  "ouml",
  "para",
  "plusmn",
  "pound",
  "quot",
  "raquo",
  "reg",
  "sect",
  "shy",
  "sup1",
  "sup2",
  "sup3",
  "szlig",
  "thorn",
  "times",
  "uacute",
  "ucirc",
  "ugrave",
  "uml",
  "uuml",
  "yacute",
  "yen",
  "yuml"
];

// node_modules/character-entities-html4/index.js
var characterEntitiesHtml4 = {
  nbsp: "\xA0",
  iexcl: "\xA1",
  cent: "\xA2",
  pound: "\xA3",
  curren: "\xA4",
  yen: "\xA5",
  brvbar: "\xA6",
  sect: "\xA7",
  uml: "\xA8",
  copy: "\xA9",
  ordf: "\xAA",
  laquo: "\xAB",
  not: "\xAC",
  shy: "\xAD",
  reg: "\xAE",
  macr: "\xAF",
  deg: "\xB0",
  plusmn: "\xB1",
  sup2: "\xB2",
  sup3: "\xB3",
  acute: "\xB4",
  micro: "\xB5",
  para: "\xB6",
  middot: "\xB7",
  cedil: "\xB8",
  sup1: "\xB9",
  ordm: "\xBA",
  raquo: "\xBB",
  frac14: "\xBC",
  frac12: "\xBD",
  frac34: "\xBE",
  iquest: "\xBF",
  Agrave: "\xC0",
  Aacute: "\xC1",
  Acirc: "\xC2",
  Atilde: "\xC3",
  Auml: "\xC4",
  Aring: "\xC5",
  AElig: "\xC6",
  Ccedil: "\xC7",
  Egrave: "\xC8",
  Eacute: "\xC9",
  Ecirc: "\xCA",
  Euml: "\xCB",
  Igrave: "\xCC",
  Iacute: "\xCD",
  Icirc: "\xCE",
  Iuml: "\xCF",
  ETH: "\xD0",
  Ntilde: "\xD1",
  Ograve: "\xD2",
  Oacute: "\xD3",
  Ocirc: "\xD4",
  Otilde: "\xD5",
  Ouml: "\xD6",
  times: "\xD7",
  Oslash: "\xD8",
  Ugrave: "\xD9",
  Uacute: "\xDA",
  Ucirc: "\xDB",
  Uuml: "\xDC",
  Yacute: "\xDD",
  THORN: "\xDE",
  szlig: "\xDF",
  agrave: "\xE0",
  aacute: "\xE1",
  acirc: "\xE2",
  atilde: "\xE3",
  auml: "\xE4",
  aring: "\xE5",
  aelig: "\xE6",
  ccedil: "\xE7",
  egrave: "\xE8",
  eacute: "\xE9",
  ecirc: "\xEA",
  euml: "\xEB",
  igrave: "\xEC",
  iacute: "\xED",
  icirc: "\xEE",
  iuml: "\xEF",
  eth: "\xF0",
  ntilde: "\xF1",
  ograve: "\xF2",
  oacute: "\xF3",
  ocirc: "\xF4",
  otilde: "\xF5",
  ouml: "\xF6",
  divide: "\xF7",
  oslash: "\xF8",
  ugrave: "\xF9",
  uacute: "\xFA",
  ucirc: "\xFB",
  uuml: "\xFC",
  yacute: "\xFD",
  thorn: "\xFE",
  yuml: "\xFF",
  fnof: "\u0192",
  Alpha: "\u0391",
  Beta: "\u0392",
  Gamma: "\u0393",
  Delta: "\u0394",
  Epsilon: "\u0395",
  Zeta: "\u0396",
  Eta: "\u0397",
  Theta: "\u0398",
  Iota: "\u0399",
  Kappa: "\u039A",
  Lambda: "\u039B",
  Mu: "\u039C",
  Nu: "\u039D",
  Xi: "\u039E",
  Omicron: "\u039F",
  Pi: "\u03A0",
  Rho: "\u03A1",
  Sigma: "\u03A3",
  Tau: "\u03A4",
  Upsilon: "\u03A5",
  Phi: "\u03A6",
  Chi: "\u03A7",
  Psi: "\u03A8",
  Omega: "\u03A9",
  alpha: "\u03B1",
  beta: "\u03B2",
  gamma: "\u03B3",
  delta: "\u03B4",
  epsilon: "\u03B5",
  zeta: "\u03B6",
  eta: "\u03B7",
  theta: "\u03B8",
  iota: "\u03B9",
  kappa: "\u03BA",
  lambda: "\u03BB",
  mu: "\u03BC",
  nu: "\u03BD",
  xi: "\u03BE",
  omicron: "\u03BF",
  pi: "\u03C0",
  rho: "\u03C1",
  sigmaf: "\u03C2",
  sigma: "\u03C3",
  tau: "\u03C4",
  upsilon: "\u03C5",
  phi: "\u03C6",
  chi: "\u03C7",
  psi: "\u03C8",
  omega: "\u03C9",
  thetasym: "\u03D1",
  upsih: "\u03D2",
  piv: "\u03D6",
  bull: "\u2022",
  hellip: "\u2026",
  prime: "\u2032",
  Prime: "\u2033",
  oline: "\u203E",
  frasl: "\u2044",
  weierp: "\u2118",
  image: "\u2111",
  real: "\u211C",
  trade: "\u2122",
  alefsym: "\u2135",
  larr: "\u2190",
  uarr: "\u2191",
  rarr: "\u2192",
  darr: "\u2193",
  harr: "\u2194",
  crarr: "\u21B5",
  lArr: "\u21D0",
  uArr: "\u21D1",
  rArr: "\u21D2",
  dArr: "\u21D3",
  hArr: "\u21D4",
  forall: "\u2200",
  part: "\u2202",
  exist: "\u2203",
  empty: "\u2205",
  nabla: "\u2207",
  isin: "\u2208",
  notin: "\u2209",
  ni: "\u220B",
  prod: "\u220F",
  sum: "\u2211",
  minus: "\u2212",
  lowast: "\u2217",
  radic: "\u221A",
  prop: "\u221D",
  infin: "\u221E",
  ang: "\u2220",
  and: "\u2227",
  or: "\u2228",
  cap: "\u2229",
  cup: "\u222A",
  int: "\u222B",
  there4: "\u2234",
  sim: "\u223C",
  cong: "\u2245",
  asymp: "\u2248",
  ne: "\u2260",
  equiv: "\u2261",
  le: "\u2264",
  ge: "\u2265",
  sub: "\u2282",
  sup: "\u2283",
  nsub: "\u2284",
  sube: "\u2286",
  supe: "\u2287",
  oplus: "\u2295",
  otimes: "\u2297",
  perp: "\u22A5",
  sdot: "\u22C5",
  lceil: "\u2308",
  rceil: "\u2309",
  lfloor: "\u230A",
  rfloor: "\u230B",
  lang: "\u2329",
  rang: "\u232A",
  loz: "\u25CA",
  spades: "\u2660",
  clubs: "\u2663",
  hearts: "\u2665",
  diams: "\u2666",
  quot: '"',
  amp: "&",
  lt: "<",
  gt: ">",
  OElig: "\u0152",
  oelig: "\u0153",
  Scaron: "\u0160",
  scaron: "\u0161",
  Yuml: "\u0178",
  circ: "\u02C6",
  tilde: "\u02DC",
  ensp: "\u2002",
  emsp: "\u2003",
  thinsp: "\u2009",
  zwnj: "\u200C",
  zwj: "\u200D",
  lrm: "\u200E",
  rlm: "\u200F",
  ndash: "\u2013",
  mdash: "\u2014",
  lsquo: "\u2018",
  rsquo: "\u2019",
  sbquo: "\u201A",
  ldquo: "\u201C",
  rdquo: "\u201D",
  bdquo: "\u201E",
  dagger: "\u2020",
  Dagger: "\u2021",
  permil: "\u2030",
  lsaquo: "\u2039",
  rsaquo: "\u203A",
  euro: "\u20AC"
};

// node_modules/stringify-entities/lib/constant/dangerous.js
var dangerous = [
  "cent",
  "copy",
  "divide",
  "gt",
  "lt",
  "not",
  "para",
  "times"
];

// node_modules/stringify-entities/lib/util/to-named.js
var own3 = {}.hasOwnProperty;
var characters = {};
var key;
for (key in characterEntitiesHtml4) {
  if (own3.call(characterEntitiesHtml4, key)) {
    characters[characterEntitiesHtml4[key]] = key;
  }
}
var notAlphanumericRegex = /[^\dA-Za-z]/;
function toNamed(code, next, omit, attribute) {
  const character = String.fromCharCode(code);
  if (own3.call(characters, character)) {
    const name = characters[character];
    const value = "&" + name;
    if (omit && characterEntitiesLegacy.includes(name) && !dangerous.includes(name) && (!attribute || next && next !== 61 && notAlphanumericRegex.test(String.fromCharCode(next)))) {
      return value;
    }
    return value + ";";
  }
  return "";
}

// node_modules/stringify-entities/lib/util/format-smart.js
function formatSmart(code, next, options) {
  let numeric = toHexadecimal(code, next, options.omitOptionalSemicolons);
  let named;
  if (options.useNamedReferences || options.useShortestReferences) {
    named = toNamed(
      code,
      next,
      options.omitOptionalSemicolons,
      options.attribute
    );
  }
  if ((options.useShortestReferences || !named) && options.useShortestReferences) {
    const decimal = toDecimal(code, next, options.omitOptionalSemicolons);
    if (decimal.length < numeric.length) {
      numeric = decimal;
    }
  }
  return named && (!options.useShortestReferences || named.length < numeric.length) ? named : numeric;
}

// node_modules/stringify-entities/lib/index.js
function stringifyEntities(value, options) {
  return core(value, Object.assign({ format: formatSmart }, options));
}

// node_modules/hast-util-to-html/lib/handle/comment.js
var htmlCommentRegex = /^>|^->|<!--|-->|--!>|<!-$/g;
var bogusCommentEntitySubset = [">"];
var commentEntitySubset = ["<", ">"];
function comment(node, _1, _2, state) {
  return state.settings.bogusComments ? "<?" + stringifyEntities(
    node.value,
    Object.assign({}, state.settings.characterReferences, {
      subset: bogusCommentEntitySubset
    })
  ) + ">" : "<!--" + node.value.replace(htmlCommentRegex, encode) + "-->";
  function encode($0) {
    return stringifyEntities(
      $0,
      Object.assign({}, state.settings.characterReferences, {
        subset: commentEntitySubset
      })
    );
  }
}

// node_modules/hast-util-to-html/lib/handle/doctype.js
function doctype(_1, _2, _3, state) {
  return "<!" + (state.settings.upperDoctype ? "DOCTYPE" : "doctype") + (state.settings.tightDoctype ? "" : " ") + "html>";
}

// node_modules/ccount/index.js
function ccount(value, character) {
  const source = String(value);
  if (typeof character !== "string") {
    throw new TypeError("Expected character");
  }
  let count = 0;
  let index = source.indexOf(character);
  while (index !== -1) {
    count++;
    index = source.indexOf(character, index + character.length);
  }
  return count;
}

// node_modules/comma-separated-tokens/index.js
function stringify(values, options) {
  const settings = options || {};
  const input = values[values.length - 1] === "" ? [...values, ""] : values;
  return input.join(
    (settings.padRight ? " " : "") + "," + (settings.padLeft === false ? "" : " ")
  ).trim();
}

// node_modules/space-separated-tokens/index.js
function stringify2(values) {
  return values.join(" ").trim();
}

// node_modules/hast-util-whitespace/lib/index.js
var re = /[ \t\n\f\r]/g;
function whitespace(thing) {
  return typeof thing === "object" ? thing.type === "text" ? empty(thing.value) : false : empty(thing);
}
function empty(value) {
  return value.replace(re, "") === "";
}

// node_modules/hast-util-to-html/lib/omission/util/siblings.js
var siblingAfter = siblings(1);
var siblingBefore = siblings(-1);
var emptyChildren = [];
function siblings(increment2) {
  return sibling;
  function sibling(parent, index, includeWhitespace) {
    const siblings2 = parent ? parent.children : emptyChildren;
    let offset = (index || 0) + increment2;
    let next = siblings2[offset];
    if (!includeWhitespace) {
      while (next && whitespace(next)) {
        offset += increment2;
        next = siblings2[offset];
      }
    }
    return next;
  }
}

// node_modules/hast-util-to-html/lib/omission/omission.js
var own4 = {}.hasOwnProperty;
function omission(handlers) {
  return omit;
  function omit(node, index, parent) {
    return own4.call(handlers, node.tagName) && handlers[node.tagName](node, index, parent);
  }
}

// node_modules/hast-util-to-html/lib/omission/closing.js
var closing = omission({
  body,
  caption: headOrColgroupOrCaption,
  colgroup: headOrColgroupOrCaption,
  dd,
  dt,
  head: headOrColgroupOrCaption,
  html: html3,
  li,
  optgroup,
  option,
  p,
  rp: rubyElement,
  rt: rubyElement,
  tbody,
  td: cells,
  tfoot,
  th: cells,
  thead,
  tr
});
function headOrColgroupOrCaption(_2, index, parent) {
  const next = siblingAfter(parent, index, true);
  return !next || next.type !== "comment" && !(next.type === "text" && whitespace(next.value.charAt(0)));
}
function html3(_2, index, parent) {
  const next = siblingAfter(parent, index);
  return !next || next.type !== "comment";
}
function body(_2, index, parent) {
  const next = siblingAfter(parent, index);
  return !next || next.type !== "comment";
}
function p(_2, index, parent) {
  const next = siblingAfter(parent, index);
  return next ? next.type === "element" && (next.tagName === "address" || next.tagName === "article" || next.tagName === "aside" || next.tagName === "blockquote" || next.tagName === "details" || next.tagName === "div" || next.tagName === "dl" || next.tagName === "fieldset" || next.tagName === "figcaption" || next.tagName === "figure" || next.tagName === "footer" || next.tagName === "form" || next.tagName === "h1" || next.tagName === "h2" || next.tagName === "h3" || next.tagName === "h4" || next.tagName === "h5" || next.tagName === "h6" || next.tagName === "header" || next.tagName === "hgroup" || next.tagName === "hr" || next.tagName === "main" || next.tagName === "menu" || next.tagName === "nav" || next.tagName === "ol" || next.tagName === "p" || next.tagName === "pre" || next.tagName === "section" || next.tagName === "table" || next.tagName === "ul") : !parent || // Confusing parent.
  !(parent.type === "element" && (parent.tagName === "a" || parent.tagName === "audio" || parent.tagName === "del" || parent.tagName === "ins" || parent.tagName === "map" || parent.tagName === "noscript" || parent.tagName === "video"));
}
function li(_2, index, parent) {
  const next = siblingAfter(parent, index);
  return !next || next.type === "element" && next.tagName === "li";
}
function dt(_2, index, parent) {
  const next = siblingAfter(parent, index);
  return Boolean(
    next && next.type === "element" && (next.tagName === "dt" || next.tagName === "dd")
  );
}
function dd(_2, index, parent) {
  const next = siblingAfter(parent, index);
  return !next || next.type === "element" && (next.tagName === "dt" || next.tagName === "dd");
}
function rubyElement(_2, index, parent) {
  const next = siblingAfter(parent, index);
  return !next || next.type === "element" && (next.tagName === "rp" || next.tagName === "rt");
}
function optgroup(_2, index, parent) {
  const next = siblingAfter(parent, index);
  return !next || next.type === "element" && next.tagName === "optgroup";
}
function option(_2, index, parent) {
  const next = siblingAfter(parent, index);
  return !next || next.type === "element" && (next.tagName === "option" || next.tagName === "optgroup");
}
function thead(_2, index, parent) {
  const next = siblingAfter(parent, index);
  return Boolean(
    next && next.type === "element" && (next.tagName === "tbody" || next.tagName === "tfoot")
  );
}
function tbody(_2, index, parent) {
  const next = siblingAfter(parent, index);
  return !next || next.type === "element" && (next.tagName === "tbody" || next.tagName === "tfoot");
}
function tfoot(_2, index, parent) {
  return !siblingAfter(parent, index);
}
function tr(_2, index, parent) {
  const next = siblingAfter(parent, index);
  return !next || next.type === "element" && next.tagName === "tr";
}
function cells(_2, index, parent) {
  const next = siblingAfter(parent, index);
  return !next || next.type === "element" && (next.tagName === "td" || next.tagName === "th");
}

// node_modules/hast-util-to-html/lib/omission/opening.js
var opening = omission({
  body: body2,
  colgroup,
  head,
  html: html4,
  tbody: tbody2
});
function html4(node) {
  const head2 = siblingAfter(node, -1);
  return !head2 || head2.type !== "comment";
}
function head(node) {
  const seen = /* @__PURE__ */ new Set();
  for (const child2 of node.children) {
    if (child2.type === "element" && (child2.tagName === "base" || child2.tagName === "title")) {
      if (seen.has(child2.tagName)) return false;
      seen.add(child2.tagName);
    }
  }
  const child = node.children[0];
  return !child || child.type === "element";
}
function body2(node) {
  const head2 = siblingAfter(node, -1, true);
  return !head2 || head2.type !== "comment" && !(head2.type === "text" && whitespace(head2.value.charAt(0))) && !(head2.type === "element" && (head2.tagName === "meta" || head2.tagName === "link" || head2.tagName === "script" || head2.tagName === "style" || head2.tagName === "template"));
}
function colgroup(node, index, parent) {
  const previous = siblingBefore(parent, index);
  const head2 = siblingAfter(node, -1, true);
  if (parent && previous && previous.type === "element" && previous.tagName === "colgroup" && closing(previous, parent.children.indexOf(previous), parent)) {
    return false;
  }
  return Boolean(head2 && head2.type === "element" && head2.tagName === "col");
}
function tbody2(node, index, parent) {
  const previous = siblingBefore(parent, index);
  const head2 = siblingAfter(node, -1);
  if (parent && previous && previous.type === "element" && (previous.tagName === "thead" || previous.tagName === "tbody") && closing(previous, parent.children.indexOf(previous), parent)) {
    return false;
  }
  return Boolean(head2 && head2.type === "element" && head2.tagName === "tr");
}

// node_modules/hast-util-to-html/lib/handle/element.js
var constants = {
  // See: <https://html.spec.whatwg.org/#attribute-name-state>.
  name: [
    ["	\n\f\r &/=>".split(""), "	\n\f\r \"&'/=>`".split("")],
    [`\0	
\f\r "&'/<=>`.split(""), "\0	\n\f\r \"&'/<=>`".split("")]
  ],
  // See: <https://html.spec.whatwg.org/#attribute-value-(unquoted)-state>.
  unquoted: [
    ["	\n\f\r &>".split(""), "\0	\n\f\r \"&'<=>`".split("")],
    ["\0	\n\f\r \"&'<=>`".split(""), "\0	\n\f\r \"&'<=>`".split("")]
  ],
  // See: <https://html.spec.whatwg.org/#attribute-value-(single-quoted)-state>.
  single: [
    ["&'".split(""), "\"&'`".split("")],
    ["\0&'".split(""), "\0\"&'`".split("")]
  ],
  // See: <https://html.spec.whatwg.org/#attribute-value-(double-quoted)-state>.
  double: [
    ['"&'.split(""), "\"&'`".split("")],
    ['\0"&'.split(""), "\0\"&'`".split("")]
  ]
};
function element(node, index, parent, state) {
  const schema = state.schema;
  const omit = schema.space === "svg" ? false : state.settings.omitOptionalTags;
  let selfClosing = schema.space === "svg" ? state.settings.closeEmptyElements : state.settings.voids.includes(node.tagName.toLowerCase());
  const parts = [];
  let last;
  if (schema.space === "html" && node.tagName === "svg") {
    state.schema = svg2;
  }
  const attributes = serializeAttributes(state, node.properties);
  const content = state.all(
    schema.space === "html" && node.tagName === "template" ? node.content : node
  );
  state.schema = schema;
  if (content) selfClosing = false;
  if (attributes || !omit || !opening(node, index, parent)) {
    parts.push("<", node.tagName, attributes ? " " + attributes : "");
    if (selfClosing && (schema.space === "svg" || state.settings.closeSelfClosing)) {
      last = attributes.charAt(attributes.length - 1);
      if (!state.settings.tightSelfClosing || last === "/" || last && last !== '"' && last !== "'") {
        parts.push(" ");
      }
      parts.push("/");
    }
    parts.push(">");
  }
  parts.push(content);
  if (!selfClosing && (!omit || !closing(node, index, parent))) {
    parts.push("</" + node.tagName + ">");
  }
  return parts.join("");
}
function serializeAttributes(state, properties) {
  const values = [];
  let index = -1;
  let key2;
  if (properties) {
    for (key2 in properties) {
      if (properties[key2] !== null && properties[key2] !== void 0) {
        const value = serializeAttribute(state, key2, properties[key2]);
        if (value) values.push(value);
      }
    }
  }
  while (++index < values.length) {
    const last = state.settings.tightAttributes ? values[index].charAt(values[index].length - 1) : void 0;
    if (index !== values.length - 1 && last !== '"' && last !== "'") {
      values[index] += " ";
    }
  }
  return values.join("");
}
function serializeAttribute(state, key2, value) {
  const info = find(state.schema, key2);
  const x2 = state.settings.allowParseErrors && state.schema.space === "html" ? 0 : 1;
  const y2 = state.settings.allowDangerousCharacters ? 0 : 1;
  let quote = state.quote;
  let result;
  if (info.overloadedBoolean && (value === info.attribute || value === "")) {
    value = true;
  } else if ((info.boolean || info.overloadedBoolean) && (typeof value !== "string" || value === info.attribute || value === "")) {
    value = Boolean(value);
  }
  if (value === null || value === void 0 || value === false || typeof value === "number" && Number.isNaN(value)) {
    return "";
  }
  const name = stringifyEntities(
    info.attribute,
    Object.assign({}, state.settings.characterReferences, {
      // Always encode without parse errors in non-HTML.
      subset: constants.name[x2][y2]
    })
  );
  if (value === true) return name;
  value = Array.isArray(value) ? (info.commaSeparated ? stringify : stringify2)(value, {
    padLeft: !state.settings.tightCommaSeparatedLists
  }) : String(value);
  if (state.settings.collapseEmptyAttributes && !value) return name;
  if (state.settings.preferUnquoted) {
    result = stringifyEntities(
      value,
      Object.assign({}, state.settings.characterReferences, {
        attribute: true,
        subset: constants.unquoted[x2][y2]
      })
    );
  }
  if (result !== value) {
    if (state.settings.quoteSmart && ccount(value, quote) > ccount(value, state.alternative)) {
      quote = state.alternative;
    }
    result = quote + stringifyEntities(
      value,
      Object.assign({}, state.settings.characterReferences, {
        // Always encode without parse errors in non-HTML.
        subset: (quote === "'" ? constants.single : constants.double)[x2][y2],
        attribute: true
      })
    ) + quote;
  }
  return name + (result ? "=" + result : result);
}

// node_modules/hast-util-to-html/lib/handle/text.js
var textEntitySubset = ["<", "&"];
function text(node, _2, parent, state) {
  return parent && parent.type === "element" && (parent.tagName === "script" || parent.tagName === "style") ? node.value : stringifyEntities(
    node.value,
    Object.assign({}, state.settings.characterReferences, {
      subset: textEntitySubset
    })
  );
}

// node_modules/hast-util-to-html/lib/handle/raw.js
function raw(node, index, parent, state) {
  return state.settings.allowDangerousHtml ? node.value : text(node, index, parent, state);
}

// node_modules/hast-util-to-html/lib/handle/root.js
function root(node, _1, _2, state) {
  return state.all(node);
}

// node_modules/hast-util-to-html/lib/handle/index.js
var handle = zwitch("type", {
  invalid,
  unknown,
  handlers: { comment, doctype, element, raw, root, text }
});
function invalid(node) {
  throw new Error("Expected node, not `" + node + "`");
}
function unknown(node_) {
  const node = (
    /** @type {Nodes} */
    node_
  );
  throw new Error("Cannot compile unknown node `" + node.type + "`");
}

// node_modules/hast-util-to-html/lib/index.js
var emptyOptions = {};
var emptyCharacterReferences = {};
var emptyChildren2 = [];
function toHtml(tree, options) {
  const options_ = options || emptyOptions;
  const quote = options_.quote || '"';
  const alternative = quote === '"' ? "'" : '"';
  if (quote !== '"' && quote !== "'") {
    throw new Error("Invalid quote `" + quote + "`, expected `'` or `\"`");
  }
  const state = {
    one,
    all,
    settings: {
      omitOptionalTags: options_.omitOptionalTags || false,
      allowParseErrors: options_.allowParseErrors || false,
      allowDangerousCharacters: options_.allowDangerousCharacters || false,
      quoteSmart: options_.quoteSmart || false,
      preferUnquoted: options_.preferUnquoted || false,
      tightAttributes: options_.tightAttributes || false,
      upperDoctype: options_.upperDoctype || false,
      tightDoctype: options_.tightDoctype || false,
      bogusComments: options_.bogusComments || false,
      tightCommaSeparatedLists: options_.tightCommaSeparatedLists || false,
      tightSelfClosing: options_.tightSelfClosing || false,
      collapseEmptyAttributes: options_.collapseEmptyAttributes || false,
      allowDangerousHtml: options_.allowDangerousHtml || false,
      voids: options_.voids || htmlVoidElements,
      characterReferences: options_.characterReferences || emptyCharacterReferences,
      closeSelfClosing: options_.closeSelfClosing || false,
      closeEmptyElements: options_.closeEmptyElements || false
    },
    schema: options_.space === "svg" ? svg2 : html2,
    quote,
    alternative
  };
  return state.one(
    Array.isArray(tree) ? { type: "root", children: tree } : tree,
    void 0,
    void 0
  );
}
function one(node, index, parent) {
  return handle(node, index, parent, this);
}
function all(parent) {
  const results = [];
  const children = parent && parent.children || emptyChildren2;
  let index = -1;
  while (++index < children.length) {
    results[index] = this.one(children[index], index, parent);
  }
  return results.join("");
}

// src/types.ts
var CANVAS_PRESET_COLORS = {
  "1": "#fb464c",
  "2": "#e9973f",
  "3": "#e0de71",
  "4": "#44cf6e",
  "5": "#53dfdd",
  "6": "#a882ff"
};

// src/components/styles/canvas.scss
var canvas_default = `.canvas-page {
  width: 100%;
  max-width: none;
  height: 100%;
  margin: 0;
}

.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: none;
  border-radius: 0;
  background-color: var(--light);
  background-image: radial-gradient(circle, var(--lightgray) 1px, transparent 1px);
  background-size: 20px 20px;
  cursor: grab;
  user-select: none;
  touch-action: none;
}
.canvas-container:active {
  cursor: grabbing;
}

.canvas-viewport {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
}

.canvas-nodes {
  position: absolute;
  top: 0;
  left: 0;
}

.canvas-node {
  position: absolute;
  border: 2px solid var(--canvas-node-color, var(--lightgray));
  border-radius: 6px;
  background: var(--light);
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.15s ease;
  display: flex;
  flex-direction: column;
}
.canvas-node:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.canvas-node-content {
  padding: 12px;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--darkgray);
  word-wrap: break-word;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.canvas-node-text .canvas-node-content {
  white-space: pre-wrap;
}

.canvas-node-file {
  overflow: visible;
}
.canvas-node-file .canvas-file-label {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  padding: 2px 8px;
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 6px;
}
.canvas-node-file .canvas-file-label a {
  color: var(--canvas-node-color, var(--secondary));
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.canvas-node-file .canvas-file-label a::before {
  content: "";
  display: inline-block;
  width: 12px;
  height: 12px;
  background: var(--canvas-node-color, var(--secondary));
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/%3E%3Cpolyline points='14 2 14 8 20 8'/%3E%3C/svg%3E");
  mask-size: contain;
  mask-repeat: no-repeat;
  flex-shrink: 0;
}
.canvas-node-file .canvas-file-label a:hover {
  text-decoration: underline;
}
.canvas-node-file .canvas-embed-content h1,
.canvas-node-file .canvas-embed-content h2,
.canvas-node-file .canvas-embed-content h3,
.canvas-node-file .canvas-embed-content h4,
.canvas-node-file .canvas-embed-content h5,
.canvas-node-file .canvas-embed-content h6 {
  margin-top: 0.8em;
  margin-bottom: 0.4em;
}
.canvas-node-file .canvas-embed-content h1:first-child,
.canvas-node-file .canvas-embed-content h2:first-child,
.canvas-node-file .canvas-embed-content h3:first-child,
.canvas-node-file .canvas-embed-content h4:first-child,
.canvas-node-file .canvas-embed-content h5:first-child,
.canvas-node-file .canvas-embed-content h6:first-child {
  margin-top: 0;
}
.canvas-node-file .canvas-embed-content p {
  margin: 0.5em 0;
}
.canvas-node-file .canvas-embed-content ul,
.canvas-node-file .canvas-embed-content ol {
  padding-left: 1.5em;
  margin: 0.5em 0;
}
.canvas-node-file .canvas-embed-content img {
  max-width: 100%;
  height: auto;
}
.canvas-node-file .canvas-embed-content pre {
  overflow-x: auto;
  padding: 0.5em;
  border-radius: 4px;
  background: var(--lightgray);
}
.canvas-node-file .canvas-embed-content code {
  font-size: 0.85em;
}
.canvas-node-file .canvas-file-subpath {
  font-size: 0.75rem;
  color: var(--gray);
  margin-left: auto;
}
.canvas-node-file .canvas-node-content > .canvas-file-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 100%;
  color: var(--secondary);
  text-decoration: none;
  font-weight: 500;
}
.canvas-node-file .canvas-node-content > .canvas-file-link:hover {
  text-decoration: underline;
}

.canvas-node-link {
  overflow: visible;
}
.canvas-node-link .canvas-node-content {
  padding: 0;
  overflow: hidden;
}
.canvas-node-link .canvas-link-label {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  padding: 2px 8px;
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.canvas-node-link .canvas-link-label a {
  color: var(--canvas-node-color, var(--secondary));
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.canvas-node-link .canvas-link-label a::before {
  content: "";
  display: inline-block;
  width: 12px;
  height: 12px;
  background: var(--canvas-node-color, var(--secondary));
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'/%3E%3Cpolyline points='15 3 21 3 21 9'/%3E%3Cline x1='10' y1='14' x2='21' y2='3'/%3E%3C/svg%3E");
  mask-size: contain;
  mask-repeat: no-repeat;
  flex-shrink: 0;
}
.canvas-node-link .canvas-link-label a:hover {
  text-decoration: underline;
}
.canvas-node-link .canvas-iframe-wrapper {
  position: relative;
  padding: 0;
  overflow: hidden;
}
.canvas-node-link .canvas-iframe-wrapper iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: var(--light);
}
.canvas-node-link .canvas-iframe-wrapper .canvas-iframe-fallback {
  display: none;
  position: absolute;
  inset: 0;
  align-items: center;
  justify-content: center;
  background: var(--light);
  font-size: 0.85rem;
}
.canvas-node-link .canvas-iframe-wrapper .canvas-iframe-fallback a {
  color: var(--secondary);
  text-decoration: underline;
}

.canvas-node-group {
  background: transparent;
  border-style: dashed;
  border-color: var(--canvas-node-color, var(--gray));
  border-radius: 12px;
  overflow: visible;
}
.canvas-node-group .canvas-group-label {
  position: absolute;
  top: -10px;
  left: 16px;
  padding: 0 8px;
  background: var(--light);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--canvas-node-color, var(--darkgray));
}

.canvas-edges {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  overflow: visible;
}

.canvas-edge path {
  pointer-events: stroke;
}

.canvas-edge-label-bg {
  fill: var(--light);
  fill-opacity: 0.85;
}

.canvas-edge-label {
  font-size: 0.8rem;
  fill: var(--darkgray);
  pointer-events: none;
}

.canvas-controls {
  position: fixed;
  top: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 25;
  transition: top 0.25s ease;
}
.canvas-controls button {
  width: 32px;
  height: 32px;
  border: 1px solid var(--lightgray);
  border-radius: 6px;
  background: var(--light);
  color: var(--darkgray);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: background 0.1s ease;
}
.canvas-controls button:hover {
  background: var(--lightgray);
}
.canvas-controls button svg {
  pointer-events: none;
}
.canvas-controls .canvas-zoom-group {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--lightgray);
  border-radius: 6px;
  overflow: hidden;
}
.canvas-controls .canvas-zoom-group button {
  border: none;
  border-radius: 0;
}
.canvas-controls .canvas-zoom-group button:first-child {
  border-bottom: 1px solid var(--lightgray);
}

.page[data-frame=canvas] {
  --canvas-sidebar-width: 300px;
}

.page[data-frame=canvas] .canvas-frame {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding-left: 0;
  transition: padding-left 0.2s ease;
}

.page[data-frame=canvas] .canvas-stage {
  width: 100%;
  height: 100%;
}

.page[data-frame=canvas] .canvas-sidebar {
  position: fixed;
  top: 0;
  height: 100vh;
  width: var(--canvas-sidebar-width);
  box-sizing: border-box;
  background: var(--light);
  border-right: 1px solid var(--lightgray);
  box-shadow: 8px 0 24px rgba(0, 0, 0, 0.12);
  overflow-y: hidden;
  left: calc(-1 * var(--canvas-sidebar-width));
  transition: left 0.25s ease;
  z-index: 20;
}

.page[data-frame=canvas] .canvas-sidebar-toggle {
  position: fixed;
  top: 12px;
  left: 12px;
  width: 32px;
  height: 32px;
  border: 1px solid var(--lightgray);
  border-radius: 6px;
  background: var(--light);
  color: var(--darkgray);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
  transition: background 0.1s ease, left 0.25s ease;
}
.page[data-frame=canvas] .canvas-sidebar-toggle:hover {
  background: var(--lightgray);
}
.page[data-frame=canvas] .canvas-sidebar-toggle svg {
  pointer-events: none;
}

.page[data-frame=canvas] .canvas-sidebar-icon-close {
  display: none;
}

.page[data-frame=canvas].canvas-sidebar-open .canvas-frame {
  padding-left: var(--canvas-sidebar-width);
}

.page[data-frame=canvas].canvas-sidebar-open .canvas-sidebar {
  left: 0;
}

.page[data-frame=canvas].canvas-sidebar-open .canvas-sidebar-toggle {
  left: calc(var(--canvas-sidebar-width) + 12px);
}

.page[data-frame=canvas].canvas-sidebar-open .canvas-sidebar-icon-open {
  display: none;
}

.page[data-frame=canvas].canvas-sidebar-open .canvas-sidebar-icon-close {
  display: block;
}

@media (max-width: 800px) {
  .page[data-frame=canvas] {
    --canvas-sidebar-width: calc(100vw - 56px);
  }
  .page[data-frame=canvas].canvas-sidebar-open .canvas-frame {
    padding-left: 0;
  }
  .page[data-frame=canvas].canvas-sidebar-open .canvas-sidebar-toggle {
    left: calc(var(--canvas-sidebar-width) + 12px);
  }
  .page[data-frame=canvas].canvas-sidebar-open .canvas-controls {
    top: 48px;
  }
}
.page[data-frame=canvas] .canvas-sidebar {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.page[data-frame=canvas] .canvas-sidebar .spacer {
  display: none;
}
.page[data-frame=canvas] .canvas-sidebar .explorer button.desktop-explorer,
.page[data-frame=canvas] .canvas-sidebar .explorer button.mobile-explorer {
  display: none !important;
}
.page[data-frame=canvas] .canvas-sidebar .explorer {
  order: initial;
  overflow-y: hidden;
  overflow: hidden;
  flex: 1 1 0;
  min-height: 0;
  flex-shrink: initial;
  align-self: initial;
  margin-top: 0;
  margin-bottom: 0;
}
.page[data-frame=canvas] .canvas-sidebar .explorer .explorer-content,
.page[data-frame=canvas] .canvas-sidebar .explorer.collapsed > .explorer-content,
.page[data-frame=canvas] .canvas-sidebar .explorer:not(.collapsed) > .explorer-content {
  position: static;
  width: auto;
  max-width: none;
  height: 100%;
  max-height: 100%;
  transform: none !important;
  visibility: visible !important;
  padding: 0;
  overflow-y: auto;
  z-index: auto;
  background-color: transparent;
}
.page[data-frame=canvas] .canvas-sidebar .explorer-content > .explorer-ul {
  overscroll-behavior: auto;
}

.transclude .canvas-page {
  height: auto;
}
.transclude .canvas-container {
  height: auto;
  min-height: 400px;
}
.transclude .canvas-controls {
  position: absolute;
}

.popover-inner .canvas-page {
  height: auto;
}
.popover-inner .canvas-container {
  height: auto;
  min-height: 200px;
  max-height: 300px;
}
.popover-inner .canvas-controls {
  display: none;
}

.page[data-frame=canvas] .canvas-fullscreen-toggle {
  display: none;
}

.canvas-container:fullscreen {
  width: 100vw;
  height: 100vh;
  min-height: unset;
  background-color: var(--light);
}
.canvas-container:fullscreen .canvas-controls {
  position: fixed;
}`;

// src/components/scripts/canvas.inline.ts
var canvas_inline_default = 'function K(){let E=document.querySelectorAll(".canvas-container");if(E.length!==0)for(let t of Array.from(E)){if(t.dataset.initialized==="true")continue;t.dataset.initialized="true";let M=t.querySelector(".canvas-viewport");if(!M)continue;let j=t.dataset.enableInteraction!=="false",w=parseFloat(t.dataset.minZoom??"")||.1,H=parseFloat(t.dataset.maxZoom??"")||5,o=parseFloat(t.dataset.initialZoom??"")||1,c=0,a=0,Y=!1,D=0,O=0,v=()=>{M.style.transform=`translate(${c}px, ${a}px) scale(${o})`},q=()=>{let n=t.getBoundingClientRect(),l=parseFloat(M.style.width)||1e3,u=parseFloat(M.style.height)||1e3,r=n.width/l,d=n.height/u;o=Math.min(r,d,1)*.9,o=Math.max(w,Math.min(H,o)),c=(n.width-l*o)/2,a=(n.height-u*o)/2,v()};q();let F=o,B=c,S=a,L=t.querySelector(".canvas-reset-view"),m=()=>{if(!L)return;let n=Math.abs(o-F)>.001||Math.abs(c-B)>1||Math.abs(a-S)>1;L.style.display=n?"flex":"none"},f=[];if(j){let n=e=>{let s=e.target instanceof HTMLElement?e.target.closest(".canvas-node-content"):null;if(s&&s.scrollHeight>s.clientHeight){let b=s.scrollTop<=0,A=s.scrollTop+s.clientHeight>=s.scrollHeight-1,x=e.deltaY>0,J=e.deltaY<0;if(!(b&&J)&&!(A&&x))return}e.preventDefault();let i=t.getBoundingClientRect(),T=e.clientX-i.left,p=e.clientY-i.top,g=o,X=e.deltaY>0?.9:1.1;o=Math.max(w,Math.min(H,o*X)),c=T-(T-c)*(o/g),a=p-(p-a)*(o/g),v(),m()},l=e=>{if(e.button===0&&!(e.target instanceof HTMLElement&&(e.target.closest("a")||e.target.closest("button")))){if(e.target instanceof HTMLElement){let s=e.target.closest(".canvas-node-content");if(s&&s.scrollHeight>s.clientHeight){let i=s.getBoundingClientRect();if(e.clientX>=i.right-16)return}}Y=!0,D=e.clientX-c,O=e.clientY-a,t.setPointerCapture(e.pointerId)}},u=e=>{Y&&(c=e.clientX-D,a=e.clientY-O,v(),m())},r=()=>{Y=!1};t.addEventListener("wheel",n,{passive:!1}),t.addEventListener("pointerdown",l),t.addEventListener("pointermove",u),t.addEventListener("pointerup",r);let d=0,h=0,I=0,z=!1,N=e=>{if(e.length<2||!e[0]||!e[1])return 0;let s=e[0].clientX-e[1].clientX,i=e[0].clientY-e[1].clientY;return Math.sqrt(s*s+i*i)},U=e=>{if(e.touches.length===2){let s=e.touches[0],i=e.touches[1];if(!s||!i)return;e.preventDefault(),z=!0,Y=!1,d=N(e.touches),h=(s.clientX+i.clientX)/2,I=(s.clientY+i.clientY)/2}},W=e=>{if(e.touches.length===2&&z){let s=e.touches[0],i=e.touches[1];if(!s||!i)return;e.preventDefault();let T=N(e.touches),p=(s.clientX+i.clientX)/2,g=(s.clientY+i.clientY)/2,X=t.getBoundingClientRect(),P=p-X.left,b=g-X.top,A=T/d,x=o;o=Math.max(w,Math.min(H,o*A)),c=P-(P-c)*(o/x),a=b-(b-a)*(o/x),c+=p-h,a+=g-I,d=T,h=p,I=g,v(),m()}},V=e=>{e.touches.length<2&&(z=!1)};t.addEventListener("touchstart",U,{passive:!1}),t.addEventListener("touchmove",W,{passive:!1}),t.addEventListener("touchend",V),f.push(()=>{t.removeEventListener("wheel",n),t.removeEventListener("pointerdown",l),t.removeEventListener("pointermove",u),t.removeEventListener("pointerup",r),t.removeEventListener("touchstart",U),t.removeEventListener("touchmove",W),t.removeEventListener("touchend",V)})}let C=t.closest(\'.page[data-frame="canvas"]\'),R=C?.querySelector(".canvas-sidebar-toggle");if(C&&R){let n=()=>{let l=t.getBoundingClientRect();C.classList.toggle("canvas-sidebar-open"),requestAnimationFrame(()=>{let r=t.getBoundingClientRect().left-l.left;c+=r,B+=r,v(),m()})};R.addEventListener("click",n),f.push(()=>{R.removeEventListener("click",n)})}let k=t.querySelector(".canvas-zoom-in"),Z=t.querySelector(".canvas-zoom-out"),$=n=>{let l=t.getBoundingClientRect(),u=l.width/2,r=l.height/2,d=o;o=Math.max(w,Math.min(H,o*n)),c=u-(u-c)*(o/d),a=r-(r-a)*(o/d),v(),m()};if(k){let n=()=>{$(1.25)};k.addEventListener("click",n),f.push(()=>k.removeEventListener("click",n))}if(Z){let n=()=>{$(.8)};Z.addEventListener("click",n),f.push(()=>Z.removeEventListener("click",n))}if(L){let n=()=>{q(),F=o,B=c,S=a,m()};L.addEventListener("click",n),f.push(()=>L.removeEventListener("click",n))}let y=t.querySelector(".canvas-fullscreen-toggle");if(y){let n=y.querySelector(".canvas-fullscreen-enter"),l=y.querySelector(".canvas-fullscreen-exit"),u=()=>{let h=document.fullscreenElement===t;n&&(n.style.display=h?"none":""),l&&(l.style.display=h?"":"none")},r=()=>{document.fullscreenElement===t?document.exitFullscreen():t.requestFullscreen()},d=()=>{u(),requestAnimationFrame(()=>{q(),F=o,B=c,S=a,m()})};y.addEventListener("click",r),document.addEventListener("fullscreenchange",d),f.push(()=>{y.removeEventListener("click",r),document.removeEventListener("fullscreenchange",d)})}let G=t.querySelectorAll(".canvas-iframe-wrapper iframe");for(let n of Array.from(G))n.addEventListener("error",()=>{let l=n.parentElement?.querySelector(".canvas-iframe-fallback");l&&(n.style.display="none",l.style.display="flex")});typeof window<"u"&&window.addCleanup&&window.addCleanup(()=>{for(let n of f)n();t.dataset.initialized="false"})}}if(typeof document<"u"){let E=()=>{K()};document.addEventListener("nav",E),document.addEventListener("render",E)}\n';
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
  var a2, c2, p3 = t2;
  if ("ref" in p3) for (c2 in p3 = {}, t2) "ref" == c2 ? a2 = t2[c2] : p3[c2] = t2[c2];
  var l2 = { type: e2, props: p3, key: n2, ref: a2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f2, __i: -1, __u: 0, __source: i2, __self: u3 };
  if ("function" == typeof e2 && (a2 = e2.defaultProps)) for (c2 in a2) void 0 === p3[c2] && (p3[c2] = a2[c2]);
  return l.vnode && l.vnode(l2), l2;
}

// src/components/CanvasBody.tsx
function resolveColor(color) {
  if (!color) return void 0;
  if (color.startsWith("#")) return color;
  return CANVAS_PRESET_COLORS[color] ?? void 0;
}
function getEdgeAnchor(node, side) {
  const border = node.type === "group" ? 2 : 2;
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  switch (side) {
    case "top":
      return { x: cx, y: node.y - border };
    case "bottom":
      return { x: cx, y: node.y + node.height + border };
    case "left":
      return { x: node.x - border, y: cy };
    case "right":
      return { x: node.x + node.width + border, y: cy };
    default:
      return { x: cx, y: cy };
  }
}
var headerRegex = /^h[1-6]$/;
function findPage(fileSlug, allFiles) {
  let page = allFiles.find((f3) => f3.slug === fileSlug);
  if (!page) {
    const dotIdx = fileSlug.lastIndexOf(".");
    const slashIdx = fileSlug.lastIndexOf("/");
    if (dotIdx > slashIdx + 1) {
      const stripped = fileSlug.slice(0, dotIdx);
      page = allFiles.find((f3) => f3.slug === stripped);
    }
  }
  return page;
}
function applySubpath(htmlAst, page, subpath, isBasePage) {
  if (subpath.startsWith("#^")) {
    const blockId = subpath.slice(2);
    const blocks = page.blocks;
    const blockNode = blocks?.[blockId];
    if (!blockNode) return void 0;
    const wrapped = blockNode.tagName === "li" ? { type: "element", tagName: "ul", properties: {}, children: [blockNode] } : blockNode;
    return { type: "root", children: [wrapped] };
  }
  const ref = subpath.startsWith("#") ? subpath.slice(1) : subpath;
  if (!ref) return htmlAst;
  if (isBasePage) {
    const refLower = ref.toLowerCase();
    for (const child of htmlAst.children) {
      if (child.type !== "element") continue;
      const found = findBasesView(child, refLower);
      if (found) return { type: "root", children: [found] };
    }
    return void 0;
  }
  let startIdx;
  let startDepth;
  let endIdx;
  for (const [i2, el] of htmlAst.children.entries()) {
    if (el.type !== "element" || !headerRegex.test(el.tagName)) continue;
    const depth = Number(el.tagName.substring(1));
    if (startIdx === void 0 || startDepth === void 0) {
      if (el.properties?.id === ref) {
        startIdx = i2;
        startDepth = depth;
      }
    } else if (depth <= startDepth) {
      endIdx = i2;
      break;
    }
  }
  if (startIdx === void 0) return void 0;
  return { type: "root", children: htmlAst.children.slice(startIdx, endIdx) };
}
function findBasesView(el, viewName) {
  const classes = (el.properties?.className ?? []).join(" ");
  if (classes.includes("bases-view") && !classes.includes("bases-view-container")) {
    const viewType = el.properties?.dataViewType ?? "";
    if (viewType.toLowerCase() === viewName) return el;
  }
  for (const child of el.children) {
    if (child.type !== "element") continue;
    const found = findBasesView(child, viewName);
    if (found) return found;
  }
  return void 0;
}
function resolveEmbeddedHtml(fileSlug, canvasSlug, allFiles, subpath, visited) {
  const resolvedSlug = fileSlug;
  if (visited?.has(resolvedSlug)) return void 0;
  const page = findPage(fileSlug, allFiles);
  if (!page) return void 0;
  const htmlAst = page.htmlAst;
  if (!htmlAst) return void 0;
  const sourceSlug = page.slug;
  if (!sourceSlug) return void 0;
  let tree = htmlAst;
  if (subpath) {
    const isBasePage = "basesData" in page;
    const sub = applySubpath(htmlAst, page, subpath, isBasePage);
    if (!sub) return void 0;
    tree = sub;
  }
  const rebased = {
    ...tree,
    children: tree.children.map(
      (child) => child.type === "element" ? normalizeHastElement(child, canvasSlug, sourceSlug) : child
    )
  };
  return toHtml(rebased, { allowDangerousHtml: true });
}
function renderNode(node, renderedTexts, slug2, allFiles, visited) {
  const color = resolveColor(node.color);
  const baseStyle = {
    left: `${node.x}px`,
    top: `${node.y}px`,
    width: `${node.width}px`,
    height: `${node.height}px`
  };
  if (color) {
    baseStyle["--canvas-node-color"] = color;
  }
  const styleStr = Object.entries(baseStyle).map(([k, v2]) => `${k}:${v2}`).join(";");
  switch (node.type) {
    case "text": {
      const html5 = renderedTexts[node.id];
      return /* @__PURE__ */ u2("div", { class: "canvas-node canvas-node-text", "data-node-id": node.id, style: styleStr, children: html5 ? /* @__PURE__ */ u2("div", { class: "canvas-node-content", dangerouslySetInnerHTML: { __html: html5 } }) : /* @__PURE__ */ u2("div", { class: "canvas-node-content", children: node.text }) });
    }
    case "file": {
      const filename = node.file.split("/").pop()?.replace(/\.md$/, "") ?? node.file;
      const fileSlug = slugifyFilePath(node.file);
      const isImage = /\.(png|jpe?g|gif|svg|webp|avif|bmp|ico)$/i.test(node.file);
      if (isImage) {
        return /* @__PURE__ */ u2(
          "div",
          {
            class: "canvas-node canvas-node-file canvas-node-image",
            "data-node-id": node.id,
            style: styleStr,
            children: /* @__PURE__ */ u2("img", { src: resolveRelative(slug2, fileSlug), alt: filename, loading: "lazy" })
          }
        );
      }
      const embedded = resolveEmbeddedHtml(fileSlug, slug2, allFiles, node.subpath, visited);
      return /* @__PURE__ */ u2("div", { class: "canvas-node canvas-node-file", "data-node-id": node.id, style: styleStr, children: [
        /* @__PURE__ */ u2("div", { class: "canvas-file-label", children: [
          /* @__PURE__ */ u2(
            "a",
            {
              href: resolveRelative(slug2, fileSlug),
              class: "canvas-file-link internal internal-link",
              "data-slug": fileSlug,
              children: filename
            }
          ),
          node.subpath && /* @__PURE__ */ u2("span", { class: "canvas-file-subpath", children: node.subpath })
        ] }),
        /* @__PURE__ */ u2("div", { class: "canvas-node-content", children: embedded ? /* @__PURE__ */ u2("div", { class: "canvas-embed-content", dangerouslySetInnerHTML: { __html: embedded } }) : /* @__PURE__ */ u2(
          "a",
          {
            href: resolveRelative(slug2, fileSlug),
            class: "canvas-file-link internal internal-link",
            "data-slug": fileSlug,
            children: filename
          }
        ) })
      ] });
    }
    case "link": {
      let hostname;
      try {
        hostname = new URL(node.url).hostname;
      } catch {
        hostname = node.url;
      }
      return /* @__PURE__ */ u2("div", { class: "canvas-node canvas-node-link", "data-node-id": node.id, style: styleStr, children: [
        /* @__PURE__ */ u2("div", { class: "canvas-link-label", children: /* @__PURE__ */ u2(
          "a",
          {
            href: node.url,
            class: "canvas-link external external-link",
            target: "_blank",
            rel: "noopener noreferrer",
            children: hostname
          }
        ) }),
        /* @__PURE__ */ u2("div", { class: "canvas-node-content canvas-iframe-wrapper", children: [
          /* @__PURE__ */ u2(
            "iframe",
            {
              src: node.url,
              title: hostname,
              sandbox: "allow-scripts allow-same-origin allow-popups",
              loading: "lazy",
              referrerpolicy: "no-referrer"
            }
          ),
          /* @__PURE__ */ u2("div", { class: "canvas-iframe-fallback", children: /* @__PURE__ */ u2("a", { href: node.url, target: "_blank", rel: "noopener noreferrer", children: [
            "Open ",
            hostname,
            " in new tab"
          ] }) })
        ] })
      ] });
    }
    case "group":
      return /* @__PURE__ */ u2("div", { class: "canvas-node canvas-node-group", "data-node-id": node.id, style: styleStr, children: node.label && /* @__PURE__ */ u2("div", { class: "canvas-group-label", children: node.label }) });
    default:
      return null;
  }
}
function renderEdge(edge, nodeMap) {
  const fromNode = nodeMap.get(edge.fromNode);
  const toNode = nodeMap.get(edge.toNode);
  if (!fromNode || !toNode) return null;
  const from = getEdgeAnchor(fromNode, edge.fromSide);
  const to = getEdgeAnchor(toNode, edge.toSide);
  const color = resolveColor(edge.color);
  const hasFromArrow = edge.fromEnd === "arrow";
  const hasToArrow = (edge.toEnd ?? "arrow") === "arrow";
  const markerId = `arrow-${edge.id}`;
  const markerStartId = `arrow-start-${edge.id}`;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const midX = from.x + dx / 2;
  const midY = from.y + dy / 2;
  const pathD = `M ${from.x} ${from.y} Q ${midX} ${from.y}, ${midX} ${midY} T ${to.x} ${to.y}`;
  return /* @__PURE__ */ u2("g", { class: "canvas-edge", "data-edge-id": edge.id, children: [
    /* @__PURE__ */ u2("defs", { children: [
      hasToArrow && /* @__PURE__ */ u2(
        "marker",
        {
          id: markerId,
          viewBox: "0 0 10 10",
          refX: "9",
          refY: "5",
          markerWidth: "6",
          markerHeight: "6",
          orient: "auto-start-reverse",
          children: /* @__PURE__ */ u2("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: color ?? "var(--darkgray)" })
        }
      ),
      hasFromArrow && /* @__PURE__ */ u2(
        "marker",
        {
          id: markerStartId,
          viewBox: "0 0 10 10",
          refX: "1",
          refY: "5",
          markerWidth: "6",
          markerHeight: "6",
          orient: "auto-start-reverse",
          children: /* @__PURE__ */ u2("path", { d: "M 10 0 L 0 5 L 10 10 z", fill: color ?? "var(--darkgray)" })
        }
      )
    ] }),
    /* @__PURE__ */ u2(
      "path",
      {
        d: pathD,
        fill: "none",
        stroke: color ?? "var(--darkgray)",
        "stroke-width": "2",
        "marker-end": hasToArrow ? `url(#${markerId})` : void 0,
        "marker-start": hasFromArrow ? `url(#${markerStartId})` : void 0
      }
    ),
    edge.label && /* @__PURE__ */ u2("g", { class: "canvas-edge-label-group", children: [
      /* @__PURE__ */ u2(
        "rect",
        {
          x: midX - edge.label.length * 3.5 - 4,
          y: midY - 20,
          width: edge.label.length * 7 + 8,
          height: 16,
          rx: "3",
          class: "canvas-edge-label-bg"
        }
      ),
      /* @__PURE__ */ u2("text", { x: midX, y: midY, class: "canvas-edge-label", "text-anchor": "middle", dy: "-8", children: edge.label })
    ] })
  ] });
}
var CanvasBody_default = ((userOpts) => {
  const Component = (props) => {
    const fileData = props.fileData;
    const slug2 = props.fileData.slug ?? "";
    const canvasData = fileData.canvasData;
    if (!canvasData) {
      return /* @__PURE__ */ u2("article", { class: "canvas-page popover-hint", children: /* @__PURE__ */ u2("p", { children: "No canvas data found." }) });
    }
    const nodes = canvasData.nodes ?? [];
    const edges = canvasData.edges ?? [];
    const renderedTexts = canvasData.renderedTexts ?? {};
    const allFiles = props.allFiles;
    const visited = /* @__PURE__ */ new Set([slug2]);
    const nodeMap = /* @__PURE__ */ new Map();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodes) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }
    if (nodes.length === 0) {
      minX = minY = 0;
      maxX = maxY = 100;
    }
    const padding = 50;
    const viewWidth = maxX - minX + padding * 2;
    const viewHeight = maxY - minY + padding * 2;
    const opts = userOpts ?? {};
    const enableInteraction = opts.enableInteraction ?? true;
    const initialZoom = opts.initialZoom ?? 1;
    const minZoom = opts.minZoom ?? 0.1;
    const maxZoom = opts.maxZoom ?? 5;
    return /* @__PURE__ */ u2("article", { class: "canvas-page popover-hint", children: /* @__PURE__ */ u2(
      "div",
      {
        class: "canvas-container",
        "data-enable-interaction": enableInteraction.toString(),
        "data-initial-zoom": initialZoom.toString(),
        "data-min-zoom": minZoom.toString(),
        "data-max-zoom": maxZoom.toString(),
        children: [
          /* @__PURE__ */ u2("div", { class: "canvas-controls", children: [
            /* @__PURE__ */ u2("div", { class: "canvas-zoom-group", children: [
              /* @__PURE__ */ u2("button", { class: "canvas-zoom-in", type: "button", "aria-label": "Zoom in", children: /* @__PURE__ */ u2(
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
                  children: [
                    /* @__PURE__ */ u2("circle", { cx: "11", cy: "11", r: "8" }),
                    /* @__PURE__ */ u2("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" }),
                    /* @__PURE__ */ u2("line", { x1: "11", y1: "8", x2: "11", y2: "14" }),
                    /* @__PURE__ */ u2("line", { x1: "8", y1: "11", x2: "14", y2: "11" })
                  ]
                }
              ) }),
              /* @__PURE__ */ u2("button", { class: "canvas-zoom-out", type: "button", "aria-label": "Zoom out", children: /* @__PURE__ */ u2(
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
                  children: [
                    /* @__PURE__ */ u2("circle", { cx: "11", cy: "11", r: "8" }),
                    /* @__PURE__ */ u2("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" }),
                    /* @__PURE__ */ u2("line", { x1: "8", y1: "11", x2: "14", y2: "11" })
                  ]
                }
              ) })
            ] }),
            /* @__PURE__ */ u2(
              "button",
              {
                class: "canvas-reset-view",
                type: "button",
                "aria-label": "Reset view",
                style: "display:none",
                children: /* @__PURE__ */ u2(
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
                    children: [
                      /* @__PURE__ */ u2("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }),
                      /* @__PURE__ */ u2("path", { d: "M3 3v5h5" })
                    ]
                  }
                )
              }
            ),
            /* @__PURE__ */ u2("button", { class: "canvas-fullscreen-toggle", type: "button", "aria-label": "Toggle fullscreen", children: [
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
                  class: "canvas-fullscreen-enter",
                  children: [
                    /* @__PURE__ */ u2("path", { d: "M8 3H5a2 2 0 0 0-2 2v3" }),
                    /* @__PURE__ */ u2("path", { d: "M21 8V5a2 2 0 0 0-2-2h-3" }),
                    /* @__PURE__ */ u2("path", { d: "M3 16v3a2 2 0 0 0 2 2h3" }),
                    /* @__PURE__ */ u2("path", { d: "M16 21h3a2 2 0 0 0 2-2v-3" })
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
                  class: "canvas-fullscreen-exit",
                  style: "display:none",
                  children: [
                    /* @__PURE__ */ u2("path", { d: "M8 3v3a2 2 0 0 1-2 2H3" }),
                    /* @__PURE__ */ u2("path", { d: "M21 8h-3a2 2 0 0 1-2-2V3" }),
                    /* @__PURE__ */ u2("path", { d: "M3 16h3a2 2 0 0 1 2 2v3" }),
                    /* @__PURE__ */ u2("path", { d: "M16 21v-3a2 2 0 0 1 2-2h3" })
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ u2("div", { class: "canvas-viewport", style: `width:${viewWidth}px;height:${viewHeight}px`, children: [
            /* @__PURE__ */ u2(
              "div",
              {
                class: "canvas-nodes",
                style: `transform:translate(${-minX + padding}px,${-minY + padding}px)`,
                children: nodes.map((node) => renderNode(node, renderedTexts, slug2, allFiles, visited))
              }
            ),
            /* @__PURE__ */ u2(
              "svg",
              {
                class: "canvas-edges",
                width: viewWidth,
                height: viewHeight,
                viewBox: `${minX - padding} ${minY - padding} ${viewWidth} ${viewHeight}`,
                children: edges.map((edge) => renderEdge(edge, nodeMap))
              }
            )
          ] })
        ]
      }
    ) });
  };
  Component.css = canvas_default;
  Component.afterDOMLoaded = canvas_inline_default;
  return Component;
});

export { CanvasBody_default as CanvasBody, resolveEmbeddedHtml };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map