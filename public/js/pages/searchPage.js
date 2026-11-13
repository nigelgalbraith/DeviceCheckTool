
// IMPORTS
import { createPageRuntime } from "../core/pageRuntime.js";
import { el } from "../core/helpers.js";
import { loadRiskTableRegistry } from "../core/riskData.js";
import { buildIntroPane } from "../panes/IntroPane.js";
import { buildSearchPane } from "../panes/SearchPane.js";

// BUILD
/** Initializes the search page */
export async function initSearchPage() {
  const { lifecycle, shell } = createPageRuntime({
    pageTitle: "Search Device Checkups",
    activeNavKey: "search"
  });
  const section = el("section", "intro-hero");
  shell.contentHost.appendChild(section);
  const loadingMessage = el("p", "intro-text", "Loading device checkups...");
  section.appendChild(loadingMessage);
  try {
    const registry = await loadRiskTableRegistry();
    const search = registry.search || {};
    const analyses = registry.analyses || [];
    const heading = shell.header.querySelector("#pageTitle");
    if (heading) heading.textContent = search.title || "Search Device Checkups";
    document.title = search.title || "Search Device Checkups";
    const introPane = buildIntroPane({
      text: search.intro || [],
      className: "intro-text"
    });
    section.prepend(introPane.node);
    lifecycle.add(introPane.destroy);
    const searchPane = buildSearchPane({
      analyses,
      placeholder: "Search device checkups...",
      ariaLabel: "Search device checkups"
    });
    loadingMessage.replaceWith(searchPane.node);
    lifecycle.add(searchPane.destroy);
  } catch (error) {
    console.error("Unable to load device checkups:", error);
    loadingMessage.textContent = "Unable to load device checkups.";
  }
}
