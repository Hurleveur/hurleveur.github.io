// @ts-nocheck
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.15;

function initExcalidraw() {
  const framePage = document.querySelector(".page[data-frame='excalidraw']");
  if (framePage) {
    initSidebar(framePage);
  }

  // LOCI PATCH: pan/zoom now lives inside a <dialog> per drawing (standalone
  // page or transcluded/popover embed alike) — wire each thumb to its dialog,
  // and only run positionOverlays() once the dialog is actually visible
  // (getScreenCTM() on a display:none <dialog> returns null at init time).
  const dialogs = document.querySelectorAll(".excalidraw-dialog");
  for (const dialog of dialogs) {
    const page = dialog.querySelector(".excalidraw-page");
    if (!page) continue;
    const pz = initPanZoom(page);
    initDialog(dialog, pz);
  }
}

function initDialog(dialog, panZoom) {
  const thumb = dialog.previousElementSibling;
  const closeBtn = dialog.querySelector(".excalidraw-dialog-close");

  if (thumb && thumb.classList.contains("excalidraw-thumb")) {
    thumb.addEventListener("click", () => {
      dialog.showModal();
      panZoom?.refresh();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => dialog.close());
  }

  // native backdrop click: only the <dialog> itself (not its content) is
  // the click target when the click lands outside .excalidraw-page
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
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

function initPanZoom(page) {
  const container = page.querySelector(".excalidraw-container");
  if (!container) return;

  const svg = container.querySelector("svg");
  if (!svg) return;

  container.style.backgroundColor = "var(--excalidraw-bg, var(--light))";

  var overlaysContainer = page.querySelector(".excalidraw-overlays");

  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  function positionOverlays() {
    if (!overlaysContainer) return;
    var overlays = overlaysContainer.querySelectorAll(".excalidraw-overlay");
    if (overlays.length === 0) return;

    var offX = parseFloat(overlaysContainer.getAttribute("data-offset-x")) || 0;
    var offY = parseFloat(overlaysContainer.getAttribute("data-offset-y")) || 0;

    var ctm = svg.getScreenCTM();
    var containerRect = container.getBoundingClientRect();
    if (!ctm) return;

    for (var i = 0; i < overlays.length; i++) {
      var el = overlays[i];
      var ex = parseFloat(el.getAttribute("data-x")) || 0;
      var ey = parseFloat(el.getAttribute("data-y")) || 0;
      var ew = parseFloat(el.getAttribute("data-w")) || 0;
      var eh = parseFloat(el.getAttribute("data-h")) || 0;

      var svgX = ex + offX;
      var svgY = ey + offY;

      var screenLeft = svgX * ctm.a + ctm.e - containerRect.left;
      var screenTop = svgY * ctm.d + ctm.f - containerRect.top;
      var screenWidth = ew * ctm.a;
      var screenHeight = eh * ctm.d;

      el.style.left = screenLeft + "px";
      el.style.top = screenTop + "px";
      el.style.width = screenWidth + "px";
      el.style.height = screenHeight + "px";
      el.style.display = "flex";
    }
  }

  positionOverlays();

  function applyTransform() {
    svg.style.transform = "translate(" + panX + "px, " + panY + "px) scale(" + zoom + ")";
    positionOverlays();
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
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    container.style.cursor = "grabbing";
  }

  function handleMouseMove(e) {
    if (!isDragging) return;
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
    resetBtn.addEventListener("click", function () {
      zoom = 1;
      panX = 0;
      panY = 0;
      applyTransform();
    });
  }

  var lastTouchDist = 0;

  function handleTouchStart(e) {
    if (e.touches.length === 1) {
      isDragging = true;
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

  // exposed so initDialog() can reposition overlays once the dialog (and
  // its getScreenCTM()) actually has layout, right after showModal()
  return { refresh: positionOverlays };
}

document.addEventListener("nav", initExcalidraw);
