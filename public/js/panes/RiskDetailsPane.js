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

// STATE
const DETAILS_CLASS = "pane-host--risk-details";
const DETAILS_STORAGE_KEY = "riskAnalysisState.v1";
const DETAILS_ROOT_KEY = "reportDetailsByService";

// BUILD
function getOrCreateDetailsRoot(stateObj) {
  if (!stateObj[DETAILS_ROOT_KEY] || typeof stateObj[DETAILS_ROOT_KEY] !== "object") {
    stateObj[DETAILS_ROOT_KEY] = {};
  }
  return stateObj[DETAILS_ROOT_KEY];
}


function getOrCreateServiceDetails(detailsRoot, riskKey) {
  if (!detailsRoot[riskKey] || typeof detailsRoot[riskKey] !== "object") {
    detailsRoot[riskKey] = {
      client: "",
      system: "",
      assessor: "",
      notes: ""
    };
  }
  return detailsRoot[riskKey];
}


function makeField(labelText, inputNode) {
  const wrap = el("div", "rd-field");
  const label = el("label", "rd-label", labelText);
  wrap.appendChild(label);
  wrap.appendChild(inputNode);
  return wrap;
}


function makeInput(className, value) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = className;
  input.value = value || "";
  return input;
}


function makeTextarea(className, value) {
  const textarea = document.createElement("textarea");
  textarea.className = className;
  textarea.rows = 4;
  textarea.value = value || "";
  return textarea;
}


function initRiskDetailsPane(host, settings, api) {
  const riskKey = settings.riskKey || "";
  const title = settings.title || "Assessment Details";
  const storageKey = settings.storageKey || DETAILS_STORAGE_KEY;
  clearHost(host);
  renderHostTitle(host, title, "rt-title");
  if (!riskKey) {
    renderHostMessage(host, "Missing risk key.", "rt-error", false);
    return { destroy() {} };
  }
  const state = loadState(storageKey, {});
  const detailsRoot = getOrCreateDetailsRoot(state);
  const serviceDetails = getOrCreateServiceDetails(detailsRoot, riskKey);
  const form = el("div", "rd-form");
  const clientInput = makeInput("rd-input", serviceDetails.client);
  const systemInput = makeInput("rd-input", serviceDetails.system);
  const assessorInput = makeInput("rd-input", serviceDetails.assessor);
  const notesInput = makeTextarea("rd-textarea", serviceDetails.notes);
  form.appendChild(makeField("Client / Organisation", clientInput));
  form.appendChild(makeField("System / Device", systemInput));
  form.appendChild(makeField("Assessor", assessorInput));
  form.appendChild(makeField("Notes", notesInput));
  function persist() {
    const latestState = loadState(storageKey, {});
    const latestRoot = getOrCreateDetailsRoot(latestState);
    latestRoot[riskKey] = {
      client: clientInput.value.trim(),
      system: systemInput.value.trim(),
      assessor: assessorInput.value.trim(),
      notes: notesInput.value.trim()
    };
    saveState(storageKey, latestState);
    if (api && api.events && api.events.emit) {
      api.events.emit("reportDetails:changed", {
        category: riskKey,
        value: latestRoot[riskKey]
      });
    }
  }
  const inputs = [clientInput, systemInput, assessorInput, notesInput];
  const destroyFns = [];
  inputs.forEach((node) => {
    const onInput = function () {
      persist();
    };
    node.addEventListener("input", onInput);
    destroyFns.push(() => node.removeEventListener("input", onInput));
  });
  host.appendChild(form);
  return {
    destroy() {
      destroyFns.forEach((fn) => {
        try {
          fn();
        } catch (_e) {}
      });
    }
  };
}


export function buildRiskDetailsPane(options, api) {
  const settings = options || {};
  const node = document.createElement("div");
  if (settings.id) node.id = settings.id;
  addHostClasses(node, ["pane-host", DETAILS_CLASS, "pane"]);
  const instance = initRiskDetailsPane(node, settings, api || {});
  return { node, destroy: instance.destroy };
}
