// IMPORTS
import { el } from "../../../js/core/helpers.js";

// STATE
const CHECK_TYPES = ["percentage", "number", "yes_no", "pass_fail", "condition", "text"];
const RANGE_TYPES = new Set(["percentage", "number"]);
const FIXED_RULE_KEYS = Object.freeze({
  yes_no: ["yes", "no"],
  pass_fail: ["pass", "fail"]
});
const DEFAULT_CONDITION_KEYS = ["excellent", "good", "fair", "poor"];

// BUILD
function makeField(labelText, inputNode, options = {}) {
  const wrap = el("div", "rd-field" + (options.wide ? " form-field--wide" : "") + (options.className ? " " + options.className : ""));
  wrap.appendChild(el("label", "rd-label", labelText));
  wrap.appendChild(inputNode);
  return wrap;
}


function makeInput(value) {
  const input = document.createElement("input");
  input.className = "rd-input";
  input.type = "text";
  input.value = value ?? "";
  return input;
}


function makeNumber(value) {
  const input = makeInput(value ?? "");
  input.type = "number";
  input.step = "0.1";
  return input;
}


function makeCheckbox(value) {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = Boolean(value);
  return input;
}


function makeCheckboxField(labelText, inputNode) {
  const wrap = el("label", "rd-field checkbox-field");
  wrap.appendChild(inputNode);
  wrap.appendChild(el("span", "rd-label", labelText));
  return wrap;
}


function makeTextarea(value, rows = 4) {
  const textarea = document.createElement("textarea");
  textarea.className = "rd-textarea";
  textarea.rows = rows;
  textarea.value = value || "";
  return textarea;
}


function makeTypeSelect(value) {
  const select = document.createElement("select");
  select.className = "rd-input";
  CHECK_TYPES.forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    option.selected = value === type;
    select.appendChild(option);
  });
  return select;
}


function cloneRule(rule) {
  return rule && typeof rule === "object" && !Array.isArray(rule) ? { ...rule } : {};
}


function titleForRuleKey(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}


function numberFromInput(input, path, errors, options = {}) {
  const raw = String(input.value || "").trim();
  if (!raw) {
    if (options.required) errors.push(path + " is required.");
    return undefined;
  }
  const number = Number(raw);
  if (!Number.isFinite(number)) errors.push(path + " must be numeric.");
  if (options.score && Number.isFinite(number) && (number < 0 || number > 100)) {
    errors.push(path + " must be between 0 and 100.");
  }
  return Number.isFinite(number) ? number : undefined;
}


function textFromInput(input) {
  return String(input.value || "").trim();
}


function assignOptionalText(target, key, input) {
  const value = textFromInput(input);
  if (value) target[key] = value;
}


function defaultRulesForType(type) {
  if (RANGE_TYPES.has(type)) return [{ min: "", max: "", score: "" }];
  if (type === "yes_no") return { yes: { score: "" }, no: { score: "" } };
  if (type === "pass_fail") return { pass: { score: "" }, fail: { score: "" } };
  if (type === "condition") {
    return DEFAULT_CONDITION_KEYS.reduce((rules, key) => {
      rules[key] = { score: "" };
      return rules;
    }, {});
  }
  return undefined;
}


function rulesForType(row, type) {
  if (RANGE_TYPES.has(type)) {
    return Array.isArray(row.rules) && row.rules.length ? row.rules.map(cloneRule) : defaultRulesForType(type);
  }
  if (type === "yes_no" || type === "pass_fail") {
    const source = row.rules && typeof row.rules === "object" && !Array.isArray(row.rules) ? row.rules : {};
    return FIXED_RULE_KEYS[type].reduce((rules, key) => {
      rules[key] = cloneRule(source[key]);
      return rules;
    }, {});
  }
  if (type === "condition" || type === "text") {
    if (row.rules && typeof row.rules === "object" && !Array.isArray(row.rules)) return { ...row.rules };
    return type === "condition" ? defaultRulesForType(type) : undefined;
  }
  return undefined;
}


function validateRangeOverlap(rules, errors) {
  const ranges = rules
    .map((rule, index) => ({
      index,
      min: rule.min === undefined ? Number.NEGATIVE_INFINITY : rule.min,
      max: rule.max === undefined ? Number.POSITIVE_INFINITY : rule.max
    }))
    .sort((a, b) => a.min - b.min || a.max - b.max);
  for (let i = 1; i < ranges.length; i += 1) {
    if (ranges[i].min <= ranges[i - 1].max) {
      errors.push("Rule " + String(ranges[i - 1].index + 1) + " overlaps Rule " + String(ranges[i].index + 1) + ".");
    }
  }
}


function buildRuleObject(scoreInput, issueInput, recommendationInput, path, errors) {
  const rule = {};
  const score = numberFromInput(scoreInput, path + " Score", errors, { required: true, score: true });
  if (score !== undefined) rule.score = score;
  assignOptionalText(rule, "issue", issueInput);
  assignOptionalText(rule, "recommendation", recommendationInput);
  return rule;
}


function buildRuleFields(rule, path, refs) {
  const score = makeNumber(rule.score ?? "");
  const issue = makeTextarea(rule.issue || "", 3);
  const recommendation = makeTextarea(rule.recommendation || "", 3);
  refs.push({ path, score, issue, recommendation });
  return [
    makeField("Score", score),
    makeField("Issue", issue),
    makeField("Recommendation", recommendation)
  ];
}


function makeRuleBlock(title) {
  const block = el("div", "rule-block");
  block.appendChild(el("h4", "rule-title", title));
  return block;
}


function makeRangeRulesEditor(row, actions) {
  const rules = rulesForType(row, row.type);
  const refs = [];
  const wrap = el("div", "rules-editor");
  rules.forEach((rule, index) => {
    const block = makeRuleBlock("Rule " + String(index + 1));
    const min = makeNumber(rule.min ?? "");
    const max = makeNumber(rule.max ?? "");
    const score = makeNumber(rule.score ?? "");
    const issue = makeTextarea(rule.issue || "", 3);
    const recommendation = makeTextarea(rule.recommendation || "", 3);
    refs.push({ index, min, max, score, issue, recommendation });
    block.appendChild(makeField("Min", min));
    block.appendChild(makeField("Max", max));
    block.appendChild(makeField("Score", score));
    block.appendChild(makeField("Issue", issue));
    block.appendChild(makeField("Recommendation", recommendation));
    wrap.appendChild(block);
  });
  const actionsRow = el("div", "re-actions rule-actions");
  const add = document.createElement("button");
  add.type = "button";
  add.className = "re-button re-button-add";
  add.textContent = "Add Rule";
  add.addEventListener("click", () => {
    row.rules = collectRangeRules(refs, false);
    row.rules.push({ min: "", max: "", score: "" });
    actions.markDirty?.();
    actions.renderAll?.();
  });
  actionsRow.appendChild(add);
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "re-button re-button-remove";
  remove.textContent = "Remove Rule";
  remove.disabled = refs.length <= 1;
  remove.addEventListener("click", () => {
    if (refs.length <= 1) return;
    row.rules = collectRangeRules(refs, false).slice(0, -1);
    actions.markDirty?.();
    actions.renderAll?.();
  });
  actionsRow.appendChild(remove);
  wrap.appendChild(actionsRow);
  return {
    node: wrap,
    collect(strict = true) {
      return collectRangeRules(refs, strict);
    }
  };
}


function collectRangeRules(refs, strict) {
  const errors = [];
  const rules = refs.map((ref) => {
    const path = "Rule " + String(ref.index + 1);
    const rule = {};
    const min = numberFromInput(ref.min, path + " Min", errors, { required: false });
    const max = numberFromInput(ref.max, path + " Max", errors, { required: false });
    const score = numberFromInput(ref.score, path + " Score", errors, { required: strict, score: true });
    if (min !== undefined) rule.min = min;
    if (max !== undefined) rule.max = max;
    if (score !== undefined) rule.score = score;
    if (min === undefined && max === undefined && strict) errors.push(path + " needs a Min or Max value.");
    if (min !== undefined && max !== undefined && min > max) errors.push(path + " Min must not be greater than Max.");
    assignOptionalText(rule, "issue", ref.issue);
    assignOptionalText(rule, "recommendation", ref.recommendation);
    return rule;
  });
  if (strict) validateRangeOverlap(rules, errors);
  if (strict && errors.length) throw new Error(errors.join("\n"));
  return rules;
}


function makeKeyedRulesEditor(row) {
  const type = row.type || "text";
  if (type === "text" && row.rules && (typeof row.rules !== "object" || Array.isArray(row.rules))) {
    return {
      node: el("p", "rule-empty", "This check has scoring rules that are preserved but not editable in this structured editor."),
      collect() {
        return row.rules;
      }
    };
  }
  const rules = rulesForType(row, type);
  const keys = type === "yes_no" || type === "pass_fail"
    ? FIXED_RULE_KEYS[type]
    : Object.keys(rules || {});
  if (!keys.length) {
    return {
      node: el("p", "rule-empty", "This check does not use scoring rules."),
      collect() {
        return undefined;
      }
    };
  }
  const refs = [];
  const wrap = el("div", "rules-editor");
  keys.forEach((key) => {
    const ruleKey = String(key || "").trim();
    const block = makeRuleBlock(titleForRuleKey(ruleKey));
    buildRuleFields(cloneRule(rules[ruleKey]), titleForRuleKey(ruleKey), refs).forEach((field) => {
      block.appendChild(field);
    });
    refs[refs.length - 1].key = ruleKey;
    wrap.appendChild(block);
  });
  return {
    node: wrap,
    collect(strict = true) {
      const errors = [];
      const nextRules = {};
      refs.forEach((ref) => {
        nextRules[ref.key] = buildRuleObject(ref.score, ref.issue, ref.recommendation, ref.path, errors);
      });
      if (strict && errors.length) throw new Error(errors.join("\n"));
      return nextRules;
    }
  };
}


function makeRulesEditor(row, actions) {
  if (RANGE_TYPES.has(row.type)) return makeRangeRulesEditor(row, actions);
  return makeKeyedRulesEditor(row);
}


function bindRuleInputs(editor, row, actions) {
  editor.node.querySelectorAll("input, textarea").forEach((input) => {
    input.addEventListener("input", () => {
      row.rules = editor.collect(false);
      actions.markDirty?.();
    });
  });
}


/** Renders the selected device check editor */
export function renderRiskControlEditorPane({ state, host, actions }) {
  const rows = state.currentRiskRows || [];
  const row = rows.find((item) => (item._editorId || item.id) === state.selectedControlId);
  const pane = el("section", "pane editor-pane");
  pane.appendChild(el("h2", "rt-title", "Selected Check"));
  if (!row) {
    pane.appendChild(el("p", "", "Select a check to edit."));
    host.appendChild(pane);
    return;
  }
  const id = makeInput(row.id);
  const label = makeInput(row.label);
  const type = makeTypeSelect(row.type || "text");
  const unit = makeInput(row.unit || "");
  const allowNA = makeCheckbox(row.allowNA);
  const weight = makeNumber(row.weight ?? 0);
  const rulesEditor = makeRulesEditor(row, actions);

  function applyControlChanges() {
    const oldEditorId = row._editorId;
    row.id = id.value.trim();
    row.label = label.value.trim();
    row.type = type.value;
    row.unit = unit.value.trim();
    row.allowNA = allowNA.checked;
    row.weight = Number(weight.value);
    const nextRules = rulesEditor.collect(true);
    if (nextRules === undefined) {
      delete row.rules;
    } else {
      row.rules = nextRules;
    }
    row._editorId = String(row._categoryId || "") + "." + String(row.id || "");
    state.selectedControlId = row._editorId || oldEditorId;
  }

  function applyBasicChanges() {
    const oldEditorId = row._editorId;
    row.id = id.value.trim();
    row.label = label.value.trim();
    row.type = type.value;
    row.unit = unit.value.trim();
    row.allowNA = allowNA.checked;
    row.weight = Number(weight.value);
    row._editorId = String(row._categoryId || "") + "." + String(row.id || "");
    state.selectedControlId = row._editorId || oldEditorId;
  }

  [id, label, unit, allowNA, weight].forEach((input) => {
    input.addEventListener("input", () => {
      applyBasicChanges();
      actions.markDirty?.();
    });
    input.addEventListener("change", () => {
      applyBasicChanges();
      actions.markDirty?.();
    });
  });
  type.addEventListener("change", () => {
    applyBasicChanges();
    row.rules = defaultRulesForType(row.type);
    actions.markDirty?.();
    actions.showStatus?.("Rules editor reset for " + row.type + ". Save Device Checkup to persist the new structure.");
    actions.renderAll?.();
  });
  bindRuleInputs(rulesEditor, row, actions);

  const identityGroup = el("div", "form-grid form-grid--single selected-check-form");
  identityGroup.appendChild(el("h3", "rt-subtitle", "Check"));
  identityGroup.appendChild(makeField("Category", makeInput(row._categoryTitle || row._categoryId || "")));
  identityGroup.appendChild(makeField("ID", id));
  identityGroup.appendChild(makeField("Label", label));
  identityGroup.appendChild(makeField("Type", type));
  identityGroup.appendChild(makeField("Unit", unit));
  identityGroup.appendChild(makeCheckboxField("Allow N/A", allowNA));
  identityGroup.appendChild(makeField("Weight", weight));
  pane.appendChild(identityGroup);

  const rulesGroup = el("div", "form-grid form-grid--single");
  rulesGroup.appendChild(el("h3", "rt-subtitle", "Rules"));
  rulesGroup.appendChild(rulesEditor.node);
  pane.appendChild(rulesGroup);

  const actionsRow = el("div", "re-actions");
  const add = document.createElement("button");
  add.type = "button";
  add.className = "re-button re-button-add";
  add.textContent = "Add Check";
  add.addEventListener("click", () => {
    try {
      applyControlChanges();
      actions.addControl();
    } catch (error) {
      actions.showStatus?.(error.message, "error");
    }
  });
  actionsRow.appendChild(add);
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "re-button re-button-remove";
  remove.textContent = "Remove Check";
  remove.disabled = rows.length <= 1;
  remove.addEventListener("click", () => actions.removeControl(row._editorId || row.id));
  actionsRow.appendChild(remove);
  const save = document.createElement("button");
  save.type = "button";
  save.className = "re-button re-button-save";
  save.textContent = "Save Device Checkup";
  save.addEventListener("click", () => {
    try {
      applyControlChanges();
      actions.markDirty();
      actions.saveSelectedRiskAnalysis();
    } catch (error) {
      actions.showStatus?.(error.message, "error");
    }
  });
  actionsRow.appendChild(save);
  pane.appendChild(actionsRow);
  host.appendChild(pane);
}
