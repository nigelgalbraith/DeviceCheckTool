// IMPORTS
import {
  loadState,
  el,
  clearHost,
  addHostClasses,
  renderHostMessage,
  renderHostTitle
} from "../core/helpers.js";
import { evaluateDeviceCheck } from "../core/deviceScoring.js";
import { loadRiskTable, loadScoringConfig } from "../core/riskData.js";

// STATE
const SUMMARY_CLASS = "pane-host--risk-summary";
const SUMMARY_STORAGE_KEY = "riskAnalysisState.v1";

// BUILD
/** Applies the configured Device Status colour when one is available */
function applyStatusColor(node, result) {
  const color = result?.statusDefinition?.color || result?.statusColor || "";
  if (color) node.style.color = color;
}


/** Renders the current Device Summary */
function renderSummary(host, definition, result) {
  clearHost(host);
  renderHostTitle(host, "Device Summary", "rt-title");
  const table = el("table", "rt-table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Device Check", "Device Status", "Device Score", "Summary"].forEach((text) => {
    headRow.appendChild(el("th", "", text));
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  const bodyRow = document.createElement("tr");
  const statusCell = el("td", "rs-level", result?.status || "Not calculated yet");
  applyStatusColor(statusCell, result);
  bodyRow.appendChild(el("td", "rs-message", definition?.title || "-"));
  bodyRow.appendChild(statusCell);
  bodyRow.appendChild(el("td", "rs-total", result?.scoreText || "Not calculated yet"));
  bodyRow.appendChild(el("td", "rs-message", result?.summary || "Not calculated yet"));
  tbody.appendChild(bodyRow);
  table.appendChild(tbody);
  host.appendChild(table);
}


/** Initializes the summary pane node */
function initRiskSummaryPane(host, settings, api) {
  const riskKey = settings.riskKey || "";
  const storageKey = settings.storageKey || SUMMARY_STORAGE_KEY;
  if (!riskKey) {
    renderHostMessage(host, "Missing Device Check key.", "rs-error", true);
    return { destroy() {} };
  }
  let definitionCache = null;
  let scoringCache = null;
  function rebuild() {
    const state = loadState(storageKey, {});
    const values = state?.[riskKey] || {};
    const result = evaluateDeviceCheck(definitionCache, values, scoringCache);
    renderSummary(host, definitionCache, result);
  }
  const onChanged = function (ev) {
    if (!ev || !ev.detail || ev.detail.category !== riskKey) return;
    rebuild();
  };
  const offChanged = (api && api.events && api.events.on) ? api.events.on("risk:changed", onChanged) : null;
  loadAll();
  function loadAll() {
    return Promise.all([loadRiskTable(riskKey), loadScoringConfig()]).then(([definition, scoring]) => {
      definitionCache = definition;
      scoringCache = scoring;
      rebuild();
    }).catch((err) => {
      renderHostMessage(host, String(err && (err.message || err)), "rs-error", true);
    });
  }
  return {
    destroy() {
      if (typeof offChanged === "function") offChanged();
    }
  };
}


/** Builds the summary pane */
export function buildRiskSummaryPane(options, api) {
  const settings = options || {};
  const node = document.createElement("div");
  if (settings.id) node.id = settings.id;
  addHostClasses(node, ["pane-host", SUMMARY_CLASS, "pane"]);
  const instance = initRiskSummaryPane(node, settings, api || {});
  return { node, destroy: instance.destroy };
}
