import type { VoyageStats } from './encounters';
export type ResourceFailure='supplies'|'trust'|'both';
export function resourceFailure(stats:Pick<VoyageStats,'supply'|'trust'>):ResourceFailure|null{
 if(stats.supply<=0&&stats.trust<=0)return 'both';
 if(stats.supply<=0)return 'supplies';
 if(stats.trust<=0)return 'trust';
 return null;
}
export const FAILURE_STORIES={
 supplies:{title:'断炊的航程',body:'粮食与饮水用尽，船必须停航。新的技术和更快的航速，都不能替代下一顿口粮。',cause:'补给已归零，船不能继续航行。'},
 trust:{title:'无人响应的号令',body:'一连串安排让船员不再相信这条航程。甲板空了，号令也没有人回应。船上的设备还在，愿意一起使用它们的人却离开了。',cause:'人心已归零，船员停止协作。'},
 both:{title:'空船回航',body:'船上既没有口粮，也没有愿意继续同行的人。这次航程留下的不是更远的目的地，而是被忽略的维持与合作。',cause:'补给与人心都已归零，这次航行无法继续。'},
} as const;
/** Only a still-active zero balance can pay for recovery. Repeated callbacks are no-ops. */
export function recoverVoyage(stats:VoyageStats,kind:ResourceFailure):VoyageStats{
 if(resourceFailure(stats)!==kind)return stats;
 const food=kind!=='trust',crew=kind!=='supplies';
 return {...stats,supply:food?35:stats.supply,trust:crew?30:stats.trust,
  hull:food?Math.max(0,stats.hull-20):stats.hull,shipLevel:food?Math.max(0,stats.shipLevel-1):stats.shipLevel,
  crewLevel:crew?Math.max(0,stats.crewLevel-1):stats.crewLevel,score:Math.max(0,stats.score-200),combo:0,setbacks:stats.setbacks+1,
  log:[...stats.log,FAILURE_STORIES[kind].title+'：紧急返航重整。降低得分与相应外观等级，保留本次故事选择。'].slice(-40)};
}
export function voyageVerdict(stats:VoyageStats):{title:string;body:string}{
 const failure=resourceFailure(stats);if(failure)return FAILURE_STORIES[failure];
 if(stats.trust<30)return {title:stats.supply>=60?'满舱而独行':'带着裂痕前行',body:'船还在走，船上的安排却少了愿意共同维护的人。技术扩大了收获，没有自动换来信任。'};
 if(stats.supply<15)return {title:'同行，却难以为继',body:'伙伴愿意留下，口粮却已接近耗尽。维持共同生活，也需要为明天保留物资。'};
 if(stats.trust>=55&&stats.supply>=20)return {title:stats.setbacks?'重整后的共同远行':'共同远行',body:stats.setbacks?'这次航程曾经中断。你付出代价重新安排物资与合作，才让船有机会继续前行。':'船上留有口粮，也有人愿意继续同行。新的本领与维持它的共同安排，一起留了下来。'};
 return {title:'仍需商量的下一程',body:'船有能力继续走，一些安排却还没有说定。下一程仍要决定，怎样让技术的便利与代价被共同看见。'};
}
