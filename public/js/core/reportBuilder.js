// IMPORTS
import {
  loadState,
  titleCase
} from "./helpers.js";
import { evaluateDeviceCheck, formatScorePercent } from "./deviceScoring.js";
import { loadRiskTable, loadScoringConfig } from "./riskData.js";

// STATE
const STORAGE_KEY = "riskAnalysisState.v1";
const DETAILS_ROOT_KEY = "reportDetailsByService";

// BUILD
/** Returns true when a scored check should be shown in review/report output */
function shouldDisplayCheck(item) {
  return item?.state && item.state !== "unanswered";
}


/** Formats a saved check value for user-facing output */
function formatCheckValue(item) {
  if (item?.state === "na") return "N/A";
  const raw = String(item?.value ?? "").trim();
  if (!raw) return "-";
  if (item?.type === "yes_no" || item?.type === "pass_fail" || item?.type === "condition") {
    return titleCase(raw);
  }
  return raw;
}


/** Adds units to a display value when appropriate */
function formatCheckValueWithUnit(item) {
  const value = formatCheckValue(item);
  if (!item?.unit || value === "-" || value === "N/A") return value;
  return value + " " + item.unit;
}


/** Returns saved report details for the selected service */
function getServiceDetails(savedState, serviceKey) {
  const detailsRoot = savedState?.[DETAILS_ROOT_KEY];
  const serviceDetails = detailsRoot?.[serviceKey];
  return {
    client: String(serviceDetails?.client || "").trim(),
    system: String(serviceDetails?.system || "").trim(),
    assessor: String(serviceDetails?.assessor || "").trim(),
    notes: String(serviceDetails?.notes || "").trim()
  };
}


/** Builds report rows from Device Check categories and transient session values */
function buildReportRows(definition, serviceState, scoredChecks) {
  const scoredById = new Map((scoredChecks || []).map((item) => [item.id, item]));
  const rows = [];
  (definition?.categories || []).forEach((category) => {
    (category?.checks || []).forEach((check) => {
      const id = String(check?.id || "").trim();
      const scored = scoredById.get(id) || {};
      const row = {
        id,
        category: String(category?.title || category?.id || ""),
        label: String(check?.label || id),
        type: String(check?.type || ""),
        unit: String(check?.unit || ""),
        value: serviceState?.[id] ?? "",
        score: scored.score ?? null,
        scoreText: scored.score == null ? "" : formatScorePercent(scored.score),
        state: scored.state || "unanswered",
        issue: scored.issue || "",
        recommendation: scored.recommendation || ""
      };
      row.displayValue = formatCheckValue(row);
      row.displayValueWithUnit = formatCheckValueWithUnit(row);
      rows.push(row);
    });
  });
  return rows;
}


/** Builds report groups in configured Device Check category order */
function buildReportGroups(definition, rows) {
  const rowsById = new Map((rows || []).map((row) => [row.id, row]));
  const groups = [];
  (definition?.categories || []).forEach((category) => {
    const checks = [];
    (category?.checks || []).forEach((check) => {
      const row = rowsById.get(String(check?.id || "").trim());
      if (shouldDisplayCheck(row)) checks.push(row);
    });
    if (checks.length) {
      groups.push({
        id: String(category?.id || ""),
        title: String(category?.title || category?.id || "Checks"),
        checks
      });
    }
  });
  return groups;
}


/** Formats an ISO date string for display */
export function formatReportDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}


/** Returns report rows in source order */
export function getDisplayReportRows(reportData) {
  return Array.isArray(reportData?.rows) ? reportData.rows : [];
}


/** Returns grouped completed checks in source order */
export function getDisplayReportGroups(reportData) {
  return Array.isArray(reportData?.groups) ? reportData.groups : [];
}


/** Formats the current report model as readable plain text */
export function buildRiskReportText(reportData) {
  const lines = [];
  const groups = getDisplayReportGroups(reportData);

  function addField(label, value) {
    lines.push(label);
    lines.push(value || "-");
    lines.push("");
  }

  lines.push("DEVICE CHECK REPORT");
  lines.push("");
  addField("Client / Organisation", reportData?.client);
  addField("System / Device", reportData?.system);
  addField("Assessor", reportData?.assessor);
  addField("Generated", formatReportDate(reportData?.generatedAt));
  addField("Device Check", reportData?.displayName);
  addField("Device Status", reportData?.riskLevel);
  addField("Device Score", reportData?.scoreText);
  addField("Summary", reportData?.summaryMessage);

  for (let i = 0; i < groups.length; i += 1) {
    const group = groups[i] || {};
    lines.push(String(group.title || "Checks").toUpperCase());
    lines.push("");
    (group.checks || []).forEach((row) => {
      lines.push(row.label || "-");
      lines.push(row.displayValueWithUnit || "-");
      if (row.scoreText) lines.push("Score: " + row.scoreText);
      if (row.issue) lines.push("Issue: " + row.issue);
      if (row.recommendation) lines.push("Recommendation: " + row.recommendation);
      lines.push("");
    });
  }

  lines.push("NOTES");
  lines.push(reportData?.notes || "-");
  return lines.join("\n").trim();
}


/** Builds a complete report model for the selected service */
export async function buildRiskReportData(serviceKey) {
  const [definition, scoringConfig] = await Promise.all([
    loadRiskTable(serviceKey),
    loadScoringConfig()
  ]);
  const savedState = loadState(STORAGE_KEY, {});
  const serviceState = savedState?.[serviceKey] || {};
  const details = getServiceDetails(savedState, serviceKey);
  const scoring = evaluateDeviceCheck(definition, serviceState, scoringConfig);
  const rows = buildReportRows(definition, serviceState, scoring.checks);
  const groups = buildReportGroups(definition, rows);
  const displayName = definition?.title || titleCase(serviceKey);
  return {
    service: serviceKey,
    displayName,
    title: displayName + " Device Check Report",
    generatedAt: new Date().toISOString(),
    client: details.client,
    system: details.system,
    assessor: details.assessor,
    notes: details.notes,
    totalScore: scoring.score,
    maxScore: 100,
    scoreText: scoring.scoreText,
    ratio: scoring.score == null ? null : scoring.score / 100,
    riskLevel: scoring.status,
    riskColor: scoring.statusColor,
    statusDefinition: scoring.statusDefinition,
    summaryMessage: scoring.summary,
    groups,
    rows
  };
}

/** Builds a complete print document from the rendered report only. */
export function buildPrintableReportHtml(reportNode, title) {
  const escapedTitle = String(title || "Review Report").replace(/[&<>"']/g, function (character) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
  });
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    "<title>" + escapedTitle + "</title>",
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<link rel="stylesheet" href="css/print.css">',
    "</head>",
    '<body class="print-document">',
    '<main class="print-page">',
    '<header class="print-header"><h1>' + escapedTitle + "</h1></header>",
    '<div class="print-content"><div>',
    reportNode.outerHTML,
    "</div></div></main>",
    "<script>",
    'window.addEventListener("load", function () {',
    "setTimeout(function () { window.focus(); window.print(); }, 300);",
    "});",
    "<\/script>",
    "</body></html>"
  ].join("");
}
