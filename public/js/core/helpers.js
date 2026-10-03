// BUILD
/** Provides a shared no-op pane destroy contract */
export const NOOP_PANE = Object.freeze({ destroy() {} });

/** Parses JSON safely and falls back on failure */
export function safeJSONParse(raw, fallback = null) {
  try {
    return JSON.parse(raw);
  } catch (_e) {
    return fallback;
  }
}


/** Loads transient session state */
export function loadState(storageKey, fallback = {}) {
  const raw = window.sessionStorage.getItem(storageKey);
  if (!raw) return fallback;
  return safeJSONParse(raw, fallback);
}


/** Saves transient session state */
export function saveState(storageKey, stateObj) {
  window.sessionStorage.setItem(storageKey, JSON.stringify(stateObj));
}


/** Fetches JSON without using a cached response */
export async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load JSON: ${url} (${res.status})`);
  return res.json();
}


/** Creates a DOM element with optional class and text */
export function el(tag, cls = "", text = "") {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null && text !== "") node.textContent = String(text);
  return node;
}


/** Clears a host element and returns it */
export function clearHost(host) {
  host.innerHTML = "";
  return host;
}


/** Applies a list of CSS classes to a host element */
export function addHostClasses(host, classes) {
  (classes || []).forEach((name) => {
    if (name) host.classList.add(name);
  });
  return host;
}


/** Renders a message into a host element */
export function renderHostMessage(host, message, className, replace = true, tag = "div") {
  if (replace) clearHost(host);
  const box = el(tag, className, message);
  host.appendChild(box);
  return box;
}


/** Renders a host title element */
export function renderHostTitle(host, title, className = "rt-title") {
  const heading = el("h2", className, title);
  host.appendChild(heading);
  return heading;
}


/** Reads the current service key from the URL */
export function getServiceKey() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("service") || "").trim();
}


/** Converts a value to display title case */
export function titleCase(value) {
  return String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, function (match) {
      return match.toUpperCase();
    })
    .trim();
}


/** Normalizes a status value to the supported set */
export function normalizeStatus(value) {
  return value === "enabled" ? "enabled" : "disabled";
}


/** Computes the weighted risk score for a row */
export function getRiskScore(row) {
  if (!row) return 0;
  const likelihood = row.likelihood || {};
  const impact = row.impact || {};
  const lValues = [
    Number(likelihood.exploitability),
    Number(likelihood.exposure),
    Number(likelihood.prevalence)
  ].filter(Number.isFinite);
  const iValues = [
    Number(impact.confidentiality),
    Number(impact.integrity),
    Number(impact.availability)
  ].filter(Number.isFinite);
  if (!lValues.length || !iValues.length) return 0;
  const lAvg = lValues.reduce((a, b) => a + b, 0) / lValues.length;
  const iAvg = iValues.reduce((a, b) => a + b, 0) / iValues.length;
  return Math.ceil(lAvg * iAvg);
}


/** Computes the maximum combined risk score for a set of rows */
export function computeMaxRiskScore(rows) {
  let total = 0;
  (rows || []).forEach((row) => {
    total += getRiskScore(row);
  });
  return total;
}

/** Opens a complete printable HTML document in a clean window. */
export function openPrintWindow(printableHtml) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(printableHtml);
  printWindow.document.close();
  return true;
}
