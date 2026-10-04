// LOCI PATCH (whole file): LessWrong's fixed ToC, measured off a live post.
// The rail fills the free margin left of the text: from the window edge, or
// from the explorer's right edge while it is open (both move with the
// viewport, the side brain and ☰, so they are read here rather than
// re-derived from custom.scss). Each row's flex-grow is its section's length,
// so a tick sits where its heading falls in the article; the progress segment
// is the viewport's share of the page; the heading last scrolled past is
// .active. On a phone the line runs down the text's gutter and a tap opens
// the titles (the nav is focusable; :focus-within shows them).
function layoutRail(rail: HTMLElement) {
  const center = document.querySelector(".center") as HTMLElement | null;
  if (!center) return;
  const textLeft = center.getBoundingClientRect().left;
  // the explorer counts only as a panel beside the text: on a phone it is a
  // drawer, and below $explorerFitsAt it overlays the text
  const er = document.querySelector(".explorer")?.getBoundingClientRect();
  const beside =
    !document.body.classList.contains("nav-off") && !!er && er.width > 100 && er.right <= textLeft;
  const from = beside && er ? er.right : 0;
  const room = textLeft - from;
  rail.style.left = `${from}px`;
  rail.style.width = `${Math.max(0, room)}px`;
  rail.classList.toggle("toc-rail-off", room < 8);
  // titles need ~170px; in a narrower gap (the explorer open beside the text,
  // a phone's gutter) the line sits mid-gap and the titles open over the text
  const narrow = room < 170;
  rail.classList.toggle("toc-rail-narrow", narrow);
  rail.style.setProperty("--rail-x", `${narrow ? Math.round(room / 2) : 17}px`);

  const rows = Array.from(rail.querySelectorAll<HTMLElement>(".toc-rail-item"));
  const docH = document.documentElement.scrollHeight;
  const tops = rows.map((row) => {
    const id = row.dataset.for;
    const h = id ? document.getElementById(id) : null;
    return h ? h.getBoundingClientRect().top + window.scrollY : 0;
  });
  rows.forEach((row, i) => {
    const end = tops[i + 1] ?? docH;
    row.style.flexGrow = String(Math.max(0, end - (tops[i] ?? 0)) / docH);
  });
  return tops;
}

function setupTocRail() {
  const rails = Array.from(document.getElementsByClassName("toc-rail")) as HTMLElement[];
  for (const rail of rails) {
    // out of the top bar: on a phone the bar hides with a transform, which
    // would carry a fixed child off-screen with it. Removed on navigation,
    // since every page renders its own rail inside the bar again.
    document.body.appendChild(rail);
    let tops = layoutRail(rail) ?? [];
    const rows = Array.from(rail.querySelectorAll<HTMLElement>(".toc-rail-item"));
    const progress = rail.querySelector(".toc-rail-progress") as HTMLElement | null;
    const onScroll = () => {
      const docH = document.documentElement.scrollHeight;
      if (progress) {
        progress.style.top = `${(window.scrollY / docH) * 100}%`;
        progress.style.height = `${(window.innerHeight / docH) * 100}%`;
      }
      // the last heading above the top fifth of the screen is the one being read
      const line = window.scrollY + window.innerHeight * 0.2;
      let active = 0;
      tops.forEach((t, i) => {
        if (t <= line) active = i;
      });
      rows.forEach((row, i) => row.classList.toggle("active", i === active));
    };
    const onResize = () => {
      tops = layoutRail(rail) ?? [];
      onScroll();
    };
    onScroll();
    // ☰ toggles body.nav-off, which moves the explorer edge the rail starts at
    const watch = new MutationObserver(onResize);
    watch.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    // images and the side brain settle after load and push the headings down
    const settle = window.setTimeout(onResize, 1500);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addCleanup(() => {
      rail.remove();
      watch.disconnect();
      window.clearTimeout(settle);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    });
  }
}

document.addEventListener("nav", setupTocRail);
