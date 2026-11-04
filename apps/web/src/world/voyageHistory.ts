import routes from './voyageHistory.json';
import type { Encounter, Outcome } from './encounters';
import type { FableState } from './fable';

export interface HistoricalOption {label:string;note:string;text:string;supply:number;trust:number}
export interface HistoricalScene {id:string;title:string;date:string;year:number|null;who:string;image:string;nature:string;paragraphs:string[];source:{title:string;url:string};options:HistoricalOption[]}
export interface HistoricalRoute {title:string;region:string;period:string;question:string;opening:string;islands:HistoricalScene[];crisis:HistoricalScene;ending:{name:string;date:string;year:number;deathYear:number|null;fictional:boolean;deed:string;image:string;reflection:string;source?:{title:string;url:string}}}
export const HISTORY_ROUTES:Record<string,HistoricalRoute>=routes;
export const historyFor=(era:string|undefined,lane:string)=>HISTORY_ROUTES[`${era}-${lane}`]??null;
export function historyScene(id:string):HistoricalScene|null {
  for(const route of Object.values(HISTORY_ROUTES)){const scene=[...route.islands,route.crisis].find(item=>item.id===id);if(scene)return scene;}
  return null;
}
export function historyOutcome(scene:HistoricalScene,index:number,legacySet:Record<string,string>={}):Outcome {
  const choice=scene.options[index];
  return {skillSucceeded:true,text:choice.text,supply:choice.supply,trust:choice.trust,set:{...legacySet,[`history:${scene.id}`]:index===1?'care':'fast',[`history:${scene.id}:label`]:choice.label,[`history:${scene.id}:text`]:choice.text}};
}
export function historyRecap(route:HistoricalRoute,state:FableState):string[] {
  return [...route.islands,route.crisis].map(scene=>`${scene.date}，${scene.title}：${state[`history:${scene.id}:text`]??'这段旧记录没有保留具体安排，可从本次日志回看。'}`);
}
/** Earlier cooperation returns materials in the next chapter; never a second payout. */
export function supportedEncounter(enc:Encounter,state:FableState):Encounter {
  if(!enc.historyId)return enc;
  const route=Object.values(HISTORY_ROUTES).find(item=>[...item.islands,item.crisis].some(scene=>scene.id===enc.historyId));
  const scenes=route?[...route.islands,route.crisis]:[],index=scenes.findIndex(scene=>scene.id===enc.historyId);
  if(index<1||state[`history:${scenes[index-1].id}`]!=='care')return enc;
  const support=(out:Outcome):Outcome=>({...out,supply:out.supply+3,text:out.text+' 上一站留下的合作省回了3份补给。',set:{...out.set,[`history:${enc.historyId}:supported`]:'yes'}});
  return {...enc,line:'上一站愿意合作的人帮忙准备了工料，这一站可省回3份补给。 '+enc.line,
    game:enc.game.kind==='choice'?{...enc.game,options:enc.game.options.map(option=>({...option,out:support(option.out)}))}:enc.game,
    social:enc.social?{...enc.social,options:enc.social.options.map(option=>({...option,out:support(option.out)}))}:undefined};
}
