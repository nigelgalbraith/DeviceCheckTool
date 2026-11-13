
// IMPORTS
import { addHostClasses, el } from "../core/helpers.js";
import { buildIntroCardPane } from "./IntroCardPane.js";

// STATE
const SEARCH_CONFIG = {
  itemsKey: "analyses",
  searchFields: ["title", "description"],
  placeholder: "Search device checkups...",
  ariaLabel: "Search device checkups",
  emptyMessage: "No matching device checkups found.",
  cardClass: "risk-analysis-grid",
  paneClass: "search-pane",
  resultsClass: "search-results"
};

// BUILD
/** Returns items matching the search text */
function filterSearchItems(items, query, fields) {
  const search = query.trim().toLowerCase();
  if (!search) return items;
  return items.filter(function (item) {
    const values = fields.map(function (field) {
      const value = item[field];
      return Array.isArray(value) ? value.join(" ") : String(value || "");
    });
    return values.join(" ").toLowerCase().includes(search);
  });
}


/** Initializes the search pane */
function initSearchPane(host, settings) {
  const items = settings[SEARCH_CONFIG.itemsKey] || [];
  const searchInput = el("input", "search-input");
  searchInput.type = "search";
  searchInput.placeholder = settings.placeholder || SEARCH_CONFIG.placeholder;
  searchInput.setAttribute("aria-label", settings.ariaLabel || SEARCH_CONFIG.ariaLabel);
  const resultsHost = el("div", SEARCH_CONFIG.resultsClass);
  host.append(searchInput, resultsHost);
  function renderResults() {
    const matches = filterSearchItems(items, searchInput.value, SEARCH_CONFIG.searchFields);
    if (!matches.length) {
      resultsHost.replaceChildren(el("p", "intro-text", SEARCH_CONFIG.emptyMessage));
      return;
    }
    const cardPane = buildIntroCardPane({
      [SEARCH_CONFIG.itemsKey]: matches,
      className: SEARCH_CONFIG.cardClass
    });
    resultsHost.replaceChildren(cardPane.node);
  }
  searchInput.addEventListener("input", renderResults);
  renderResults();
  return {
    destroy() {
      searchInput.removeEventListener("input", renderResults);
    }
  };
}


/** Builds the search pane */
export function buildSearchPane(options) {
  const settings = options || {};
  const node = document.createElement("div");
  node.className = settings.className || SEARCH_CONFIG.paneClass;
  if (settings.id) node.id = settings.id;
  addHostClasses(node, ["pane-host", "pane-host--search"]);
  const instance = initSearchPane(node, settings);
  return { node, destroy: instance.destroy };
}
