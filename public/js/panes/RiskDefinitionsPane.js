// IMPORTS
import {
  el,
  clearHost,
  addHostClasses,
  renderHostTitle,
  renderHostMessage
} from "../core/helpers.js";

// STATE
const DEFINITIONS_CLASS = "pane-host--risk-definitions";

// BUILD
/** Initializes the scoring method pane */
function initRiskDefinitionsPane(host, settings) {
  try {
    clearHost(host);
    renderHostTitle(host, "Device Check Scoring", "rt-title");
    const list = el("ul", "rt-list");
    [
      "Percentage and number checks use matching min/max range rules.",
      "Yes/No, Pass/Fail, and Condition checks use keyed rule outcomes.",
      "Text checks are informational unless rules are explicitly defined.",
      "Missing weights default to 1.",
      "The final Device Score is a weighted average from 0 to 100."
    ].forEach((text) => {
      list.appendChild(el("li", "", text));
    });
    host.appendChild(list);
  } catch (err) {
    renderHostMessage(host, String(err && (err.message || err)), "rt-error", true);
  }
  return { destroy() {} };
}


/** Builds the risk definitions pane */
export function buildRiskDefinitionsPane(options) {
  const settings = options || {};
  const node = document.createElement("div");
  if (settings.id) node.id = settings.id;
  addHostClasses(node, ["pane-host", DEFINITIONS_CLASS, "pane"]);
  const instance = initRiskDefinitionsPane(node, settings);
  return { node, destroy: instance.destroy };
}
