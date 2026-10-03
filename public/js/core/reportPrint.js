// IMPORTS
import { el } from "./helpers.js";

/** Opens only the review heading and report in a dedicated print document. */
export function openReportPrintWindow(reportNode, title) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;
  const printDocument = document.implementation.createHTMLDocument(title);
  printDocument.documentElement.lang = "en";
  printDocument.documentElement.dataset.theme = document.documentElement.dataset.theme || "dark";
  const stylesheet = printDocument.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = new URL("../../css/print.css", import.meta.url).href;
  printDocument.head.appendChild(stylesheet);
  const app = el("div", "app");
  const header = el("header", "header-centered");
  header.appendChild(el("h1", "", title));
  app.appendChild(header);
  const main = el("main", "split");
  const reportHost = el("div");
  reportHost.appendChild(reportNode.cloneNode(true));
  main.appendChild(reportHost);
  app.appendChild(main);
  printDocument.body.appendChild(app);
  const script = printDocument.createElement("script");
  script.textContent = `
    window.addEventListener("afterprint", function () { window.close(); });
    window.addEventListener("load", function () {
      setTimeout(function () { window.focus(); window.print(); }, 300);
    });
  `;
  printDocument.body.appendChild(script);
  printWindow.document.open();
  printWindow.document.write("<!doctype html>" + printDocument.documentElement.outerHTML);
  printWindow.document.close();
  return true;
}
