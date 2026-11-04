import type { Outcome } from './encounters';
import type { FableState } from './fable';
import { historyOutcome, type HistoryScene } from './history';
import type { ChallengeReport } from './challenges';
import { recordChallenge } from './storyArcs';

/** 技术操作与使用它的约定分别结算；失败的操作不能在回顾中被写成已完成。 */
export function challengeOutcome(scene: HistoryScene, option: number, state: FableState, work: ChallengeReport, selected?: number[]): Outcome {
  const base=historyOutcome(scene,option,state,selected);
  const quality=Math.max(0,Math.min(100,Math.round(work.quality)));
  const productivity=quality>=75?3:quality>=40?1:-2;
  const strain=Math.max(0,Math.min(6,work.strain));
  const label=base.set?.[`history:${scene.id}:label`]??scene.options[option===1?1:0].label;
  const action=quality>=60?base.text:`你决定「${label}」：${scene.options[option===1?1:0].note}。操作仍有未完成的部分，后人需要继续修补；这份约定也还要接受检验。`;
  const text=`${work.summary} ${action} ${quality>=75?'可靠的操作省下3份补给。':quality>=40?'已有的技术成果省下1份补给。':'修补未完成的操作用去2份补给。'}${strain?`疲劳、遗漏或额外暴露使人心减少${strain}点，已计入结算。`:''}`;
  return { ...base, supply:base.supply+productivity, trust:base.trust-strain, text,
    set:{...base.set,...recordChallenge(scene.id,{...work,quality}),[`history:${scene.id}:text`]:text,[`history:${scene.id}:label`]:label} };
}
