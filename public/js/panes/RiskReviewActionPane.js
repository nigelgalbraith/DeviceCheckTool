// IMPORTS
import {
  el,
  clearHost,
  addHostClasses,
  renderHostMessage,
  renderHostTitle
} from "../core/helpers.js";

// STATE
const REVIEW_ACTION_CLASS = "pane-host--risk-review-action";

// BUILD
/** Builds the review page URL for the selected service */
function buildReviewUrl(riskKey) {
  return "index.html?page=review&service=" + encodeURIComponent(riskKey);
}


/** Initializes the review action pane */
function initRiskReviewActionPane(host, settings) {
  const riskKey = settings.riskKey || "";
  const title = settings.title || "Review";
  clearHost(host);
  renderHostTitle(host, title, "rt-title");
  if (!riskKey) {
    renderHostMessage(host, "Missing device key.", "rt-error", false);
    return { destroy() {} };
  }
  const actionsWrap = el("div", "rra-actions");
  const reviewButton = document.createElement("button");
  reviewButton.type = "button";
  reviewButton.className = "rra-button";
  reviewButton.textContent = "Show Review";
  const onClick = function () {
    window.location.href = buildReviewUrl(riskKey);
  };
  reviewButton.addEventListener("click", onClick);
  actionsWrap.appendChild(reviewButton);
  host.appendChild(actionsWrap);
  return {
    destroy() {
      reviewButton.removeEventListener("click", onClick);
    }
  };
}


/** Builds the review action pane host */
export function buildRiskReviewActionPane(options) {
  const settings = options || {};
  const node = document.createElement("div");
  if (settings.id) node.id = settings.id;
  addHostClasses(node, ["pane-host", REVIEW_ACTION_CLASS, "pane"]);
  const instance = initRiskReviewActionPane(node, settings);
  return { node, destroy: instance.destroy };
}
