// IMPORTS
import { NOOP_PANE, addHostClasses, el, renderHostMessage } from "../core/helpers.js";

// STATE
const CARDS_CLASS = "risk-analysis-grid";

// BUILD
/** Builds one Device Checkup card */
function buildAnalysisCard(analysis) {
  const card = el("div", "risk-card");
  const link = document.createElement("a");
  link.href = analysis.link || ("index.html?page=checkup&service=" + encodeURIComponent(analysis.id || ""));
  link.appendChild(el("h2", "", analysis.title || analysis.id || ""));
  const description = document.createElement("p");
  description.innerHTML = analysis.description || "";
  link.appendChild(description);
  card.appendChild(link);
  return card;
}


/** Initializes the intro cards pane node */
function initIntroCardsPane(host, settings) {
  const analyses = settings.analyses || [];
  if (!analyses.length) {
    renderHostMessage(host, "No Device Checkups configured.", "", true, "p");
    return NOOP_PANE;
  }
  analyses.forEach((analysis) => {
    if (analysis) host.appendChild(buildAnalysisCard(analysis));
  });
  return NOOP_PANE;
}


/** Builds the intro cards pane */
export function buildIntroCardPane(options) {
  const settings = options || {};
  const node = document.createElement("div");
  node.className = settings.className || CARDS_CLASS;
  if (settings.id) node.id = settings.id;
  addHostClasses(node, ["pane-host", "pane-host--intro-cards"]);
  const instance = initIntroCardsPane(node, settings);
  return { node, destroy: instance.destroy };
}
