import { HISTORY_ROUTES, type HistoryScene } from './history';

export type DemoRoute = 'light' | 'deep';
export type DemoRole = 'first' | 'second';
export type DemoAgent = 'research' | 'verify' | 'build';
export type DemoPriority = 'production' | 'community';
export const DEMO_MISSION = '技术让一座港城更强之后，怎样让更多人过得更好？';
export const DEMO_TEAM = [
  { id:'A', role:'玄览玄通 · 文化理解', topic:'航海、文化问题与人物对话', time:'2分30秒' },
  { id:'B', role:'和而不同 · 路径比较', topic:'轻装线、考察线与不同观点', time:'2分30秒' },
  { id:'C', role:'知行合一 · 文明重现', topic:'文化碎片、共同建城与反思', time:'2分30秒' },
  { id:'D', role:'产品与现场 Demo', topic:'操作四阶段，展示真实产物', time:'3分钟' },
  { id:'E', role:'AI 工具与商业 BP · 你', topic:'LLM、API、Agents、RAG与商业落地', time:'4分30秒' },
];
export const DEMO_ROUTES = {
  light: { name:'轻装线', cost:6, materialCount:2, description:'先得到能用的方向，再决定是否继续研究。', steps:['读取两份材料','做一次来源核对','生成一份建城方案'], costs:[['整备与调度',2],['资料整理',1],['来源核对',1],['建造规划',2]] as const },
  deep: { name:'考察线', cost:12, materialCount:3, description:'多看材料、比较反例，并保留尚未解决的问题。', steps:['整理三章真实记录','区分史实与创作','再问一个反例','比较两种安排'], costs:[['整备与调度',2],['资料整理',4],['来源与反例核对',4],['两方案比较',2]] as const },
};
export interface CultureChunk { id:string; title:string; date:string; text:string; nature:string; source:{title:string;url:string}; }
export const CULTURE_CORPUS: CultureChunk[] = Object.values(HISTORY_ROUTES).flatMap(route=>[...route.islands,route.crisis]).map((scene:HistoryScene)=>({id:scene.id,title:scene.title,date:scene.date,text:scene.paragraphs[0],nature:scene.nature,source:scene.source}));
function terms(text:string) {
  const normal=text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g,' '),result=new Set(normal.match(/[a-z0-9]+/g)??[]);
  for(const block of normal.match(/[\u4e00-\u9fff]+/g)??[])for(let index=0;index<block.length;index++){result.add(block[index]);if(index+1<block.length)result.add(block.slice(index,index+2));}
  return result;
}
export function retrieveCulture(query:string,limit=3):CultureChunk[] {
  const wanted=terms(query);if(!wanted.size)return [];
  return CULTURE_CORPUS.map(chunk=>{const title=terms(chunk.title),body=terms(chunk.text);let score=0;for(const term of wanted)if(title.has(term)||body.has(term))score+=(term.length>1?4:1)*(title.has(term)?2:1);return{chunk,score};}).filter(item=>item.score>=3).sort((a,b)=>b.score-a.score||a.chunk.id.localeCompare(b.chunk.id)).slice(0,limit).map(item=>item.chunk);
}
export interface DemoLedger { id:string; to:string; amount:number; }
export interface DemoAgentOutput { id:DemoAgent; title:string; text:string; sources:string[]; checks:string[]; }
export interface DemoState { step:number; mission:string; talks:{role:DemoRole;text:string;origin:string}[]; route:DemoRoute; paid:boolean; ledger:DemoLedger[]; outputs:DemoAgentOutput[]; fragments:CultureChunk[]; priority:DemoPriority; approved:boolean; reflection:string; }
export const freshDemo=():DemoState=>({step:0,mission:DEMO_MISSION,talks:[],route:'light',paid:false,ledger:[],outputs:[],fragments:[],priority:'community',approved:false,reflection:''});
export function demoBalance(state:DemoState){return 100-state.ledger.reduce((sum,item)=>sum+item.amount,0);}
export function bookDemoRoute(state:DemoState):DemoState {
  if(state.paid)return {...state,step:2};
  const route=DEMO_ROUTES[state.route];
  if(demoBalance(state)<route.cost)return state;
  return {...state,step:2,paid:true,ledger:route.costs.map(([to,amount],index)=>({id:`route-${index}`,to,amount}))};
}
export const DEMO_CREW:Record<DemoRole,{name:string;model:string;duty:string;script:string}>={
  first:{name:'资料核对',model:'Claude',duty:'追问依据',script:'先别急着把港城造大。我们先查：技术解决了什么，哪些只是传说或推演？把出处带上，最后由船长决定要信到哪一步。'},
  second:{name:'方案比较',model:'GPT',duty:'追问谁受影响',script:'我想多问一句：省下来的粮、时间和工钱，最后到了谁手里？先做一个能运行的方案，再比较工坊、学堂和普通人的生活怎样改变。'},
};
export function runDemoAgent(state:DemoState,id:DemoAgent,available?:CultureChunk[]):DemoState {
  const refreshing=id==='research'&&!!available?.slice(0,DEMO_ROUTES[state.route].materialCount).some(item=>!state.fragments.some(fragment=>fragment.id===item.id));
  if(!state.paid||(state.outputs.some(output=>output.id===id)&&!refreshing))return state;
  if(available&&(available.length===0||(id!=='research'&&available.length<3)))return state;
  if(id==='verify'&&!state.outputs.some(output=>output.id==='research'))return state;
  if(id==='build'&&!state.outputs.some(output=>output.id==='verify'))return state;
  let output:DemoAgentOutput,fragments=state.fragments;
  if(id==='research'){
    fragments=available?available.slice(0,DEMO_ROUTES[state.route].materialCount):retrieveCulture(`${state.mission} 都江堰 分水 工匠 学习`,DEMO_ROUTES[state.route].materialCount);
    output={id,title:'资料员 · 检索与整理',text:`从${available?'本航程实际完成的岛屿记录':'本地文化材料'}中整理${fragments.length}份片段。片段可以用于设计，不能把创作情境当成历史原貌。`,sources:fragments.map(item=>item.id),checks:fragments.map(item=>`${item.title} · ${item.date} · ${item.nature}`)};
  }else if(id==='verify'){
    const caution=fragments.filter(item=>!item.nature.includes('史实'));
    output={id,title:'复核员 · 区分依据与解释',text:state.route==='deep'?'考察线增加反例：修好设施不等于公平分配；生产更多也不自动带来学习机会。保留这两项未被技术直接解决的问题。':'核对每份材料的出处、年代与性质。轻装线完成一次核查，不能据此声称已经穷尽不同解释。',sources:fragments.map(item=>item.id),checks:[`已检查${fragments.length}份材料的来源字段`,caution.length?`${caution.length}份材料涉及传说或推演，仅作创作启发`:'材料属于史实背景，人物话语与建城方案仍为创作',...(state.route==='deep'?['反例一：有水路，谁来决定分水顺序？','反例二：工坊增产，学徒是否有机会学会维护？']:[])]};
  }else{
    output={id,title:'建造员 · 形成待批准方案',text:'把材料转成水渠、仓库、工坊、学堂与住屋。提供产能优先和共同生活两种安排；等船长批准后才建成港城。',sources:fragments.map(item=>item.id),checks:['技术设施与共同生活同时进入方案','人作最后决定，Agent不能自行签字','港城为游戏创作，不宣称复原任何历史城市']};
  }
  return {...state,fragments,outputs:id==='research'?[output]:[...state.outputs,output],approved:id==='research'?false:state.approved};
}
export function cityPlan(priority:DemoPriority){return priority==='community'?{canals:2,warehouses:2,workshops:1,schools:2,homes:5,label:'共同生活优先'}:{canals:1,warehouses:4,workshops:3,schools:1,homes:3,label:'产能优先'};}
export function demoReflection(state:DemoState){const plan=cityPlan(state.priority);return `本次选择${DEMO_ROUTES[state.route].name}，使用${DEMO_ROUTES[state.route].cost}份准备补给，核对${state.fragments.length}份材料；最终采用“${plan.label}”。港城表达这段航程的技术与共同生活安排，不再次结算。下一轮应继续追问：谁能使用技术，谁承担代价，哪些依据还不足？`;}
export function publicDemoSnapshot(state:DemoState,style:'ancient'|'modern'|'future'='ancient'){return {version:1,mode:'game-workspace',...state,city_style:style,preparation_supply:DEMO_ROUTES[state.route].cost,city:state.approved?cityPlan(state.priority):null,notice:'核对示例与建城方案为创作；准备补给来自游戏，真实API费用另账，不再次发放建城奖励。'};}
