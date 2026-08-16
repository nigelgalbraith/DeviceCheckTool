// IMPORTS
import {
  el,
  clearHost,
  addHostClasses,
  renderHostMessage,
  renderHostTitle
} from "../core/helpers.js";
import { formatReportDate, getDisplayReportGroups } from "../core/reportBuilder.js";

// STATE
const REPORT_CLASS = "pane-host--risk-report";

// BUILD
/** Creates a report detail row */
function buildDetailRow(labelText, valueText) {
  const row = el("div", "rr-detail-row");
  const label = el("div", "rr-detail-label", labelText);
  const value = el("div", "rr-detail-value", valueText || "-");
  row.appendChild(label);
  row.appendChild(value);
  return row;
}


/** Builds the report summary block */
function buildSummaryBlock(reportData) {
  const summary = el("div", "rr-summary");
  const deviceRow = el("div", "rr-summary-row");
  const deviceLabel = el("div", "rr-summary-label", "Device Check");
  const deviceValue = el("div", "rr-summary-value", reportData.displayName || "-");
  deviceRow.appendChild(deviceLabel);
  deviceRow.appendChild(deviceValue);
  const levelRow = el("div", "rr-summary-row");
  const levelLabel = el("div", "rr-summary-label", "Device Status");
  const levelValue = el("div", "rr-summary-value rr-summary-value--level", reportData.riskLevel || "-");
  if (reportData.riskColor) levelValue.style.color = reportData.riskColor;
  levelRow.appendChild(levelLabel);
  levelRow.appendChild(levelValue);
  const scoreRow = el("div", "rr-summary-row");
  const scoreLabel = el("div", "rr-summary-label", "Device Score");
  const scoreValue = el("div", "rr-summary-value", reportData.scoreText || "Not calculated yet");
  scoreRow.appendChild(scoreLabel);
  scoreRow.appendChild(scoreValue);
  const messageRow = el("div", "rr-summary-row rr-summary-row--message");
  const messageLabel = el("div", "rr-summary-label", "Summary");
  const messageValue = el("div", "rr-summary-value", reportData.summaryMessage || "-");
  messageRow.appendChild(messageLabel);
  messageRow.appendChild(messageValue);
  summary.appendChild(deviceRow);
  summary.appendChild(levelRow);
  summary.appendChild(scoreRow);
  summary.appendChild(messageRow);
  return summary;
}


/** Builds the report details block */
function buildDetailsBlock(reportData) {
  const block = el("div", "rr-details");
  block.appendChild(buildDetailRow("Client / Organisation", reportData.client));
  block.appendChild(buildDetailRow("System / Device", reportData.system));
  block.appendChild(buildDetailRow("Assessor", reportData.assessor));
  block.appendChild(buildDetailRow("Generated", formatReportDate(reportData.generatedAt)));
  return block;
}


/** Builds one completed check result */
function buildCheckResult(rowData) {
  const item = el("article", "rr-check");
  item.appendChild(el("h4", "rr-check-title", rowData.label || "-"));
  item.appendChild(el("div", "rr-check-value", rowData.displayValueWithUnit || "-"));
  if (rowData.scoreText) {
    item.appendChild(buildDetailRow("Score", rowData.scoreText));
  }
  if (rowData.issue) {
    item.appendChild(buildDetailRow("Issue", rowData.issue));
  }
  if (rowData.recommendation) {
    item.appendChild(buildDetailRow("Recommendation", rowData.recommendation));
  }
  return item;
}


/** Builds grouped completed checks for the report */
function buildCheckGroups(reportData) {
  const wrap = el("div", "rr-check-groups");
  const groups = getDisplayReportGroups(reportData);
  if (!groups.length) {
    wrap.appendChild(el("p", "rr-empty", "No completed checks to display."));
    return wrap;
  }
  groups.forEach((group) => {
    const section = el("section", "rr-check-group");
    section.appendChild(el("h3", "rr-section-title", String(group.title || "Checks").toUpperCase()));
    (group.checks || []).forEach((rowData) => {
      section.appendChild(buildCheckResult(rowData || {}));
    });
    wrap.appendChild(section);
  });
  return wrap;
}


/** Builds the notes block for the report */
function buildNotesBlock(reportData) {
  const wrap = el("div", "rr-notes");
  const heading = el("h3", "rr-section-title", "Notes");
  const body = el("p", "rr-notes-text", reportData.notes || "-");
  wrap.appendChild(heading);
  wrap.appendChild(body);
  return wrap;
}


/** Initializes the risk report pane */
function initRiskReportPane(host, settings) {
  const title = settings.title || "Device Check Report";
  const reportData = settings.reportData || null;
  clearHost(host);
  renderHostTitle(host, title, "rt-title");
  if (!reportData) {
    renderHostMessage(host, "Missing report data.", "rt-error", false);
    return { destroy() {} };
  }
  host.appendChild(buildDetailsBlock(reportData));
  host.appendChild(buildSummaryBlock(reportData));
  host.appendChild(buildCheckGroups(reportData));
  host.appendChild(buildNotesBlock(reportData));
  return { destroy() {} };
}


/** Builds the risk report pane host */
export function buildRiskReportPane(options) {
  const settings = options || {};
  const node = document.createElement("div");
  if (settings.id) node.id = settings.id;
  addHostClasses(node, ["pane-host", REPORT_CLASS, "pane"]);
  const instance = initRiskReportPane(node, settings);
  return { node, destroy: instance.destroy };
}
