// IMPORTS
import { createPageRuntime } from "../core/pageRuntime.js";
import { buildIntroPane } from "../panes/IntroPane.js";
import { buildRiskDefinitionsPane } from "../panes/RiskDefinitionsPane.js";
import { buildRiskSummaryListPane } from "../panes/RiskSummaryListPane.js";

// STATE
const BASE_TITLE = "Scoring Reference";
const BACK_NAV_KEY = "reference";
const REFERENCE_STATE_ENTRIES = [["page", "riskReference"]];
const SCORING_REFERENCE_HTML = `
  <p>Device Check scores are calculated from the rules defined on each individual check.</p>
  <ul>
    <li>Each applicable check receives a 0-100 score from its JSON rule.</li>
    <li>Higher Device Scores are better.</li>
    <li>Checks may have different weights.</li>
    <li>N/A checks are excluded from scoring.</li>
    <li>Unanswered checks are excluded until a valid value is entered.</li>
    <li>Applicable check scores are combined with a weighted average.</li>
    <li>The overall scoring configuration converts the final Device Score into a Device Status.</li>
  </ul>
`;

// BUILD
/** Initializes the risk reference page */
export async function initRiskReferencePage() {
  const { lifecycle, shell, events, state } = createPageRuntime({
    pageTitle: BASE_TITLE,
    activeNavKey: BACK_NAV_KEY,
    initialState: REFERENCE_STATE_ENTRIES
  });
  const api = { events, state, lifecycle };
  document.title = BASE_TITLE;
  const introPane = buildIntroPane({ html: SCORING_REFERENCE_HTML, className: "intro-text", id: "introHost" }, api);
  const definitionsPane = buildRiskDefinitionsPane({ id: "scoringDefinitionsHost" }, api);
  const summaryPane = buildRiskSummaryListPane({ id: "riskSummaryHost" }, api);
  shell.contentHost.appendChild(introPane.node);
  shell.contentHost.appendChild(definitionsPane.node);
  shell.contentHost.appendChild(summaryPane.node);
  lifecycle.add(introPane.destroy);
  lifecycle.add(definitionsPane.destroy);
  lifecycle.add(summaryPane.destroy);
}
