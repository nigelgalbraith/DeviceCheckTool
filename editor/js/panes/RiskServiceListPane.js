// IMPORTS
import { el } from "../../../js/core/helpers.js";

// BUILD
function titleFromId(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}


function deviceCheckKey(categoryId, deviceId) {
  return String(categoryId || "").trim() + "-" + String(deviceId || "").trim();
}


function makeSelect(options, selectedValue) {
  const select = document.createElement("select");
  select.className = "rd-input";
  options.forEach((item) => {
    const value = String(item?.value || "").trim();
    const option = document.createElement("option");
    option.value = value;
    option.textContent = item?.label || value;
    option.selected = value === selectedValue;
    select.appendChild(option);
  });
  return select;
}


function makeField(labelText, inputNode) {
  const wrap = el("div", "rd-field");
  wrap.appendChild(el("label", "rd-label", labelText));
  wrap.appendChild(inputNode);
  return wrap;
}


function findSelectedEntry(state) {
  const analyses = state.data?.riskTables?.analyses || [];
  return analyses.find((entry) => entry?.id === state.selectedService) || analyses[0] || null;
}


// BUILD
/** Renders Device Checkup and check selection */
export function renderRiskServiceListPane({ state, host, actions }) {
  const pane = el("section", "pane editor-pane");
  pane.appendChild(el("h2", "rt-title", "Edit Existing Device Checkup"));
  const registry = state.data?.riskTables || {};
  const categories = registry.categories || [];
  const selectedEntry = findSelectedEntry(state);
  const selectedCategoryId = selectedEntry?.categoryId || categories[0]?.id || "";
  const selectedCategory = categories.find((category) => category?.id === selectedCategoryId) || categories[0] || {};
  const devices = selectedCategory.devices || [];
  const selectedDeviceId = selectedEntry?.deviceId || selectedEntry?.manufacturerId || devices[0]?.id || "";

  const selectionGroup = el("div", "form-grid form-grid--single");
  selectionGroup.appendChild(el("h3", "rt-subtitle", "Device Checkup"));
  const categorySelect = makeSelect(categories.map((category) => ({
    value: category.id,
    label: category.title || titleFromId(category.id)
  })), selectedCategoryId);
  const deviceSelect = makeSelect(devices.map((device) => ({
    value: device.id,
    label: titleFromId(device.id)
  })), selectedDeviceId);
  categorySelect.addEventListener("change", () => {
    const category = categories.find((item) => item?.id === categorySelect.value) || {};
    const firstDevice = category.devices?.[0]?.id || "";
    if (firstDevice) actions.selectService(deviceCheckKey(categorySelect.value, firstDevice));
  });
  deviceSelect.addEventListener("change", () => {
    actions.selectService(deviceCheckKey(categorySelect.value, deviceSelect.value));
  });
  selectionGroup.appendChild(makeField("Select Category", categorySelect));
  selectionGroup.appendChild(makeField("Select Device", deviceSelect));
  pane.appendChild(selectionGroup);
  pane.appendChild(el("h3", "rt-subtitle", "Checks"));
  const list = el("div", "editor-list");
  const rows = state.currentRiskRows || [];
  rows.forEach((row) => {
    const button = document.createElement("button");
    button.type = "button";
    const rowKey = row._editorId || row.id;
    button.className = "re-button" + (rowKey === state.selectedControlId ? " editor-selected" : "");
    button.textContent = (row._categoryTitle ? row._categoryTitle + " - " : "") + (row.label || row.id);
    button.addEventListener("click", () => actions.selectControl(rowKey));
    list.appendChild(button);
  });
  pane.appendChild(list);
  host.appendChild(pane);
}
