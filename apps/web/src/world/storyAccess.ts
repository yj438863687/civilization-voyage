import { ISLAND_OFFSET, VILLAGE_OFFSET } from './fable';
import { encounterFor } from './encounters';
import { HULL_STYLES, STYLE_BY_SCENE } from './hull';
import type { FragmentPlace } from './world.config';
import type { Story } from './stories';

export function fragmentAnchor(fragment: FragmentPlace) {
  const island=!!encounterFor(fragment.id)?.stage;
  return { x:fragment.x+(island?ISLAND_OFFSET.x:0), z:fragment.z+(island?ISLAND_OFFSET.z:0) };
}
export function crisisAnchor(story: Story) {
  return {x:story.crisis.at.x+VILLAGE_OFFSET.x,z:story.crisis.at.z+VILLAGE_OFFSET.z};
}
/** 船头接近岸边就能登岛，不要求船中心驶上陆地。 */
export function storyReach(sceneId: string) {
  const hull=HULL_STYLES[STYLE_BY_SCENE[sceneId]??'junk'];
  return 5.5+hull.length/2+2;
}
export function inStoryReach(ship:{x:number;z:number},target:{x:number;z:number},sceneId:string) {
  return Math.hypot(ship.x-target.x,ship.z-target.z)<=storyReach(sceneId);
}
export function nearestFragment(world:{fragments:FragmentPlace[]},lane:string,ship:{x:number;z:number},sceneId:string,collected:string[]) {
  let found:FragmentPlace|null=null,best=Infinity;
  for(const fragment of world.fragments) {
    if(fragment.lane!=='both'&&fragment.lane!==lane)continue;
    const encounter=encounterFor(fragment.id),completed=collected.includes(fragment.id);
    if(completed&&!encounter?.history)continue;
    const target=fragmentAnchor(fragment),distance=Math.hypot(ship.x-target.x,ship.z-target.z);
    if(distance>(encounter?.stage?storyReach(sceneId):fragment.pickupRadius))continue;
    // 重叠范围优先未走过的故事；其余按最近的可见岛选择。
    const rank=distance+(completed?1000:0);
    if(rank<best){found=fragment;best=rank;}
  }
  return found?.id??null;
}
