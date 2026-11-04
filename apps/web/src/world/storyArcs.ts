import type { FableState } from './fable';
import type { ChallengeReport } from './challenges';

interface Chapter { scene: string; objective: string; continuation: string }
export interface StoryArc { artifact: string; promise: string; cast: string; chapters: [Chapter,Chapter,Chapter]; ending: string }
export const STORY_ARCS: Record<string, StoryArc> = {
  'A-near': {
    artifact:'一张两岸分水图', cast:'筑堤人、开渠人和后来守水的乡民',
    promise:'替两岸找到一种既能过汛、又能一起种下去的办法。你沿年代翻阅由后人续写的分水图；人物衔接为创作，传说与战国工程分别说明。',
    chapters:[
      {scene:'A-water',objective:'发现堵水把危险推向邻村，画出第一条能试放水的渠。',continuation:'筑堤人带你走到堤外：堤内干着，邻村的苗却泡在水里。你先把河道摆上图，再决定这张图要不要交给两岸共同维护。'},
      {scene:'A-stake',objective:'接过旧图修复支渠，并定下两岸轮灌的约定。',continuation:'翻到下一页，后人把你留下的渠图带到了开渠工地。暴雨冲偏了一处弯口；图可以修好，谁先开闸却还没有约定。'},
      {scene:'A-n-flood',objective:'春汛检验前两站留下的工程本领与协修承诺。',continuation:'图本继续传到战国这一页。春汛将至，岸上要木料和粮，船也要继续走。你装进船舱的物资与留下的承诺，终于遇到同一次涨水。'},
    ],ending:'分水图从一个人的办法，变成两岸共同守护的工程。最后检验它的，既有河水，也有是否肯继续协作的人。',
  },
  'A-far': {
    artifact:'一册没有写完的仓单',cast:'管仓家庭、搬粮者与接班的书记员',
    promise:'让一季丰收不只剩在仓里，也能在欠收时找到等粮的人。相隔年代的片段由创作的仓单续页连接。',
    chapters:[
      {scene:'A-bone',objective:'装好种子与口粮，决定给共同储备留下多少。',continuation:'管仓人的孩子把第一袋大麦搬进来，问：留下来的粮，是为了明年播种，还是为了装船卖掉？先试着把它们妥善存起来。'},
      {scene:'A-granary',objective:'把仓里的粮与仓外的人一同写进可追查的记录。',continuation:'后人接过仓单，粮的数量写得很清楚，修渠家庭却只有一道空白。记录有了技术，名单还需要有人补全。'},
      {scene:'A-f-famine',objective:'用已有的储粮经验与名单，兑现欠收时的安排。',continuation:'这个冬天，仓门外来了仓单里那些家庭的后人。前面留下的种子、储粮办法和领粮约定，现在都要派上用场。'},
    ],ending:'仓库让粮食跨过季节，记录让承诺跨过交接；粮究竟给谁，仍要有人在仓门打开时负责。',
  },
  'B-near': {
    artifact:'一本从译稿长成施工图的工坊笔记',cast:'译员、刻工、学徒和后来修路的工程队',
    promise:'把“看懂别人的机器”变成“自己能修一条路”。笔记的代际传递是创作的连贯线索。',
    chapters:[
      {scene:'B-coal',objective:'拼回译稿，让陌生的零件有可核对的名字。',continuation:'译员把散页递给你。商人催船，码头学徒却还不懂图里的零件。他想抄一份，等以后亲手试装。'},
      {scene:'B-gauge',objective:'将工坊笔记排成能反复学习的印本。',continuation:'译稿来到刻工案头，上一站的问题被写在页边。你要先排出可读的学习顺序，再决定这本书要交给哪些人。'},
      {scene:'B-n-boiler',objective:'让学会的知识成为能通行、也能服务沿线的铁路。',continuation:'翻到1909年的续页，旧书旁添了勘测草图。工程队里有人曾从简本上学过识图。现在由你铺出一条能到站的线，再决定工人怎样交班。'},
    ],ending:'同一本笔记，先让机器被看懂，再让本领能传下去，最后成为土地上的路。技术的自立也需要人的成长。',
  },
  'B-far': {
    artifact:'一份逐页增加批注的工厂改造记录',cast:'作坊学徒、织工家庭与码头工人',
    promise:'完成一批订单，同时回答省下来的煤与时间怎样进入人的生活。代际人物连接为创作。',
    chapters:[
      {scene:'B-ticket',objective:'学会稳定做功，把节煤变成能验证的能力。',continuation:'学徒在改造记录上写了第一行：煤少烧一些，机器还能做多少活？你来试机，再决定把节余投向哪里。'},
      {scene:'B-shift',objective:'把机器的节奏排成人能承受的工班。',continuation:'记录传到纺织厂，订单比从前多了。织工家庭在页边添了一行：机器可以一直转，人不能。现在请你排六个时段。'},
      {scene:'B-f-strike',objective:'在交货压力下检验试机经验与劳动约定。',continuation:'交货日到了。上一站留下的疲劳会减少可用燃料，学过的操作能帮助你稳压。合同要交，原先答应的轮休也有人记得。'},
    ],ending:'改造没有在机器开动时结束。煤、货和工班表一起变化，才说明进步怎样进入了生活。',
  },
  'C-near': {
    artifact:'一本从接线图变成值班册的报房记录',cast:'线务学徒、来发家书的人与下一班报务员',
    promise:'让一根连到岸上的电线，最终成为有人会用、有人接班的公共联系。',
    chapters:[
      {scene:'C-screen',objective:'把线路接通，考虑沿途的小站是否也能接入。',continuation:'线务学徒拿来一张接线草图。图上只有两端的大站，中间村落还没标进去。请先把线路铺通。'},
      {scene:'C-dark',objective:'亲手把一句报平安的话变成可传送的编码。',continuation:'十年后的报房续用这份记录。来人递来一张“平安”的纸条，你先把它拍出去，再安排商单和求助信的先后。'},
      {scene:'C-n-wire',objective:'让下一班学得会、接得住线路上的人。',continuation:'记录翻到办学这一页。熟练报务员要走了，学徒带着前一站的编码笔记来值班。排班不能只填满窗口，还要留下教与学的时间。'},
    ],ending:'一条线的完成，要经历架通、用得起与有人接班。连接成为日常生活，靠的不只是电流。',
  },
  'C-far': {
    artifact:'一封被反复转送的求助信与它的线路记录',cast:'报房学徒、跨洋值班员和通信工程师',
    promise:'让求助不只跑得快，也能穿过距离与噪声被准确听见。信件在不同年代是创作的叙事接力。',
    chapters:[
      {scene:'C-relay',objective:'把 HELP 拍成电码，再决定谁先占用线路。',continuation:'报房学徒把一张写着HELP的纸放到桌上。这句话不长，等它的人却不能一直等。先亲手学会把它送出去。'},
      {scene:'C-tz',objective:'让同样的消息跨过大洋，并考虑中途的岛。',continuation:'线路记录传到铺缆船。求助已经能越过陆地，现在要越过海。小岛请求接入，会让这条线更长。'},
      {scene:'C-f-wire',objective:'在受损信号中恢复内容，再分配有限容量。',continuation:'工程师翻到记录最后一页：速度已有了，噪声仍会改变字句。他把同一信号的三份副本交给你，看看怎样减少误读。'},
    ],ending:'同一句求助，经过编码、线路和校验才可靠到达。到达以后，仍需要有人为它留一个被听见的位置。',
  },
  'D-near': {
    artifact:'一本会被船员改写的自动调度规程',cast:'调度员、登记员与未来的轮值船长',
    promise:'把效率目标写成可用的安排，再给数据与自动决策划出边界。未来一页明确为推演。',
    chapters:[
      {scene:'D-log',objective:'看见只追总量的排班如何影响不同的人。',continuation:'调度员交来第一版表格：总量算得很好，谁连续值班却没算。你来试着补齐目标，再决定新系统怎样进入工人的一天。'},
      {scene:'D-skip',objective:'让系统只拿完成任务所需的数据。',continuation:'规程里多了一张数据申请单。上一站需要的值班信息旁，添了住址与通讯录。能采集的东西，是否都该进入系统？'},
      {scene:'D-n-grant',objective:'在未来的改航事件里落实复核与负责的约定。',continuation:'翻到2035年的推演页。船长照着这本规程值班，系统却略过了一座求援小港。你先核对三份证据，再履行此前写下的边界。'},
    ],ending:'规程不是一次写完的。能力更强以后，仍要让人能知情、参与、复核和接管。',
  },
  'D-far': {
    artifact:'一册“表现与证据”的实验札记',cast:'对话实验助理、棋手与船队评估员',
    promise:'亲手试出表现、能力与责任之间的差别，再给一次新用途的试航定条件。',
    chapters:[
      {scene:'D-weight',objective:'用不同提问试出规则程序的回应边界。',continuation:'札记先记下图灵提出的问题，再来到ELIZA的演示室。助理不让你只听介绍，请你自己问几句，看看理解的感觉从哪里来。'},
      {scene:'D-star',objective:'在规则清楚的棋盘上取得一份可检查的证据。',continuation:'札记翻到2016年的棋局一页。这里的能力不靠说得动听，可以按规则试出来。你先走一手教学棋，再决定它是否说明另一领域的可靠。'},
      {scene:'D-f-proposal',objective:'在演示合同里区分已有证据与尚待验证的用途。',continuation:'札记被带到船队的评估桌上。赞助人愿付钱看一次自动航行，棋局和对话记录都在，却都不是复杂海况试验。现在请你逐项核查。'},
    ],ending:'札记最后没有只写“相信”或“不相信”。它写下相信什么、证据到哪里、越界以后由谁负责。',
  },
};
export function arcForScene(sceneId: string): { arc: StoryArc; chapter: Chapter; index: number; key: string } | null {
  for (const [key, arc] of Object.entries(STORY_ARCS)) { const index=arc.chapters.findIndex(chapter=>chapter.scene===sceneId); if(index>=0)return {arc,chapter:arc.chapters[index],index,key}; }
  return null;
}
export function workSummary(sceneId: string, state: FableState) { return state[`work:${sceneId}:summary`] ?? ''; }
export function recordChallenge(sceneId: string, report: ChallengeReport): FableState {
  return { [`work:${sceneId}:quality`]:String(report.quality), [`work:${sceneId}:summary`]:report.summary, [`work:${sceneId}:plan`]:report.plan, [`work:${sceneId}:strain`]:String(report.strain) };
}

/** 结尾只承认本次确实留下的本领和安排，失败与分歧也有自己的最后一页。 */
export function arcEnding(arc: StoryArc, state: FableState): string {
  const completed=arc.chapters.filter(chapter=>!!state[`history:${chapter.scene}`]);
  const reliable=arc.chapters.filter(chapter=>Number(state[`work:${chapter.scene}:quality`]??0)>=60);
  const shared=arc.chapters.filter(chapter=>state[`history:${chapter.scene}`]==='care');
  if(completed.length===3&&reliable.length===3&&shared.length>=2)return arc.ending;
  const technique=reliable.length===3?'三章留下了可继续使用的技术记录。':`${reliable.length}/3章留下了较可靠的技术记录，其余操作还有待修补。`;
  const arrangement=shared.length>=2?'沿途有人愿意共同维护，但愿望还需要可靠的操作兑现。':shared.length===1?'一章选择了共同安排，其他承诺还没有形成连续的规则。':'你大多保留了眼前的物资或既有安排，共同维护的约定尚未建立。';
  return `${arc.artifact}留下了这一程的实际记录。${technique}${arrangement}这份记录会继续提醒后来的人：有了本领，还要商量怎样一起使用；作出约定，也还要把事情做成。`;
}
