// IMPORTS
import { el } from "../../../js/core/helpers.js";

// BUILD
/** Renders the top-level editor workflow choices */
export function renderEditorModePane({ state, host, actions }) {
  const pane = el("section", "pane editor-mode-pane");
  const actionsRow = el("div", "editor-mode-actions");
  [
    { mode: "edit", label: "Edit Existing Device Checkup" },
    { mode: "add", label: "Add New Device Checkup" }
  ].forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "re-button editor-mode-button" + (state.mode === item.mode ? " editor-mode-button--active" : "");
    button.textContent = item.label;
    button.setAttribute("aria-pressed", String(state.mode === item.mode));
    button.addEventListener("click", () => actions.setMode(item.mode));
    actionsRow.appendChild(button);
  });
  pane.appendChild(actionsRow);
  host.appendChild(pane);
}
