// LOCI PATCH: light is the default, the OS preference is not consulted.
// Upstream read `(prefers-color-scheme: light)` and fell through to "dark",
// so a browser reporting `no-preference` — the common case — opened the site
// dark. The palace is painted for daylight; night is a choice the visitor
// makes with the toggle, and that choice is what localStorage remembers.
const currentTheme = localStorage.getItem("theme") ?? "light";
document.documentElement.setAttribute("saved-theme", currentTheme);

const syncBodyThemeClass = (theme: "light" | "dark") => {
  document.body?.classList.remove("theme-dark", "theme-light");
  document.body?.classList.add(`theme-${theme}`);
};

const emitThemeChangeEvent = (theme: "light" | "dark") => {
  const event: CustomEventMap["themechange"] = new CustomEvent("themechange", {
    detail: { theme },
  });
  document.dispatchEvent(event);
};

const setupDarkmode = () => {
  // Sync body class with current theme on setup (runs after DOM is ready)
  const currentSavedTheme =
    (document.documentElement.getAttribute("saved-theme") as "light" | "dark") ?? "light";
  syncBodyThemeClass(currentSavedTheme);

  const switchTheme = () => {
    const newTheme =
      document.documentElement.getAttribute("saved-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("saved-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    syncBodyThemeClass(newTheme);
    emitThemeChangeEvent(newTheme);
  };

  for (const darkmodeButton of document.getElementsByClassName("darkmode")) {
    darkmodeButton.addEventListener("click", switchTheme);
    window.addCleanup(() => darkmodeButton.removeEventListener("click", switchTheme));
  }

  // LOCI PATCH: no prefers-color-scheme listener. Upstream wrote the OS value
  // straight into localStorage on every flip, discarding whatever the visitor
  // had picked with the toggle. The default above ignores the OS too, so the
  // theme now has exactly one input: this button.
};

document.addEventListener("nav", setupDarkmode);
document.addEventListener("render", setupDarkmode);
