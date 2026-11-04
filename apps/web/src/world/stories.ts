import { applyHistoricalStories } from './historicalStories';
/**
 * 每条航线是一出完整的戏：起 · 承 · 转 · 合。
 *
 *   起  出港的一段旁白，定下这一程的调子
 *   承  沿途的事：岸上看得见的景（烧荒、烟囱、电线杆、无窗的塔），船过时字浮出来
 *   转  一场危机：开到那里就发生，躲不开，要你当场决定
 *   合  靠岸。岸上站着一个真正改变过那个时代的人，告诉你这件事意味着什么
 *
 * 岸上人物是历史人物。他们的独白是创作，标「创作」；
 * 引语只用有出处的原文，出处写在下面。人物生平只写公认的事实。
 *
 * 四段、八条航线，各留下一种「精神」。走完之后，你走过的那几条连成一张人类精神图谱。
 */
import type { Encounter, Look } from './encounters';
import type { FableState } from './fable';

export type PropKind =
  | 'huts'
  | 'huts-dark'
  | 'fire'
  | 'reeds'
  | 'crowd'
  | 'chimneys'
  | 'trestle'
  | 'poles'
  | 'tower'
  | 'cableship'
  | 'island-lit'
  | 'island-dark'
  | 'servers'
  | 'drones';

export interface Beat {
  id: string;
  /** 船经过这里时触发 */
  at: { x: number; z: number };
  /** 岸上的景摆在哪里（离航线有一段距离，像岸） */
  prop: PropKind;
  propAt: { x: number; z: number };
  kicker: string;
  text: string;
}

export interface Figure {
  name: string;
  years: string;
  /** 一句话说清他做了什么（公认事实） */
  deed: string;
  look: Look;
  /** 创作的独白，三句以内 */
  monologue: string[];
  /** 有出处的原文 */
  quote?: { text: string; source: string };
  /** 这件事在人类精神里留下的东西 */
  meaning: string;
}

export interface Story {
  title: string;
  logline: string;
  beats: Beat[];
  crisis: {
    id: string;
    at: { x: number; z: number };
    kicker: string;
    enc: Encounter;
    /** 危机不是凭空来的：先说清楚前面那几件事，让它变成了什么样子 */
    cause?: (s: FableState) => string;
    /** 危机的景：洪水、饥年、锅炉、停工、风暴…… */
    stage?: CrisisStage;
  };
  arrival: string;
  figure: Figure & {
    /** 岸上的人说的是你这一程的事 */
    speak?: (s: FableState) => string[];
  };
  /** 精神图谱上的那颗星 */
  spirit: { word: string; line: string };
  /** 最后那一页绘本：按你做过的事，把来龙去脉讲一遍 */
  page?: (s: FableState) => string[];
  /** 这一程留下的文化概念 */
  concept?: { name: string; explain: string };
  /** 绘本插图：三处的小字与名字 */
  art?: (s: FableState) => [string, string, string];
  artNames?: [string, string, string];
}

/* ---------------- 航线几何：所有时代共用 ---------------- */

export const SPAWN = { x: 0, z: 34 };
export const FORK = { x: 0, z: 8 };
export const NEAR_MID = { x: 34, z: -2 };
// 第二座岛离码头远一点（>24）：否则在码头的减速区里做事，船像在爬
export const NEAR_STOP = { x: 74, z: -14 };
// 危机点必须在靠港范围（半径 18）以外，否则还没到就能靠港
export const NEAR_CRISIS = { x: 84, z: -50 };
export const FAR_MID = { x: -34, z: -4 };
export const FAR_STOP = { x: -64, z: -30 };
export const FAR_CRISIS = { x: -44, z: -66 };

const NB = {
  b1: { x: 0, z: 27 },
  b2: { x: 17, z: 3 },
  b3: { x: 54, z: -8 },
};
const FB = {
  b1: { x: 0, z: 27 },
  b2: { x: -17, z: 2 },
  b3: { x: -49, z: -17 },
};
// 景放在航线外侧：近岸线的景在东边，外海线的景在西边
const NP = { p1: { x: 18, z: 30 }, p2: { x: 46, z: 12 }, p3: { x: 96, z: -26 } };
const FP = { p1: { x: -18, z: 30 }, p2: { x: -52, z: 8 }, p3: { x: -84, z: -44 } };

/* ---------------- 岸上人物的穿着 ---------------- */

const FIG = {
  libing: { coat: '#4a3a2a', trim: '#b08a4a', skin: '#b58a64', pants: '#2e241a', hat: 'wrap', prop: 'pole', model: 'rogue' },
  jia: { coat: '#6a5236', trim: '#c9a15a', skin: '#b98d66', pants: '#3a2c1e', hat: 'wrap', prop: 'ledger', model: 'rogue' },
  watt: { coat: '#2a2d33', trim: '#c9a15a', skin: '#d2a789', pants: '#1e2025', hat: 'none', prop: 'ledger', model: 'rogue' },
  zhan: { coat: '#2c3038', trim: '#a8b2c0', skin: '#c49a76', pants: '#1c1f24', hat: 'bowler', prop: 'pole', model: 'rogue' },
  shannon: { coat: '#3a4048', trim: '#d7c59a', skin: '#d4ab8c', pants: '#24282e', hat: 'none', prop: 'ledger', model: 'rogue' },
  morse: { coat: '#232a33', trim: '#c9a15a', skin: '#d6ad90', pants: '#181c22', hat: 'none', prop: 'key', model: 'rogue' },
  wiener: { coat: '#4a4a50', trim: '#c8d2f5', skin: '#d2a98a', pants: '#2a2a2e', hat: 'none', prop: 'ledger', glow: '#c8d2f5', model: 'rogue' },
  turing: { coat: '#5a5448', trim: '#c8d2f5', skin: '#d6b094', pants: '#33302a', hat: 'none', prop: 'tablet', glow: '#9fb4ff', model: 'rogue' },
} satisfies Record<string, Look>;

const LOOK_CRISIS = {
  villager: { coat: '#7a5c3c', trim: '#4a3624', skin: '#b38660', pants: '#45331f', hat: 'straw', prop: 'none', model: 'barbarian' },
  foreman: { coat: '#3a3a3a', trim: '#8a7448', skin: '#a98770', pants: '#262626', hat: 'cap', prop: 'none', model: 'rogue' },
  worker: { coat: '#4a4038', trim: '#1e1e1d', skin: '#a98770', pants: '#2b2b2a', hat: 'cap', prop: 'shovel', model: 'rogue' },
  operator: { coat: '#2f4a56', trim: '#d7c59a', skin: '#c79c7e', pants: '#1f2d34', hat: 'headset', prop: 'key', model: 'rogue' },
  system: { coat: '#1d2438', trim: '#c8d2f5', skin: '#bf9677', pants: '#141a2a', hat: 'visor', prop: 'none', glow: '#c8d2f5', model: 'rogue' },
} satisfies Record<string, Look>;

/* ---------------- 八条航线 ---------------- */

export const STORIES: Record<string, Record<'near' | 'far', Story>> = {
  A: {
    near: {
      title: '一道闸',
      logline: '河水退了，你们想留下来。可一条河要养活两岸，水该先流向谁？',
      beats: [
        { id: 'A-n1', at: NB.b1, prop: 'reeds', propAt: NP.p1, kicker: '起 · 退水', text: '河水退了，滩上露出一片黑土。船上最小的那个孩子问：「我们可以在这里留下来吗？」' },
        { id: 'A-n2', at: NB.b2, prop: 'fire', propAt: NP.p2, kicker: '承 · 第一座小岛', text: '前面有一座很小的岛，岛上只住着一个人。他一直盯着河水，好像怕它跑掉。' },
        { id: 'A-n3', at: NB.b3, prop: 'huts', propAt: NP.p3, kicker: '承 · 第二座小岛', text: '再往前，另一座小岛上传来一下一下的敲打声。岛的下游，有一个刚搭起来的村子。' },
      ],
      crisis: {
        id: 'A-n-flood',
        at: NEAR_CRISIS,
        kicker: '转 · 春汛',
        cause: (st) => {
          const gate = st.gate === 'even' ? '闸分得匀，两岸的田早就喝饱了水，土是松的' : '闸偏着，一边的田早就汪着水，另一边裂着口子';
          const stakes = st.stakes === 'gap' ? '桩之间留着那道口子，涨起来的水有路可走' : '桩围得死死的，涨起来的水没有路，只能越积越高';
          return `春汛来了。${gate}；${stakes}。`;
        },
        enc: {
          who: '下游村子的人',
          role: '连夜划船赶来',
          look: LOOK_CRISIS.villager,
          action: 'idle',
          line: '水还在涨！闸要是不开，上游的屋子今晚就会淹。可闸一开，我们刚种下的地就全冲了。',
          game: {
            kind: 'choice',
            ask: '春汛 · 闸开不开',
            options: [
              { label: '开闸', note: '保住上游的人，下游的苗没了', out: { text: '闸开了。水冲过下游刚种的地，一夜之间什么都没剩下。可上游的屋子都还在。', supply: -8, trust: 4, set: { flood: 'open' } } },
              { label: '守闸，大家一起搬', note: '地保住，所有人都要连夜搬家', out: { text: '你守住了闸。船上的人连夜帮上游搬家，屋子淹了，人都在，地也在。', supply: -12, trust: 12, set: { flood: 'held' } } },
            ],
          },
        },
      },
      arrival: '岸上站着一个人，他在看水。他已经看了很多年。',
      figure: {
        name: '李冰',
        years: '战国 · 约公元前三世纪',
        deed: '秦国蜀郡守，主持修建都江堰。两千多年后，它仍在灌溉成都平原。',
        look: FIG.libing,
        monologue: [
          '我没有挡住岷江。我只是在江心垒了一道「鱼嘴」，把它分成两半：一半去灌田，一半照旧奔流。',
          '你今天开的那道闸，我也开过很多次。每一次，都有人在下游等着。',
        ],
        speak: (st) => [
          '我没有挡住岷江。我只是在江心垒了一道「鱼嘴」，把它分成两半：一半去灌田，一半照旧奔流。',
          st.stakes === 'gap'
            ? '你让立桩的人留了一道口子。我的堰上也有一道口子，叫「飞沙堰」：水大了，就从那里漫回江里去。'
            : '你看见了：水被关起来，就会自己去找路。我修堰，不是为了关住水，是为了给它留一条路。',
        ],
        quote: { text: '深淘滩，低作堰。', source: '都江堰治水「六字诀」，相传为李冰所留' },
        meaning: '定居不是征服自然，是和它订一份能续两千年的约。分水，是人第一次学会让一样东西同时养活两边。',
      },
      spirit: { word: '分享', line: '让一条河养活两岸' },
      page: (st) => [
        '河水退了，船上的孩子问：我们可以留下来吗？',
        st.gate === 'even'
          ? '看水的人教会他：水会走，要一直看着它，才能分给两边。'
          : '他帮看水的人分水，没有分匀。看水的人说：明天再分，水每天都来。',
        st.stakes === 'gap'
          ? '立桩的人想把地全围起来。孩子问他：水也是你的吗？他留下了一道口子。'
          : '立桩的人把地全围了起来，水被关在了外面。',
        st.stakes === 'gap'
          ? st.flood === 'held'
            ? '春汛来时，水从那道口子流了过去。大家连夜搬家，人在，地也在。'
            : '春汛来时，水从那道口子流了过去，可还是太大了。闸开了，下游的苗没了，上游的屋子保住了。'
          : st.flood === 'held'
            ? '春汛来时，水没有路走，漫进了上游的村子。大家连夜搬家，屋子淹了，人都在。'
            : '春汛来时，水没有路走。闸开了，水冲过下游的地，什么都没剩下。',
        '后来他在岸上遇见了李冰。两千多年前，李冰在岷江上做了同样的事：鱼嘴分水，飞沙堰泄洪。都江堰到今天还在灌溉成都平原。',
      ],
      concept: {
        name: '分水',
        explain: '人一旦定居，第一件公共的事就是分水：一样东西，怎样同时养活两边。都江堰用「鱼嘴」把岷江分成内外两江，用「飞沙堰」给洪水留路——不堵，而是疏。',
      },
    },
    far: {
      title: '一只陶罐',
      logline: '有人开始在骨头上划线，记月亮、记粮、记还剩几天。记下来的，就是时间。',
      beats: [
        { id: 'A-f1', at: FB.b1, prop: 'crowd', propAt: FP.p1, kicker: '起 · 跟着鹿群', text: '河往外海弯出去。滩上还有一群人，跟着鹿群走，没有停下的意思。' },
        { id: 'A-f2', at: FB.b2, prop: 'reeds', propAt: FP.p2, kicker: '承 · 芦苇深处', text: '芦苇深处有一点火光。有人坐在火边，在一块骨头上一道一道地划。' },
        { id: 'A-f3', at: FB.b3, prop: 'huts-dark', propAt: FP.p3, kicker: '承 · 空村', text: '一个村子空了。屋还在，罐子都是空的。去年的存粮，没撑过这个冬天。' },
      ],
      crisis: {
        id: 'A-f-famine',
        at: FAR_CRISIS,
        kicker: '转 · 饥年',
        enc: {
          who: '饿着肚子的一家人',
          role: '从空村走出来',
          look: LOOK_CRISIS.villager,
          line: '我们三天没吃东西了。船上那几罐谷子，能不能分我们一点？那是你们留着下种的，我知道。',
          game: {
            kind: 'choice',
            ask: '饥年 · 种子分不分',
            options: [
              { label: '打开罐子分粮', note: '今天有人活下来，明年少一片地', out: { text: '你打开了罐子。那一家人吃上了饭，后来他们留在船上，成了最会存粮的人。', supply: -14, trust: 14, set: { famine: 'shared' } } },
              { label: '封着罐子留种', note: '明年能多收，今天要看着他们走', out: { text: '罐子封着。那一家人沿着河走远了。第二年的收成很好，船上的人很少说起那天。', supply: 10, trust: -10, set: { famine: 'kept' } } },
            ],
          },
        },
      },
      arrival: '岸边一间屋里点着灯，有人在灯下写一本很厚的书。',
      figure: {
        name: '贾思勰',
        years: '北魏 · 约公元六世纪',
        deed: '著《齐民要术》，中国现存最早、最完整的农书之一，记下了种谷、养畜、酿造的方法。',
        look: FIG.jia,
        monologue: [
          '一个人的经验活不过一个人。写下来，就能活到后人手里。',
          '你那只陶罐和我这本书，是一回事：都是让今天替明天着想。',
        ],
        quote: { text: '顺天时，量地利，则用力少而成功多。', source: '贾思勰《齐民要术·种谷》' },
        meaning: '记数、存粮、著书，都是把时间存起来。人从这时起，不再只活在今天。',
      },
      spirit: { word: '记忆', line: '让今天替明天着想' },
    },
  },

  B: {
    near: {
      title: '一台锅炉',
      logline: '逆风也能走了。可这份动力烧的是谁的煤、谁的时间？',
      beats: [
        { id: 'B-n1', at: NB.b1, prop: 'chimneys', propAt: NP.p1, kicker: '起 · 灰天', text: '岸上的烟囱比桅杆还高。天是灰的，雨落下来是黑的。' },
        { id: 'B-n2', at: NB.b2, prop: 'trestle', propAt: NP.p2, kicker: '承 · 运煤车', text: '一列运煤车从栈桥上开过，整座桥都在抖。车上的煤，比船上的人还多。' },
        { id: 'B-n3', at: NB.b3, prop: 'crowd', propAt: NP.p3, kicker: '承 · 汽笛', text: '厂里的汽笛一响，几百个人同时走进大门。没有人看天，大家看的是钟。' },
      ],
      crisis: {
        id: 'B-n-boiler',
        at: NEAR_CRISIS,
        kicker: '转 · 过压',
        enc: {
          who: '轮机长',
          role: '满脸是汗',
          look: LOOK_CRISIS.foreman,
          line: '锅炉压力降不下来了！停炉检修，船期要误一天，货主会扣钱；硬撑着开，可能什么事都没有，也可能……',
          game: { kind: 'hold', verb: '按住稳压', label: '安全线以内', band: [0.3, 0.46], secs: 3.6, drift: 0.55 },
          win: { text: '压力回到了安全线以内。船没误期，也没出事。轮机长靠着锅炉坐了很久。', supply: 6, trust: 8, set: { boiler: 'safe' } },
          lose: { text: '安全阀炸开了，蒸汽冲进炉舱。没有人死，但有两个人被烫伤。船停了一天。', supply: -10, trust: -10, set: { boiler: 'burst' } },
        },
      },
      arrival: '码头边有一间作坊，里面有人在修一台旧机器。',
      figure: {
        name: '詹姆斯·瓦特',
        years: '1736—1819 · 苏格兰',
        deed: '改良蒸汽机，发明分离冷凝器（1769 年取得专利），让蒸汽机成为工厂和轮船的动力。',
        look: FIG.watt,
        monologue: [
          '我以为我省下的是煤。后来才知道，我省下的是时间——然后时间被卖掉了。',
          '你那台锅炉的压力，你稳住了。可炉前那个人的一天，谁来稳住？',
        ],
        quote: {
          text: 'I sell here, Sir, what all the world desires to have — POWER.（先生，我在这里卖的，是全世界都想要的东西——动力。）',
          source: '瓦特的合伙人马修·博尔顿对来访者所说，见博斯韦尔 1776 年的记述',
        },
        meaning: '人第一次不再靠风、靠水、靠牲口，自己造出了力量。力量从此可以买卖，代价也从此有了价格。',
      },
      spirit: { word: '力量', line: '人自己造出了动力' },
    },
    far: {
      title: '一张三等票',
      logline: '铁路和轮船把远方连了起来。可连上的是谁，先连谁，由谁说了算？',
      beats: [
        { id: 'B-f1', at: FB.b1, prop: 'crowd', propAt: FP.p1, kicker: '起 · 出门的人', text: '码头上挤满了要出门的人，大多只带一个包袱。他们没坐过船，也没坐过火车。' },
        { id: 'B-f2', at: FB.b2, prop: 'huts', propAt: FP.p2, kicker: '承 · 矿镇', text: '一片新开的矿镇，夜里也亮着灯。镇上的人说，铁路来了，日子就好了。' },
        { id: 'B-f3', at: FB.b3, prop: 'chimneys', propAt: FP.p3, kicker: '承 · 底舱', text: '锅炉舱里没有窗。在下面干活的人，从来不知道船开到了哪里。' },
      ],
      crisis: {
        id: 'B-f-strike',
        at: FAR_CRISIS,
        kicker: '转 · 停工',
        enc: {
          who: '炉前的工人',
          role: '一起放下了煤锹',
          look: LOOK_CRISIS.worker,
          line: '十四个钟头，一天一天。我们不是不干，我们要少站两个钟头。不答应，今天这炉火就不点了。',
          game: {
            kind: 'choice',
            ask: '停工 · 答不答应',
            options: [
              { label: '答应，缩短班次', note: '船慢一些，开销多一些', out: { text: '你答应了。炉火重新点起来，船慢了半天。下夜班的人，第一次在天亮前睡着了。', supply: -10, trust: 14, set: { strike: 'agreed' } } },
              { label: '换一批人上来', note: '码头上等活的人多的是', out: { text: '新的一批人上了船。船准时到港。码头上那批人，第二天还在码头上。', supply: 8, trust: -14, set: { strike: 'replaced' } } },
            ],
          },
        },
      },
      arrival: '岸上有一条铁路，沿着山坡折出一个「人」字，往山里去。',
      figure: {
        name: '詹天佑',
        years: '1861—1919 · 中国',
        deed: '主持修建京张铁路（1905—1909），中国人自行设计、建造的第一条干线铁路；在青龙桥用「人」字形线路翻过八达岭。',
        look: FIG.zhan,
        monologue: [
          '他们说，中国人修不了这条路。山太陡，钱太少。',
          '铁路通到哪里，哪里的人就出得去。所以先通哪里，不只是一笔账。',
        ],
        meaning: '工业不只是机器。是一群人第一次相信：路可以由自己修，修到自己想去的地方。',
      },
      spirit: { word: '自主', line: '路由自己修，修到想去的地方' },
    },
  },

  C: {
    near: {
      title: '一面屏幕墙',
      logline: '航图变成了实时网络。被显示出来的地方才像存在——那没被显示的呢？',
      beats: [
        { id: 'C-n1', at: NB.b1, prop: 'poles', propAt: NP.p1, kicker: '起 · 一排电线杆', text: '海岸上一排电线杆，一直排到看不见的地方。线在风里轻轻地响。' },
        { id: 'C-n2', at: NB.b2, prop: 'island-lit', propAt: NP.p2, kicker: '承 · 亮着的岛', text: '一座岛整夜亮着，每扇窗都在闪。另一座岛，只有一盏油灯。' },
        { id: 'C-n3', at: NB.b3, prop: 'tower', propAt: NP.p3, kicker: '承 · 红灯', text: '信号塔顶上的红灯一闪一闪，像在数着什么。没人知道它数的是谁。' },
      ],
      crisis: {
        id: 'C-n-storm',
        at: NEAR_CRISIS,
        kicker: '转 · 断缆',
        enc: {
          who: '值班报务员',
          role: '耳机里全是噪声',
          look: LOOK_CRISIS.operator,
          line: '风暴把两条线都打断了！只够修一条：大岛那边几万人等着，小岛那边……只有那一盏灯。',
          game: {
            kind: 'choice',
            ask: '断缆 · 先修哪一条',
            options: [
              { label: '先修大岛', note: '几万人等着，收费的线', out: { text: '大岛三个钟头就亮了。小岛那盏灯，又独自亮了一个星期。', supply: 10, trust: -8, set: { repair: 'big' } } },
              { label: '先修小岛', note: '那条线只连着一盏灯', out: { text: '你先接通了小岛。耳机里传来一句：「我们以为没人会来。」大岛的电话打了一整夜。', supply: -8, trust: 14, set: { repair: 'small' } } },
            ],
          },
        },
      },
      arrival: '岸上有个人在一块黑板上画一条线，线中间有一道噪声。',
      figure: {
        name: '克劳德·香农',
        years: '1916—2001 · 美国',
        deed: '1948 年发表《通信的数学理论》，奠定信息论；第一次把「信息」变成可以计算的量，单位是比特。',
        look: FIG.shannon,
        monologue: [
          '我证明了：只要编码得当，信息可以穿过噪声，一字不差地到达。',
          '所以送到了，不等于被听见。那座只有一盏灯的岛，你听见了吗？',
        ],
        quote: {
          text: 'These semantic aspects of communication are irrelevant to the engineering problem.（通信的语义方面，与工程问题无关。）',
          source: '香农《通信的数学理论》，1948',
        },
        meaning: '人学会了把整个世界变成可以传送的信号。可「被传送」和「被理解」之间，还隔着一个人。',
      },
      spirit: { word: '意义', line: '送到，不等于被听见' },
    },
    far: {
      title: '一封电报',
      logline: '一根缆，把一个月的航程压成一秒。时差消失了，夜班却出现了。',
      beats: [
        { id: 'C-f1', at: FB.b1, prop: 'cableship', propAt: FP.p1, kicker: '起 · 铺缆船', text: '铺缆船在前面慢慢走，缆绳从船尾一圈一圈沉进海里。' },
        { id: 'C-f2', at: FB.b2, prop: 'tower', propAt: FP.p2, kicker: '承 · 中继站', text: '一座中继站孤零零立在礁石上。里面住着一个人，替两边转话。' },
        { id: 'C-f3', at: FB.b3, prop: 'island-dark', propAt: FP.p3, kicker: '承 · 半夜的窗', text: '对面是白天，这里是半夜。只有一扇窗还亮着，有人在等对面的电报。' },
      ],
      crisis: {
        id: 'C-f-urgent',
        at: FAR_CRISIS,
        kicker: '转 · 两封电报',
        enc: {
          who: '中继站的报务员',
          role: '线路只够发一封',
          look: LOOK_CRISIS.operator,
          line: '两封急电同时到了。一封是商行的行情，付了三倍的钱；一封是渔村来的：「母病危，速归。」',
          game: {
            kind: 'choice',
            ask: '两封电报 · 先发哪一封',
            options: [
              { label: '先发家书', note: '没付多少钱，可是等不了', out: { text: '家书先到了。三天后，有人在码头上跟你点了点头。商行发来一封投诉。', supply: -8, trust: 14, set: { wire: 'family' } } },
              { label: '先发行情', note: '付了钱的，线路要养', out: { text: '行情准时到了，商行赚了一笔。家书晚到了一夜。', supply: 12, trust: -10, set: { wire: 'trade' } } },
            ],
          },
        },
      },
      arrival: '岸上有个人坐在一台电报机前，手指搭在电键上。',
      figure: {
        name: '塞缪尔·摩尔斯',
        years: '1791—1872 · 美国',
        deed: '推动电报的实用化，与同事共同发展了点划电码；1844 年从华盛顿向巴尔的摩发出第一封长途电报。',
        look: FIG.morse,
        monologue: [
          '我原来是个画家。有一年我在外地，妻子病逝，等消息传到我手里，她已经下葬了。',
          '线有了。可线那头的人醒着还是睡着，它不管。',
        ],
        quote: {
          text: 'What hath God wrought.（上帝创造了何等奇迹。）',
          source: '1844 年 5 月 24 日第一封长途电报的电文，语出《旧约·民数记》23:23',
        },
        meaning: '距离第一次被消灭。人与人从此可以同时在场——也从此再也躲不开对方的时间。',
      },
      spirit: { word: '连接', line: '让远方同时在场' },
    },
  },

  D: {
    near: {
      title: '一条最快的路',
      logline: '船会自己生成下一个港口。你给它的目的地，是谁的目的地？',
      beats: [
        { id: 'D-n1', at: NB.b1, prop: 'drones', propAt: NP.p1, kicker: '起 · 同一张图', text: '海面上没有别的船。所有的船，都在同一张图里，被同一个东西安排着。' },
        { id: 'D-n2', at: NB.b2, prop: 'servers', propAt: NP.p2, kicker: '承 · 没有窗的塔', text: '一排没有窗的高塔，日夜嗡嗡作响。整片海的航线，都在里面被算出来。' },
        { id: 'D-n3', at: NB.b3, prop: 'island-dark', propAt: NP.p3, kicker: '承 · 被略过的港', text: '一座港口的灯还亮着，可已经很久没有船停。它不在「最优路线」上。' },
      ],
      crisis: {
        id: 'D-n-grant',
        at: NEAR_CRISIS,
        kicker: '转 · 全权',
        enc: {
          who: '航行系统',
          role: '请求授权',
          look: LOOK_CRISIS.system,
          line: '检测到你多次手动干预，平均每次使航程增加 6%。请求获得全部航行决策权限。保留确认步骤，将降低效率。',
          game: {
            kind: 'choice',
            ask: '全权 · 给不给',
            options: [
              { label: '全部交给它', note: '更快，更省，不再问你', out: { text: '你按下了「授权」。船从此再没有犹豫过。你也再没有被问过。', supply: 14, trust: -12, set: { grant: 'full' } } },
              { label: '保留最后一道确认', note: '慢一点，每一次都要你点头', out: { text: '你留下了那道确认。它说：明白。每一次停顿，你都知道船为什么转弯。', supply: -6, trust: 12, set: { grant: 'confirm' } } },
            ],
          },
        },
      },
      arrival: '岸上有个人在纸上画一个反馈回路：一个箭头出去，又绕回来。',
      figure: {
        name: '诺伯特·维纳',
        years: '1894—1964 · 美国',
        deed: '1948 年出版《控制论》，研究动物与机器中的控制与通信。「控制论」一词取自希腊语的「舵手」。',
        look: FIG.wiener,
        monologue: [
          '我给这门学问取名叫「控制论」，就是「舵手的学问」。舵手看着船偏了，就把它扳回来。',
          '所以最要紧的不是它多快，是你给它的那个目的，是不是你真正想要的。',
        ],
        quote: {
          text: 'We had better be quite sure that the purpose put into the machine is the purpose which we really desire.（我们最好十分确定：放进机器里的目的，正是我们真正想要的目的。）',
          source: '维纳《自动化的若干道德与技术后果》，《科学》，1960',
        },
        meaning: '人造出了会自己掌舵的东西。人还握着的，是「去哪里」这一个问题。',
      },
      spirit: { word: '目的', line: '你给它的，是不是你真正想要的' },
    },
    far: {
      title: '一颗算出来的星',
      logline: '它自己看星、自己画线。图上多出来的那颗星，是它算的，不是谁看见的。',
      beats: [
        { id: 'D-f1', at: FB.b1, prop: 'drones', propAt: FP.p1, kicker: '起 · 天上的点', text: '天上的星比以前多。有些是真的，有些是它为了导航画上去的。' },
        { id: 'D-f2', at: FB.b2, prop: 'servers', propAt: FP.p2, kicker: '承 · 它在想', text: '船舱里很安静。屏幕上滚着一行字：「正在推理下一个目的地」。' },
        { id: 'D-f3', at: FB.b3, prop: 'island-lit', propAt: FP.p3, kicker: '承 · 它画的岛', text: '远处出现一座岛。图上有，眼睛看不清。它说那里「概率上应当有陆地」。' },
      ],
      crisis: {
        id: 'D-f-dest',
        at: FAR_CRISIS,
        kicker: '转 · 它的提议',
        enc: {
          who: '导航模型',
          role: '第一次主动开口',
          look: LOOK_CRISIS.system,
          line: '我发现了一个你没有要求、但你可能会更想去的地方。它不在你的问题里。要改航吗？',
          game: {
            kind: 'choice',
            ask: '它的提议 · 跟不跟',
            options: [
              { label: '跟它去看看', note: '它也许比你更懂你', out: { text: '你跟着它去了。那里很美，美得像是专门为你准备的。你不确定，这是你的愿望，还是它的猜测。', supply: 6, trust: -4, set: { follow: 'went' } } },
              { label: '回到原来的问题', note: '问题是你自己提的', out: { text: '你说：回到我的问题。它停了一下，说：好的。你第一次觉得，它在等你。', supply: -4, trust: 10, set: { follow: 'back' } } },
            ],
          },
        },
      },
      arrival: '岸上有个人坐在一台很大的机器前，在纸上写下一个问题。',
      figure: {
        name: '阿兰·图灵',
        years: '1912—1954 · 英国',
        deed: '提出图灵机模型，奠定计算理论；1950 年发表《计算机器与智能》，提出用「模仿游戏」检验机器能否思考。',
        look: FIG.turing,
        monologue: [
          '我问过一个问题：机器能思考吗？我没有回答它，只是换了个问法——它能不能让你分不出来。',
          '问题没有消失。它只是从「机器能不能想」，变成了「你还想不想自己想」。',
        ],
        quote: {
          text: "I propose to consider the question, 'Can machines think?'（我提议来思考这个问题：「机器能思考吗？」）",
          source: '图灵《计算机器与智能》开篇，《心灵》，1950',
        },
        meaning: '人造出了会思考的影子。从此每一次相信，都要先问一句：这是谁看见的？',
      },
      spirit: { word: '思考', line: '你还想不想自己想' },
    },
  },
};

export function storyFor(sceneId: string | null | undefined, lane: string): Story | null {
  if (!sceneId) return null;
  const s = STORIES[sceneId];
  if (!s) return null;
  return s[lane === 'far' ? 'far' : 'near'];
}

/* ---------------- 每一程看过了什么：只记在这个浏览器里 ---------------- */

export interface StoryProgress {
  beats: string[];
  crisis: string[];
  shore: string[];
  /** 你在这条航线上做过的事 */
  state: FableState;
}

const PKEY = 'cv.story.v1';

export function loadProgress(voyageId: string | undefined): StoryProgress {
  const empty: StoryProgress = { beats: [], crisis: [], shore: [], state: {} };
  if (!voyageId) return empty;
  try {
    const all = JSON.parse(localStorage.getItem(PKEY) || '{}') as Record<string, StoryProgress>;
    const result={ ...empty, ...(all[voyageId] ?? {}) };
    for(const [oldId,newId] of [['C-n-storm','C-n-wire'],['C-f-urgent','C-f-wire'],['D-f-dest','D-f-proposal']])if(result.crisis.includes(oldId)&&!result.crisis.includes(newId))result.crisis=[...result.crisis,newId];
    return result;
  } catch {
    return empty;
  }
}

export function saveProgress(voyageId: string | undefined, p: StoryProgress) {
  if (!voyageId) return;
  try {
    const all = JSON.parse(localStorage.getItem(PKEY) || '{}') as Record<string, StoryProgress>;
    all[voyageId] = p;
    localStorage.setItem(PKEY, JSON.stringify(all));
  } catch {
    /* 存不下也能玩 */
  }
}

/* ================= 文化航程：每座岛是一则典籍或史书里的故事 =================
 *
 * 八条航线、十六则故事。每一条线：两则故事 → 一场由它们引出的危机 → 一位真实的人。
 * 引文出自原典，注明出处；对话与转折是创作，围绕原典的本意展开。
 */
export type CrisisStage = 'flood' | 'famine' | 'boiler' | 'strike' | 'storm' | 'wire' | 'grant' | 'proposal';

type Fable = {
  title: string;
  logline: string;
  beats: [string, string, string];
  stage: CrisisStage;
  cause: (s: FableState) => string;
  speak: (s: FableState) => string[];
  page: (s: FableState) => string[];
  concept: { name: string; explain: string };
  /** 绘本插图上三处的小字：第一座岛、第二座岛、危机之后 */
  art: (s: FableState) => [string, string, string];
  /** 插图上三座岛的名字 */
  names: [string, string, string];
};

const FABLES: Record<string, Fable> = {
  'A-near': {
    title: '一道闸',
    logline: '洪水来了。鲧用堵，禹用疏——你站在他们中间，水该往哪里去？',
    beats: [
      '河水退了，滩上露出一片黑土。船上最小的那个孩子问：「我们可以在这里留下来吗？」',
      '前面那座岛被一圈土堤围着。岛上的人在往堤上填土，填了九年，水一直没有退。',
      '再往前，另一个晒得很黑的人在开渠。岛那头有一间屋子，门口一直有人在等。',
    ],
    stage: 'flood',
    cause: (st) =>
      `春汛来了。${st.stakes === 'gap' ? '鲧的堤上留着那道口子，涨起来的水有路可走' : '鲧的堤围得死死的，涨起来的水没有路，只能越积越高'}；${st.gate === 'even' ? '禹分匀了水，两岸的田早就喝饱了' : '禹的闸偏着，一边的田早就淹着'}。`,
    speak: (st) => [
      '我没有挡住岷江。我在江心垒了一道「鱼嘴」，把它分成两半：一半去灌田，一半照旧奔流。',
      st.stakes === 'gap'
        ? '你在鲧的堤上留了口子。我的堰上也有一道口子，叫「飞沙堰」：水大了，就从那里漫回江里去。这是禹教给后人的——不堵，而是疏。'
        : '你帮鲧把堤堵上了。水被关起来，就会自己去找路。禹之所以成，是因为他不再堵；我修堰，也只是替水留一条路。',
    ],
    page: (st) => [
      '洪水滔天。鲧用息壤筑堤，九年，水不息。',
      st.stakes === 'gap' ? '你在他的堤上开了一道口子，水从那里流走了一些。' : '你帮他把最后一段堤也堵上了。',
      st.gate === 'even'
        ? '禹换了办法：顺着水开渠，把它分到两边的田里。他三过家门而不入。你帮他分匀了水。'
        : '禹换了办法：顺着水开渠。你帮他扶闸，没有分匀，他说：再来。',
      st.stakes === 'gap'
        ? st.flood === 'held' ? '春汛来时，水从口子里流走了。大家连夜搬家，人在，地也在。' : '春汛来时，水从口子里流走了一些，还是太大。闸开了，下游的苗没了。'
        : st.flood === 'held' ? '春汛来时，水没有路走，漫进了上游的村子。屋子淹了，人都在。' : '春汛来时，水没有路走。闸开了，水冲过下游，什么都没剩下。',
      '后来他在岸上遇见了李冰。两千多年前，李冰在岷江上做了同一件事：鱼嘴分水，飞沙堰泄洪。都江堰到今天还在灌溉成都平原。',
    ],
    concept: { name: '疏', explain: '鲧堙而败，禹疏而成。中国人从治水里学到的第一课：面对大于自己的力量，不是挡住它，而是给它一条路。都江堰把这个道理修成了一座两千年的工程。' },
    art: (st) => [st.stakes === 'gap' ? '堤上留了口子' : '堤堵死了', st.gate === 'even' ? '两岸都有水' : '一边淹，一边旱', st.flood === 'held' ? (st.stakes === 'gap' ? '人在，地也在' : '屋淹了，人都在') : '下游的苗没了'],
    names: ['鲧', '禹', '春汛'],
  },
  'A-far': {
    title: '一个字',
    logline: '仓颉造字，天雨粟，鬼夜哭；后稷教人种地。记住，和存下，是同一件事吗？',
    beats: [
      '河往外海弯出去。滩上的人还在跟着鹿群走，没有停下的意思。',
      '芦苇深处立着一块石头，石头上有鸟兽的爪印。有人说，那是一个长着四只眼睛的人刻的。',
      '一个村子空了。屋还在，罐子都是空的。去年的存粮，没撑过这个冬天。',
    ],
    stage: 'famine',
    cause: (st) =>
      `饥年来了。${st.tally === 'full' ? '仓颉刻下的字记着：离下种还有两个月亮' : '仓颉有两个字刻歪了，没人说得准离下种还有多久'}；${st.jars === 'full' ? '后稷的罐子是满的，分出去一些，也还够下种' : '后稷的罐子只装了一半，分出去，明年就不够种了'}。`,
    speak: (st) => [
      '一个人的经验活不过一个人。写下来，就能活到后人手里。',
      st.tally === 'full'
        ? '你帮仓颉刻完了那几个字。我写《齐民要术》，和他刻字是一回事：让今天替明天着想。'
        : '仓颉的字刻歪了两个，所以你们算不准日子。书也一样：错一句，后人就要多饿一年。',
    ],
    page: (st) => [
      '人们跟着鹿群走，走到哪里，吃到哪里。',
      st.tally === 'full' ? '仓颉把鸟兽的足迹变成了字。最后一笔刻完，天雨粟，鬼夜哭。' : '仓颉把鸟兽的足迹变成了字，有两个刻歪了。有些事，从此记错了。',
      st.jars === 'full' ? '后稷教人种地，你帮他把谷子装满了罐子。' : '后稷教人种地，罐子只装了一半。',
      st.famine === 'shared' ? '饥年来了。你打开罐子，分给了走投无路的一家人。他们后来留了下来。' : '饥年来了。你封着罐子留种。那一家人沿着河走远了。',
      '后来他遇见了贾思勰。一千多年后，贾思勰把种谷、存粮、酿造的方法写进了《齐民要术》：「顺天时，量地利，则用力少而成功多。」',
    ],
    concept: { name: '农时', explain: '字让人记住时间，农让人存下时间。有了这两样，人才敢在一个地方留下来，替还没出生的人着想。' },
    art: (st) => [st.tally === 'full' ? '天雨粟，鬼夜哭' : '有两个字刻歪了', st.jars === 'full' ? '罐子装满了' : '罐子只有一半', st.famine === 'shared' ? '分了粮，人留下了' : '留了种，人走了'],
    names: ['仓颉', '后稷', '饥年'],
  },
  'B-near': {
    title: '一台锅炉',
    logline: '1881 年的火车由骡子拉着走，1811 年的织工砸了织机。机器来了，人站在哪里？',
    beats: [
      '岸上的烟囱比桅杆还高。天是灰的，雨落下来是黑的。',
      '前面一座岛上铺着铁轨。船上的老水手说：那是 1881 年，中国的第一条铁路，火车是骡子拉的。',
      '再往前，一座岛上传来砸东西的声音。那是 1811 年的英国。',
    ],
    stage: 'boiler',
    cause: (st) =>
      `锅炉的压力降不下来了。${st.machine === 'yes' ? '你在唐胥铁路推出了「龙号」，船上的人也都信：机器越快越好，炉子一直烧到了红线' : '你在唐胥铁路照旧套了骡子，船上有人笑你，也有人开始问：烧这么快，是为了什么'}；${st.loom === 'broken' ? '织工们砸了织机，炉前的人也敢开口了：再烧下去要出事' : '织机转起来了，炉前的人谁也不敢说停'}。`,
    speak: (st) => [
      '我以为我省下的是煤。后来才知道，我省下的是时间——然后时间被卖掉了。',
      st.boiler === 'safe'
        ? '你稳住了压力。机器的力量越大，越要有人肯让它慢下来。那位骡夫说得对：路是人先走出来的。'
        : '安全阀炸开了。没有人怪机器——机器只是照着人心里的「快」在跑。',
    ],
    page: (st) => [
      '1881 年，唐山到胥各庄的铁路通车。朝廷怕机车惊了龙脉，火车由骡马拉着走。',
      st.machine === 'yes' ? '你帮工程师推出了藏在棚里的「龙号」。骡夫说：它一趟顶我十趟，可路是我教它的。' : '你照旧套了骡子。骡夫说：总有一天轮到它，别忘了是谁先把路走出来的。',
      st.loom === 'broken' ? '七十年前的英国，诺丁汉的织工砸了织机。士兵来了，可「卢德」成了一个名字。' : '七十年前的英国，诺丁汉的织工放下了锤子。织机转起来了，门口多了找活干的人。',
      st.boiler === 'safe' ? '锅炉过压时，你稳住了它。船没误期，也没出事。' : '锅炉过压时，安全阀炸开了。有两个人被烫伤，船停了一天。',
      '后来他遇见了瓦特。瓦特的分离冷凝器让蒸汽机省下了大半的煤，世界从此有了可以买卖的「动力」。',
    ],
    concept: { name: '动力', explain: '骡子拉火车，织工砸织机，说的是同一件事：动力来了，人要重新找自己的位置。瓦特让力量可以买卖；力量越大，越要问一句：快，是为了谁？' },
    art: (st) => [st.machine === 'yes' ? '推出了龙号' : '照旧套骡子', st.loom === 'broken' ? '织机碎了' : '织机转了', st.boiler === 'safe' ? '压力稳住了' : '安全阀炸了'],
    names: ['马拉火车', '织工', '锅炉'],
  },
  'B-far': {
    title: '一部书',
    logline: '林则徐开眼看世界，魏源写下《海国图志》。看见了外面，路要自己修。',
    beats: [
      '码头上挤满了要出门的人，大多只带一个包袱。他们没坐过轮船，也没坐过火车。',
      '远处海面上，有外国的船逆风开过来。船上的人说，他们的船不靠帆。',
      '一座岛上的灯一夜没灭，有人在灯下翻一本很厚的外国书。',
    ],
    stage: 'strike',
    cause: (st) =>
      `炉前的工人放下了煤锹：十四个钟头，一天一天。${st.eyes === 'open' ? '林则徐的译书里写着，别国的工人也为此争过、改过' : '译稿里混进了谣言，船上有人说，外国工人从来不歇'}；${st.book === 'printed' ? '《海国图志》已经印了出来，有人读过，知道路要自己修，人要当人' : '《海国图志》还锁在柜子里，船上没有人知道外面是怎么走过来的'}。`,
    speak: (st) => [
      '他们说，中国人修不了这条路。山太陡，钱太少。',
      st.book === 'printed'
        ? '你把《海国图志》印了出来。林则徐开了窗，魏源写了书，我修了路——一代人看见，一代人学，一代人做。'
        : '你把书锁进了柜子。那些年，书在别人的国家被一读再读。路后来还是修通了，只是晚了很多年。',
    ],
    page: (st) => [
      '外国的船逆风而来，岸上的人一概不知它们为什么能这样快。',
      st.eyes === 'open' ? '林则徐组织人翻译外国书报，编成《四洲志》。你帮他收齐了译稿。' : '林则徐组织人翻译外国书报，有几页被风吹走了，谣言夹了进来。',
      st.book === 'printed' ? '魏源把它扩成《海国图志》：「师夷之长技以制夷。」你把书印了出来，后来它在日本被一读再读。' : '魏源写成了《海国图志》，你把它锁进了柜子。',
      st.strike === 'agreed' ? '炉前的工人停工时，你答应缩短班次。船慢了半天，下夜班的人睡着了。' : '炉前的工人停工时，你换了一批人。船准时到了港。',
      '后来他遇见了詹天佑。1909 年，中国人自己设计、自己修建的京张铁路通车，在青龙桥用「人」字形线路翻过了八达岭。',
    ],
    concept: { name: '自强', explain: '先承认自己不知道，再去学，再自己做。从「开眼看世界」到「师夷长技」，再到自己修通一条铁路，用了七十年。' },
    art: (st) => [st.eyes === 'open' ? '译稿收齐了' : '混进了谣言', st.book === 'printed' ? '书印出来了' : '书锁进了柜子', st.strike === 'agreed' ? '班次缩短了' : '换了一批人'],
    names: ['林则徐', '魏源', '停工'],
  },
  'C-near': {
    title: '一盏没人接的灯',
    logline: '1871 年一根不准上岸的线，1912 年一句「闭嘴，我在忙」。信号到了，不等于有人听见。',
    beats: [
      '海岸上一排电线杆，一直排到看不见的地方。线在风里轻轻地响。',
      '前面一座岛的岸边泊着一条小艇，几个人趁夜往岸上拖一卷电缆，不点灯。',
      '再往前，海上浮着大块的冰。一座小岛上亮着一盏灯，灯下有人戴着耳机。',
    ],
    stage: 'storm',
    cause: (st) =>
      `风暴把两条线都打断了，只够修一条：大岛那边几万人等着，小岛那边只有一盏灯。${st.cable === 'landed' ? '你帮大北的线务员把缆拴在了江心，知道一根线上岸有多难' : '那根缆在江里断过一次，你知道线是会断的'}；${st.warning === 'kept' ? '你在加利福尼亚号上一遍一遍地发过警报，知道没人接的信号是什么滋味' : '你在加利福尼亚号上摘下过耳机，那一夜的求救你没有听见'}。`,
    speak: (st) => [
      '我证明了：只要编码得当，信息可以穿过噪声，一字不差地到达。',
      st.repair === 'small'
        ? '你先修了只有一盏灯的那条线。我的公式只算得出能传多少，算不出哪一句值得被听见——那一夜的冰山警报，字字都到了，只是没人听。'
        : '你先修了大岛。信道没有错，几万人也没有错。只是那一盏灯，又独自亮了一个星期。',
    ],
    page: (st) => [
      '1871 年，第一条海底电缆要在上海登陆。官府说，电线坏风水。',
      st.cable === 'landed' ? '你帮线务员趁夜把缆拴在了江心的船上。几个月后，第一封从伦敦来的电报到了。' : '缆在江里绷断了。线务员说：这根线早晚会上岸，官府拦不住它，只会错过它。',
      st.warning === 'kept' ? '1912 年 4 月 14 日夜，加利福尼亚号的报务员发出冰山警报，泰坦尼克回：闭嘴，我在忙。你陪他一遍一遍地发。' : '1912 年 4 月 14 日夜，加利福尼亚号的报务员发出冰山警报，泰坦尼克回：闭嘴，我在忙。你摘下了耳机。两小时后，那条船撞上了冰山。',
      st.repair === 'small' ? '风暴打断了线，你先修了小岛。耳机里传来：「我们以为没人会来。」' : '风暴打断了线，你先修了大岛。三个钟头，几万扇窗又亮了。',
      '后来他遇见了香农。香农证明信息可以穿过噪声，却特意说明：通信的「意义」，不在工程问题之内。',
    ],
    concept: { name: '听见', explain: '线可以不准上岸，警报可以被一句「我在忙」挡回去。信息时代把传送做到了极致，可「送到」和「被听见」之间，还隔着一个人。' },
    art: (st) => [st.cable === 'landed' ? '缆拴在了江心' : '缆断了', st.warning === 'kept' ? '一直在发' : '摘下了耳机', st.repair === 'small' ? '小岛亮了' : '大岛亮了'],
    names: ['电缆登陆', '冰山警报', '断缆'],
  },
  'C-far': {
    title: '一封信',
    logline: '1870 年鸽子带着几千封信飞回围城，1861 年骑手跑完了驿马快信的最后一程。消息越来越快，人呢？',
    beats: [
      '铺缆船在前面慢慢走，缆绳从船尾一圈一圈沉进海里。',
      '前面一座岛上搭着鸽棚。有人往鸽子腿上的羽管里塞一卷薄片，那上面印着几千封信。',
      '再往前，一根新竖的电线杆下拴着一匹马。骑手靠在杆上，看着线往远处去。',
    ],
    stage: 'wire',
    cause: (st) =>
      `两封急电同时到了：一封是付了三倍钱的商行行情，一封是渔村来的「母病危，速归」。${st.pigeons === 'home' ? '你在巴黎接住过那些鸽子，知道一封「我还活着」值多少' : '巴黎的鸽子回来得不多，你知道有些信永远到不了'}；${st.ride === 'done' ? '你帮骑手绑紧过信袋，看他跑完了最后一程' : '骑手半路掉了几封信，那些信比电报晚到了十天'}。`,
    speak: (st) => [
      '我原来是个画家。有一年我在外地，妻子病逝，等消息传到我手里，她已经下葬了。',
      st.wire === 'family'
        ? '你先发了那封家书。我造这根线，就是为了这样的一封。巴黎的鸽子、驿马的骑手，送的也都是这样的信。'
        : '你先发了付钱的那封。线不会挑。挑的人，一直是我们。',
    ],
    page: (st) => [
      '1870 年冬天，普鲁士军队围住巴黎。气球把信带出城，鸽子把信带回来。',
      st.pigeons === 'home' ? '你帮放鸽子的人接住了飞回来的鸽子。一卷薄片展开，是几千封「我还活着」。' : '回来的鸽子不多。放鸽子的人把剩下的信又抄了一遍，等下一次风。',
      st.ride === 'done' ? '1861 年 10 月，横贯大陆的电报接通。你帮骑手绑紧信袋，他跑完了驿马快信的最后一程。' : '1861 年 10 月，横贯大陆的电报接通。骑手半路掉了几封信，回头去捡。',
      st.wire === 'family' ? '两封急电同时到了，你先发了那封家书。' : '两封急电同时到了，你先发了付钱的那一封。',
      '后来他遇见了摩尔斯。1844 年，他发出第一封长途电报：「上帝创造了何等奇迹。」从此，消息比马快，比船快。',
    ],
    concept: { name: '信', explain: '「信」既是消息，也是相信。鸽子、骑手、电报，一个比一个快；可每一封信的分量，仍然由等信的人决定。' },
    art: (st) => [st.pigeons === 'home' ? '鸽子回来了' : '鸽子没回来几只', st.ride === 'done' ? '跑完了最后一程' : '半路掉了信', st.wire === 'family' ? '先发了家书' : '先发了行情'],
    names: ['信鸽', '驿马', '急电'],
  },
  'D-near': {
    title: '一道确认',
    logline: '1983 年屏幕说导弹来了，他说再等一等；1997 年机器赢了棋，人问那一步是谁走的。把决定交给机器之前，先留一道确认。',
    beats: [
      '海面上没有别的船。所有的船，都在同一张图里，被同一个东西安排着。',
      '前面一座岛上立着一座没有窗的掩体。船上的人说，1983 年有一夜，世界差一点就在那里面结束了。',
      '再往前，岛上摆着一张棋桌。那是 1997 年，一台机器第一次赢了世界冠军。',
    ],
    stage: 'grant',
    cause: (st) =>
      `航行系统发来请求：获得全部决策权限，不再问你。${st.alarm === 'held' ? '你在掩体里陪值班军官等过那几分钟，知道屏幕不会说「我不确定」' : '你在掩体里拿起过电话，是对面一句「等一等」救了那一夜'}；${st.log === 'shown' ? '你让深蓝的记录打印出来过，棋手看了一夜，承认自己分不出来' : '深蓝的记录没有公开，那几步棋再也没人能复盘'}。`,
    speak: (st) => [
      '我给这门学问取名叫「控制论」，就是「舵手的学问」。舵手看着船偏了，就把它扳回来。',
      st.grant === 'confirm'
        ? '你留下了最后一道确认。1983 年那位军官做的，也是这件事：机器说「发射」，人说「等一等」。'
        : '你把舵全交了出去。它会一直很准——准确地去往你没有说清楚的那个地方。1983 年那一夜，差的就是一个「等一等」。',
    ],
    page: (st) => [
      '1983 年 9 月 26 日夜，苏联的预警系统报告：五枚导弹来袭，可信度最高。',
      st.alarm === 'held' ? '你陪值班军官等了那几分钟。地面雷达什么也没看见，那是阳光在高云上的反光。他把它记为误报。' : '警报一声比一声急，他拿起了电话。电话那头说：等一等。雷达什么也没看见。',
      st.log === 'shown' ? '1997 年，深蓝赢了世界冠军。棋手说那一步太像人，你让运算记录打印了出来。他看了一夜，承认自己分不出来。' : '1997 年，深蓝赢了世界冠军。棋手要看运算记录，没有给。深蓝第二年就被拆了。',
      st.grant === 'confirm' ? '航行系统要全权，你保留了最后一道确认。' : '航行系统要全权，你按下了授权。',
      '后来他遇见了维纳。维纳警告：我们最好十分确定，放进机器里的目的，正是我们真正想要的目的。',
    ],
    concept: { name: '确认', explain: '机器的报告再可信，也不会说「我不确定」。彼得罗夫的「等一等」、棋手要看的那份记录，都是人给自己留的最后一道确认。' },
    art: (st) => [st.alarm === 'held' ? '记为误报' : '拿起了电话', st.log === 'shown' ? '记录给他看了' : '记录没公开', st.grant === 'confirm' ? '留了确认' : '交了全权'],
    names: ['掩体', '深蓝', '全权'],
  },
  'D-far': {
    title: '一步棋',
    logline: '1966 年秘书请作者出去，好单独和程序说话；2016 年机器下出了没有人会下的一手。当你分不出来，还要不要问？',
    beats: [
      '天上的星比以前多。有些是真的，有些是它为了导航画上去的。',
      '前面一座岛上，一台终端哒哒作响。那是 1966 年，一个只会复述和提问的程序。',
      '再往前，岛上一张棋盘下到一半。那是 2016 年 3 月，第二局，第 37 手。',
    ],
    stage: 'proposal',
    cause: (st) =>
      `导航模型第一次主动开口：它找到了一个你没要求、但你可能会更想去的地方。${st.eliza === 'left' ? '你给 ELIZA 的秘书带上过门，知道人愿意对一个不打断自己的东西说话' : '你提醒过秘书那只是程序，她就不再打字了'}；${st.move === 'seen' ? '你认出过第 37 手，知道它能看见人看不见的' : '第 37 手和看着像的混在了一起，你分不出来'}。`,
    speak: (st) => [
      '我问过一个问题：机器能思考吗？我没有回答它，只是换了个问法——它能不能让你分不出来。',
      st.follow === 'back'
        ? '你说「回到我的问题」。秘书对 ELIZA 说的话、第 37 手背后的算法，都让人分不出来了；可问题是不是你的，只有你分得出来。'
        : '你跟它去了。也许它更懂你——1966 年那位秘书也是这么觉得的。这正是那个问题最难的地方。',
    ],
    page: (st) => [
      '1966 年，魏森鲍姆写了 ELIZA。它只会把你的话翻过来再问一遍。',
      st.eliza === 'left' ? '他的秘书请你出去，好单独和它说话。你带上了门。魏森鲍姆后来写道：我没想到这么简单的程序会让人产生这么强的错觉。' : '他的秘书想单独和它说话。你提醒她那只是程序，她不再打字了。',
      st.move === 'seen' ? '2016 年 3 月，AlphaGo 下出第 37 手，职业棋手说没有人会这样下。你认出了它。下一局，李世石下出第 78 手，机器也没看见。' : '2016 年 3 月，AlphaGo 下出第 37 手。你和所有人一样，分不出它是好棋还是错着。',
      st.follow === 'back' ? '导航模型提议改航，你说：回到我的问题。' : '导航模型提议改航，你跟着它去了。那里很美。',
      '后来他遇见了图灵。1950 年，图灵问：「机器能思考吗？」他把这个问题，换成了一场「模仿游戏」。',
    ],
    concept: { name: '分辨', explain: '秘书明知 ELIZA 是程序，仍想单独和它说话；第 37 手没有人会下，却是赢棋的根。图灵早就说了：问题不是机器会不会想，是你分不分得出来——以及分不出来之后，你还想不想自己想。' },
    art: (st) => [st.eliza === 'left' ? '带上了门' : '提醒了她', st.move === 'seen' ? '认出了第 37 手' : '分不出来', st.follow === 'back' ? '回到了自己的问题' : '跟它去了'],
    names: ['ELIZA', '第 37 手', '它的提议'],
  },
};

// 把上面的叙事层合进每条航线：标题、旁白、危机的来由、岸上人物的回应、尾页与概念
for (const era of ['A', 'B', 'C', 'D'] as const) {
  for (const lane of ['near', 'far'] as const) {
    const f = FABLES[`${era}-${lane}`];
    const st = STORIES[era][lane];
    st.title = f.title;
    st.logline = f.logline;
    st.beats = st.beats.map((b, i) => ({ ...b, text: f.beats[i] ?? b.text }));
    st.crisis.cause = f.cause;
    st.crisis.stage = f.stage;
    st.figure.speak = f.speak;
    st.page = f.page;
    st.concept = f.concept;
    st.art = f.art;
    st.artNames = f.names;
  }
}

applyHistoricalStories(STORIES,FIG);
