
 // IMPORTS
import { el } from "./helpers.js";

// STATE
const APP_CLASS = "app";
const HEADER_CLASS = "header-centered";
const MAIN_CLASS = "split";
const MAIN_ID = "root";
const PAGE_TITLE_ID = "pageTitle";
const THEME_TOGGLE_WRAPPER_CLASS = "theme-toggle-wrapper";
const THEME_TOGGLE_CLASS = "theme-toggle";
const THEME_TOGGLE_ICON_CLASS = "theme-toggle-icon";
const THEME_TOGGLE_TEXT_CLASS = "theme-toggle-text";
const NAV_CLASS = "nav";
const NAV_LINKS_CLASS = "nav-links";
const NAV_ITEMS = [
  { key: "home", label: "Main Menu", href: "index.html" },
  { key: "search", label: "Search Device Checkups", href: "index.html?page=search" },
  { key: "reference", label: "Scoring Reference", href: "index.html?page=reference" }
];

// BUILD
/** Creates the shell theme toggle button */
function createThemeToggle() {
  const wrapper = el("div", THEME_TOGGLE_WRAPPER_CLASS);
  const button = el("button", THEME_TOGGLE_CLASS);
  button.type = "button";
  button.setAttribute("aria-label", "Toggle light/dark mode");
  button.setAttribute("aria-pressed", "false");
  button.title = "Toggle light/dark mode";
  const icon = el("span", THEME_TOGGLE_ICON_CLASS, "☾");
  icon.setAttribute("aria-hidden", "true");
  const text = el("span", THEME_TOGGLE_TEXT_CLASS, "Theme");
  button.appendChild(icon);
  button.appendChild(text);
  wrapper.appendChild(button);
  return wrapper;
}


/** Creates the shell navigation for the active page */
function createNav(activeNavKey) {
  if (!activeNavKey) return null;
  const nav = el("nav", NAV_CLASS);
  const links = el("div", NAV_LINKS_CLASS);
  links.id = "mobile-nav-links";
  NAV_ITEMS.forEach(function (item) {
    const link = el("a", "", item.label);
    link.href = item.href;
    if (activeNavKey === item.key) link.setAttribute("aria-current", "page");
    links.appendChild(link);
  });
  const hamburger = el("button", "nav-hamburger", "☰");
  hamburger.type = "button";
  hamburger.setAttribute("aria-label", "Toggle navigation");
  hamburger.setAttribute("aria-controls", links.id);
  hamburger.setAttribute("aria-expanded", "false");
  hamburger.addEventListener("click", function () {
    const isOpen = nav.classList.toggle("menu-open");
    hamburger.setAttribute("aria-expanded", String(isOpen));
  });
  links.addEventListener("click", function (event) {
    if (event.target.closest("a")) {
      nav.classList.remove("menu-open");
      hamburger.setAttribute("aria-expanded", "false");
    }
  });
  nav.appendChild(hamburger);
  nav.appendChild(links);
  return nav;
}


/** Builds the application shell and mounts it into the app root */
export function buildAppShell({ pageTitle, activeNavKey }) {
  const appRoot = el("div", APP_CLASS);
  const header = el("header", HEADER_CLASS);
  const heading = el("h1", "", pageTitle || "Device Checkup");
  heading.id = PAGE_TITLE_ID;
  const themeHost = createThemeToggle();
  const nav = createNav(activeNavKey);
  header.appendChild(heading);
  header.appendChild(themeHost);
  if (nav) header.appendChild(nav);
  const main = el("main", MAIN_CLASS);
  main.id = MAIN_ID;
  appRoot.appendChild(header);
  appRoot.appendChild(main);
  const root = document.getElementById("app");
  if (!root) throw new Error("Missing #app root");
  root.replaceChildren(appRoot);
  return { appRoot, header, main, nav, themeHost, contentHost: main };
}
