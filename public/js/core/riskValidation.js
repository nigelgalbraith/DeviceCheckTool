// STATE
const SAFE_RISK_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;
const SUPPORTED_CHECK_TYPES = new Set(["percentage", "number", "yes_no", "pass_fail", "condition", "text"]);

// BUILD
/** Adds an error when a condition is false */
function requireCondition(errors, condition, message) {
  if (!condition) errors.push(message);
}


/** Returns true when a value is a plain object */
function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}


/** Validates a future rule score value */
function validateRuleScore(errors, value, path) {
  const number = Number(value);
  requireCondition(errors, Number.isFinite(number), path + " must be a number.");
  requireCondition(errors, number >= 0 && number <= 100, path + " must be between 0 and 100.");
}


/** Validates a string list */
function validateTextList(errors, value, path) {
  requireCondition(errors, Array.isArray(value), path + " must be a list.");
  if (!Array.isArray(value)) return;
  value.forEach((item, index) => {
    requireCondition(errors, typeof item === "string", path + "[" + index + "] must be text.");
  });
}


/** Validates intro text lines */
function validateIntroList(errors, value, path) {
  requireCondition(errors, Array.isArray(value), path + " must be a list.");
  if (!Array.isArray(value)) return;
  value.forEach((item, index) => {
    requireCondition(errors, typeof item === "string", path + "[" + index + "] must be text.");
  });
}


/** Validates optional issue/recommendation text */
function validateOptionalText(errors, value, path) {
  if (value != null) requireCondition(errors, typeof value === "string", path + " must be text.");
}


/** Validates one keyed rule outcome */
function validateRuleOutcome(errors, value, path) {
  requireCondition(errors, isObject(value), path + " must be an object.");
  if (!isObject(value)) return;
  requireCondition(errors, "score" in value, path + ".score is required.");
  if ("score" in value) validateRuleScore(errors, value.score, path + ".score");
  validateOptionalText(errors, value.issue, path + ".issue");
  validateOptionalText(errors, value.recommendation, path + ".recommendation");
}


/** Validates optional future scoring rules for one check */
function validateRules(errors, rules, checkType, path) {
  if (rules == null) return;
  if (checkType === "percentage" || checkType === "number") {
    requireCondition(errors, Array.isArray(rules), path + ".rules must be a list for " + checkType + " checks.");
    if (!Array.isArray(rules)) return;
    rules.forEach((rule, index) => {
      const rulePath = path + ".rules[" + index + "]";
      requireCondition(errors, isObject(rule), rulePath + " must be an object.");
      if (!isObject(rule)) return;
      if ("min" in rule) requireCondition(errors, Number.isFinite(Number(rule.min)), rulePath + ".min must be a number.");
      if ("max" in rule) requireCondition(errors, Number.isFinite(Number(rule.max)), rulePath + ".max must be a number.");
      if ("min" in rule && "max" in rule && Number.isFinite(Number(rule.min)) && Number.isFinite(Number(rule.max))) {
        requireCondition(errors, Number(rule.min) <= Number(rule.max), rulePath + ".min must be less than or equal to max.");
      }
      requireCondition(errors, "score" in rule, rulePath + ".score is required.");
      if ("score" in rule) validateRuleScore(errors, rule.score, rulePath + ".score");
      validateOptionalText(errors, rule.issue, rulePath + ".issue");
      validateOptionalText(errors, rule.recommendation, rulePath + ".recommendation");
    });
    return;
  }
  if (checkType === "yes_no" || checkType === "pass_fail" || checkType === "condition" || checkType === "text") {
    requireCondition(errors, isObject(rules), path + ".rules must be an object for " + checkType + " checks.");
    if (!isObject(rules)) return;
    Object.entries(rules).forEach(([key, value]) => {
      requireCondition(errors, typeof key === "string" && key.trim(), path + ".rules keys must be text.");
      validateRuleOutcome(errors, value, path + ".rules." + key);
    });
  }
}


/** Validates one Device Check item */
function validateDeviceCheck(errors, check, path) {
  requireCondition(errors, isObject(check), path + " must be an object.");
  if (!isObject(check)) return;
  requireCondition(errors, typeof check.id === "string" && check.id.trim(), path + ".id is required.");
  if (typeof check.id === "string") {
    requireCondition(errors, SAFE_RISK_ID_PATTERN.test(check.id), path + ".id may contain only letters, numbers, underscores, or hyphens and must start with a letter.");
  }
  requireCondition(errors, typeof check.label === "string" && check.label.trim(), path + ".label is required.");
  requireCondition(errors, SUPPORTED_CHECK_TYPES.has(check.type), path + ".type must be one of " + Array.from(SUPPORTED_CHECK_TYPES).sort().join(", ") + ".");
  if ("unit" in check) requireCondition(errors, typeof check.unit === "string", path + ".unit must be text.");
  if ("allowNA" in check) requireCondition(errors, typeof check.allowNA === "boolean", path + ".allowNA must be true or false.");
  if ("weight" in check) requireCondition(errors, Number.isFinite(Number(check.weight)), path + ".weight must be a number.");
  validateRules(errors, check.rules, check.type, path);
}


/** Validates the device type registry */
export function validateRiskTableRegistry(data) {
  const errors = [];
  requireCondition(errors, isObject(data), "deviceTypes must be an object.");
  if (!isObject(data)) return errors;
  requireCondition(errors, isObject(data.home), "deviceTypes.home must be an object.");
  if (isObject(data.home)) {
    requireCondition(errors, typeof data.home.title === "string" && data.home.title.trim(), "deviceTypes.home.title is required.");
    validateIntroList(errors, data.home.intro, "deviceTypes.home.intro");
  }
  requireCondition(errors, Array.isArray(data.categories), "deviceTypes.categories must be a list.");
  if (!Array.isArray(data.categories)) return errors;
  const categoryIds = new Set();
  data.categories.forEach((category, categoryIndex) => {
    const categoryPath = "deviceTypes.categories[" + categoryIndex + "]";
    requireCondition(errors, isObject(category), categoryPath + " must be an object.");
    if (!isObject(category)) return;
    const categoryId = category.id;
    requireCondition(errors, typeof categoryId === "string" && categoryId.trim(), categoryPath + ".id is required.");
    if (typeof categoryId !== "string") return;
    requireCondition(errors, SAFE_RISK_ID_PATTERN.test(categoryId), categoryPath + ".id may contain only letters, numbers, underscores, or hyphens and must start with a letter.");
    if (categoryIds.has(categoryId)) errors.push("deviceTypes.categories contains duplicate id " + categoryId + ".");
    categoryIds.add(categoryId);
    requireCondition(errors, typeof category.title === "string" && category.title.trim(), categoryPath + ".title is required.");
    requireCondition(errors, typeof category.description === "string", categoryPath + ".description must be text.");
    validateIntroList(errors, category.intro, categoryPath + ".intro");
    requireCondition(errors, Array.isArray(category.devices), categoryPath + ".devices must be a list.");
    if (!Array.isArray(category.devices)) return;
    const deviceIds = new Set();
    category.devices.forEach((device, deviceIndex) => {
      const devicePath = categoryPath + ".devices[" + deviceIndex + "]";
      requireCondition(errors, isObject(device), devicePath + " must be an object.");
      if (!isObject(device)) return;
      const deviceId = device.id;
      requireCondition(errors, typeof deviceId === "string" && deviceId.trim(), devicePath + ".id is required.");
      if (typeof deviceId !== "string") return;
      requireCondition(errors, SAFE_RISK_ID_PATTERN.test(deviceId), devicePath + ".id may contain only letters, numbers, underscores, or hyphens and must start with a letter.");
      if (deviceIds.has(deviceId)) errors.push(categoryPath + ".devices contains duplicate id " + deviceId + ".");
      deviceIds.add(deviceId);
      requireCondition(errors, device.path === "checkups/" + categoryId + "/" + deviceId + ".json", devicePath + ".path must reference checkups/" + categoryId + "/" + deviceId + ".json.");
    });
  });
  return errors;
}


/** Validates one Device Check definition file */
export function validateRiskAnalysisRows(data, serviceId = "selected") {
  const errors = [];
  requireCondition(errors, isObject(data), "checkups." + serviceId + " must be an object.");
  if (!isObject(data)) return errors;
  requireCondition(errors, typeof data.id === "string" && data.id.trim(), "checkups." + serviceId + ".id is required.");
  if (typeof data.id === "string") {
    requireCondition(errors, SAFE_RISK_ID_PATTERN.test(data.id), "checkups." + serviceId + ".id may contain only letters, numbers, underscores, or hyphens and must start with a letter.");
  }
  requireCondition(errors, typeof data.title === "string" && data.title.trim(), "checkups." + serviceId + ".title is required.");
  requireCondition(errors, typeof data.description === "string", "checkups." + serviceId + ".description must be text.");
  requireCondition(errors, Array.isArray(data.categories), "checkups." + serviceId + ".categories must be a list.");
  if (!Array.isArray(data.categories)) return errors;
  const categoryIds = new Set();
  data.categories.forEach((category, categoryIndex) => {
    const categoryPath = "checkups." + serviceId + ".categories[" + categoryIndex + "]";
    requireCondition(errors, isObject(category), categoryPath + " must be an object.");
    if (!isObject(category)) return;
    requireCondition(errors, typeof category.id === "string" && category.id.trim(), categoryPath + ".id is required.");
    if (typeof category.id === "string") {
      requireCondition(errors, SAFE_RISK_ID_PATTERN.test(category.id), categoryPath + ".id may contain only letters, numbers, underscores, or hyphens and must start with a letter.");
      if (categoryIds.has(category.id)) errors.push("checkups." + serviceId + ".categories contains duplicate id " + category.id + ".");
      categoryIds.add(category.id);
    }
    requireCondition(errors, typeof category.title === "string" && category.title.trim(), categoryPath + ".title is required.");
    requireCondition(errors, Array.isArray(category.checks), categoryPath + ".checks must be a list.");
    if (!Array.isArray(category.checks)) return;
    const checkIds = new Set();
    category.checks.forEach((check, checkIndex) => {
      const checkPath = categoryPath + ".checks[" + checkIndex + "]";
      validateDeviceCheck(errors, check, checkPath);
      if (check && typeof check.id === "string") {
        const id = check.id.trim();
        if (checkIds.has(id)) errors.push(categoryPath + ".checks contains duplicate id " + id + ".");
        checkIds.add(id);
      }
    });
  });
  return errors;
}


/** Backward-compatible validator name for the registry file */
export function validateRiskTables(data) {
  return validateRiskTableRegistry(data);
}


/** Validates overall Device Score bands */
export function validateScoringConfig(data) {
  const errors = [];
  requireCondition(errors, Array.isArray(data), "scoring must be a list.");
  if (!Array.isArray(data)) return errors;
  data.forEach((band, index) => {
    const path = "scoring[" + index + "]";
    requireCondition(errors, isObject(band), path + " must be an object.");
    if (!isObject(band)) return;
    requireCondition(errors, typeof band.color === "string" && band.color.trim(), path + ".color is required.");
    requireCondition(errors, Number.isFinite(Number(band.minScore)), path + ".minScore must be a number.");
    requireCondition(errors, Number.isFinite(Number(band.maxScore)), path + ".maxScore must be a number.");
    if (Number.isFinite(Number(band.minScore)) && Number.isFinite(Number(band.maxScore))) {
      requireCondition(errors, Number(band.minScore) <= Number(band.maxScore), path + ".minScore must be less than or equal to maxScore.");
      requireCondition(errors, Number(band.minScore) >= 0 && Number(band.maxScore) <= 100, path + " must be within 0-100.");
    }
    requireCondition(errors, typeof band.message === "string" && band.message.trim(), path + ".message is required.");
    requireCondition(errors, typeof band.title === "string" && band.title.trim(), path + ".title is required.");
  });
  return errors;
}


/** Validates one named editor-managed dataset */
export function validateRiskDataset(name, data) {
  if (name === "riskTables") return validateRiskTableRegistry(data);
  if (name === "scoring") return validateScoringConfig(data);
  return ["Unknown dataset: " + name];
}
