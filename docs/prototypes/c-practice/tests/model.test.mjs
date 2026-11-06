import test from 'node:test';
import assert from 'node:assert/strict';
import { newDraft, restore, effects, previewPlan, reveal, actOnReflection, evidenceErrors, planErrors, reflectionErrors } from '../model.js';
import { renderPage } from '../views.js';
import { scenario as s, planned, reflecting, finished } from './helpers.mjs';

const roundTrip = d => restore(s, JSON.stringify(d));
const invalid = /草稿的数据或记录关联不完整/;

for (const [planId, expected] of Object.entries({ regular: [1, 0, 0, 3, 1, 0], rush: [0, 1, 0, 3, 1, 0], relief: [0, 0, 2, 1, 0, 1] })) {
  test(`rules and restore: ${planId}`, () => {
    const d = finished(planId);
    const e = effects(s, planId), o = d.maintenanceObservations[0];
    assert.deepEqual([e.deliveryDelay, e.originalCrewExtraDuty, e.reserveCost, e.reserveAfterPlan, o.remainingAfterMaintenance, o.maintenanceShortfall], expected);
    assert.deepEqual(roundTrip(d), d);
  });
}

test('empty and partial input remain incomplete', () => {
  assert.equal(evidenceErrors(s, ' \n\t', []).length, 3);
  const d = planned(); d.form.reason = ' '; d.form.bearer = '其他'; d.form.otherBearer = ''; d.form.expected = '';
  assert.equal(planErrors(s, d).length, 3);
  assert.equal(reflectionErrors({ decision: '', insight: '', cost: '', response: '' }).length, 4);
});

test('same plan with a valid keep reason seals one unchanged plan and one keep reflection', () => {
  const d = reflecting('relief', 'revise');
  const before = structuredClone(d.planRecords[0]);
  actOnReflection(d);
  Object.assign(d.form, { planId: 'relief', reason: '仍保留原安排，并交接下一班缺口。', selectedMaterialIds: ['K1', 'S2'] });
  previewPlan(s, d); previewPlan(s, d); actOnReflection(d); reveal(s, d);
  assert.equal(d.stage, 'final');
  assert.equal(d.planRecords.length, 1);
  assert.deepEqual(d.planRecords[0], before);
  assert.equal(d.reflections.length, 1);
  const r = d.reflections[0];
  assert.equal(r.decision, 'keep');
  assert.equal(r.response, '仍保留原安排，并交接下一班缺口。');
  assert.equal(r.basedOnPlanRecordId, before.id);
  assert.equal(r.resultPlanRecordId, before.id);
  assert.deepEqual(roundTrip(d), d);
});

test('v2 is a comparison from the initial reserve, with immutable v1 and correct links', () => {
  const d = reflecting('relief', 'revise');
  const before = structuredClone(d.planRecords[0]);
  actOnReflection(d);
  Object.assign(d.form, { ...planned('regular').form });
  previewPlan(s, d); previewPlan(s, d);
  assert.equal(d.stage, 'v2preview');
  assert.equal(d.planRecords.length, 2);
  assert.deepEqual(d.planRecords[0], before);
  assert.equal(d.planRecords[1].previousPlanRecordId, before.id);
  assert.equal(d.planRecords[1].effects.reserveAfterPlan, 3);
  assert.equal(d.reflections[0].resultPlanRecordId, d.planRecords[1].id);
  assert.deepEqual(roundTrip(d), d);
});

test('all reachable draft stages round-trip, including revealed preview and same-plan revision', () => {
  const d = planned();
  assert.deepEqual(roundTrip(newDraft(s)), newDraft(s));
  assert.deepEqual(roundTrip(d), d);
  previewPlan(s, d); assert.deepEqual(roundTrip(d), d);
  reveal(s, d); reveal(s, d); assert.equal(d.maintenanceObservations.length, 1); assert.deepEqual(roundTrip(d), d);
  d.stage = 'reflect'; assert.deepEqual(roundTrip(d), d);
  const revision = reflecting('relief', 'revise'); actOnReflection(revision);
  revision.form.planId = 'relief'; assert.deepEqual(roundTrip(revision), revision);
  const insufficient = finished('rush', 'insufficient');
  assert.deepEqual(roundTrip(insufficient), insufficient);
});

test('malformed JSON is rejected rather than replaced', () => {
  for (const raw of ['', '{broken', '{"schemaVersion":']) assert.throws(() => restore(s, raw), SyntaxError);
});

for (const [field, value] of [['schemaVersion', 2], ['schemaVersion', '1'], ['rulesVersion', '2.0'], ['scenarioId', 'other']]) {
  test(`incompatible ${field}=${value}`, () => {
    const d = newDraft(s); d[field] = value;
    assert.throws(() => roundTrip(d), /不兼容/);
  });
}

for (const [name, mutate] of [
  ['missing form', d => { delete d.form; }],
  ['wrong field type', d => { d.form.reason = []; }],
  ['unknown material', d => { d.form.selectedMaterialIds = ['K1', 'unknown']; }],
  ['duplicate material', d => { d.form.selectedMaterialIds = ['K1', 'K1']; }],
  ['forged effects', d => { d.planRecords[0].effects.reserveAfterPlan = 999; }],
  ['dangling selected record', d => { d.selectedPlanRecordId = 'plan-missing'; }],
  ['dangling reflection', d => { d.reflections[0].basedOnPlanRecordId = 'plan-missing'; }],
  ['missing observation', d => { d.maintenanceObservations = []; }],
  ['unrevealed final', d => { d.maintenanceRevealed = false; }],
  ['duplicate reflection', d => { d.reflections.push(structuredClone(d.reflections[0])); }],
  ['changed source', d => { d.handoff.origin = 'fabricated'; }],
  ['null record', d => { d.planRecords[0] = null; }],
  ['numeric plan timestamp', d => { d.planRecords[0].createdAt = 123; }],
  ['numeric reflection timestamp', d => { d.reflections[0].createdAt = 123; }],
]) {
  test(`reject corruption with a clear error: ${name}`, () => {
    const d = finished(); mutate(d);
    assert.throws(() => roundTrip(d), invalid);
  });
}

test('user text renders as text instead of executable HTML', () => {
  const d = finished();
  d.reflections[0].response = '<img src=x onerror="alert(1)">';
  const html = renderPage(s, d);
  assert.ok(html.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'));
  assert.ok(!html.includes('<img src=x'));
});

test('a null v1 in a two-version draft is rejected with an actionable error', () => {
  const d = reflecting('relief', 'revise'); actOnReflection(d);
  Object.assign(d.form, planned('regular').form); previewPlan(s, d);
  d.planRecords[0] = null;
  assert.throws(() => roundTrip(d), invalid);
});
