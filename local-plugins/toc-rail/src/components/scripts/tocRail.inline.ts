// LOCI PATCH (whole file): rebuilt from a hover-expanding dash strip into a
// LessWrong-style margin ToC — a plain heading list, quiet until the current
// section is scrolled under it. Clicking already works for free: html has
// scroll-behavior: smooth and scroll-padding-top (base.scss), so a plain
// <a href="#slug"> jumps and clears the fixed topbar on its own. The only
// job left for this script is scrollspy: mark the heading currently being
// read as .active.

// Fires once a heading has scrolled to just under the fixed topbar and
// marks its rail link active; the previous active link is cleared by the
// next heading's own entry, so exactly one (the latest one reached) is lit
// at a time — including on load, since IntersectionObserver reports the
// current state immediately on observe().
function setupScrollSpy(rail: HTMLElement) {
  const links = Array.from(rail.querySelectorAll<HTMLAnchorElement>(".toc-rail-item > a"));
  const headings = links
    .map((link) => {
      const id = link.getAttribute("data-for");
      const heading = id && document.getElementById(id);
      return heading ? { link, heading } : null;
    })
    .filter((x): x is { link: HTMLAnchorElement; heading: HTMLElement } => x !== null);
  if (headings.length === 0) return;

  // measured, not read from --topbar-h: that var is a rem string ("2.7rem"),
  // and this only ever runs where the fixed bar is actually on screen
  const topbarH = document.querySelector(".sidebar.left")?.getBoundingClientRect().height || 43;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const hit = headings.find((h) => h.heading === entry.target);
        if (!hit) continue;
        for (const { link } of headings) link.classList.remove("active");
        hit.link.classList.add("active");
      }
    },
    { rootMargin: `-${topbarH + 8}px 0px -80% 0px`, threshold: 0 },
  );
  for (const { heading } of headings) observer.observe(heading);
  window.addCleanup(() => observer.disconnect());
}

function setupTocRail() {
  const rails = Array.from(document.getElementsByClassName("toc-rail")) as HTMLElement[];
  for (const rail of rails) setupScrollSpy(rail);
}

document.addEventListener("nav", setupTocRail);
document.addEventListener("render", setupTocRail);
