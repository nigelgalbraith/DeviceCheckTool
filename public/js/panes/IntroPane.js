// IMPORTS
import { NOOP_PANE, addHostClasses, renderTextArray } from "../core/helpers.js";

// STATE
const INTRO_CLASS = "intro-text";
// BUILD

/** Initializes the intro pane node */
function initIntroPane(host, settings) {
  host.replaceChildren();
  renderTextArray(host, settings.text || []);
  return NOOP_PANE;
}


/** Builds the intro pane */
export function buildIntroPane(options) {
  const settings = options || {};
  const node = document.createElement("div");
  node.className = settings.className || INTRO_CLASS;
  if (settings.id) node.id = settings.id;
  addHostClasses(node, ["pane-host", "pane-host--intro-text", "pane", "pane-intro-text"]);
  const instance = initIntroPane(node, settings);
  return { node, destroy: instance.destroy };
}
