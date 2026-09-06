// Obsidian-style shortcuts. Bound once at document level and resolved lazily
// per keypress, so they keep working across SPA navigations without needing
// to re-bind on "nav" the way per-component scripts do.

function openSearch() {
  const button = document.querySelector<HTMLButtonElement>(".search-button")
  button?.click()
}

function revealCurrentPageInExplorer() {
  const active = document.querySelector<HTMLElement>(".explorer-ul .active")
  if (!active) return
  active.scrollIntoView({ behavior: "smooth", block: "center" })
  active.animate([{ backgroundColor: "var(--highlight)" }, { backgroundColor: "transparent" }], {
    duration: 1200,
    easing: "ease-out",
  })
}

function onGlobalKeydown(e: KeyboardEvent) {
  if (!e.ctrlKey || e.metaKey || e.altKey) return
  const key = e.key.toLowerCase()
  if (key === "o") {
    // browser default is "open file" — must not fire alongside our search
    e.preventDefault()
    openSearch()
  } else if (key === "q") {
    // browser default is "quit" — must not fire alongside the reveal
    e.preventDefault()
    revealCurrentPageInExplorer()
  }
}

document.addEventListener("keydown", onGlobalKeydown)
