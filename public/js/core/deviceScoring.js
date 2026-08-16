// STATE
const UNSCORED_TYPES = new Set(["text"]);

// BUILD
/** Returns true when no technician value has been entered */
function isUnanswered(value) {
  return value === undefined || value === null || String(value).trim() === "";
}


/** Normalizes selector-style values for rule lookup */
function normalizeChoice(value) {
  return String(value || "").trim().toLowerCase();
}


/** Returns a usable numeric weight, defaulting to 1 */
function checkWeight(check) {
  const weight = Number(check?.weight);
  return Number.isFinite(weight) ? weight : 1;
}


/** Finds the matching range rule for percentage/number checks */
function findRangeRule(rules, value) {
  const number = Number(value);
  if (!Number.isFinite(number) || !Array.isArray(rules)) return null;
  return rules.find((rule) => {
    if (!rule || typeof rule !== "object") return false;
    const min = Number(rule.min);
    const max = Number(rule.max);
    const aboveMin = !Number.isFinite(min) || number >= min;
    const belowMax = !Number.isFinite(max) || number <= max;
    return aboveMin && belowMax;
  }) || null;
}


/** Finds the matching keyed rule for selector/text checks */
function findChoiceRule(rules, value) {
  if (!rules || typeof rules !== "object" || Array.isArray(rules)) return null;
  const key = normalizeChoice(value);
  return rules[key] || null;
}


/** Evaluates one Device Check item against its JSON rules */
export function evaluateCheck(check, value) {
  const id = String(check?.id || "");
  const type = String(check?.type || "text");
  if (isUnanswered(value)) return { id, state: "unanswered", score: null, weight: 0 };
  if (check?.allowNA && normalizeChoice(value) === "na") return { id, state: "na", score: null, weight: 0 };
  const rules = check?.rules;
  if (!rules && UNSCORED_TYPES.has(type)) return { id, state: "informational", score: null, weight: 0 };
  const rule = (type === "percentage" || type === "number")
    ? findRangeRule(rules, value)
    : findChoiceRule(rules, value);
  if (!rule || !Number.isFinite(Number(rule.score))) {
    return { id, state: "unscored", score: null, weight: 0 };
  }
  const weight = Math.max(0, checkWeight(check));
  return {
    id,
    state: "scored",
    score: Number(rule.score),
    weight,
    weightedScore: Number(rule.score) * weight,
    issue: rule.issue || "",
    recommendation: rule.recommendation || ""
  };
}


/** Finds the configured Device Status band for a score */
export function findStatusBand(scoringConfig, score) {
  if (!Number.isFinite(Number(score))) return null;
  const value = Number(score);
  const bands = Array.isArray(scoringConfig) ? scoringConfig : [];
  return bands.find((band) => {
    const min = Number(band.minScore);
    const max = Number(band.maxScore);
    return Number.isFinite(min) && Number.isFinite(max) && value >= min && value <= max;
  }) || null;
}


/** Formats a normalized score for user-facing display */
export function formatScorePercent(score) {
  return Number.isFinite(Number(score)) ? String(Math.round(Number(score))) + "%" : "";
}


/** Evaluates all checks and returns the overall weighted Device Score */
export function evaluateDeviceCheck(definition, values, scoringConfig) {
  const checks = [];
  let weightedTotal = 0;
  let totalWeight = 0;
  (definition?.categories || []).forEach((category) => {
    (category?.checks || []).forEach((check) => {
      const id = String(check?.id || "");
      const result = evaluateCheck(check, values?.[id]);
      checks.push({
        ...result,
        categoryId: category?.id || "",
        categoryTitle: category?.title || "",
        label: check?.label || id,
        type: check?.type || "",
        value: values?.[id] ?? ""
      });
      if (result.state === "scored" && result.weight > 0) {
        weightedTotal += result.weightedScore;
        totalWeight += result.weight;
      }
    });
  });
  if (totalWeight <= 0) {
    return {
      score: null,
      scoreText: "Not calculated yet",
      status: "Not calculated yet",
      statusDefinition: null,
      statusColor: "",
      summary: "Not calculated yet",
      totalWeight,
      checks
    };
  }
  const score = Math.round(weightedTotal / totalWeight);
  const band = findStatusBand(scoringConfig, score);
  return {
    score,
    scoreText: formatScorePercent(score),
    status: band?.title || "Not calculated yet",
    statusDefinition: band || null,
    statusColor: band?.color || "",
    summary: band?.message || "",
    totalWeight,
    checks
  };
}
