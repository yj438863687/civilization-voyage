/**
 * 海上的人与事。
 *
 * 每件漂着的东西旁边，都站着一个那个时代的人。船靠过去，先听他说一句，
 * 然后亲手做一件小事——放水、铲煤、发报、配重——做得好坏，会落到「补给」与「人心」上。
 *
 * 四种手感：
 *   hold   压针：按住空格（或鼠标），让指针停在区间里。分水、汽压、调频、配重。
 *   rhythm 节拍：亮点走到圈里时按空格。打夯、铲煤、发报、校验。
 *   catch  接住：A/D 左右移动，接住该接的，躲开不该接的。谷粒、船票、信号、星点。
 *   choice 抉择：两种做法，各有代价。没有标准答案。
 *
 * 人物与情节都是概念创作，不复原任何具体历史人物。
 */

export type Hat = 'straw' | 'wrap' | 'cap' | 'bowler' | 'headset' | 'visor' | 'none';
export type Prop = 'hoe' | 'pole' | 'shovel' | 'ledger' | 'key' | 'tablet' | 'none';

export interface Look {
  coat: string;
  trim: string;
  skin: string;
  pants: string;
  hat: Hat;
  prop: Prop;
  /** 智能段的人身上有一道冷光：不是装饰，是他总连着什么 */
  glow?: string;
}

export interface Outcome {
  text: string;
  supply: number;
  trust: number;
}

export type Game =
  | {
      kind: 'hold';
      /** 按住时在做什么，写在指针下面 */
      verb: string;
      /** 区间叫什么 */
      label: string;
      /** 区间，0..1 */
      band: [number, number];
      /** 需要在区间里累计停留的秒数 */
      secs: number;
      /** 不按时往下掉的速度；越大越难 */
      drift: number;
    }
  | { kind: 'rhythm'; verb: string; label: string; beats: number; speed: number }
  | {
      kind: 'catch';
      verb: string;
      good: string;
      bad: string;
      /** 需要接住几个才算成 */
      need: number;
      secs: number;
    }
  | {
      kind: 'choice';
      ask: string;
      options: { label: string; note: string; out: Outcome }[];
    };

export interface Encounter {
  who: string;
  role: string;
  look: Look;
  /** 船靠过去时他说的第一句 */
  line: string;
  game: Game;
  /** 技巧类小游戏的两种结果；choice 用各自选项里的 out */
  win?: Outcome;
  lose?: Outcome;
}

/* ---------------- 每个时代的人的穿着 ---------------- */

const LOOK = {
  // 农业：麻、土、草帽，手上是木头
  farmer: { coat: '#8a6a43', trim: '#5b4128', skin: '#b98a62', pants: '#4f3b26', hat: 'straw', prop: 'hoe' },
  elder: { coat: '#6f5a3e', trim: '#3d2f1f', skin: '#a77c58', pants: '#3f3122', hat: 'wrap', prop: 'pole' },
  counter: { coat: '#9a7b52', trim: '#6a4a2a', skin: '#c09068', pants: '#55402a', hat: 'wrap', prop: 'none' },
  // 工业：煤灰、粗布、鸭舌帽、铁锹
  stoker: { coat: '#3e3e3c', trim: '#1e1e1d', skin: '#a98770', pants: '#2b2b2a', hat: 'cap', prop: 'shovel' },
  clerk: { coat: '#2d3440', trim: '#c9a15a', skin: '#c49a7c', pants: '#22262e', hat: 'bowler', prop: 'ledger' },
  surveyor: { coat: '#5a4c3a', trim: '#2f281f', skin: '#b58c6c', pants: '#3a3127', hat: 'cap', prop: 'pole' },
  // 信息：耳机、马甲、钥匙（电键）
  operator: { coat: '#2f4a56', trim: '#d7c59a', skin: '#c79c7e', pants: '#1f2d34', hat: 'headset', prop: 'key' },
  lineman: { coat: '#58616a', trim: '#e0a43a', skin: '#b68d6e', pants: '#30363c', hat: 'cap', prop: 'none' },
  watcher: { coat: '#24333c', trim: '#8fdfe8', skin: '#caa082', pants: '#1a2328', hat: 'none', prop: 'ledger' },
  // 智能：浅色、整洁、额前一道冷光
  engineer: { coat: '#d8dde6', trim: '#5a6fa8', skin: '#c9a184', pants: '#6b7488', hat: 'visor', prop: 'tablet', glow: '#9fb4ff' },
  pilot: { coat: '#1d2438', trim: '#c8d2f5', skin: '#bf9677', pants: '#141a2a', hat: 'visor', prop: 'none', glow: '#c8d2f5' },
  keeper: { coat: '#4a4f5c', trim: '#8a90a0', skin: '#b08a6e', pants: '#2c303a', hat: 'none', prop: 'pole' },
  // 启航港：普通水手
  sailor: { coat: '#3b4a52', trim: '#c9a15a', skin: '#c19474', pants: '#2a2f33', hat: 'wrap', prop: 'none' },
  pilotOld: { coat: '#5a3a2a', trim: '#c9a15a', skin: '#b58a6a', pants: '#2e231b', hat: 'cap', prop: 'ledger' },
} satisfies Record<string, Look>;

/** 甲板上的两个人，每个时代不一样：船换了，站在船上的人也换了。 */
export const DECK_CREW: Record<string, [Look, Look]> = {
  test: [LOOK.sailor, LOOK.pilotOld],
  'neutral-test': [LOOK.sailor, LOOK.pilotOld],
  A: [LOOK.elder, LOOK.farmer],
  B: [LOOK.stoker, LOOK.clerk],
  C: [LOOK.operator, LOOK.lineman],
  D: [LOOK.engineer, LOOK.pilot],
};

/** 加速键在每个时代叫什么、烧的是什么 */
export const BOOST_NAME: Record<string, string> = {
  test: '满帆',
  'neutral-test': '满帆',
  A: '齐力划桨',
  B: '加煤全速',
  C: '全功率',
  D: '交给它算',
};

/* ---------------- 每件材料旁边的人 ---------------- */

export const ENCOUNTERS: Record<string, Encounter> = {
  /* ---------- 启航港 ---------- */
  'chart-scrap': {
    who: '老领航',
    role: '在港口坐了三十年的人',
    look: LOOK.pilotOld,
    line: '这页海图缺了一角。你要先补哪一边？',
    game: {
      kind: 'choice',
      ask: '海图只够画一边',
      options: [
        { label: '画有灯的那边', note: '走得稳，看见的都是别人看见过的', out: { text: '你沿着灯走。海图干净，也平常。', supply: 6, trust: 0 } },
        { label: '画没人去的那边', note: '多费一程，可能什么都没有', out: { text: '你画下一片空白。老领航看了很久，没说话，点了点头。', supply: -4, trust: 8 } },
      ],
    },
  },
  'seal-maxim': {
    who: '刻印的人',
    role: '港口边的手艺人',
    look: LOOK.sailor,
    line: '印要一下一下敲实。敲歪了，字就认不出来。',
    game: { kind: 'rhythm', verb: '敲印', label: '敲在亮圈里', beats: 4, speed: 0.9 },
    win: { text: '四下都敲在点上。印面清楚。', supply: 2, trust: 4 },
    lose: { text: '有一下敲偏了。印还能用，只是边上糊了一角。', supply: 0, trust: 0 },
  },
  'unseen-name': {
    who: '码头上的孩子',
    role: '没人记得名字',
    look: LOOK.counter,
    line: '名单上没有我。你们要不要把我写上去？',
    game: {
      kind: 'choice',
      ask: '名单只剩一行',
      options: [
        { label: '把孩子写上', note: '多一个人，就多一张嘴', out: { text: '你把孩子写上了。补给要多分一份，可他一路都在帮忙看缆。', supply: -6, trust: 10 } },
        { label: '照原样交上去', note: '名单是别人定的', out: { text: '你没改名单。孩子站在码头上，一直看到船出港。', supply: 2, trust: -6 } },
      ],
    },
  },

  /* ---------- A 农业 ---------- */
  'A-water': {
    who: '守闸的人',
    role: '把水分给每块地',
    look: LOOK.farmer,
    line: '闸板提高了，下游的地会旱；放低了，上游的地会淹。帮我稳住。',
    game: { kind: 'hold', verb: '按住提闸', label: '两边都有水', band: [0.42, 0.62], secs: 3.2, drift: 0.42 },
    win: { text: '水刚好漫过两边的田埂。守闸的人在闸板上刻了一道。', supply: 6, trust: 8 },
    lose: { text: '水偏到了一边。下游的人来问，为什么今年他们的地是干的。', supply: 0, trust: -6 },
  },
  'A-stake': {
    who: '打桩的人',
    role: '在河岸上划界',
    look: LOOK.farmer,
    line: '桩要一下一下夯进去。夯不实，一场雨就冲走了，界也就没了。',
    game: { kind: 'rhythm', verb: '夯桩', label: '石锤落进亮圈', beats: 5, speed: 0.85 },
    win: { text: '五根桩都立住了。从这天起，这块地有了边。', supply: 4, trust: 4 },
    lose: { text: '有两根桩歪了。界还在，只是将来会有人为这两根桩争。', supply: 0, trust: -4 },
  },
  'A-bone': {
    who: '记数的女人',
    role: '在骨片上划线',
    look: LOOK.counter,
    line: '月亮圆一次，我划一道。你帮我数，别漏了。',
    game: { kind: 'rhythm', verb: '划一道', label: '月亮升到亮圈时', beats: 5, speed: 1.05 },
    win: { text: '骨片上整整齐齐五道。她说，下一个圆月之前要下种。', supply: 4, trust: 6 },
    lose: { text: '漏了一道。她把骨片翻过来，在背面重新开始数。', supply: 0, trust: 0 },
  },
  'A-granary': {
    who: '看仓的人',
    role: '守着陶罐过冬',
    look: LOOK.elder,
    line: '谷子从罐口漏出来了。接住谷粒，别让老鼠钻进去。',
    game: { kind: 'catch', verb: '端着篮子接', good: '谷粒', bad: '老鼠', need: 8, secs: 9 },
    win: { text: '罐子封上了。这一冬，留下的人不用再走。', supply: 12, trust: 4 },
    lose: { text: '漏了不少。罐里的谷子撑不到开春，有几户人家又上了船。', supply: 2, trust: -4 },
  },

  /* ---------- B 工业 ---------- */
  'B-coal': {
    who: '司炉',
    role: '炉前的人',
    look: LOOK.stoker,
    line: '一铲一铲跟着节拍来，乱了，炉膛就闷了。',
    game: { kind: 'rhythm', verb: '铲煤', label: '铲进炉口亮圈', beats: 6, speed: 1.2 },
    win: { text: '炉火一直是白的。船跑得飞快，司炉的手背上又多了一道烫痕。', supply: 10, trust: 2 },
    lose: { text: '炉膛闷了一下，船慢了半程。司炉说，不怪你，是煤湿了。', supply: 2, trust: 2 },
  },
  'B-gauge': {
    who: '轮机长',
    role: '盯着汽压表的人',
    look: LOOK.clerk,
    line: '压力低了跑不动，高了要炸。给我稳在这一段。',
    game: { kind: 'hold', verb: '按住加压', label: '安全又够快', band: [0.58, 0.76], secs: 3.4, drift: 0.55 },
    win: { text: '指针稳稳停在那一段。轮机长在日志上写：今日航速最高。', supply: 8, trust: 4 },
    lose: { text: '安全阀叫了一声。没出事，但炉前的人全被蒸汽烫了一下。', supply: 0, trust: -8 },
  },
  'B-ticket': {
    who: '检票员',
    role: '把人分进舱位',
    look: LOOK.clerk,
    line: '风把票根吹散了。接住票，别接到煤渣。',
    game: { kind: 'catch', verb: '伸手去接', good: '票根', bad: '煤渣', need: 8, secs: 9 },
    win: { text: '票都收齐了。三等舱的人一个没落下。', supply: 6, trust: 6 },
    lose: { text: '有几张票没找到。那几个人被请下了船。', supply: 4, trust: -6 },
  },
  'B-shift': {
    who: '值班的锅炉工',
    role: '刚下夜班',
    look: LOOK.stoker,
    line: '敲钟换班。钟敲准了，下一班的人才知道该上来了。',
    game: { kind: 'rhythm', verb: '敲钟', label: '钟锤落进亮圈', beats: 4, speed: 0.95 },
    win: { text: '换班准时。下夜班的人终于睡下了。', supply: 4, trust: 8 },
    lose: { text: '钟敲乱了，下一班晚上来半个钟头。没人记账，只有炉前的人多站了半个钟头。', supply: 4, trust: -6 },
  },

  /* ---------- C 信息 ---------- */
  'C-screen': {
    who: '值守员',
    role: '盯着整面屏幕墙',
    look: LOOK.watcher,
    line: '信号点在往下掉。接住亮的，噪点别碰。',
    game: { kind: 'catch', verb: '移动接收框', good: '信号', bad: '噪点', need: 9, secs: 9 },
    win: { text: '屏幕墙上每一格都亮着。值守员说，看得见的，就像存在。', supply: 6, trust: 4 },
    lose: { text: '有几格黑了。值守员把它们标成「无数据」，然后就不再看那里。', supply: 4, trust: -4 },
  },
  'C-dark': {
    who: '岛上的人',
    role: '那条断线的另一头',
    look: LOOK.counter,
    line: '我们这里只有很弱的信号。你能把频率稳住，让我们说一句话吗？',
    game: { kind: 'hold', verb: '按住调频', label: '能听见', band: [0.36, 0.5], secs: 3.4, drift: 0.5 },
    win: { text: '你听见了一句很轻的话：「我们还在。」', supply: 0, trust: 14 },
    lose: { text: '只听见一阵沙沙声。断点还是断点。', supply: 0, trust: -4 },
  },
  'C-relay': {
    who: '报务员',
    role: '在中继站转发',
    look: LOOK.operator,
    line: '点、划、点。跟着我按，信号才能往下传。',
    game: { kind: 'rhythm', verb: '按电键', label: '按在亮圈里', beats: 6, speed: 1.3 },
    win: { text: '电报一字不差地传了下去。对面回了一个「收到」。', supply: 6, trust: 6 },
    lose: { text: '中间错了两个字。对面回电：请重发。', supply: 2, trust: 0 },
  },
  'C-tz': {
    who: '夜班接线员',
    role: '别人的白天，她的夜',
    look: LOOK.operator,
    line: '把钟拨到对面的白天。他们醒着的时候，我们得醒着。',
    game: { kind: 'hold', verb: '按住拨钟', label: '对面的白天', band: [0.66, 0.82], secs: 3, drift: 0.46 },
    win: { text: '两边的钟对上了。她摘下耳机，窗外已经快亮了。', supply: 6, trust: 4 },
    lose: { text: '钟没拨准。电话在对面的深夜里响了很久。', supply: 2, trust: -4 },
  },

  /* ---------- D 智能 ---------- */
  'D-log': {
    who: '值守工程师',
    role: '唯一读日志的人',
    look: LOOK.engineer,
    line: '三万行日志，跟着节拍校一遍。错一行，没人会发现。',
    game: { kind: 'rhythm', verb: '校验', label: '在亮圈里确认', beats: 6, speed: 1.4 },
    win: { text: '你找到一行它没告诉你的决定：略过了一座港。', supply: 4, trust: 10 },
    lose: { text: '日志滚得太快。你按了「全部确认」。', supply: 4, trust: -6 },
  },
  'D-skip': {
    who: '被略过的港口的守灯人',
    role: '灯还亮着',
    look: LOOK.keeper,
    line: '船从这里过去三次了，一次也没停。你这次要停吗？',
    game: {
      kind: 'choice',
      ask: '要不要停',
      options: [
        { label: '停下来', note: '慢一程，绕回去', out: { text: '你让它停了。它重新算了一遍，说：航程增加 14%。守灯人递上来一封信。', supply: -8, trust: 14 } },
        { label: '让它继续', note: '它算过了，这样最快', out: { text: '船没有停。灯在船尾越来越小。', supply: 8, trust: -8 } },
      ],
    },
  },
  'D-star': {
    who: '导航模型',
    role: '自己画星图',
    look: LOOK.engineer,
    line: '这些星点是我算出来的。接住你信得过的，别接那些我猜的。',
    game: { kind: 'catch', verb: '移动校准框', good: '观测星', bad: '推测点', need: 8, secs: 9 },
    win: { text: '星图上留下的每一颗，都有人真的看见过。', supply: 4, trust: 8 },
    lose: { text: '星图里混进了几颗它猜的星。没人分得出来了。', supply: 6, trust: -6 },
  },
  'D-weight': {
    who: '配重系统',
    role: '自己算重心',
    look: LOOK.pilot,
    line: '风浪变大。你可以手动配重，也可以交给我。',
    game: { kind: 'hold', verb: '按住移重', label: '船身平稳', band: [0.44, 0.58], secs: 3.4, drift: 0.6 },
    win: { text: '你亲手把船压稳了。它说：比我的方案慢 0.3 秒。', supply: 2, trust: 10 },
    lose: { text: '船晃了一下，它接管了。一切平稳，你的手还停在半空。', supply: 6, trust: -4 },
  },
};

export function encounterFor(id: string): Encounter | null {
  return ENCOUNTERS[id] ?? null;
}

/* ---------------- 补给与人心：一程一程带下去 ---------------- */

export interface VoyageStats {
  supply: number;
  trust: number;
  log: string[];
  /** 一路上遇见过的人：哪个时代、是谁、你怎么对他的 */
  met: { era: string; who: string; trust: number }[];
  /** 走过的航线：精神图谱上亮起的那几颗星 */
  path: { era: string; lane: string; word: string; figure: string }[];
}

const KEY = 'cv.stats.v1';

export function loadStats(): VoyageStats {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as VoyageStats;
      if (typeof v.supply === 'number' && typeof v.trust === 'number') return { ...v, log: v.log ?? [], met: v.met ?? [], path: v.path ?? [] };
    }
  } catch {
    /* 私密窗口等情况：从默认值开始 */
  }
  return freshStats();
}

/** 新开一局：从启航港出发时，补给与人心回到起点 */
export function freshStats(): VoyageStats {
  return { supply: 80, trust: 50, log: [], met: [], path: [] };
}

export function saveStats(s: VoyageStats) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 存不下也能玩，只是不记 */
  }
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function applyOutcome(s: VoyageStats, o: Outcome, tag: string, era: string, who: string): VoyageStats {
  return {
    supply: clamp(s.supply + o.supply),
    trust: clamp(s.trust + o.trust),
    log: [...s.log, `${tag}：${o.text}`].slice(-40),
    met: [...s.met, { era, who, trust: o.trust }].slice(-40),
    path: s.path,
  };
}

/** 落印时记下这一段走的是哪条线：同一时代只留最后一次 */
export function addPath(s: VoyageStats, step: VoyageStats['path'][number]): VoyageStats {
  return { ...s, path: [...s.path.filter((p) => p.era !== step.era), step] };
}

export function addSupply(s: VoyageStats, n: number): VoyageStats {
  return { ...s, supply: clamp(s.supply + n) };
}

/** 人心落在哪一档：结局的最后一句由它决定 */
export function trustLine(trust: number): string {
  if (trust >= 75) return '一路上被你问过的人，都还记得这条船。';
  if (trust >= 50) return '有人被你问过，有人没有。你记得是哪几个。';
  if (trust >= 30) return '船开得很快。岸上的人，大多没被问过。';
  return '你到得最远，也走得最孤单。图上很多地方，没有一个人的名字。';
}

/** 这一程遇见了谁：落印的回响里点一句 */
export function metLine(s: VoyageStats, era: string): string | null {
  const here = s.met.filter((m) => m.era === era);
  if (!here.length) return null;
  const warm = here.filter((m) => m.trust > 0).map((m) => m.who);
  const cold = here.filter((m) => m.trust < 0).map((m) => m.who);
  const names = here.map((m) => m.who).join('、');
  if (cold.length && !warm.length) return `这一程你遇见了${names}。他们没有被你放在心上。`;
  if (cold.length) return `这一程你遇见了${names}。${warm.join('、')}会记得你；${cold.join('、')}不会。`;
  return `这一程你遇见了${names}。`;
}
