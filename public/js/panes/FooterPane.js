// IMPORTS
import { NOOP_PANE, el } from "../core/helpers.js";

// STATE
const FOOTER_CLASS = "footer";
const FOOTER_ICONS_CLASS = "footer-icons";
const FOOTER_LINKS = [
  {
    href: "mailto:nigel.galbraith@proton.me",
    label: "Email",
    icon: "images/icons/optimized/email.png"
  },
  {
    href: "https://github.com/nigelgalbraith/",
    label: "GitHub",
    icon: "images/icons/optimized/github.png",
    external: true
  },
  {
    href: "https://www.linkedin.com/in/nigel-galbraith/",
    label: "LinkedIn",
    icon: "images/icons/optimized/linkedin.png",
    external: true
  }
];

// BUILD
/** Builds one footer icon link */
function buildFooterLink(item) {
  const link = document.createElement("a");
  link.href = item.href;
  link.setAttribute("aria-label", item.label);
  if (item.external) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
  const image = document.createElement("img");
  image.src = item.icon;
  image.alt = item.label;
  link.appendChild(image);
  return link;
}


/** Builds the footer pane */
export function buildFooterPane() {
  const footer = document.createElement("footer");
  footer.className = FOOTER_CLASS;
  const icons = el("div", FOOTER_ICONS_CLASS);
  FOOTER_LINKS.forEach(function (item) {
    icons.appendChild(buildFooterLink(item));
  });
  footer.appendChild(icons);
  footer.appendChild(el("p", "", "\u00a9 " + new Date().getFullYear() + " Nigel Galbraith"));
  return { node: footer, destroy: NOOP_PANE.destroy };
}
