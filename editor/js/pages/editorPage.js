// IMPORTS
import { el } from "../../../js/core/helpers.js";
import { createEditorPageRuntime } from "../core/pageRuntime.js";
import {
  clone,
  createEditorService,
  loadEditorRiskData,
  loadEditorRiskTable,
  saveEditorRiskTable
} from "../core/editorData.js";
import { hosts, state } from "../core/editorState.js";
import { renderCreateRiskServicePane } from "../panes/CreateRiskServicePane.js";
import { renderEditorModePane } from "../panes/EditorModePane.js";
import { renderRiskControlEditorPane } from "../panes/RiskControlEditorPane.js";
import { renderRiskServiceListPane } from "../panes/RiskServiceListPane.js";

// STATE
const PAGE_TITLE = "Device Checkup Editor";

// BUILD
function defaultControlFromTitle(title) {
  const id = String(title || "new-control")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "new-control";
  return {
    id,
    label: title || "New Check",
    type: "text",
    unit: "",
    allowNA: false,
    weight: 0
  };
}


/** Flattens Device Check categories for the existing editor list pane */
function flattenChecks(definition) {
  const rows = [];
  (definition?.categories || []).forEach((category) => {
    (category?.checks || []).forEach((check) => {
      check._editorId = String(category.id || "") + "." + String(check.id || "");
      check._categoryId = category.id || "";
      check._categoryTitle = category.title || category.id || "";
      rows.push(check);
    });
  });
  return rows;
}


/** Removes editor-only fields before saving JSON */
function cleanDeviceDefinition(definition) {
  const copy = clone(definition);
  (copy.categories || []).forEach((category) => {
    (category.checks || []).forEach((check) => {
      delete check._editorId;
      delete check._categoryId;
      delete check._categoryTitle;
    });
  });
  return copy;
}


function uniqueControlId(rows) {
  const ids = new Set((rows || []).map((row) => row?.id).filter(Boolean));
  let index = rows.length + 1;
  let control = defaultControlFromTitle("Check " + String(index));
  while (ids.has(control.id)) {
    index += 1;
    control = defaultControlFromTitle("Check " + String(index));
  }
  return control;
}


/** Finds the selected Device Check registry entry */
function selectedServiceEntry() {
  const entries = state.data?.riskTables?.analyses || [];
  return entries.find((entry) => entry?.id === state.selectedService) || null;
}


/** Shows editor status output */
function showStatus(message, type = "") {
  hosts.status.replaceChildren();
  if (!message) return;
  const box = el("div", "status-message" + (type ? " status-message--" + type : ""));
  String(message).split("\n").forEach((line) => box.appendChild(el("div", "", line)));
  hosts.status.appendChild(box);
}


/** Marks editor data as dirty */
function markDirty() {
  state.dirty = true;
  showStatus("Unsaved changes.");
}


/** Switches between editor workflows */
function setMode(mode) {
  state.mode = mode === "add" ? "add" : "edit";
  showStatus("");
  renderAll();
}


/** Loads the selected Device Checkup rows */
async function loadSelectedRiskAnalysis() {
  if (!state.selectedService) {
    state.currentRiskRows = [];
    state.currentDeviceDefinition = null;
    state.selectedControlId = "";
    return;
  }
  const definition = await loadEditorRiskTable(selectedServiceEntry() || state.selectedService);
  state.currentDeviceDefinition = clone(definition);
  state.currentRiskRows = flattenChecks(state.currentDeviceDefinition);
  state.selectedControlId = state.currentRiskRows[0]?._editorId || "";
}


/** Selects a Device Checkup */
async function selectService(serviceId) {
  state.selectedService = serviceId;
    showStatus("Loading " + serviceId + "...");
  try {
    await loadSelectedRiskAnalysis();
    state.dirty = false;
    renderAll();
    showStatus("");
  } catch (error) {
    showStatus(error.message, "error");
  }
}


/** Selects a device check */
function selectControl(controlId) {
  state.selectedControlId = controlId;
  renderAll();
}


/** Adds a new check to the current Device Checkup in memory */
function addControl() {
  const rows = state.currentRiskRows || [];
  const control = uniqueControlId(rows);
  const definition = state.currentDeviceDefinition;
  if (!definition?.categories?.length) {
    showStatus("Add at least one category before adding checks.", "error");
    return;
  }
  definition.categories[0].checks = Array.isArray(definition.categories[0].checks) ? definition.categories[0].checks : [];
  definition.categories[0].checks.push(control);
  state.currentRiskRows = flattenChecks(definition);
  state.selectedControlId = state.currentRiskRows.find((row) => row.id === control.id)?._editorId || "";
  markDirty();
  renderAll();
}


/** Removes a check from the current Device Checkup in memory */
function removeControl(controlId) {
  const rows = state.currentRiskRows || [];
  if (rows.length <= 1) {
    showStatus("At least one device check is needed.", "error");
    return;
  }
  const index = rows.findIndex((row) => row._editorId === controlId);
  if (index < 0) return;
  const row = rows[index];
  const category = (state.currentDeviceDefinition?.categories || []).find((item) => item.id === row._categoryId);
  if (!category || !Array.isArray(category.checks)) return;
  category.checks = category.checks.filter((check) => check !== row);
  state.currentRiskRows = flattenChecks(state.currentDeviceDefinition);
  state.selectedControlId = state.currentRiskRows[Math.min(index, state.currentRiskRows.length - 1)]?._editorId || "";
  markDirty();
  renderAll();
}


/** Saves only the selected Device Checkup rows file */
async function saveSelectedRiskAnalysis() {
  if (!state.selectedService) return;
  showStatus("Saving " + state.selectedService + "...");
  try {
    await saveEditorRiskTable(selectedServiceEntry() || state.selectedService, cleanDeviceDefinition(state.currentDeviceDefinition));
    state.dirty = false;
    showStatus(state.selectedService + " saved. A backup was retained.", "success");
  } catch (error) {
    showStatus(error.message, "error");
  }
}


/** Reloads editor data after a successful API mutation */
async function reloadData() {
  const loaded = await loadEditorRiskData();
  state.data = clone(loaded);
}


/** Creates a new Device Checkup and selects it for editing */
async function createService(payload) {
  showStatus("Creating Device Checkup...");
  try {
    const result = await createEditorService(payload);
    await reloadData();
    state.lastCreatedServiceId = result.serviceId;
    state.mode = "edit";
    state.selectedService = result.serviceId;
    await loadSelectedRiskAnalysis();
    state.dirty = false;
    renderAll();
    showStatus("Device Checkup created.", "success");
  } catch (error) {
    showStatus(error.message, "error");
  }
}


/** Renders all editor panes */
function renderAll() {
  hosts.main.replaceChildren();
  renderEditorModePane({ state, host: hosts.main, actions });
  if (state.mode === "add") {
    renderCreateRiskServicePane({ state, host: hosts.main, actions });
    return;
  }
  renderRiskServiceListPane({ state, host: hosts.main, actions });
  renderRiskControlEditorPane({ state, host: hosts.main, actions });
}


const actions = {
  addControl,
  createService,
  markDirty,
  removeControl,
  renderAll,
  saveSelectedRiskAnalysis,
  selectControl,
  selectService,
  showStatus,
  setMode
};


/** Warns before discarding unsaved editor changes */
window.addEventListener("beforeunload", (event) => {
  if (!state.dirty) return;
  event.preventDefault();
  event.returnValue = "";
});


/** Initializes the editor page */
export async function initEditorPage() {
  const { shell } = createEditorPageRuntime({
    pageTitle: PAGE_TITLE,
    activeNavKey: "editor"
  });
  hosts.status = el("div", "editor-status");
  hosts.main = shell.contentHost;
  shell.header.after(hosts.status);
  showStatus("Loading editor data...");
  try {
    const loaded = await loadEditorRiskData();
    state.data = clone(loaded);
    state.selectedService = state.data.riskTables?.analyses?.[0]?.id || "";
    await loadSelectedRiskAnalysis();
    state.dirty = false;
    renderAll();
    showStatus("");
  } catch (error) {
    showStatus(error.message, "error");
  }
}
