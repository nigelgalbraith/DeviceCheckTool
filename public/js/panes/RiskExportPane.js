// IMPORTS
import {
  el,
  clearHost,
  addHostClasses,
  renderHostMessage,
  renderHostTitle
} from "../core/helpers.js";

// STATE
const EXPORT_CLASS = "pane-host--risk-export";

// BUILD
/** Initializes the export pane */
function initRiskExportPane(host, settings) {
  const title = settings.title || "Export";
  const backUrl = settings.backUrl || "index.html";
  const reportText = settings.reportText || "";
  clearHost(host);
  renderHostTitle(host, title, "rt-title");
  const actions = el("div", "re-actions");
  const statusHost = el("div", "re-status");
  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "re-button";
  copyButton.textContent = "Copy Review Text";
  const onCopyClick = async function () {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        throw new Error("Clipboard access is not available.");
      }
      await navigator.clipboard.writeText(reportText);
      renderHostMessage(statusHost, "Review copied to clipboard.", "status-message status-message--success");
    } catch (_err) {
      renderHostMessage(statusHost, "Unable to copy review text to clipboard.", "status-message status-message--error");
    }
  };
  copyButton.addEventListener("click", onCopyClick);
  const printButton = document.createElement("button");
  printButton.type = "button";
  printButton.className = "re-button";
  printButton.textContent = "Print / Save PDF";
  const onPrintClick = function () {
    window.print();
  };
  printButton.addEventListener("click", onPrintClick);
  const backButton = document.createElement("button");
  backButton.type = "button";
  backButton.className = "re-button re-button-muted";
  backButton.textContent = "Back";
  const onBackClick = function () {
    window.location.href = backUrl;
  };
  backButton.addEventListener("click", onBackClick);
  actions.appendChild(copyButton);
  actions.appendChild(printButton);
  actions.appendChild(backButton);
  host.appendChild(actions);
  host.appendChild(statusHost);
  return {
    destroy() {
      copyButton.removeEventListener("click", onCopyClick);
      printButton.removeEventListener("click", onPrintClick);
      backButton.removeEventListener("click", onBackClick);
    }
  };
}


/** Builds the export pane host */
export function buildRiskExportPane(options) {
  const settings = options || {};
  const node = document.createElement("div");
  if (settings.id) node.id = settings.id;
  addHostClasses(node, ["pane-host", EXPORT_CLASS, "pane"]);
  const instance = initRiskExportPane(node, settings);
  return { node, destroy: instance.destroy };
}
