import { HISTORY_ROUTES, routeRecap } from './history';
import type { FableState } from './fable';

/**
 * 每条航线自己的落印：港口那一下，要把你在两座岛和危机里做过的事收束成一个站位。
 * 刻度的两端就是这条线的两种做法；三个刻度是「偏左 / 中间 / 偏右」；
 * 回响按你的状态来写，所以每个人落的印都不一样。
 * 全部是创作 / 推演，不是史实结论。
 */
export interface LaneSeal {
  /** 港口那一句问 */
  question: string;
  left: string;
  right: string;
  choices: { label: string; note: string }[];
  /** 落印后的回响：按这一程的状态写 */
  epilogue: (st: FableState, pick: string) => string;
}

export const LANE_SEALS: Record<string, LaneSeal> = {
  'A-near': {
    question: '水来了。你今天站在堵的这一边，还是疏的这一边？',
    left: '堵 · 把水挡住',
    right: '疏 · 给水一条路',
    choices: [
      { label: '先堵住再说', note: '眼前的屋子保住了，水去哪里，明年再想。' },
      { label: '堵一半，留一条路', note: '堤要修，口子也要留。' },
      { label: '顺着它开渠', note: '不挡，把水分到该去的地方。' },
    ],
    epilogue: (st, pick) =>
      pick === '顺着它开渠'
        ? st.stakes === 'gap'
          ? '你在鲧的堤上留了口子，又在禹的渠边分了水，最后落的印也是「疏」。这一程你前后一致。'
          : '你帮鲧堵死了堤，最后却落了「疏」的印。你是在路上改变想法的——这也算数。'
        : pick === '先堵住再说'
          ? '你落了「堵」的印。鲧也是这么想的，九年后水还在。'
          : '你落在中间。都江堰正是这样：鱼嘴分水，飞沙堰泄洪，一半堤，一半路。',
  },
  'A-far': {
    question: '收成到了。先记下来，还是先存起来？',
    left: '记 · 刻下日子',
    right: '存 · 装满罐子',
    choices: [
      { label: '先把日子刻下来', note: '知道什么时候下种，比多存一罐更要紧。' },
      { label: '一边刻，一边存', note: '仓颉的字和后稷的罐，缺一个都过不了冬。' },
      { label: '先把罐子装满', note: '明年的种子，是今天不吃的那一口。' },
    ],
    epilogue: (st, pick) =>
      st.famine === 'shared'
        ? `你落了「${pick}」的印。饥年那天你开过罐子，那一家人留下了——存下的东西，最后是给人的。`
        : `你落了「${pick}」的印。饥年那天你封着罐子留种，第二年收成很好。船上很少有人提起那天。`,
  },
  'B-near': {
    question: '炉子还在烧。你给机器多少，给炉前的人多少？',
    left: '机器 · 先让它跑',
    right: '人 · 先问炉前的人',
    choices: [
      { label: '先让机器跑起来', note: '快了，所有人都受益——至少账上是这样。' },
      { label: '机器跑，班次也要定', note: '让它跑，但炉前的人几点换班要写进账本。' },
      { label: '先问炉前的人', note: '机器可以等，人的一天等不了。' },
    ],
    epilogue: (st, pick) =>
      st.loom === 'broken'
        ? `你落了「${pick}」的印。织工们砸过的那台织机，你站在了他们那边；可织机还会再来，这一印是你给它的条件。`
        : `你落了「${pick}」的印。织机转起来了，门口多了找活的人；这一印，是你欠他们的那一句。`,
  },
  'B-far': {
    question: '外面的世界看见了。你先学，还是先做？',
    left: '学 · 先看清外面',
    right: '做 · 先修一段路',
    choices: [
      { label: '先把书读完', note: '林则徐的窗、魏源的书，先看清再动手。' },
      { label: '边学边修', note: '书印出去，铁轨也铺出去。' },
      { label: '先修出一段路来', note: '詹天佑的办法：不等别人，先翻过这座山。' },
    ],
    epilogue: (st, pick) =>
      st.book === 'printed'
        ? `你落了「${pick}」的印。《海国图志》印出去了，七十年后京张铁路通了车——先看见，再学，再做，这一程你走了第一步。`
        : `你落了「${pick}」的印。那部书锁在柜子里很多年；你今天落的印，是替当年没印出来的那一版。`,
  },
  'C-near': {
    question: '线接上了。你先修人多的那条，还是先修只有一盏灯的那条？',
    left: '人多 · 几万扇窗',
    right: '灯 · 只亮一盏的那条',
    choices: [
      { label: '先修人多的', note: '几万扇窗，一个钟头就亮。' },
      { label: '两条一起修', note: '慢一些，但没有人独自亮一个星期。' },
      { label: '先修那盏灯', note: '它说过话，只是没人听见。' },
    ],
    epilogue: (st, pick) =>
      st.warning === 'kept'
        ? `你落了「${pick}」的印。那一夜在加利福尼亚号上，你一遍一遍地发过——你知道「送到」和「听见」隔着什么。`
        : `你落了「${pick}」的印。那一夜你摘下过耳机，有一封求救没被听见。这一印，是你补上的那一次。`,
  },
  'C-far': {
    question: '两封信同时到。你按谁付的钱排，还是按谁等得急排？',
    left: '付钱 · 谁出得多',
    right: '等信 · 谁等得急',
    choices: [
      { label: '按付的钱排', note: '线要养，规矩要守。' },
      { label: '急的先走，钱照收', note: '家书先发，行情晚半个钟头，商行会懂。' },
      { label: '按等信的人排', note: '摩尔斯造这根线，就是为了那一封。' },
    ],
    epilogue: (st, pick) =>
      st.wire === 'family'
        ? `你落了「${pick}」的印。那封家书先到了，三天后码头上有人向你点头——线不会挑，挑的一直是你。`
        : `你落了「${pick}」的印。行情先到了，家书晚了一夜。你今天落的印，是给下一次的。`,
  },
  'D-near': {
    question: '它要全权。你留不留最后一道确认？',
    left: '交出去 · 它比你快',
    right: '留着 · 最后一道确认',
    choices: [
      { label: '全交给它', note: '它比你准，也比你快。' },
      { label: '交一半，重要的留着', note: '航线给它，开火不给。' },
      { label: '每一步都要我点头', note: '慢，但船为什么转弯，我知道。' },
    ],
    epilogue: (st, pick) =>
      st.alarm === 'held'
        ? `你落了「${pick}」的印。1983 年那一夜，你陪值班军官等过那几分钟——机器不会说「我不确定」，人会。`
        : `你落了「${pick}」的印。那一夜电话那头的一句「等一等」救了所有人；这一印，是你把那句话留给了自己。`,
  },
  'D-far': {
    question: '它比你更懂你。你还要不要自己想？',
    left: '跟它 · 它比你准',
    right: '自己想 · 哪怕慢',
    choices: [
      { label: '它说得对就听它的', note: '第 37 手没有人会下，可它赢了。' },
      { label: '听它的，但要问为什么', note: '分不出来可以，不问不行。' },
      { label: '问题是我的，答案也要是我的', note: '哪怕慢，哪怕错。' },
    ],
    epilogue: (st, pick) =>
      st.follow === 'back'
        ? `你落了「${pick}」的印。它提议改航时你说「回到我的问题」——分不分得出来是它的事，问题是不是你的，只有你分得出。`
        : `你落了「${pick}」的印。你跟它去过那个地方，很美，像专门为你准备的。这一印，是你回来之后落的。`,
  },
};

// 回顾与当前路线共用主题和选择记录，不能讲起另一条航道的旧故事。
for (const [key, route] of Object.entries(HISTORY_ROUTES)) {
  LANE_SEALS[key] = {
    question: route.question, left: '先把技术用起来', right: '同时安排共同生活的规则',
    choices: [
      { label: '先保证眼前运转', note: '保住物资与机会，尚未解决的处境要继续记着。' },
      { label: '试用，也约定边界', note: '让技术前行，并明确谁参与、谁受益、谁负责。' },
      { label: '先让受影响的人参与', note: '接受眼前的时间与物资成本，共同决定怎样使用。' },
    ],
    epilogue: (state, pick) => `你记下了「${pick}」。${routeRecap(route, state).join(' ')} ${route.ending.reflection}`,
  };
}

export function laneSealFor(sceneId: string | null | undefined, lane: string): LaneSeal | null {
  if (!sceneId) return null;
  return LANE_SEALS[`${sceneId}-${lane === 'far' ? 'far' : 'near'}`] ?? null;
}
