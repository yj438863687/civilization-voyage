import type { Encounter, Look, Stage, Outcome } from './encounters';
import { HISTORY_ROUTES, historyOutcome } from './voyageHistory';

const DIALOGUES:Record<string,string[]>={
  'A-bone':['余粮为什么不都装船？','修渠的人要吃，明年播种也要留。装走以后，谁替我们守这条渠？','先替仓里清点一遍吧。','清点完，再决定给共同储备留下多少。'],
  'A-granary':['仓单上的数都对，为什么还有人等？','交粮者有印记，搬粮和修渠的人却没列进来。','那就把漏掉的人也查一遍？','要多花一点工时。请先收齐这些仓单，别把漏记的空白当成已经领过。'],
  'B-ticket':['煤省下来了，为什么不多接订单？','新人还不会检修。炉火烧得更久，故障也不会自己消失。','我先帮你稳住压力。','等机器稳下来，再商量节余是用来接单，还是维护和带新人。'],
  'B-shift':['机器转得快，孩子就能早点走吗？','还得有人替班，有人付那份工资。法律给了要求，班表仍要有人排。','多花的这份钱，从哪里来？','这次船队得少拿些货款。你先帮我们点清工料，再决定要不要付出。'],
  'C-screen':['电缆接通以后，谁能先发消息？','商单有人付钱，求医和家书也在等。线路快，不会替我们排顺序。','先把缆稳住，再来商量？','好。缆不松也不断，才有接下来那份安排。'],
  'C-dark':['津沪之间能通电报了，窗外为什么还在等？','价高的货单排满了。求援要核地名，家书也要有人转送。','照价排最省事吧？','省事，可有人一直等不到。今天先发谁，由你来安排。'],
  'C-relay':['按下电键，对面就能读懂吗？','先把字变成点和划，再逐个校验。快还不够，要收到同一句话。','求援和货单一起到，怎么办？','先试着把信号送对，再决定给谁留一个先发的位置。'],
  'C-tz':['跨过大洋，还会有人接不到吗？','两岸通了，小岛还得等船带信。绕过去接一段线，要多付工料。','先拉稳这一段？','拉稳了，再决定这张通信图要不要给小岛留个位置。'],
  'D-log':['表里产量很好，为什么有人不放心？','连续值班和学本领的时间没算进去。新系统能算，也需要我们告诉它该顾及什么。','今天先按哪张表走？','先保证运转，或多花一份工钱培训和调班，都有眼前的代价。'],
  'D-skip':['排一次班，为什么还要住址和通讯录？','申请单列得多，完成任务用到的却没有那么多。','多接一些资料，就一定更好吗？','先讲清楚用途与范围，再决定采用现成表格，还是重新核对需要的项目。'],
  'D-star':['它听起来像是懂我的话。','你再看看记录：它核实了什么，还是把你的句子换了一种问法？','演示时要不要说明这个区别？','先辨清这些回应，再决定只展示流畅回答，还是连同局限一起讲。'],
  'D-weight':['一手好棋，能说明什么？','棋盘有规则，棋谱也能检查。那份能力，是真的值得认真看的。','那能直接替船选航线吗？','海上的证据还没做。你先挑出有根据的记录，再决定要不要花物资另作试验。'],
};
const VISUALS:Record<string,[string,string,string]>={
  'A-water':['stakes','closed','gap'],'A-bone':['jars','low','full'],'A-granary':['tally','missed','full'],
  'B-coal':['eyes','half','open'],'B-gauge':['book','shelved','printed'],'C-dark':['warning','off','kept'],
  'D-log':['log','hidden','shown'],'D-skip':['alarm','held','reported'],'D-star':['eliza','stayed','left'],
};
const TEMPLATE:Record<string,string>={'B-coal':'B-ticket','B-gauge':'B-shift','B-ticket':'A-stake','B-shift':'A-bone','C-relay':'A-bone','C-tz':'C-screen'};
const STAGES:Record<string,Stage>={'A-bone':'jars','A-granary':'tally','B-coal':'books','B-gauge':'press','B-ticket':'engine','B-shift':'loom','C-dark':'telegraph','C-relay':'telegraph','C-tz':'landing','D-log':'terminal','D-skip':'terminal'};
const LOOKS:Record<string,string>={'A-bone':'elder','A-granary':'elder','B-coal':'lin','B-gauge':'wei','B-ticket':'muleteer','B-shift':'weaver','C-relay':'operator','C-tz':'lineman','D-log':'operator2','D-skip':'recorder'};

export function enrichHistoricalEncounters(encounters:Record<string,Encounter>,looks:Record<string,Look>) {
  const original=Object.fromEntries(Object.entries(encounters).map(([id,enc])=>[id,{...enc}]));
  for(const route of Object.values(HISTORY_ROUTES))for(const scene of route.islands){
    const id=scene.id,template=original[TEMPLATE[id]??id],enc=encounters[id];
    Object.assign(enc,template,{historyId:id,who:scene.who,role:`${scene.date} · ${scene.nature} · 对话为创作`,line:scene.paragraphs[1]});
    if(STAGES[id])enc.stage=STAGES[id];if(LOOKS[id])enc.look={...looks[LOOKS[id]]};
    if(id==='C-relay')enc.look={...enc.look,hat:'cap'};
    if(DIALOGUES[id])enc.dialog=DIALOGUES[id].map((text,index)=>index%2?{them:text}:{you:text});
    const options=scene.options.map((option,index)=>{
      const visual=VISUALS[id],out=historyOutcome(scene,index,visual?{[visual[0]]:visual[index+1]}:{});
      return {label:option.label,note:option.note,out};
    });
    if(['A-water','B-gauge','C-dark','D-log','D-skip'].includes(id)){
      enc.game={kind:'choice',ask:'这一次，怎样安排？',options};enc.social=undefined;
    }else{
      if(id==='A-bone')enc.game={kind:'catch',verb:'收好粮袋',good:'大麦',bad:'漏粮',need:8,secs:10};
      if(id==='A-granary')enc.game={kind:'rhythm',verb:'核对仓单',label:'依次核对四处记录',beats:4,speed:.85};
      if(id==='B-ticket')enc.game={kind:'hold',verb:'稳住汽压',label:'把压力稳在可工作的范围',band:[.42,.62],secs:3.2,drift:.42};
      if(id==='B-shift')enc.game={kind:'catch',verb:'清点交班工料',good:'工料',bad:'废料',need:7,secs:10};
      if(id==='C-relay')enc.game={kind:'rhythm',verb:'逐字校验',label:'依次送对四段信号',beats:4,speed:.85};
      if(id==='D-star')enc.game={kind:'catch',verb:'核对演示记录',good:'可核对的记录',bad:'听着像懂了',need:6,secs:10};
      if(id==='D-weight')enc.game={kind:'catch',verb:'核对棋谱',good:'棋谱证据',bad:'跨界断言',need:6,secs:10};
      const skill=(won:boolean):Outcome=>({skillSucceeded:won,text:won?'操作完成了。接下来要决定怎样使用这份本领。':'这次操作还不熟练。眼前的安排，仍需要你决定。',supply:won?4:0,trust:0,set:{[`skill:${id}`]:won?'complete':'unfinished',...(id==='A-bone'?{jars:won?'full':'low'}:{}),...(id==='A-granary'?{tally:won?'full':'missed'}:{}),...(id==='D-weight'?{move:won?'seen':'blurred'}:{}),...(id==='A-stake'?{gate:won?'even':'tilt'}:{}),...(id==='C-screen'||id==='C-tz'?{cable:won?'landed':'snapped'}:{}),...(id==='B-ticket'?{machine:won?'yes':'no'}:{})}});
      enc.win=skill(true);enc.lose=skill(false);enc.social={ask:'技术试过了，这份成果怎样用？',options};
    }
  }
}
