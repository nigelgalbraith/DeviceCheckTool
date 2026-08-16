// IMPORTS
import {
  el,
  clearHost,
  addHostClasses,
  renderHostTitle,
  renderHostMessage
} from "../core/helpers.js";
import { loadScoringConfig } from "../core/riskData.js";

// STATE
const SUMMARY_LIST_CLASS = "pane-host--risk-summary";

// BUILD
/** Formats a configured Device Score boundary for display */
function formatRangeValue(value) {
  return value == null || value === "" ? "" : String(value) + "%";
}


/** Builds the Device Status bands table */
function buildSummaryTable(scoringConfig) {
  const table = el("table", "rt-table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Colour", "Device Status", "Min", "Max", "Summary"].forEach((text) => {
    headRow.appendChild(el("th", "", text));
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  (Array.isArray(scoringConfig) ? scoringConfig : []).forEach((item) => {
    const row = document.createElement("tr");
    const colorCell = el("td", "", item.color || "");
    const titleCell = el("td", "", item.title || "");
    if (item.color) {
      colorCell.style.color = item.color;
      titleCell.style.color = item.color;
    }
    row.appendChild(colorCell);
    row.appendChild(titleCell);
    row.appendChild(el("td", "", formatRangeValue(item.minScore)));
    row.appendChild(el("td", "", formatRangeValue(item.maxScore)));
    row.appendChild(el("td", "", item.message || ""));
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  return table;
}


/** Initializes the risk summary list pane */
function initRiskSummaryListPane(host, settings) {
  loadScoringConfig().then((scoringConfig) => {
    clearHost(host);
    renderHostTitle(host, "Device Status Bands", "rt-title");
    host.appendChild(buildSummaryTable(scoringConfig || {}));
  }).catch((err) => {
    clearHost(host);
    renderHostMessage(host, String(err && (err.message || err)), "rt-error", true);
  });
  return { destroy() {} };
}


/** Builds the risk summary list pane */
export function buildRiskSummaryListPane(options) {
  const settings = options || {};
  const node = document.createElement("div");
  if (settings.id) node.id = settings.id;
  addHostClasses(node, ["pane-host", SUMMARY_LIST_CLASS, "pane"]);
  const instance = initRiskSummaryListPane(node, settings);
  return { node, destroy: instance.destroy };
}
