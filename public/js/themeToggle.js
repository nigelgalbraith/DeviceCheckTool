// STATE
const THEME_KEY = "theme";
const THEME_LIGHT = "light";
const THEME_DARK = "dark";
const TOGGLE_SELECTOR = ".theme-toggle";
const ICON_SELECTOR = ".theme-toggle-icon";

// BUILD
/** Applies a theme to the current document */
function applyTheme(theme, rootDoc) {
  const doc = rootDoc || document;
  const html = doc.documentElement;
  html.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  const btn = doc.querySelector(TOGGLE_SELECTOR);
  if (!btn) return;
  const isLight = theme === THEME_LIGHT;
  btn.setAttribute("aria-pressed", String(isLight));
  const icon = btn.querySelector(ICON_SELECTOR);
  if (icon) icon.textContent = isLight ? "☀" : "☾";
}


/** Initializes the theme toggle control */
export function initThemeToggle(rootDoc) {
  const doc = rootDoc || document;
  const saved = localStorage.getItem(THEME_KEY);
  const systemPrefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
  const initial = saved || (systemPrefersLight ? THEME_LIGHT : THEME_DARK);
  applyTheme(initial, doc);
  const btn = doc.querySelector(TOGGLE_SELECTOR);
  if (!btn) return function noop() {};
  const onClick = function () {
    const current = doc.documentElement.dataset.theme || THEME_DARK;
    applyTheme(current === THEME_LIGHT ? THEME_DARK : THEME_LIGHT, doc);
  };
  btn.addEventListener("click", onClick);
  return function cleanup() {
    btn.removeEventListener("click", onClick);
  };
}
