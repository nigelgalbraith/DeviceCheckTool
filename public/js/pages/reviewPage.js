// IMPORTS
import { createPageRuntime } from "../core/pageRuntime.js";
import { getServiceKey, titleCase } from "../core/helpers.js";
import { buildRiskReportPane } from "../panes/RiskReportPane.js";
import { buildRiskExportPane } from "../panes/RiskExportPane.js";
import { buildRiskReportData, buildRiskReportText } from "../core/reportBuilder.js";

// STATE
const BASE_TITLE = "Device Check Review";
const BACK_NAV_KEY = "home";
const REVIEW_STATE_ENTRIES = [["page", "review"]];

// BUILD
/** Initializes the review page orchestrator */
export async function initReviewPage() {
  const { lifecycle, shell, events, state } = createPageRuntime({
    pageTitle: BASE_TITLE,
    activeNavKey: BACK_NAV_KEY,
    initialState: REVIEW_STATE_ENTRIES
  });
  const api = { events, state, lifecycle };
  const service = getServiceKey();
  const heading = shell.header.querySelector("#pageTitle");
  if (!service) {
    const msg = document.createElement("div");
    msg.className = "intro-text";
    msg.textContent = "Missing URL parameter: ?service=";
    shell.contentHost.appendChild(msg);
    if (heading) heading.textContent = BASE_TITLE;
    document.title = BASE_TITLE;
    return;
  }
  const displayName = titleCase(service);
  if (heading) heading.textContent = displayName + " Review";
  document.title = displayName + " Review";
  const reportHost = document.createElement("div");
  reportHost.id = "reportHost";
  shell.contentHost.appendChild(reportHost);
  const reportData = await buildRiskReportData(service);
  const reportPane = buildRiskReportPane({
    id: "riskReportPane",
    title: BASE_TITLE,
    reportData
  });
  const exportPane = buildRiskExportPane({
    id: "exportHost",
    backUrl: "index.html?page=checkup&service=" + encodeURIComponent(service),
    reportNode: reportPane.node,
    reportText: buildRiskReportText(reportData)
  });
  reportHost.appendChild(reportPane.node);
  shell.contentHost.appendChild(exportPane.node);
  lifecycle.add(reportPane.destroy);
  lifecycle.add(exportPane.destroy);
}
