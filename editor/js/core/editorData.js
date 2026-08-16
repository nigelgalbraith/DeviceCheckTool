// IMPORTS
import { validateRiskAnalysisRows } from "../../../js/core/riskValidation.js";

// BUILD
const DISPLAY_TITLES = Object.freeze({
  hp: "HP",
  asus: "ASUS",
  macos: "macOS",
  ios: "iPhone"
});


function displayTitle(value) {
  const id = String(value || "").trim();
  return DISPLAY_TITLES[id] || (id
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase()));
}


function deviceCheckKey(categoryId, deviceId) {
  return String(categoryId || "").trim() + "-" + String(deviceId || "").trim();
}


function flattenDeviceChecks(categories) {
  const entries = [];
  (categories || []).forEach((category) => {
    const categoryId = String(category?.id || "").trim();
    const categoryTitle = String(category?.title || displayTitle(categoryId));
    (category?.devices || []).forEach((device) => {
      const deviceId = String(device?.id || "").trim();
      if (!categoryId || !deviceId) return;
      const manufacturerTitle = displayTitle(deviceId);
      entries.push({
        id: deviceCheckKey(categoryId, deviceId),
        categoryId,
        deviceId,
        manufacturerId: deviceId,
        categoryTitle,
        manufacturerTitle,
        title: categoryTitle + " - " + manufacturerTitle,
        path: String(device?.path || "")
      });
    });
  });
  return entries;
}


function normalizeEditorRegistry(registry) {
  const categories = Array.isArray(registry?.categories) ? registry.categories : [];
  return {
    ...registry,
    categories,
    analyses: flattenDeviceChecks(categories)
  };
}


function checkupUrl(entryOrId) {
  if (entryOrId && typeof entryOrId === "object") {
    return "../api/editor/device-types/" + encodeURIComponent(entryOrId.categoryId) + "/" + encodeURIComponent(entryOrId.deviceId || entryOrId.manufacturerId);
  }
  return "../api/editor/device-types/" + encodeURIComponent(entryOrId);
}


/** Clones JSON-compatible values */
export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}


/** Requests JSON from the editor API */
export async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const messages = data.errors || [data.error || "Request failed (" + response.status + ")."];
    throw new Error(messages.join("\n"));
  }
  return data;
}


/** Loads the editable Device Checkup registry */
export function loadEditorRiskData() {
  return requestJson("../api/editor/device-types").then((riskTables) => ({ riskTables: normalizeEditorRegistry(riskTables) }));
}


/** Loads one Device Checkup rows file */
export function loadEditorRiskTable(entryOrId) {
  return requestJson(checkupUrl(entryOrId));
}


/** Saves one Device Checkup rows file */
export async function saveEditorRiskTable(entryOrId, rows) {
  const serviceId = typeof entryOrId === "object" ? entryOrId.id : entryOrId;
  const errors = validateRiskAnalysisRows(rows, serviceId);
  if (errors.length) throw new Error(errors.join("\n"));
  return requestJson(checkupUrl(entryOrId), {
    method: "POST",
    body: JSON.stringify({ data: rows })
  });
}


/** Creates a new Device Checkup through the editor API */
export function createEditorService(payload) {
  return requestJson("../api/editor/device-types", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}


/** Converts textarea content to trimmed non-empty lines */
export function textLines(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}


/** Converts a list to textarea text */
export function linesText(value) {
  return Array.isArray(value) ? value.join("\n") : "";
}
