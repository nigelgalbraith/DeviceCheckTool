// IMPORTS
import { createPageRuntime } from "../core/pageRuntime.js";
import { loadRiskTableRegistry } from "../core/riskData.js";
import { buildIntroPane } from "../panes/IntroPane.js";
import { buildIntroCardPane } from "../panes/IntroCardPane.js";

// STATE
const HOME_TITLE = "Device Checkup Tool";
const HOME_STATE_ENTRIES = [["page", "home"]];

// BUILD
/** Initializes the home page orchestrator */
export async function initHomePage() {
  const { lifecycle, shell, events, state } = createPageRuntime({
    pageTitle: HOME_TITLE,
    activeNavKey: "home",
    initialState: HOME_STATE_ENTRIES
  });
  const api = { events, state, lifecycle };
  const registry = await loadRiskTableRegistry();
  const home = registry.home || {};
  const heading = shell.header.querySelector("#pageTitle");
  if (heading) heading.textContent = home.title || HOME_TITLE;
  document.title = home.title || HOME_TITLE;
  const introSection = document.createElement("section");
  introSection.className = "intro-hero";
  const introPane = buildIntroPane({ html: home.introHtml || "", className: "intro-text" }, api);
  const categories = (registry.categories || []).map((category) => ({
    id: category.id,
    title: category.title || category.id,
    description: category.description || "",
    link: "index.html?page=category&category=" + encodeURIComponent(category.id || "")
  }));
  const cardPane = buildIntroCardPane({ analyses: categories, className: "risk-analysis-grid" }, api);
  introSection.appendChild(introPane.node);
  introSection.appendChild(cardPane.node);
  shell.contentHost.appendChild(introSection);
  lifecycle.add(introPane.destroy);
  lifecycle.add(cardPane.destroy);
}
