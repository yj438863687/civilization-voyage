import { useRef } from 'react';
import { localize } from '../i18n';
import type { VoyageStats } from '../world/encounters';
import { FAILURE_STORIES, type ResourceFailure } from '../world/consequences';
import { useModalFocus } from './useModalFocus';
import './resource-consequences.css';
export function ResourceConsequences({kind,stats,busy,error,onRecover,onEnd}:{kind:ResourceFailure;stats:VoyageStats;busy:boolean;error:string|null;onRecover:()=>void;onEnd:()=>void}){
 const panel=useRef<HTMLDivElement>(null);useModalFocus(panel);const story=FAILURE_STORIES[kind];
 return <div className="resource-ending" role="dialog" aria-modal="true" aria-label={localize('航程中断')}><div className="resource-ending-paper" ref={panel} tabIndex={-1}>
  <p className="resource-ending-state">{localize('航程中断 · 本次选择已保留')}</p><h1>{localize(story.title)}</h1><p>{localize(story.body)}</p>
  <div className="resource-ending-balances"><span>{localize('补给')} <strong>{stats.supply}</strong></span><span>{localize('人心')} <strong>{stats.trust}</strong></span></div>
  <p>{localize(story.cause)}</p><h2>{localize('返航重整的代价')}</h2>
  <ul><li>{localize('得分减少200（最低为0），连击清零。')}</li>
   {kind!=='trust'&&<li>{localize('补给恢复至35；船身耐久减少20（最低为0），船体整修降低一级。')}</li>}
   {kind!=='supplies'&&<li>{localize('人心恢复至30；船员行装降低一级，需重新积累信任。')}</li>}
   <li>{localize('等级最低为0。返航回到出发水域，已经做过的故事选择不重置。')}</li></ul>
  <div className="resource-ending-actions"><button type="button" disabled={busy} onClick={onRecover}>{localize(busy?'正在处理…':'接受代价，返航重整')}</button><button type="button" disabled={busy} onClick={onEnd}>{localize('以这个结局结束航程')}</button></div>
  {error&&<p className="error" role="alert">{localize(error)}</p>}
 </div></div>;
}
export function ResourceWarning({stats}:{stats:VoyageStats}){
 if(resourceAtRisk(stats)===false)return null;
 return <div className="resource-warning" role="status"><strong>{localize('航程警告')}</strong>{stats.supply<=15&&<span>{localize('补给不多于15：航速降低30%；归零后停航，返航重整会损失耐久、整修等级与得分。')}</span>}{stats.trust<=20&&<span>{localize('人心不多于20：合作支援暂停；归零后船员停止协作，重整会损失行装等级与得分。')}</span>}</div>;
}
function resourceAtRisk(stats:VoyageStats){return stats.supply>0&&stats.trust>0&&(stats.supply<=15||stats.trust<=20);}
