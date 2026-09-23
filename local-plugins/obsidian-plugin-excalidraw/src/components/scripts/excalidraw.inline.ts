// @ts-nocheck
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
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
  // LOCI PATCH: pans and zooms the whole canvas rather than the bare <svg>,
  // so the note boxes ride the same transform and need no repositioning.
  // The canvas only lives in this container while the dialog is open.
  const container = page?.querySelector(".excalidraw-container");
  if (!container) return;

  container.style.backgroundColor = "var(--excalidraw-bg, var(--light))";

  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let travel = 0;

  function applyTransform() {
    canvas.style.transform = "translate(" + panX + "px, " + panY + "px) scale(" + zoom + ")";
  }

  function handleWheel(e) {
    e.preventDefault();
    var delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
    applyTransform();
  }

  function handleMouseDown(e) {
    if (e.button !== 0) return;
    isDragging = true;
    travel = 0;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    container.style.cursor = "grabbing";
  }

  function handleMouseMove(e) {
    if (!isDragging) return;
    travel += Math.abs(e.clientX - startX - panX) + Math.abs(e.clientY - startY - panY);
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    applyTransform();
  }

  function handleMouseUp() {
    isDragging = false;
    container.style.cursor = "grab";
  }

  var zoomInBtn = page.querySelector(".excalidraw-zoom-in");
  var zoomOutBtn = page.querySelector(".excalidraw-zoom-out");
  var resetBtn = page.querySelector(".excalidraw-reset");

  if (zoomInBtn) {
    zoomInBtn.addEventListener("click", function () {
      zoom = Math.min(MAX_ZOOM, zoom + ZOOM_STEP);
      applyTransform();
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", function () {
      zoom = Math.max(MIN_ZOOM, zoom - ZOOM_STEP);
      applyTransform();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", reset);
  }

  var lastTouchDist = 0;

  function handleTouchStart(e) {
    if (e.touches.length === 1) {
      isDragging = true;
      travel = 0;
      startX = e.touches[0].clientX - panX;
      startY = e.touches[0].clientY - panY;
    } else if (e.touches.length === 2) {
      isDragging = false;
      var dx = e.touches[0].clientX - e.touches[1].clientX;
      var dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist = Math.sqrt(dx * dx + dy * dy);
    }
  }

  function handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      travel +=
        Math.abs(e.touches[0].clientX - startX - panX) +
        Math.abs(e.touches[0].clientY - startY - panY);
      panX = e.touches[0].clientX - startX;
      panY = e.touches[0].clientY - startY;
      applyTransform();
    } else if (e.touches.length === 2 && lastTouchDist > 0) {
      var dx = e.touches[0].clientX - e.touches[1].clientX;
      var dy = e.touches[0].clientY - e.touches[1].clientY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var scale = dist / lastTouchDist;
      zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * scale));
      lastTouchDist = dist;
      applyTransform();
    }
  }

  function handleTouchEnd() {
    isDragging = false;
    lastTouchDist = 0;
  }

  container.addEventListener("wheel", handleWheel, { passive: false });
  container.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  container.addEventListener("touchstart", handleTouchStart, { passive: true });
  container.addEventListener("touchmove", handleTouchMove, { passive: false });
  container.addEventListener("touchend", handleTouchEnd);

  window.addCleanup(function () {
    container.removeEventListener("wheel", handleWheel);
    container.removeEventListener("mousedown", handleMouseDown);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    container.removeEventListener("touchstart", handleTouchStart);
    container.removeEventListener("touchmove", handleTouchMove);
    container.removeEventListener("touchend", handleTouchEnd);
  });

  function reset() {
    travel = 0;
    zoom = 1;
    panX = 0;
    panY = 0;
    applyTransform();
  }

  // dragged(): the last press moved more than a few px — initNotes() reads it
  // so releasing a pan over a note box does not open that note.
  return { reset, dragged: () => travel > 6 };
}

document.addEventListener("nav", initExcalidraw);
