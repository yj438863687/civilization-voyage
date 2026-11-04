import type { Story, PropKind, CrisisStage } from './stories';
import type { Look } from './encounters';
import { HISTORY_ROUTES, historyOutcome, historyRecap } from './voyageHistory';

const END_LOOK:Record<string,string>={'A-near':'libing','A-far':'jia','B-near':'zhan','B-far':'watt','C-near':'morse','C-far':'shannon','D-near':'wiener','D-far':'turing'};
const STAGE:Record<string,CrisisStage>={'A-near':'flood','A-far':'famine','B-near':'strike','B-far':'strike','C-near':'wire','C-far':'wire','D-near':'grant','D-far':'proposal'};
const LEGACY:Record<string,[string,string,string]>={'A-near':['flood','open','held'],'A-far':['famine','kept','shared'],'B-near':['strike','replaced','kept'],'B-far':['strike','replaced','kept'],'C-near':['repair','small','big'],'C-far':['repair','small','big'],'D-near':['grant','auto','confirm'],'D-far':['follow','stayed','went']};

export function applyHistoricalStories(stories:Record<string,Record<'near'|'far',Story>>,figures:Record<string,Look>){
  for(const [key,route] of Object.entries(HISTORY_ROUTES)){
    const [era,lane]=key.split('-') as [string,'near'|'far'];
    const story=stories[era][lane];
    story.title=route.title;story.logline=route.question;
    story.beats=story.beats.map((beat,index)=>({...beat,kicker:index===0?`起 · ${route.region} · ${route.period}`:`承 · ${route.islands[index-1].date}`,text:index===0?route.opening:`${route.islands[index-1].title}。${route.islands[index-1].paragraphs[1]}`,
      prop:(era==='B'&&lane==='near'?'huts':era==='C'?'poles':beat.prop) as PropKind}));
    story.crisis.id=route.crisis.id;story.crisis.kicker=`转 · ${route.crisis.title}`;story.crisis.stage=STAGE[key];
    story.crisis.cause=state=>`${route.crisis.date}。${historyRecap(route,state).slice(0,2).join(' ')} 这次要面对的是：${route.crisis.paragraphs[1]}`;
    const legacy=LEGACY[key];
    story.crisis.enc={...story.crisis.enc,historyId:route.crisis.id,who:route.crisis.who,role:`${route.crisis.date} · 情境与对话为创作`,line:route.crisis.paragraphs[1],dialog:[],social:undefined,
      game:{kind:'choice',ask:'眼前这件事，怎样安排？',options:route.crisis.options.map((option,index)=>({label:option.label,note:option.note,out:historyOutcome(route.crisis,index,{[legacy[0]]:legacy[index+1],...(key==='A-near'&&index===1?{stakes:'gap'}:{})})}))}};
    story.arrival=`${route.ending.date}。带着三站的经历，听${route.ending.name}回顾这一程。`;
    story.figure={name:route.ending.name,years:route.ending.date,deed:route.ending.deed,look:{...figures[END_LOOK[key]],...(key==='C-near'?{hat:'wrap',prop:'ledger'}:{}),...(key==='D-far'?{hat:'none',prop:'none'}:{})},
      monologue:[route.question,route.ending.reflection],speak:state=>[...historyRecap(route,state),route.ending.reflection],meaning:route.ending.reflection};
    story.spirit={word:({A:'共同生活',B:'劳动与进步',C:'连接与理解',D:'判断与责任'} as Record<string,string>)[era],line:route.question};
    story.concept={name:'技术与文明',explain:route.question};
    story.page=state=>[route.opening,...historyRecap(route,state),route.ending.reflection];
    story.art=state=>[...route.islands,route.crisis].map(scene=>String(state[`history:${scene.id}:label`]??'未记录安排')) as [string,string,string];
    story.artNames=[route.islands[0].who,route.islands[1].who,route.crisis.who];
  }
}
