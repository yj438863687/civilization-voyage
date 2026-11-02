// Direct results are sealed with each plan. Maintenance is a later observation of that plan.
export const DRAFT_KEY = "civilization-voyage.c-practice.steam-port";
export const bearers = ["货主", "原班船员", "下一班", "其他"];
export const decisions = ["revise", "keep", "insufficient"];
const stages = ["materials", "plan", "preview", "reflect", "revise", "v2preview", "final"];
const emptyReflection = () => ({ decision: "", insight: "", cost: "", response: "" });

function newForm(ids = []) {
  return { planId: "", selectedMaterialIds: [...ids], reason: "", bearer: "", otherBearer: "", expected: "" };
}

export function newDraft(s) {
  return {
    schemaVersion: s.schemaVersion, moduleRole: s.moduleRole, scenarioId: s.scenarioId,
    scenarioVersion: s.scenarioVersion, rulesVersion: s.rulesVersion, question: s.question,
    materials: structuredClone(s.materials), upstreamViews: structuredClone(s.upstreamViews),
    handoff: structuredClone(s.handoff), goal: "", initialGoal: null, stage: "materials",
    selectedPlanRecordId: null, maintenanceRevealed: false, planRecords: [],
    maintenanceObservations: [], reflections: [], form: newForm(), reflectionDraft: emptyReflection()
  };
}

const entered = value => typeof value === "string" && value.trim().length > 0;
const owns = (obj, key) => Object.hasOwn(obj, key);
const validIds = (s, ids) => Array.isArray(ids) && new Set(ids).size === ids.length &&
  ids.every(id => typeof id === "string" && owns(s.materials, id));

export function evidenceErrors(s, goal, ids) {
  const errors = [];
  if (!entered(goal)) errors.push("请写下你本轮优先考虑的目标。");
  if (!ids.includes("K1")) errors.push("请加入 K1 课程概念卡。");
  if (!ids.some(id => s.materials[id]?.type === "案例设定")) errors.push("请至少加入一张情境卡（S1、S2 或 S3）。");
  return errors;
}

export function planErrors(s, d) {
  const f = d.form;
  const errors = evidenceErrors(s, d.goal, f.selectedMaterialIds);
  if (!owns(s.plans, f.planId)) errors.push("请选择一种安排。");
  const samePlan = d.stage === "revise" && f.planId === d.planRecords[0].planId;
  if (!entered(f.reason)) errors.push(samePlan ? "请写下保持原安排的理由。" : "请写明所选材料怎样影响你的安排。");
  if (!samePlan) {
    if (!bearers.includes(f.bearer)) errors.push("请选择你认为主要承担代价的人。");
    if (f.bearer === "其他" && !entered(f.otherBearer)) errors.push("请补充其他承担者的身份。");
    if (!entered(f.expected)) errors.push("请写下一句预期影响。");
  }
  return errors;
}

export function reflectionErrors(r) {
  const errors = [];
  if (!entered(r.insight)) errors.push("请说明哪项结果让你重新审视原先的判断。");
  if (!entered(r.cost)) errors.push("请写下谁仍承担什么代价。");
  if (!decisions.includes(r.decision)) errors.push("请选择修改、保持或证据不足。");
  if (!entered(r.response)) errors.push(({revise:"请说明为什么要换一种安排。", keep:"请说明为什么仍保持原安排。", insufficient:"请写明还需要哪种材料。"}[r.decision]) || "请说明你打算如何回应。");
  return errors;
}

function inputs(s, planId) {
  const p = s.plans[planId];
  return { rulesVersion: s.rulesVersion, initialReserve: s.rules.initialReserve, deliveryWindow: s.rules.deliveryWindow,
    deliveryDelay: p.deliveryDelay, originalCrewExtraDuty: p.originalCrewExtraDuty, reliefCrewCalled: p.reliefCrewCalled, reserveCost: p.reserveCost };
}

export function effects(s, planId) {
  const rule = inputs(s, planId);
  return { deliveryDelay: rule.deliveryDelay, originalCrewExtraDuty: rule.originalCrewExtraDuty,
    reliefCrewCalled: rule.reliefCrewCalled, reserveCost: rule.reserveCost, reserveAfterPlan: rule.initialReserve - rule.reserveCost };
}

function maintenance(s, record) {
  const available = record.effects.reserveAfterPlan;
  const need = s.rules.maintenanceNeed;
  return { planRecordId: record.id, rulesVersion: s.rulesVersion, maintenanceNeed: need,
    remainingAfterMaintenance: Math.max(0, available - need), maintenanceShortfall: Math.max(0, need - available) };
}

export function issues(record, obs) {
  const e = record.effects;
  const remaining = [];
  if (e.deliveryDelay) remaining.push(`货主仍需多等 ${e.deliveryDelay} 格。`);
  if (e.originalCrewExtraDuty) remaining.push(`原班船员仍需额外执勤 ${e.originalCrewExtraDuty} 格。`);
  if (e.reliefCrewCalled) remaining.push("替班组接手了本轮额外工作。");
  if (obs.maintenanceShortfall) remaining.push(`下一班的维护资源仍缺 ${obs.maintenanceShortfall} 单位。`);
  return remaining;
}

function makeRecord(s, d) {
  const f = d.form, first = d.planRecords[0];
  return { id: "plan-" + crypto.randomUUID(), version: first ? 2 : 1, previousPlanRecordId: first?.id ?? null,
    planId: f.planId, selectedMaterialIds: [...f.selectedMaterialIds], reason: f.reason.trim(),
    bearer: f.bearer, otherBearer: f.bearer === "其他" ? f.otherBearer.trim() : "", expected: f.expected.trim(),
    createdAt: new Date().toISOString(), ruleInputs: inputs(s, f.planId), effects: effects(s, f.planId) };
}

function appendReflection(d, decision, response) {
  const r = d.reflectionDraft;
  const current = d.planRecords.at(-1);
  const observation = d.maintenanceObservations.at(-1);
  const entry = { id: "reflection-" + crypto.randomUUID(), basedOnPlanRecordId: d.planRecords[0].id, resultPlanRecordId: current.id,
    decision, insight: r.insight.trim(), cost: r.cost.trim(), response: response.trim(), unresolvedIssues: issues(current, observation),
    createdAt: new Date().toISOString() };
  if (decision === "insufficient") entry.unresolvedIssues.push("待补材料：" + entry.response);
  d.reflections.push(entry);
  d.reflectionDraft = { decision, insight: entry.insight, cost: entry.cost, response: entry.response };
  d.form = Object.fromEntries(Object.keys(newForm()).map(k => [k, structuredClone(current[k])]));
}

export function previewPlan(s, d) {
  if (!["plan", "revise"].includes(d.stage) || planErrors(s, d).length) return;
  if (d.stage === "revise" && d.form.planId === d.planRecords[0].planId) {
    appendReflection(d, "keep", d.form.reason);
    d.stage = "final";
    return;
  }
  const record = makeRecord(s, d);
  d.planRecords.push(record);
  d.selectedPlanRecordId = record.id;
  if (record.version === 1) {
    d.initialGoal = d.goal.trim();
    d.goal = d.initialGoal;
    d.stage = "preview";
  } else {
    d.maintenanceObservations.push(maintenance(s, record));
    appendReflection(d, "revise", d.reflectionDraft.response);
    d.stage = "v2preview";
  }
}

export function reveal(s, d) {
  if (d.stage !== "preview" || d.maintenanceRevealed) return;
  d.maintenanceRevealed = true;
  d.maintenanceObservations.push(maintenance(s, d.planRecords[0]));
}

export function actOnReflection(d) {
  if (d.stage !== "reflect" || reflectionErrors(d.reflectionDraft).length) return;
  if (d.reflectionDraft.decision === "revise") {
    d.form = newForm(d.planRecords[0].selectedMaterialIds);
    d.stage = "revise";
  } else {
    appendReflection(d, d.reflectionDraft.decision, d.reflectionDraft.response);
    d.stage = "final";
  }
}

// Compare JSON values independently of object property order.
function equal(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(k => owns(b, k) && equal(a[k], b[k]));
}

function requireValue(ok) {
  if (!ok) throw new Error("草稿的数据或记录关联不完整。");
}

function validForm(s, f) {
  return f && Object.keys(newForm()).filter(k => k !== "selectedMaterialIds").every(k => typeof f[k] === "string") &&
    (f.planId === "" || owns(s.plans, f.planId)) && (f.bearer === "" || bearers.includes(f.bearer)) && validIds(s, f.selectedMaterialIds);
}

export function restore(s, raw) {
  const d = JSON.parse(raw);
  requireValue(d && typeof d === "object");
  if (!["schemaVersion","moduleRole","scenarioId","scenarioVersion","rulesVersion"].every(k => d[k] === s[k])) {
    throw new Error("本机草稿的格式、情境或规则版本与当前演练不兼容。");
  }
  requireValue(["question","materials","upstreamViews","handoff"].every(k => equal(d[k], s[k])));
  requireValue(stages.includes(d.stage) && typeof d.goal === "string" && typeof d.maintenanceRevealed === "boolean");
  requireValue(validForm(s, d.form) && d.reflectionDraft && Object.keys(emptyReflection()).every(k => typeof d.reflectionDraft[k] === "string"));
  requireValue(d.reflectionDraft.decision === "" || decisions.includes(d.reflectionDraft.decision));
  requireValue(Array.isArray(d.planRecords) && Array.isArray(d.maintenanceObservations) && Array.isArray(d.reflections));
  const records = d.planRecords, first = records[0], last = records.at(-1);
  const finished = d.stage === "v2preview" || d.stage === "final";
  const hasPlan = !["materials","plan"].includes(d.stage);
  requireValue(hasPlan ? records.length >= 1 && records.length <= 2 && entered(d.initialGoal) && d.goal === d.initialGoal :
    records.length === 0 && d.initialGoal === null);
  requireValue(d.selectedPlanRecordId === (last?.id ?? null) && new Set(records.map(p => p.id)).size === records.length);
  for (const [i, p] of records.entries()) {
    requireValue(p && entered(p.id) && p.id.startsWith("plan-") && p.version === i + 1 && p.previousPlanRecordId === (i ? first.id : null));
    requireValue(validForm(s, p) && owns(s.plans, p.planId) && !planErrors(s, { stage: "plan", form: p, goal: d.goal }).length);
    requireValue(Number.isFinite(Date.parse(p.createdAt)) && equal(p.ruleInputs, inputs(s, p.planId)) && equal(p.effects, effects(s, p.planId)));
  }
  requireValue(d.maintenanceRevealed ? hasPlan && d.maintenanceObservations.length === records.length :
    d.maintenanceObservations.length === 0 && ["materials","plan","preview"].includes(d.stage));
  requireValue(d.maintenanceObservations.every((o, i) => equal(o, maintenance(s, records[i]))));
  requireValue(d.reflections.length === (finished ? 1 : 0));
  requireValue(records.length < 2 || finished);
  if (records.length === 2) requireValue(last.planId !== first.planId);
  requireValue(d.stage !== "v2preview" || records.length === 2);
  if (d.stage === "revise") requireValue(d.reflectionDraft.decision === "revise" && !reflectionErrors(d.reflectionDraft).length);
  if (finished) {
    const r = d.reflections[0];
    requireValue(r && entered(r.id) && r.id.startsWith("reflection-") && Number.isFinite(Date.parse(r.createdAt)) && !reflectionErrors(r).length);
    requireValue(r.basedOnPlanRecordId === first.id && r.resultPlanRecordId === last.id && (r.decision === "revise") === (records.length === 2));
    const pending = issues(last, d.maintenanceObservations.at(-1));
    if (r.decision === "insufficient") pending.push("待补材料：" + r.response);
    requireValue(equal(r.unresolvedIssues, pending) && Object.keys(emptyReflection()).every(k => d.reflectionDraft[k] === r[k]));
    requireValue(Object.keys(newForm()).every(k => equal(d.form[k], last[k])));
  }
  return d;
}
