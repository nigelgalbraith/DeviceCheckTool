// IMPORTS
import { createPageRuntime } from "../core/pageRuntime.js";
import { deviceTitle, loadDeviceCategoryEntry } from "../core/riskData.js";
import { buildIntroPane } from "../panes/IntroPane.js";
import { buildIntroCardPane } from "../panes/IntroCardPane.js";

// STATE
const BASE_TITLE = "Device Platform";
const BACK_NAV_KEY = "home";
const CATEGORY_STATE_ENTRIES = [["page", "category"]];

// BUILD
/** Reads the current platform category from the URL */
function getCategoryKey() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("category") || "").trim();
}


/** Initializes the generic platform category page */
export async function initCategoryPage() {
  const { lifecycle, shell, events, state } = createPageRuntime({
    pageTitle: BASE_TITLE,
    activeNavKey: BACK_NAV_KEY,
    initialState: CATEGORY_STATE_ENTRIES
  });
  const api = { events, state, lifecycle };
  const categoryId = getCategoryKey();
  const heading = shell.header.querySelector("#pageTitle");
  if (!categoryId) {
    const msg = document.createElement("div");
    msg.className = "intro-text";
    msg.innerHTML = "<p>Missing URL parameter: <code>?category=</code></p>";
    shell.contentHost.appendChild(msg);
    if (heading) heading.textContent = BASE_TITLE;
    document.title = BASE_TITLE;
    return;
  }
  const category = await loadDeviceCategoryEntry(categoryId);
  const displayName = category.title || deviceTitle(categoryId);
  if (heading) heading.textContent = displayName;
  document.title = displayName;
  const introSection = document.createElement("section");
  introSection.className = "intro-hero";
  const introPane = buildIntroPane({ html: category.introHtml || "", className: "intro-text" }, api);
  const devices = (category.devices || []).map((device) => {
    const deviceId = String(device?.id || "").trim();
    const title = deviceTitle(deviceId);
    return {
      id: deviceId,
      title,
      description: device?.description || "Run the " + title + " device check.",
      link: "index.html?page=checkup&category=" + encodeURIComponent(categoryId) + "&device=" + encodeURIComponent(deviceId)
    };
  });
  const cardPane = buildIntroCardPane({ analyses: devices, className: "risk-analysis-grid" }, api);
  introSection.appendChild(introPane.node);
  introSection.appendChild(cardPane.node);
  shell.contentHost.appendChild(introSection);
  lifecycle.add(introPane.destroy);
  lifecycle.add(cardPane.destroy);
}
