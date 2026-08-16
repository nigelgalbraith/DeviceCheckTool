// IMPORTS
import { el } from "../../../js/core/helpers.js";

// BUILD
function makeField(labelText, inputNode, options = {}) {
  const wrap = el("div", "rd-field" + (options.wide ? " form-field--wide" : ""));
  wrap.appendChild(el("label", "rd-label", labelText));
  wrap.appendChild(inputNode);
  return wrap;
}


function makeInput(value = "") {
  const input = document.createElement("input");
  input.className = "rd-input";
  input.type = "text";
  input.value = value;
  return input;
}


function makeTextarea(value = "") {
  const textarea = document.createElement("textarea");
  textarea.className = "rd-textarea";
  textarea.rows = 4;
  textarea.value = value;
  return textarea;
}


function makeControlDraft(index) {
  const labelText = index === 1 ? "First Check" : "Check " + String(index);
  const controlLabel = makeInput(labelText);
  const controlId = makeInput(defaultControlFromTitle(labelText).id);
  controlLabel.addEventListener("input", () => {
    if (controlId.dataset.touched === "true") return;
    controlId.value = defaultControlFromTitle(controlLabel.value).id;
  });
  controlId.addEventListener("input", () => {
    controlId.dataset.touched = "true";
  });
  return { controlId, controlLabel };
}


function controlPayloadFromDraft(draft) {
  return {
    id: draft.controlId.value.trim(),
    label: draft.controlLabel.value.trim(),
    type: "text",
    allowNA: false,
    weight: 0
  };
}


function defaultControlFromTitle(title) {
  const id = String(title || "first-control")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "first-control";
  return {
    id,
    label: title || "First Check",
    type: "text",
    allowNA: false,
    weight: 0
  };
}


/** Renders the create-new Device Checkup pane */
export function renderCreateRiskServicePane({ state, host, actions }) {
  const pane = el("section", "pane editor-pane");
  pane.appendChild(el("h2", "rt-title", "Add New Device Checkup"));
  const categoryId = makeInput(state.data?.riskTables?.categories?.[0]?.id || "");
  const manufacturerId = makeInput("");
  const title = makeInput("New Device Checkup");
  const description = makeTextarea("Describe what this Device Checkup helps review.");
  let nextControlNumber = 2;
  const controlDrafts = [makeControlDraft(1)];
  const controlsHost = el("div", "editor-controls");
  const identityGroup = el("div", "form-grid");
  identityGroup.appendChild(el("h3", "rt-subtitle", "Device Checkup"));
  identityGroup.appendChild(makeField("Platform ID", categoryId));
  identityGroup.appendChild(makeField("Manufacturer ID", manufacturerId));
  identityGroup.appendChild(makeField("Title", title));
  identityGroup.appendChild(makeField("Description", description, { wide: true }));
  pane.appendChild(identityGroup);

  function renderControlDrafts() {
    controlsHost.replaceChildren();
    controlDrafts.forEach((draft, index) => {
      const controlSection = el("section", "editor-control-group");
      controlSection.appendChild(el("h3", "rt-subtitle editor-control-title", "Check " + String(index + 1)));

      const controlGroup = el("div", "risk-value-grid");
      controlGroup.appendChild(el("h3", "rt-subtitle", "Check"));
      controlGroup.appendChild(makeField("ID", draft.controlId));
      controlGroup.appendChild(makeField("Label", draft.controlLabel));
      controlSection.appendChild(controlGroup);
      controlsHost.appendChild(controlSection);
    });
  }

  renderControlDrafts();
  pane.appendChild(controlsHost);

  const actionsRow = el("div", "re-actions");
  const addControl = document.createElement("button");
  addControl.type = "button";
  addControl.className = "re-button re-button-add";
  addControl.textContent = "Add Check";
  addControl.addEventListener("click", () => {
    controlDrafts.push(makeControlDraft(nextControlNumber));
    nextControlNumber += 1;
    renderControlDrafts();
    removeControl.disabled = false;
  });
  actionsRow.appendChild(addControl);
  const removeControl = document.createElement("button");
  removeControl.type = "button";
  removeControl.className = "re-button re-button-remove";
  removeControl.textContent = "Remove Check";
  removeControl.disabled = controlDrafts.length <= 1;
  removeControl.addEventListener("click", () => {
    if (controlDrafts.length <= 1) return;
    controlDrafts.pop();
    renderControlDrafts();
    removeControl.disabled = controlDrafts.length <= 1;
  });
  actionsRow.appendChild(removeControl);
  const create = document.createElement("button");
  create.type = "button";
  create.className = "re-button re-button-save";
  create.textContent = "Save Device Checkup";
  create.addEventListener("click", () => {
    actions.createService({
      categoryId: categoryId.value.trim(),
      manufacturerId: manufacturerId.value.trim(),
      title: title.value.trim(),
      description: description.value,
      controls: controlDrafts.map(controlPayloadFromDraft)
    });
  });
  actionsRow.appendChild(create);
  pane.appendChild(actionsRow);
  host.appendChild(pane);
}
