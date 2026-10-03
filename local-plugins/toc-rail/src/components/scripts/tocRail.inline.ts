// LOCI PATCH: desktop only (see tocRail.scss's 1200px rule): the rail's hover zone has to
// stop right at the text column's left edge. That edge moves with viewport
// width, the side-brain column and whether the explorer overlaps the text
// (quartz/styles/custom.scss's $explorerFitsAt) — cheaper and more reliable
// to read .center's real position than to re-derive that formula here and
// have it silently drift the next time custom.scss changes.
function updateTocRailBounds() {
  const center = document.querySelector(".center") as HTMLElement | null;
  if (!center) return;
  const gap = 12; // breathing room between the expanded panel and the text
  const right = window.innerWidth - center.getBoundingClientRect().left + gap;
  document.documentElement.style.setProperty("--toc-rail-right", `${right}px`);
}

// Hover expands the rail (plain CSS, see tocRail.scss); this handles the
// input hover can't: tap-to-reveal on touch, where a collapsed rail is too
// narrow to hit a specific heading link. First tap on a collapsed rail
// expands it instead of following the link; a second tap on the link navigates.
function onRailClick(this: HTMLElement, ev: MouseEvent) {
  const link = (ev.target as HTMLElement).closest("a");
  if (link) {
    if (!this.classList.contains("expanded")) {
      ev.preventDefault();
      this.classList.add("expanded");
    }
    return;
  }
  this.classList.toggle("expanded");
}

function onDocumentClick(this: Document, ev: MouseEvent) {
  const rails = document.getElementsByClassName("toc-rail");
  for (const rail of rails) {
    if (!rail.contains(ev.target as Node)) {
      rail.classList.remove("expanded");
    }
  }
}

function setupTocRail() {
  const rails = Array.from(document.getElementsByClassName("toc-rail")) as HTMLElement[];
  for (const rail of rails) {
    rail.addEventListener("click", onRailClick);
    window.addCleanup(() => rail.removeEventListener("click", onRailClick));
  }
  document.addEventListener("click", onDocumentClick);
  window.addCleanup(() => document.removeEventListener("click", onDocumentClick));

  // LOCI PATCH: keep the hover zone ending at the text column
  updateTocRailBounds();
  window.addEventListener("resize", updateTocRailBounds);
  window.addCleanup(() => window.removeEventListener("resize", updateTocRailBounds));
}

document.addEventListener("nav", setupTocRail);
document.addEventListener("render", setupTocRail);
