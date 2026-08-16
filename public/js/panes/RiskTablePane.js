// IMPORTS
import {
  loadState,
  saveState,
  el,
  clearHost,
  addHostClasses,
  renderHostMessage,
  renderHostTitle
} from "../core/helpers.js";
import { loadRiskTable } from "../core/riskData.js";

// STATE
const TABLE_CLASS = "pane-host--risk-table";
const TABLE_TITLE = "Checks";
const TABLE_STORAGE_KEY = "riskAnalysisState.v1";

// BUILD
/** Gets or initializes transient state for one Device Check */
function getOrCreateCheckState(stateObj, checkKey) {
  if (!stateObj[checkKey] || typeof stateObj[checkKey] !== "object") stateObj[checkKey] = {};
  return stateObj[checkKey];
}


/** Builds an input control for the current check type */
function makeInputForCheck(check, value) {
  const type = check?.type || "text";
  if (type === "yes_no" || type === "pass_fail" || type === "condition") {
    const select = document.createElement("select");
    select.className = "rd-input";
    const options = type === "yes_no"
      ? ["", "yes", "no"]
      : type === "pass_fail"
        ? ["", "pass", "fail"]
        : ["", ...Object.keys(check?.rules || {})];
    if (check.allowNA) options.push("na");
    options.forEach((optionValue) => {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionValue === "na" ? "N/A" : optionValue ? optionValue.toUpperCase().replace("_", "/") : "Select";
      option.selected = value === optionValue;
      select.appendChild(option);
    });
    return select;
  }
  if (type === "percentage" || type === "number") {
    const input = document.createElement("input");
    input.className = "rd-input";
    input.type = "number";
    input.value = value ?? "";
    if (type === "percentage") {
      input.min = "0";
      input.max = "100";
      input.step = "1";
    }
    return input;
  }
  const input = document.createElement("input");
  input.className = "rd-input";
  input.type = "text";
  input.value = value ?? "";
  return input;
}


/** Wraps value input with an adjacent unit label when one exists */
function makeValueControl(check, value) {
  const wrap = el("div", "dc-value-control");
  const input = makeInputForCheck(check, value);
  wrap.appendChild(input);
  if (check?.unit) wrap.appendChild(el("span", "dc-unit", check.unit));
  return { wrap, input };
}


/** Renders one category of schema-driven checks */
function renderCheckCategory(host, category, checkState, storageKey, state, riskKey, api, destroyFns) {
  const section = el("section", "dc-check-section");
  section.appendChild(el("h3", "rt-subtitle dc-section-title", category.title || category.id || "Checks"));
  const form = el("div", "dc-check-form");
  (category.checks || []).forEach((check) => {
    const id = String(check?.id || "").trim();
    const field = el("div", "rd-field dc-check-field");
    field.appendChild(el("label", "rd-label", check?.label || id || "Unnamed"));
    const { wrap, input } = makeValueControl(check, checkState[id]);
    const onChange = function () {
      checkState[id] = input.value;
      saveState(storageKey, state);
      if (api && api.events && api.events.emit) api.events.emit("risk:changed", { category: riskKey, id, value: input.value });
    };
    input.addEventListener("input", onChange);
    input.addEventListener("change", onChange);
    destroyFns.push(() => {
      input.removeEventListener("input", onChange);
      input.removeEventListener("change", onChange);
    });
    field.appendChild(wrap);
    form.appendChild(field);
  });
  section.appendChild(form);
  host.appendChild(section);
}


/** Initializes the Device Check table pane node */
function initRiskTablePane(host, settings, api) {
  const riskKey = settings.riskKey || settings.category || "";
  const title = settings.title || TABLE_TITLE;
  const storageKey = settings.storageKey || TABLE_STORAGE_KEY;
  clearHost(host);
  renderHostTitle(host, title, "rt-title");
  if (!riskKey) {
    renderHostMessage(host, "Missing Device Check key.", "rt-error", false);
    return { destroy() {} };
  }
  const state = loadState(storageKey, {});
  const checkState = getOrCreateCheckState(state, riskKey);
  let destroyFns = [];
  loadRiskTable(riskKey).then((definition) => {
    const categories = Array.isArray(definition?.categories) ? definition.categories : [];
    if (!categories.length) {
      renderHostMessage(host, 'No checks found for "' + riskKey + '".', "rt-error", false);
      return;
    }
    categories.forEach((category) => {
      renderCheckCategory(host, category, checkState, storageKey, state, riskKey, api, destroyFns);
    });
  }).catch((err) => {
    renderHostMessage(host, String(err && (err.message || err)), "rt-error", false);
  });
  return {
    destroy() {
      destroyFns.forEach((fn) => {
        try {
          fn();
        } catch (_e) {}
      });
      destroyFns = [];
    }
  };
}


/** Builds the Device Check table pane */
export function buildRiskTablePane(options, api) {
  const settings = options || {};
  const node = document.createElement("div");
  if (settings.id) node.id = settings.id;
  addHostClasses(node, ["pane-host", TABLE_CLASS, "pane"]);
  const instance = initRiskTablePane(node, settings, api || {});
  return { node, destroy: instance.destroy };
}
