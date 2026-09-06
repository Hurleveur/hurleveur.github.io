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
}

document.addEventListener("nav", setupTocRail);
document.addEventListener("render", setupTocRail);
