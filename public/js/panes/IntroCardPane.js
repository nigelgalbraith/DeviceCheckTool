
// IMPORTS
import { NOOP_PANE, addHostClasses, el, renderHostMessage, renderTextArray } from "../core/helpers.js";

// STATE
const CARD_CONFIG = {
  className: "risk-analysis-grid",
  cardClass: "risk-card",
  categoriesKey: "categories",
  itemsKey: "analyses",
  categoryPage: "",
  itemPage: "index.html?page=checkup&service=",
  categoryEmptyMessage: "No categories configured.",
  itemEmptyMessage: "No Device Checkups configured.",
  countSingular: "checkup",
  countPlural: "checkups"
};

// BUILD
/** Gets the display item count for a category */
function getCategoryCountText(category) {
  const items = category[CARD_CONFIG.itemsKey];
  const count = Array.isArray(items) ? items.length : 0;
  return count + " " + (count === 1 ? CARD_CONFIG.countSingular : CARD_CONFIG.countPlural);
}


/** Converts card content into text blocks */
function getCardText(value) {
  if (Array.isArray(value)) return value;
  return value ? [String(value)] : [];
}


/** Builds one card element */
function buildCard(item, isCategory) {
  const card = el("div", CARD_CONFIG.cardClass);
  const link = document.createElement("a");
  const page = isCategory ? CARD_CONFIG.categoryPage : CARD_CONFIG.itemPage;
  link.href = item.link || (page + encodeURIComponent(item.id || ""));
  link.appendChild(el("h2", "", item.title || item.id || ""));
  const content = isCategory
    ? [item.description || "", getCategoryCountText(item)].filter(Boolean)
    : getCardText(item.description);
  renderTextArray(link, content);
  card.appendChild(link);
  return card;
}


/** Initializes the intro cards pane node */
function initIntroCardsPane(host, settings) {
  const categories = settings[CARD_CONFIG.categoriesKey] || [];
  const items = settings[CARD_CONFIG.itemsKey] || [];
  if (categories.length) {
    categories.forEach(function (category) {
      if (category) host.appendChild(buildCard(category, true));
    });
    return NOOP_PANE;
  }
  if (items.length) {
    items.forEach(function (item) {
      if (item) host.appendChild(buildCard(item, false));
    });
    return NOOP_PANE;
  }
  const message = settings[CARD_CONFIG.categoriesKey]
    ? CARD_CONFIG.categoryEmptyMessage
    : CARD_CONFIG.itemEmptyMessage;
  renderHostMessage(host, message, "", true, "p");
  return NOOP_PANE;
}


/** Builds the intro cards pane */
export function buildIntroCardPane(options) {
  const settings = options || {};
  const node = document.createElement("div");
  node.className = settings.className || CARD_CONFIG.className;
  if (settings.id) node.id = settings.id;
  addHostClasses(node, ["pane-host", "pane-host--intro-cards"]);
  const instance = initIntroCardsPane(node, settings);
  return { node, destroy: instance.destroy };
}
