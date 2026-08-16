// STATE
const DATA_URLS = Object.freeze({
  riskTables: "data/deviceTypes.json",
  scoring: "data/scoring.json"
});
const SAFE_RISK_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;
let riskRegistryPromise = null;
const riskTablePromises = new Map();
const DEVICE_TITLES = Object.freeze({
  hp: "HP",
  asus: "ASUS",
  macos: "macOS",
  ios: "iPhone"
});

// BUILD
/** Fetches JSON without using a cached response */
async function fetchJSON(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load " + url + " (" + response.status + ")");
  }
  return response.json();
}


/** Loads one editor-managed checkup definition dataset */
export async function loadRiskDataset(name) {
  const url = DATA_URLS[name];
  if (!url) throw new Error("Unknown risk dataset: " + name);
  return fetchJSON(url);
}


/** Converts registry intro arrays into the existing intro HTML convention */
function introHtmlFromLines(lines) {
  if (!Array.isArray(lines)) return "";
  return lines.map((line) => "<p>" + String(line || "") + "</p>").join("");
}


/** Converts a registry ID into a display label */
export function deviceTitle(value) {
  const id = String(value || "").trim();
  return DEVICE_TITLES[id] || (id
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase()));
}


/** Builds the stable key used by existing panes for one Device Check */
export function deviceCheckKey(categoryId, deviceId) {
  return String(categoryId || "").trim() + "-" + String(deviceId || "").trim();
}


/** Converts the category registry into the flat entries expected by older panes */
function flattenDeviceChecks(categories) {
  const entries = [];
  (categories || []).forEach((category) => {
    const categoryId = String(category?.id || "").trim();
    const categoryTitle = String(category?.title || deviceTitle(categoryId));
    (category?.devices || []).forEach((device) => {
      const deviceId = String(device?.id || "").trim();
      if (!categoryId || !deviceId) return;
      const manufacturerTitle = deviceTitle(deviceId);
      entries.push({
        id: deviceCheckKey(categoryId, deviceId),
        categoryId,
        categoryTitle,
        deviceId,
        manufacturerId: deviceId,
        manufacturerTitle,
        title: categoryTitle + " - " + manufacturerTitle,
        description: String(device?.description || "Run the " + manufacturerTitle + " device check."),
        path: String(device?.path || ""),
        link: "index.html?page=checkup&category=" + encodeURIComponent(categoryId) + "&device=" + encodeURIComponent(deviceId),
        introHtml: introHtmlFromLines(device?.intro || category?.intro || [])
      });
    });
  });
  return entries;
}


/** Loads all device checkup entries */
export function loadRiskTables() {
  return loadRiskDataset("riskTables");
}


/** Loads the registry of available Device Checkup IDs */
export async function loadRiskTableRegistry() {
  if (!riskRegistryPromise) riskRegistryPromise = loadRiskDataset("riskTables");
  const registry = await riskRegistryPromise;
  const categories = Array.isArray(registry?.categories) ? registry.categories : [];
  return {
    home: {
      ...(registry?.home || {}),
      introHtml: registry?.home?.introHtml || introHtmlFromLines(registry?.home?.intro || [])
    },
    reference: registry?.reference || {},
    categories,
    analyses: flattenDeviceChecks(categories)
  };
}


/** Finds one platform category registry entry by id */
export async function loadDeviceCategoryEntry(categoryId) {
  const id = String(categoryId || "").trim();
  if (!SAFE_RISK_ID_PATTERN.test(id)) {
    throw new Error("Invalid platform ID: " + id);
  }
  const registry = await loadRiskTableRegistry();
  const category = registry.categories.find((item) => item?.id === id);
  if (!category) {
    throw new Error("Unknown platform ID: " + id);
  }
  return {
    ...category,
    introHtml: introHtmlFromLines(category.intro || [])
  };
}


/** Finds one Device Checkup registry entry by id */
export async function loadRiskAnalysisEntry(riskId) {
  const id = String(riskId || "").trim();
  if (!SAFE_RISK_ID_PATTERN.test(id)) {
    throw new Error("Invalid Device Checkup ID: " + id);
  }
  const registry = await loadRiskTableRegistry();
  const entry = registry.analyses.find((item) => item?.id === id);
  if (!entry) {
    throw new Error("Unknown Device Checkup ID: " + id);
  }
  return entry;
}


/** Validates the registry file reference for one Device Checkup */
function getRiskTablePath(entry) {
  const categoryId = String(entry?.categoryId || "").trim();
  const deviceId = String(entry?.deviceId || entry?.manufacturerId || "").trim();
  const path = String(entry?.path || "").trim();
  if (!SAFE_RISK_ID_PATTERN.test(categoryId) || !SAFE_RISK_ID_PATTERN.test(deviceId) || path !== "checkups/" + categoryId + "/" + deviceId + ".json") {
    throw new Error("Invalid Device Check path for " + (entry?.id || "unknown"));
  }
  return path;
}


/** Loads one Device Checkup checks file by id */
export async function loadRiskTable(riskId) {
  const id = String(riskId || "").trim();
  if (!SAFE_RISK_ID_PATTERN.test(id)) {
    throw new Error("Invalid Device Checkup ID: " + id);
  }
  if (!riskTablePromises.has(id)) {
    riskTablePromises.set(id, loadRiskAnalysisEntry(id).then((entry) => fetchJSON("data/" + getRiskTablePath(entry))));
  }
  return riskTablePromises.get(id);
}


/** Loads overall Device Score to Device Status bands */
export function loadScoringConfig() {
  return loadRiskDataset("scoring");
}


/** Loads all editor-managed definition data */
export async function loadAllRiskData() {
  const [riskTables, scoring] = await Promise.all([
    loadRiskTableRegistry(),
    loadScoringConfig()
  ]);
  return { riskTables, scoring };
}
