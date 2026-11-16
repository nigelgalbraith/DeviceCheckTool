
 // IMPORTS
import { el } from "../../../js/core/helpers.js";

// STATE
const NAV_ITEMS = [
  { key: "editor", label: "Editor", href: "index.html" },
  { key: "public", label: "Public Site", href: "../index.html" }
];

// BUILD
/** Creates the editor navigation */
function createNav(activeNavKey) {
  const nav = el("nav", "nav");
  const links = el("div", "nav-links");
  links.id = "mobile-nav-links";
  NAV_ITEMS.forEach((item) => {
    const link = el("a", "", item.label);
    link.href = item.href;
    if (item.key === activeNavKey) link.setAttribute("aria-current", "page");
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


/** Builds the editor shell and mounts it into #app */
export function buildEditorShell({ pageTitle, activeNavKey }) {
  const appRoot = el("div", "app editor-app");
  const header = el("header", "header-centered");
  const heading = el("h1", "", pageTitle || "Device Checkup Editor");
  heading.id = "pageTitle";
  header.appendChild(heading);
  header.appendChild(createNav(activeNavKey || "editor"));
  const main = el("main", "split");
  main.id = "root";
  appRoot.appendChild(header);
  appRoot.appendChild(main);
  const root = document.getElementById("app");
  if (!root) throw new Error("Missing #app root");
  root.replaceChildren(appRoot);
  return { appRoot, header, main, contentHost: main };
}
