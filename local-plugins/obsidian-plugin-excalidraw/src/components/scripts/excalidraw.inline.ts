// @ts-nocheck
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.15;

function initExcalidraw() {
  const framePage = document.querySelector(".page[data-frame='excalidraw']");
  if (framePage) {
    initSidebar(framePage);
  }

  // LOCI PATCH: each drawing is one .excalidraw-canvas (SVG + note boxes)
  // shown in the column. Note boxes open maximised in the note dialog; ⤢
  // moves the canvas into the full-screen dialog, where pan/zoom applies,
  // and back out on close.
  for (const view of document.querySelectorAll(".excalidraw-view")) {
    const canvas = view.querySelector(".excalidraw-canvas");
    const full = view.nextElementSibling;
    const note = full?.nextElementSibling;
    if (!canvas || !full?.matches(".excalidraw-dialog")) continue;
    trackScale(canvas);
    const pz = initPanZoom(full.querySelector(".excalidraw-page"), canvas);
    initFullScreen(view, canvas, full, pz);
    if (note?.matches(".excalidraw-note-dialog")) initNotes(canvas, note, pz);
  }
}

// --k is the canvas's rendered width over its viewBox width: the one number
// that maps a note box's native px onto the drawing as it is laid out now.
function trackScale(canvas) {
  const vbW = parseFloat(canvas.dataset.viewboxW) || 1;
  const ro = new ResizeObserver(() => {
    canvas.style.setProperty("--k", String(canvas.clientWidth / vbW));
  });
  ro.observe(canvas);
  window.addCleanup(() => ro.disconnect());
}

function closeOnBackdrop(dialog) {
  dialog.querySelector(".excalidraw-dialog-close")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
}

function initFullScreen(view, canvas, dialog, panZoom) {
  const container = dialog.querySelector(".excalidraw-container");
  view.querySelector(".excalidraw-expand")?.addEventListener("click", () => {
    panZoom?.reset();
    container.append(canvas);
    dialog.showModal();
  });
  dialog.addEventListener("close", () => {
    panZoom?.reset();
    view.prepend(canvas);
  });
  closeOnBackdrop(dialog);
}

function initNotes(canvas, dialog, panZoom) {
  const title = dialog.querySelector(".excalidraw-note-title");
  const body = dialog.querySelector(".excalidraw-note-body");

  function open(box) {
    // a pan that ends on a box is a drag, not a request to read it
    if (panZoom?.dragged()) return;
    const href = box.dataset.href;
    title.replaceChildren();
    const heading = href ? document.createElement("a") : document.createElement("span");
    if (href) heading.href = href;
    heading.textContent = box.dataset.title ?? "";
    title.append(heading);
    body.innerHTML = box.querySelector(".excalidraw-embed-content")?.innerHTML ?? "";
    dialog.showModal();
    body.scrollTop = 0;
  }

  for (const box of canvas.querySelectorAll(".excalidraw-embed-note")) {
    box.addEventListener("click", () => open(box));
    box.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(box);
      }
    });
  }
  closeOnBackdrop(dialog);
}

function initSidebar(page) {
  const toggle = page.querySelector(".excalidraw-sidebar-toggle");
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    page.classList.toggle("excalidraw-sidebar-open");
  });

  window.addCleanup(() => {
    page.classList.remove("excalidraw-sidebar-open");
  });
}

function initPanZoom(page, canvas) {
  // LOCI PATCH: Obsidian-style pan/zoom on the canvas itself, so it works in
  // the column and full screen alike and the note boxes ride the same
  // transform. The listeners sit on the canvas and travel with it into the
  // dialog; full() tells the two places apart.
  //   column:      a click selects the drawing; once selected the wheel
  //                zooms it, until a click elsewhere lets it go. Unselected,
  //                the wheel and a one-finger swipe scroll the page. Drag
  //                pans; ctrl+wheel / trackpad pinch and two fingers zoom.
  //   full screen: always selected; wheel zooms, drag or one finger pans.
  // Zoom holds the point under the cursor or pinch still. Double-click resets.
  if (!page) return;
  const full = () => canvas.parentElement?.classList.contains("excalidraw-container");

  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let travel = 0;
  let drag = null; // last pointer position while one pointer pans
  let pinch = null; // last {dist, x, y} while two fingers are down

  function applyTransform() {
    canvas.style.transform = "translate(" + panX + "px, " + panY + "px) scale(" + zoom + ")";
  }

  // with transform-origin 0 0 the canvas box's left edge is its untransformed
  // origin plus panX, which is what lets the point under (cx, cy) stay put
  function zoomAt(cx, cy, next) {
    next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
    const r = canvas.getBoundingClientRect();
    const ux = (cx - r.left) / zoom;
    const uy = (cy - r.top) / zoom;
    panX += cx - r.left - next * ux;
    panY += cy - r.top - next * uy;
    zoom = next;
    applyTransform();
  }

  function zoomAtCentre(next) {
    const r = canvas.parentElement.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, next);
  }

  function panBy(dx, dy) {
    travel += Math.abs(dx) + Math.abs(dy);
    panX += dx;
    panY += dy;
    applyTransform();
  }

  function handleWheel(e) {
    const unit = e.deltaMode === 1 ? 16 : 1;
    if (!e.ctrlKey && !full() && !canvas.classList.contains("is-selected")) return;
    e.preventDefault();
    const d = Math.max(-50, Math.min(50, e.deltaY * unit));
    zoomAt(e.clientX, e.clientY, zoom * Math.exp(-d * 0.005));
  }

  function handleMouseDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    travel = 0;
    drag = { x: e.clientX, y: e.clientY };
    canvas.classList.add("is-panning", "is-selected");
  }

  function handleMouseMove(e) {
    if (!drag) return;
    panBy(e.clientX - drag.x, e.clientY - drag.y);
    drag = { x: e.clientX, y: e.clientY };
  }

  function handleOutside(e) {
    if (!canvas.contains(e.target)) canvas.classList.remove("is-selected");
  }

  function handleMouseUp() {
    drag = null;
    canvas.classList.remove("is-panning");
  }

  function pinchOf(touches) {
    const [a, b] = touches;
    return {
      dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
      x: (a.clientX + b.clientX) / 2,
      y: (a.clientY + b.clientY) / 2,
    };
  }

  function startTouches(touches) {
    drag = null;
    pinch = null;
    if (touches.length >= 2) pinch = pinchOf(touches);
    else if (touches.length === 1 && full())
      drag = { x: touches[0].clientX, y: touches[0].clientY };
  }

  function handleTouchStart(e) {
    if (e.touches.length === 1) travel = 0;
    startTouches(e.touches);
  }

  function handleTouchMove(e) {
    if (pinch && e.touches.length >= 2) {
      e.preventDefault();
      const now = pinchOf(e.touches);
      panBy(now.x - pinch.x, now.y - pinch.y);
      zoomAt(now.x, now.y, zoom * (now.dist / pinch.dist));
      pinch = now;
    } else if (drag && e.touches.length === 1) {
      e.preventDefault();
      panBy(e.touches[0].clientX - drag.x, e.touches[0].clientY - drag.y);
      drag = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }

  // a finger lifted mid-pinch hands over to a one-finger pan, not a jump
  function handleTouchEnd(e) {
    startTouches(e.touches);
  }

  function reset() {
    travel = 0;
    zoom = 1;
    panX = 0;
    panY = 0;
    applyTransform();
  }

  page.querySelector(".excalidraw-zoom-in")?.addEventListener("click", () => {
    zoomAtCentre(zoom * (1 + ZOOM_STEP));
  });
  page.querySelector(".excalidraw-zoom-out")?.addEventListener("click", () => {
    zoomAtCentre(zoom / (1 + ZOOM_STEP));
  });
  page.querySelector(".excalidraw-reset")?.addEventListener("click", reset);

  canvas.addEventListener("wheel", handleWheel, { passive: false });
  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("dblclick", reset);
  // a pan that ends on a linked element is a drag, not a click through
  canvas.addEventListener(
    "click",
    (e) => {
      if (travel > 6 && e.target.closest?.(".excalidraw-link")) e.preventDefault();
    },
    true,
  );
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  document.addEventListener("mousedown", handleOutside);
  canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
  canvas.addEventListener("touchend", handleTouchEnd);
  canvas.addEventListener("touchcancel", handleTouchEnd);

  window.addCleanup(function () {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.removeEventListener("mousedown", handleOutside);
  });

  // dragged(): the last press moved more than a few px — initNotes() reads it
  // so releasing a pan over a note box does not open that note.
  return { reset, dragged: () => travel > 6 };
}

document.addEventListener("nav", initExcalidraw);
