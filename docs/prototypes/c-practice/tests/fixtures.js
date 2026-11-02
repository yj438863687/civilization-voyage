import { DRAFT_KEY, newDraft, previewPlan, reveal, actOnReflection } from '../model.js';

const s = await (await fetch('../scenario.json')).json();
const raw = document.querySelector('#raw'), status = document.querySelector('#status');
const isolated = location.hostname === '127.0.0.1' && location.port === '8766';
document.querySelector('#write').disabled = !isolated;
status.textContent = isolated ? '隔离地址已确认。' : '禁止写入：请使用 127.0.0.1:8766。';

function record() {
  const d = newDraft(s); d.goal = '测试：比较原方案与维护需求。'; d.stage = 'plan';
  Object.assign(d.form, {planId: 'relief', selectedMaterialIds: ['K1','S3'], reason: '依据 K1 与 S3 作出原安排。', bearer: '下一班', expected: '替班支出2，保留1单位。'});
  previewPlan(s, d); reveal(s, d); d.stage = 'reflect';
  Object.assign(d.reflectionDraft, {decision: 'revise', insight: '共同维护需2单位，原安排缺1单位。', cost: '下一班仍承担维护缺口。', response: '准备重新比较安排。'});
  return d;
}

document.querySelector('#load').addEventListener('click', () => {
  const name = document.querySelector('#fixture').value;
  let d = newDraft(s);
  if (name === 'broken') {raw.value = '{broken'; return;}
  if (name === 'field') d.form.reason = [];
  if (name === 'schema') d.schemaVersion = 99;
  if (['null-record','numeric-time','revision','null-v1-v2'].includes(name)) {
    d = record();
    if (name === 'revision' || name === 'null-v1-v2') actOnReflection(d);
    else { d.reflectionDraft.decision = 'keep'; actOnReflection(d); }
    if (name === 'null-v1-v2') {
      Object.assign(d.form, {planId: 'regular', reason: '比较后保留维护资源。', bearer: '货主', expected: '迟1格，储备3单位。'});
      previewPlan(s, d); d.planRecords[0] = null;
    }
    if (name === 'null-record') d.planRecords[0] = null;
    if (name === 'numeric-time') d.planRecords[0].createdAt = 123;
  }
  raw.value = JSON.stringify(d, null, 2);
});
document.querySelector('#write').addEventListener('click', () => {
  if (!isolated) return;
  localStorage.setItem(DRAFT_KEY, raw.value);
  location.href = '../';
});
document.querySelector('#read').addEventListener('click', () => {
  raw.value = localStorage.getItem(DRAFT_KEY) ?? '';
  status.textContent = '已读取测试存档；尚未写入。';
});
