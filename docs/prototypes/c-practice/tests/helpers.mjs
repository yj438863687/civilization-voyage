import { readFile } from 'node:fs/promises';
import { newDraft, previewPlan, reveal, actOnReflection } from '../model.js';

export const scenario = JSON.parse(await readFile(new URL('../scenario.json', import.meta.url), 'utf8'));
export const response = '已对照结果，保留理由并继续核查。';

export function planned(planId = 'relief') {
  const d = newDraft(scenario);
  d.goal = '测试目标：比较轮休、交付与后续维护。';
  d.stage = 'plan';
  Object.assign(d.form, { planId, selectedMaterialIds: ['K1', 'S3'], reason: '依据 K1 和 S3 比较承担者与储备。', bearer: '下一班', expected: '核对本轮储备及维护缺口。' });
  return d;
}

export function reflecting(planId = 'relief', decision = 'keep') {
  const d = planned(planId);
  previewPlan(scenario, d);
  reveal(scenario, d);
  d.stage = 'reflect';
  Object.assign(d.reflectionDraft, { decision, insight: '新信息使我看见下一班的维护需求。', cost: '仍需说明承担代价的人。', response });
  return d;
}

export function finished(planId = 'relief', decision = 'keep') {
  const d = reflecting(planId, decision);
  actOnReflection(d);
  return d;
}
