// IMPORTS
import { createPageRuntime } from "../core/pageRuntime.js";
import { getServiceKey, titleCase } from "../core/helpers.js";
import { deviceCheckKey, loadRiskAnalysisEntry } from "../core/riskData.js";
import { buildIntroPane } from "../panes/IntroPane.js";
import { buildRiskDetailsPane } from "../panes/RiskDetailsPane.js";
import { buildRiskTablePane } from "../panes/RiskTablePane.js";
import { buildRiskSummaryPane } from "../panes/RiskSummaryPane.js";
import { buildRiskReviewActionPane } from "../panes/RiskReviewActionPane.js";

// STATE
const BASE_TITLE = "Device Check";
const BACK_NAV_KEY = "home";
const MISSING_PARAM_HTML = "<p>Missing URL parameters: <code>?category=</code> and <code>?device=</code></p>";
const RISK_STATE_ENTRIES = [["page", "checkup"]];

// BUILD
/** Reads category and manufacturer values from the URL */
function getSelection() {
  const params = new URLSearchParams(window.location.search);
  const category = (params.get("category") || "").trim();
  const device = (params.get("device") || "").trim();
  const service = getServiceKey();
  return {
    category,
    device,
    service: category && device ? deviceCheckKey(category, device) : service
  };
}


/** Initializes the common device checkup page orchestrator */
export async function initCheckupPage() {
  const { lifecycle, shell, events, state } = createPageRuntime({
    pageTitle: BASE_TITLE,
    activeNavKey: BACK_NAV_KEY,
    initialState: RISK_STATE_ENTRIES
  });
  const api = { events, state, lifecycle };
  const selection = getSelection();
  const service = selection.service;
  const heading = shell.header.querySelector("#pageTitle");
  if (!service) {
    const introHost = document.createElement("div");
    introHost.className = "intro-text";
    introHost.id = "introHost";
    introHost.innerHTML = MISSING_PARAM_HTML;
    shell.contentHost.appendChild(introHost);
    const tableHost = document.createElement("div");
    tableHost.id = "tableHost";
    shell.contentHost.appendChild(tableHost);
    const summaryHost = document.createElement("div");
    summaryHost.id = "summaryHost";
    shell.contentHost.appendChild(summaryHost);
    if (heading) heading.textContent = BASE_TITLE;
    document.title = BASE_TITLE;
    return;
  }
  const entry = await loadRiskAnalysisEntry(service);
  const displayName = entry.title || (titleCase(service) + " Device Check");
  const introHtml = entry.introHtml || "";
  if (heading) heading.textContent = displayName;
  document.title = displayName;
  const introPane = buildIntroPane({
    html: introHtml,
    className: "intro-text",
    id: "introHost"
  }, api);
  const detailsPane = buildRiskDetailsPane({
    id: "detailsHost",
    riskKey: service,
    title: "Assessment Details"
  }, api);
  const tablePane = buildRiskTablePane({
    id: "tableHost",
    riskKey: service,
    title: titleCase(service) + " Checks"
  }, api);
  const summaryPane = buildRiskSummaryPane({
    id: "summaryHost",
    riskKey: service
  }, api);
  const reviewPane = buildRiskReviewActionPane({
    id: "reviewHost",
    riskKey: service,
    title: "Review"
  }, api);
  shell.contentHost.appendChild(introPane.node);
  shell.contentHost.appendChild(detailsPane.node);
  shell.contentHost.appendChild(tablePane.node);
  shell.contentHost.appendChild(summaryPane.node);
  shell.contentHost.appendChild(reviewPane.node);
  lifecycle.add(introPane.destroy);
  lifecycle.add(detailsPane.destroy);
  lifecycle.add(tablePane.destroy);
  lifecycle.add(summaryPane.destroy);
  lifecycle.add(reviewPane.destroy);
}
