
 // IMPORTS
import { createPageRuntime } from "../core/pageRuntime.js";
import { loadRiskTableRegistry } from "../core/riskData.js";
import { buildIntroPane } from "../panes/IntroPane.js";
import { buildRiskDefinitionsPane } from "../panes/RiskDefinitionsPane.js";
import { buildRiskSummaryListPane } from "../panes/RiskSummaryListPane.js";

// STATE
const BASE_TITLE = "Scoring Reference";
const BACK_NAV_KEY = "reference";
const REFERENCE_STATE_ENTRIES = [["page", "riskReference"]];

// BUILD
/** Initializes the risk reference page */
export async function initRiskReferencePage() {
  const { lifecycle, shell, events, state } = createPageRuntime({
    pageTitle: BASE_TITLE,
    activeNavKey: BACK_NAV_KEY,
    initialState: REFERENCE_STATE_ENTRIES
  });
  const api = { events, state, lifecycle };
  const registry = await loadRiskTableRegistry();
  const reference = registry.reference || {};
  const title = reference.title || BASE_TITLE;
  const heading = shell.header.querySelector("#pageTitle");
  if (heading) heading.textContent = title;
  document.title = title;
  const introPane = buildIntroPane({
    text: reference.intro || [],
    className: "intro-text",
    id: "introHost"
  }, api);
  const itemsPane = buildIntroPane({
    text: reference.items || [],
    className: "intro-text",
    id: "scoringItemsHost"
  }, api);
  const definitionsPane = buildRiskDefinitionsPane({ id: "scoringDefinitionsHost" }, api);
  const summaryPane = buildRiskSummaryListPane({ id: "riskSummaryHost" }, api);
  shell.contentHost.appendChild(introPane.node);
  shell.contentHost.appendChild(itemsPane.node);
  shell.contentHost.appendChild(definitionsPane.node);
  shell.contentHost.appendChild(summaryPane.node);
  lifecycle.add(introPane.destroy);
  lifecycle.add(itemsPane.destroy);
  lifecycle.add(definitionsPane.destroy);
  lifecycle.add(summaryPane.destroy);
}
