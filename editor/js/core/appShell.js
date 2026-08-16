// STATE
const NAV_ITEMS = [
  { key: "editor", label: "Editor", href: "index.html" },
  { key: "public", label: "Public Site", href: "../index.html" }
];

// BUILD
/** Creates the editor navigation */
function createNav(activeNavKey) {
  const nav = document.createElement("nav");
  nav.className = "nav";
  const links = document.createElement("div");
  links.className = "nav-links";
  NAV_ITEMS.forEach((item) => {
    const link = document.createElement("a");
    link.href = item.href;
    link.textContent = item.label;
    if (item.key === activeNavKey) link.setAttribute("aria-current", "page");
    links.appendChild(link);
  });
  nav.appendChild(links);
  return nav;
}


/** Builds the editor shell and mounts it into #app */
export function buildEditorShell({ pageTitle, activeNavKey }) {
  const appRoot = document.createElement("div");
  appRoot.className = "app editor-app";
  const header = document.createElement("header");
  header.className = "header-centered";
  const heading = document.createElement("h1");
  heading.id = "pageTitle";
  heading.textContent = pageTitle || "Device Checkup Editor";
  header.appendChild(heading);
  header.appendChild(createNav(activeNavKey || "editor"));
  const main = document.createElement("main");
  main.id = "root";
  main.className = "split";
  appRoot.appendChild(header);
  appRoot.appendChild(main);
  const root = document.getElementById("app");
  if (!root) throw new Error("Missing #app root");
  root.replaceChildren(appRoot);
  return { appRoot, header, main, contentHost: main };
}
