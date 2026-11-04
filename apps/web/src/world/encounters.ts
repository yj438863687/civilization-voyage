import { enrichHistoricalEncounters } from './historicalEncounters';
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

export type Hat = 'straw' | 'wrap' | 'cap' | 'bowler' | 'headset' | 'visor' | 'guan' | 'none';
export type Prop = 'hoe' | 'pole' | 'shovel' | 'ledger' | 'key' | 'tablet' | 'mallet' | 'urn' | 'staff' | 'none';

export interface Look {
  coat: string;
  trim: string;
  skin: string;
  pants: string;
  hat: Hat;
  prop: Prop;
  /** 智能段的人身上有一道冷光：不是装饰，是他总连着什么 */
  glow?: string;
  /** 眼睛几只：仓颉相传「四目」 */
  eyes?: 0 | 2 | 4;
  /** 骨骼模型：古代文士 mage、古代劳作 barbarian、近现代 rogue、夜里干活 hooded、军官 knight */
  model?: 'barbarian' | 'knight' | 'mage' | 'rogue' | 'hooded';
}

export interface Outcome {
  skillSucceeded?: boolean;
  text: string;
  supply: number;
  trust: number;
  /** 这件事留下了什么：后面的危机、岸上的人、最后那一页都会读它 */
  set?: Record<string, string>;
}

/** 岛上的人在做什么：决定他的动作和岛上的景 */
export type Action = 'idle' | 'watch' | 'hammer' | 'shovel' | 'tap' | 'count';
export type Stage =
  | 'gate' | 'stakes' | 'tally' | 'jars' | 'mules' | 'loom' | 'books' | 'press'
  | 'engine' | 'telegraph' | 'landing' | 'wireless' | 'pigeons' | 'pony' | 'bunker' | 'chess' | 'terminal' | 'goboard';

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
  historyId?: string;
  social?: {ask:string;options:{label:string;note:string;out:Outcome}[]};
  who: string;
  role: string;
  look: Look;
  /** 船靠过去时他说的第一句 */
  line: string;
  /** 小王子式的一问一答：你问「为什么」，他的回答把他的执念说破 */
  dialog?: { you?: string; them?: string }[];
  /** 他一直在做的事 */
  action?: Action;
  /** 他住的那座小岛上摆着什么：会跟着你的选择改变 */
  stage?: Stage;
  game: Game;
  /** 技巧类小游戏的两种结果；choice 用各自选项里的 out */
  win?: Outcome;
  lose?: Outcome;
}

/* ---------------- 每个时代的人的穿着 ---------------- */

const LOOK = {
  // 农业：麻、土、草帽，手上是木头
  farmer: { coat: '#8a6a43', trim: '#5b4128', skin: '#b98a62', pants: '#4f3b26', hat: 'straw', prop: 'hoe', model: 'barbarian' },
  elder: { coat: '#6f5a3e', trim: '#3d2f1f', skin: '#a77c58', pants: '#3f3122', hat: 'wrap', prop: 'pole', model: 'rogue' },
  counter: { coat: '#9a7b52', trim: '#6a4a2a', skin: '#c09068', pants: '#55402a', hat: 'wrap', prop: 'none', model: 'rogue' },
  // 工业：煤灰、粗布、鸭舌帽、铁锹
  stoker: { coat: '#3e3e3c', trim: '#1e1e1d', skin: '#a98770', pants: '#2b2b2a', hat: 'cap', prop: 'shovel', model: 'rogue' },
  clerk: { coat: '#2d3440', trim: '#c9a15a', skin: '#c49a7c', pants: '#22262e', hat: 'bowler', prop: 'ledger', model: 'rogue' },
  surveyor: { coat: '#5a4c3a', trim: '#2f281f', skin: '#b58c6c', pants: '#3a3127', hat: 'cap', prop: 'pole', model: 'rogue' },
  // 信息：耳机、马甲、钥匙（电键）
  operator: { coat: '#2f4a56', trim: '#d7c59a', skin: '#c79c7e', pants: '#1f2d34', hat: 'headset', prop: 'key', model: 'rogue' },
  lineman: { coat: '#58616a', trim: '#e0a43a', skin: '#b68d6e', pants: '#30363c', hat: 'cap', prop: 'none', model: 'hooded' },
  watcher: { coat: '#24333c', trim: '#8fdfe8', skin: '#caa082', pants: '#1a2328', hat: 'none', prop: 'ledger', model: 'rogue' },
  // 智能：浅色、整洁、额前一道冷光
  engineer: { coat: '#d8dde6', trim: '#5a6fa8', skin: '#c9a184', pants: '#6b7488', hat: 'visor', prop: 'tablet', model: 'rogue', glow: '#9fb4ff' },
  pilot: { coat: '#1d2438', trim: '#c8d2f5', skin: '#bf9677', pants: '#141a2a', hat: 'visor', prop: 'none', model: 'rogue', glow: '#c8d2f5' },
  keeper: { coat: '#4a4f5c', trim: '#8a90a0', skin: '#b08a6e', pants: '#2c303a', hat: 'none', prop: 'pole', model: 'rogue' },
  // 启航港：普通水手
  sailor: { coat: '#3b4a52', trim: '#c9a15a', skin: '#c19474', pants: '#2a2f33', hat: 'wrap', prop: 'none', model: 'rogue' },
  pilotOld: { coat: '#5a3a2a', trim: '#c9a15a', skin: '#b58a6a', pants: '#2e231b', hat: 'cap', prop: 'ledger', model: 'rogue' },
} satisfies Record<string, Look>;

/** 玩家自己的穿着：跟着时代换，但一直是同一个人（那块靛蓝）。 */
export const PLAYER_LOOK: Record<string, Look> = {
  test: { coat: '#2c3e50', trim: '#c9a15a', skin: '#c19474', pants: '#1e2a33', hat: 'none', prop: 'none', model: 'rogue' },
  'neutral-test': { coat: '#2c3e50', trim: '#c9a15a', skin: '#c19474', pants: '#1e2a33', hat: 'none', prop: 'none', model: 'rogue' },
  A: { coat: '#3a4a52', trim: '#b08a4a', skin: '#c19474', pants: '#2c2620', hat: 'straw', prop: 'none' },
  B: { coat: '#2f3a46', trim: '#c9a15a', skin: '#c19474', pants: '#232a32', hat: 'cap', prop: 'none', model: 'rogue' },
  C: { coat: '#2c4a56', trim: '#d7c59a', skin: '#c19474', pants: '#1f2d34', hat: 'none', prop: 'none', model: 'rogue' },
  D: { coat: '#2a3450', trim: '#c8d2f5', skin: '#c19474', pants: '#1a2030', hat: 'none', prop: 'none', glow: undefined },
};

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


/* ---------------- 典籍与史书里的人 ---------------- */
const CL = {
  gun: { coat: '#5a4a36', trim: '#3a2c1e', skin: '#a77c58', pants: '#3a2c1e', hat: 'wrap', prop: 'shovel', model: 'barbarian' },
  yu: { coat: '#6a5a40', trim: '#8a7448', skin: '#a07450', pants: '#4a3a26', hat: 'straw', prop: 'hoe', model: 'barbarian' },
  cangjie: { coat: '#7a6a4e', trim: '#c9a15a', skin: '#b98d66', pants: '#4a3a28', hat: 'wrap', prop: 'none', model: 'rogue', eyes: 4 },
  houji: { coat: '#7a6a3e', trim: '#5a4a28', skin: '#b38660', pants: '#4a3a24', hat: 'straw', prop: 'hoe', model: 'barbarian' },
  elder: { coat: '#8a7a5e', trim: '#5a4a34', skin: '#b08a6a', pants: '#4a3e2c', hat: 'wrap', prop: 'urn', model: 'rogue' },
  weaver: { coat: '#4a4038', trim: '#8a7448', skin: '#b08870', pants: '#2e2a26', hat: 'cap', prop: 'mallet', model: 'rogue' },
  lin: { coat: '#2a3a4a', trim: '#c9a15a', skin: '#c49a76', pants: '#1e2630', hat: 'guan', prop: 'ledger', model: 'rogue' },
  wei: { coat: '#3a3a3e', trim: '#a89a7a', skin: '#c29a78', pants: '#24242a', hat: 'wrap', prop: 'ledger', model: 'rogue' },
  prisoner: { coat: '#4a4440', trim: '#2a2622', skin: '#a8866a', pants: '#2e2a26', hat: 'none', prop: 'none' },
  blind: { coat: '#6a5a48', trim: '#4a3e30', skin: '#b08a6a', pants: '#3a3026', hat: 'wrap', prop: 'pole', eyes: 0 },
  king: { coat: '#6a2a22', trim: '#d8b060', skin: '#c49a76', pants: '#3a1a14', hat: 'guan', prop: 'none' },
  suwu: { coat: '#5a5246', trim: '#c8a070', skin: '#a8805e', pants: '#3a342a', hat: 'wrap', prop: 'staff' },
  apprentice: { coat: '#3a3a5a', trim: '#c8b070', skin: '#d2a789', pants: '#24243a', hat: 'cap', prop: 'none' },
  hundun: { coat: '#c8b898', trim: '#8a7a5a', skin: '#d8c8a8', pants: '#8a7a5a', hat: 'none', prop: 'none', eyes: 0 },
  zhuang: { coat: '#6a6a5a', trim: '#a8a080', skin: '#c49a76', pants: '#3a3a30', hat: 'wrap', prop: 'none' },
  muleteer: { coat: '#4a3e34', trim: '#2a2420', skin: '#a8805e', pants: '#2e2822', hat: 'straw', prop: 'pole', model: 'rogue' },
  lineman: { coat: '#2f3e46', trim: '#c9a15a', skin: '#c49a76', pants: '#1f2a30', hat: 'cap', prop: 'none', model: 'hooded' },
  operator: { coat: '#2f4a56', trim: '#d7c59a', skin: '#d4ab8c', pants: '#1f2d34', hat: 'headset', prop: 'key', model: 'rogue' },
  pigeoneer: { coat: '#5a5048', trim: '#8a7a5a', skin: '#c8a080', pants: '#3a342c', hat: 'cap', prop: 'none', model: 'hooded' },
  rider: { coat: '#6a4a32', trim: '#c9a15a', skin: '#b88c6a', pants: '#3a2a1e', hat: 'cap', prop: 'none', model: 'rogue' },
  officer: { coat: '#3a4a3a', trim: '#c8b060', skin: '#d2a789', pants: '#2a362a', hat: 'cap', prop: 'none', model: 'knight' },
  operator2: { coat: '#e8e8e8', trim: '#2a2a3a', skin: '#d2a789', pants: '#2a2a3a', hat: 'none', prop: 'ledger', model: 'rogue' },
  secretary: { coat: '#8a5a6a', trim: '#e8d8c8', skin: '#d6b094', pants: '#4a3a44', hat: 'none', prop: 'none', model: 'rogue' },
  recorder: { coat: '#3a3a4a', trim: '#c8d2f5', skin: '#c9a184', pants: '#24242e', hat: 'none', prop: 'ledger', model: 'rogue', glow: '#9fb4ff' },
} satisfies Record<string, Look>;

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

  /* ---------- A 农业 · 治水：鲧与禹 ---------- */
  'A-water': {
    who: '鲧',
    role: '《山海经》：「鲧窃帝之息壤以堙洪水」',
    look: CL.gun,
    action: 'shovel',
    stage: 'stakes',
    line: '这座岛被一圈土堤围着。一个人在往堤上填土，填了九年，水一直没有退。',
    dialog: [
      { you: '你为什么一直在加高堤坝？' },
      { them: '水来了，就挡住它。挡得越高，越安全。' },
      { you: '可水一直在涨。' },
      { them: '那就再高一点。——你说，最后这一段，是接着堵上，还是给它留条路？' },
    ],
    game: {
      kind: 'choice',
      ask: '最后一段堤',
      options: [
        { label: '堵上', note: '照他的办法：水来土掩', out: { text: '你帮他把最后一段堤也堵上了。水被挡在外面，越积越高。「九年而水不息。」', supply: 4, trust: -4, set: { stakes: 'closed' } } },
        { label: '留一道口子', note: '给水一条出路', out: { text: '你在堤上开了一道口子。水从口子里流走了一些。鲧看着它，很久没有说话。', supply: -2, trust: 8, set: { stakes: 'gap' } } },
      ],
    },
  },
  'A-stake': {
    who: '禹',
    role: '《史记》：「居外十三年，过家门不敢入」',
    look: CL.yu,
    action: 'watch',
    stage: 'gate',
    line: '下一座岛上，一个晒得很黑的人在开渠。岛那头有一间屋子，门口有人在等他。',
    dialog: [
      { you: '你的家就在那里，为什么不回去？' },
      { them: '我父亲用堵的办法，治了九年，没有成。我不能再那样。' },
      { you: '那你要怎么办？' },
      { them: '水要往低处去，就顺着它，替它开路，把它分到两边的田里去。帮我扶住这道闸。' },
    ],
    game: { kind: 'hold', verb: '按住提闸', label: '两边的田都喝到水', band: [0.42, 0.62], secs: 3.2, drift: 0.42 },
    win: { text: '水顺着渠分到了两边的田里。禹抬头看了一眼家门，又低下头去开下一条渠。', supply: 6, trust: 8, set: { gate: 'even' } },
    lose: { text: '水偏到了一边，一块田淹了，一块田裂了。禹说：再来。他又一次走过了家门。', supply: 0, trust: -2, set: { gate: 'tilt' } },
  },

  /* ---------- A 农业 · 记时：仓颉与后稷 ---------- */
  'A-bone': {
    who: '仓颉',
    role: '《淮南子》：「仓颉作书，而天雨粟，鬼夜哭」',
    look: CL.cangjie,
    action: 'count',
    stage: 'tally',
    line: '岛上立着一块石头。一个长着四只眼睛的人，在上面刻着鸟兽的足迹。',
    dialog: [
      { you: '你在刻什么？' },
      { them: '我看鸟的爪印、兽的蹄印，把它们变成记号。记号就是字。' },
      { you: '有了字会怎样？' },
      { them: '人会记住很多事，也会忘了很多事。——天要下粟了，鬼要哭了。帮我刻完这几个字。' },
    ],
    game: { kind: 'rhythm', verb: '刻字', label: '刀落进亮圈', beats: 5, speed: 0.85 },
    win: { text: '最后一笔刻完，天上真的落下了谷粒。远处，有什么东西在夜里哭了。', supply: 8, trust: 6, set: { tally: 'full' } },
    lose: { text: '有两个字刻歪了。仓颉说：没关系，后人会替我们改。可有些事，从此记错了。', supply: 2, trust: 0, set: { tally: 'missed' } },
  },
  'A-granary': {
    who: '后稷',
    role: '《史记》：「好耕农，相地之宜……民皆法则之」',
    look: CL.houji,
    action: 'hammer',
    stage: 'jars',
    line: '这座岛上是一片麦田。一个人在田里弯着腰，身后排着一排陶罐。',
    dialog: [
      { you: '你为什么把谷子装进罐子？' },
      { them: '吃掉的是今天，罐子里的是明年。' },
      { you: '可是今天有人饿着。' },
      { them: '所以要会种，也要会存。收成到了，帮我把谷子装进去，别让老鼠钻了空子。' },
    ],
    game: { kind: 'catch', verb: '端着篮子接', good: '谷粒', bad: '老鼠', need: 8, secs: 9 },
    win: { text: '罐子都装满了。后稷说：这些够过冬，也够明年下种。', supply: 12, trust: 4, set: { jars: 'full' } },
    lose: { text: '罐子只装了一半。后稷说：今年要省着吃，种子不能动。', supply: 2, trust: -2, set: { jars: 'low' } },
  },

  /* ---------- B 工业 · 动力：唐胥铁路的马拉火车（1881）与卢德织工（1811） ---------- */
  'B-coal': {
    who: '唐胥铁路的骡夫',
    role: '1881 年，中国第一条铁路通车。机车被禁，火车由骡马拉着走',
    look: CL.muleteer,
    action: 'idle',
    stage: 'mules',
    line: '岛上铺着一段铁轨。轨道上停着几节煤车，车前套着的不是机车，是几匹骡子。',
    dialog: [
      { you: '铁路修好了，为什么还用骡子拉？' },
      { them: '朝廷说，机车喷烟放炮，惊了东陵的龙脉。所以车厢是新的，拉车的还是我。' },
      { you: '那机车呢？' },
      { them: '工程师偷偷拿废锅炉拼了一台，藏在棚子里，叫「龙号」。——你说，今天这一趟，套骡子，还是把它推出来？' },
    ],
    game: {
      kind: 'choice',
      ask: '今天这一趟',
      options: [
        { label: '推出「龙号」', note: '快，但犯禁', out: { text: '机车喷着白汽拉动了煤车。骡夫站在路边看了很久，说：「它一趟顶我十趟。可它不认识路，是我教它的。」', supply: 10, trust: -2, set: { machine: 'yes' } } },
        { label: '照旧套骡子', note: '慢，可是安稳', out: { text: '骡子拉着煤车，一步一步走。骡夫说：「总有一天轮到它。那天到了，别忘了是谁先把路走出来的。」', supply: -4, trust: 8, set: { machine: 'no' } } },
      ],
    },
  },
  'B-gauge': {
    who: '诺丁汉的织工',
    role: '卢德运动（1811—1816，英国）',
    look: CL.weaver,
    action: 'hammer',
    stage: 'loom',
    line: '岛上的作坊里，一群织工举着锤子，围着一台新来的织机。',
    dialog: [
      { you: '你们为什么要砸它？' },
      { them: '一台机器，顶我们十个人。老板买了它，我们的孩子就没有饭吃。' },
      { you: '砸了它，就会好吗？' },
      { them: '……不知道。可总得有人听见我们。你说，砸，还是不砸？' },
    ],
    game: {
      kind: 'choice',
      ask: '织机',
      options: [
        { label: '和他们一起砸', note: '让人听见：机器后面还有人', out: { text: '织机碎了。第二天来了士兵。可从那以后，「卢德」成了一个名字，说的是不肯被机器碾过去的人。', supply: -6, trust: 10, set: { loom: 'broken' } } },
        { label: '劝他们放下锤子', note: '机器会来的，想想别的办法', out: { text: '他们放下了锤子。织机转起来了，织得又快又密。作坊门口，多了几个找活干的人。', supply: 8, trust: -6, set: { loom: 'running' } } },
      ],
    },
  },

  /* ---------- B 工业 · 出路：林则徐与魏源 ---------- */
  'B-ticket': {
    who: '林则徐',
    role: '组织翻译《四洲志》，「开眼看世界」',
    look: CL.lin,
    action: 'count',
    stage: 'books',
    line: '岛上的屋子里堆满了外国的书报。一个穿官服的人，在灯下一页一页地翻。',
    dialog: [
      { you: '你为什么要读外国人的书？' },
      { them: '他们的船为什么能逆风而来，炮为什么打得那样远，我们一概不知。' },
      { you: '知道了又怎样？' },
      { them: '不知道，就只能挨打。风把译稿吹散了——帮我接住，别让谣言混进来。' },
    ],
    game: { kind: 'catch', verb: '伸手去接', good: '译稿', bad: '谣言', need: 8, secs: 9 },
    win: { text: '译稿都收齐了，编成了一本《四洲志》。林则徐说：这是一扇窗，开得小，总算开了。', supply: 6, trust: 6, set: { eyes: 'open' } },
    lose: { text: '有几页译稿被风吹走了，几条谣言夹了进来。书还是编成了，只是窗上蒙着一层灰。', supply: 4, trust: -4, set: { eyes: 'half' } },
  },
  'B-shift': {
    who: '魏源',
    role: '著《海国图志》：「师夷之长技以制夷」',
    look: CL.wei,
    action: 'count',
    stage: 'press',
    line: '下一座岛上，一个书生接过了林则徐的译稿，要把它扩成一部大书。',
    dialog: [
      { you: '你要把这本书写给谁看？' },
      { them: '写给所有还以为天下只有我们的人。「师夷之长技以制夷。」' },
      { you: '他们会看吗？' },
      { them: '不知道。书印出来，也可能被束之高阁。你说，印，还是不印？' },
    ],
    game: {
      kind: 'choice',
      ask: '《海国图志》',
      options: [
        { label: '印出来，送到每个港口', note: '让更多人看见外面', out: { text: '书印出来了，送到了每一个港口。看的人不多。后来它漂洋过海，在日本被人一读再读。', supply: -6, trust: 10, set: { book: 'printed' } } },
        { label: '先放一放', note: '时局未定，不必张扬', out: { text: '书稿锁进了柜子。又过了很多年，才有人把它找出来，说：当年要是早点看见就好了。', supply: 4, trust: -8, set: { book: 'shelved' } } },
      ],
    },
  },

  /* ---------- C 信息 · 看见：一根不准上岸的线（1871）与泰坦尼克前夜（1912） ---------- */
  'C-screen': {
    who: '大北电报公司的线务员',
    role: '1871 年，第一条海底电缆在上海登陆。清廷不准它上岸',
    look: CL.lineman,
    action: 'idle',
    stage: 'landing',
    line: '岛边停着一条小艇，艇上盘着一卷电缆。几个人趁夜把缆往岸上拖，不点灯。',
    dialog: [
      { you: '为什么要夜里干？' },
      { them: '官府说，电线坏风水，惊祖坟。白天拉上岸，第二天就有人来拆。' },
      { you: '那你们打算怎么办？' },
      { them: '缆头先不上岸，拴在江里的一条船上。等人用惯了，没人再问它是从哪来的。——帮我把缆拉稳。' },
    ],
    game: { kind: 'hold', verb: '按住拉缆', label: '缆不松也不断', band: [0.46, 0.64], secs: 3.4, drift: 0.5 },
    win: { text: '缆头拴在了江心的船上。几个月后，第一封从伦敦来的电报到了上海。没有人问它是从哪上的岸。', supply: 6, trust: 6, set: { cable: 'landed' } },
    lose: { text: '缆在江里绷断了。线务员说：不要紧，再铺一次。这根线早晚会上岸，官府拦不住它，只会错过它。', supply: 0, trust: -2, set: { cable: 'snapped' } },
  },
  'C-dark': {
    who: '加利福尼亚号的报务员',
    role: '1912 年 4 月 14 日夜。他向泰坦尼克发了冰山警报，对方回：「闭嘴，我在忙。」',
    look: CL.operator,
    action: 'tap',
    stage: 'wireless',
    line: '岛上一间小小的报务室，一个年轻人戴着耳机。外面的海上，浮着大块的冰。',
    dialog: [
      { you: '你在发什么？' },
      { them: '「我们被冰围住了，已经停船。」发给前面那条大船。' },
      { you: '他们回了吗？' },
      { them: '回了：「闭嘴，闭嘴，我在忙，我在给开普雷斯发报。」他们在替乘客发私人电报。——我该再发一次，还是摘下耳机去睡？' },
    ],
    game: {
      kind: 'choice',
      ask: '再发一次吗',
      options: [
        { label: '再发一次，直到他们回', note: '他们烦了也要发', out: { text: '你一遍一遍地发。对方始终在忙。可记录上留下了：那一夜，有人一直在喊。', supply: -2, trust: 10, set: { warning: 'kept' } } },
        { label: '摘下耳机', note: '已经尽到本分了', out: { text: '你摘下了耳机，上床睡了。两个小时后，那条大船撞上了冰山。它发的求救电报，你没有听见。', supply: 2, trust: -10, set: { warning: 'off' } } },
      ],
    },
  },

  /* ---------- C 信息 · 传信：巴黎围城的信鸽（1870）与驿马快信的最后一程（1861） ---------- */
  'C-relay': {
    who: '放鸽子的人',
    role: '1870—1871 年，普鲁士军队围住巴黎。气球把信带出城，鸽子把信带回来',
    look: CL.pigeoneer,
    action: 'idle',
    stage: 'pigeons',
    line: '岛上搭着鸽棚。一个人把一小卷薄片塞进鸽子腿上的羽管里，那上面印着几千封信。',
    dialog: [
      { you: '一只鸽子能带多少信？' },
      { them: '照相缩成薄片，一卷几千封。全城的人都在等这几只鸟。' },
      { you: '要是它飞不回来呢？' },
      { them: '普鲁士人养了鹰。十只放出去，能回来两只。——风来了，帮我接住它们。' },
    ],
    game: { kind: 'catch', verb: '张开双手去接', good: '信鸽', bad: '鹰', need: 7, secs: 9 },
    win: { text: '鸽子一只一只落回棚里。那一卷薄片展开，是几千封「我还活着」。', supply: 4, trust: 10, set: { pigeons: 'home' } },
    lose: { text: '回来的鸽子不多。放鸽子的人把剩下的信又抄了一遍，等下一次风。', supply: 2, trust: 0, set: { pigeons: 'lost' } },
  },
  'C-tz': {
    who: '驿马快信的骑手',
    role: '1861 年 10 月，横贯大陆的电报线接通。两天后，驿马快信停业',
    look: CL.rider,
    action: 'watch',
    stage: 'pony',
    line: '岛上立着一根新竖的电线杆，杆下拴着一匹马。骑手靠在杆上，看着线往远处去。',
    dialog: [
      { you: '你还跑吗？' },
      { them: '最后一程。线接通了，一封信十天的路，现在只要几分钟。' },
      { you: '那你以后做什么？' },
      { them: '不知道。可这一袋信已经在马背上了，总得有人把它送到。——帮我把袋子绑紧。' },
    ],
    game: { kind: 'rhythm', verb: '勒紧', label: '扣扣进亮圈', beats: 5, speed: 0.95 },
    win: { text: '信袋绑紧了。他翻身上马，沿着电线杆往西跑，跑完了驿马快信的最后一程。', supply: 4, trust: 8, set: { ride: 'done' } },
    lose: { text: '有一道扣没扣上，半路掉了几封信。他回头捡，耽误了半天。那些信，还是比电报晚到了十天。', supply: 2, trust: 0, set: { ride: 'late' } },
  },

  /* ---------- D 智能 · 目的：1983 年的值班军官与深蓝的操作员（1997） ---------- */
  'D-log': {
    who: '值班军官',
    role: '斯坦尼斯拉夫·彼得罗夫（1939—2017）。1983 年 9 月 26 日，预警系统报告五枚导弹来袭',
    look: CL.officer,
    action: 'watch',
    stage: 'bunker',
    line: '岛上一座没有窗的掩体。墙上的屏幕红了，上面写着：发射。',
    dialog: [
      { you: '屏幕上说什么？' },
      { them: '五枚导弹，从对面来。系统的可信度：最高。按规定，我该立刻上报。' },
      { you: '你信吗？' },
      { them: '如果真要打，不会只来五枚。可屏幕不会说「我不确定」。——帮我撑住这几分钟，别让警报把我推过去。' },
    ],
    game: { kind: 'hold', verb: '按住，等地面雷达的回音', label: '不报，也不睡', band: [0.4, 0.58], secs: 3.6, drift: 0.62 },
    win: { text: '地面雷达什么也没看见。那是阳光在高云上的反光。他把这一次记为「误报」，没有上报。多年后他说：我只是不想成为那个按下按钮的人。', supply: 2, trust: 12, set: { alarm: 'held' } },
    lose: { text: '警报一声比一声急，他拿起了电话。电话那头说：等一等。等到了雷达的回音——什么也没有。那一夜，世界差了一个「等一等」。', supply: 0, trust: -6, set: { alarm: 'reported' } },
  },
  'D-skip': {
    who: '深蓝的操作员',
    role: '1997 年 5 月，IBM 的深蓝在六局棋中战胜了国际象棋世界冠军',
    look: CL.operator2,
    action: 'count',
    stage: 'chess',
    line: '岛上摆着一张棋桌。一边坐着棋手，一边坐着一个穿白衬衫的人，他替一台看不见的机器移子。',
    dialog: [
      { you: '刚才那一步，是它走的还是你走的？' },
      { them: '它走的。我只是把它算出来的那一步放到棋盘上。' },
      { you: '可棋手说，那一步太像人了。' },
      { them: '他要求看它的运算记录。我们可以给，也可以不给。——你说，给不给？' },
    ],
    game: {
      kind: 'choice',
      ask: '运算记录',
      options: [
        { label: '给他看', note: '打开黑箱，哪怕看不懂', out: { text: '记录打印出来，几万行。棋手看了一夜，没找到人的手。他说：我还是不信——可他第一次承认，他分不出来了。', supply: -2, trust: 10, set: { log: 'shown' } } },
        { label: '不给', note: '规则没要求公开', out: { text: '记录没有公开。棋手输了比赛，带着怀疑离开。深蓝第二年就被拆了，那几步棋，再也没有人能复盘。', supply: 6, trust: -8, set: { log: 'kept' } } },
      ],
    },
  },

  /* ---------- D 智能 · 思考：ELIZA 的秘书（1966）与第 37 手（2016） ---------- */
  'D-star': {
    who: 'ELIZA 的秘书',
    role: '1966 年，魏森鲍姆写了一个只会复述和提问的程序。他的秘书请他离开房间，好单独和它说话',
    look: CL.secretary,
    action: 'count',
    stage: 'terminal',
    line: '岛上一间办公室，一台打字机似的终端在哒哒作响。一个女人坐在它前面，背对着门。',
    dialog: [
      { you: '你知道它只是一个程序吧？' },
      { them: '我知道。是我帮他打的那些字。它只会把我的话翻过来再问我一遍。' },
      { you: '那你为什么还要跟它说？' },
      { them: '因为它不打断我。——你能出去一下吗？有些话，我想单独跟它说。' },
    ],
    game: {
      kind: 'choice',
      ask: '出去吗',
      options: [
        { label: '出去，把门带上', note: '把房间留给她', out: { text: '你带上了门。门外，魏森鲍姆站着，脸色很难看。他后来写道：我没想到，这么简单的程序，会让正常人产生这么强的错觉。', supply: 0, trust: 8, set: { eliza: 'left' } } },
        { label: '留下，提醒她那只是程序', note: '不该让她陷进去', out: { text: '你说：它只是个程序。她说：我知道。然后她不再打字了。有些话，没有说出来。', supply: 2, trust: -4, set: { eliza: 'stayed' } } },
      ],
    },
  },
  'D-weight': {
    who: '记谱员',
    role: '2016 年 3 月，AlphaGo 对李世石第二局第 37 手。人类职业棋手说：没有人会这样下',
    look: CL.recorder,
    action: 'count',
    stage: 'goboard',
    line: '岛上一张棋盘，黑白子下到一半。记谱员停住了笔，盯着右边五路上那一颗刚落下的白子。',
    dialog: [
      { you: '怎么了？' },
      { them: '这一手，所有职业棋手都说：下错了。它算出来，人类下在这里的概率是万分之一。' },
      { you: '那它为什么下？' },
      { them: '因为它不是在模仿人。棋下到后面才看出来，这一手是赢棋的根。——你帮我分一分：哪些是真的好棋，哪些只是看着像。' },
    ],
    game: { kind: 'catch', verb: '移动记谱的手', good: '好棋', bad: '看着像', need: 7, secs: 9 },
    win: { text: '你挑出了那几手真的好棋，第 37 手在里面。记谱员说：它看见了我们没看见的。可下一局，李世石下出了第 78 手，它也没看见。', supply: 4, trust: 8, set: { move: 'seen' } },
    lose: { text: '真的好棋和看着像的混在了一起。记谱员说：没关系，当时所有人都分不出来。分不出来，才是这一手的意思。', supply: 4, trust: 0, set: { move: 'blurred' } },
  },
};

enrichHistoricalEncounters(ENCOUNTERS,CL);

export function encounterFor(id: string): Encounter | null {
  return ENCOUNTERS[id] ?? null;
}

/* ---------------- 补给与人心：一程一程带下去 ---------------- */

export interface VoyageStats {
  setbacks:number;
  shipLevel: number;
  crewLevel: number;
  supply: number;
  trust: number;
  log: string[];
  /** 一路上遇见过的人：哪个时代、是谁、你怎么对他的 */
  met: { era: string; who: string; trust: number }[];
  /** 走过的航线：精神图谱上亮起的那几颗星 */
  path: { era: string; lane: string; word: string; figure: string }[];
  /** 暗线：比如桃花源（marked / kept） */
  secrets: Record<string, string>;
  /** 船身耐久 0..100：撞礁会掉 */
  hull: number;
  /** 连击：小游戏连着做成几场 */
  combo: number;
  /** 这一局的分 */
  score: number;
}

const KEY = 'cv.stats.v1';

export function loadStats(): VoyageStats {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as VoyageStats;
      if (typeof v.supply === 'number' && typeof v.trust === 'number') return { ...v, setbacks:Number.isInteger(v.setbacks)?Math.max(0,v.setbacks):0, shipLevel: Number.isInteger(v.shipLevel)?Math.max(0,Math.min(3,v.shipLevel)):0, crewLevel: Number.isInteger(v.crewLevel)?Math.max(0,Math.min(3,v.crewLevel)):0, log: v.log ?? [], met: v.met ?? [], path: v.path ?? [], secrets: v.secrets ?? {}, hull: v.hull ?? 100, combo: v.combo ?? 0, score: v.score ?? 0 };
    }
  } catch {
    /* 私密窗口等情况：从默认值开始 */
  }
  return freshStats();
}

/** 新开一局：从启航港出发时，补给与人心回到起点 */
export function freshStats(): VoyageStats {
  return { setbacks:0, shipLevel:0, crewLevel:0, supply: 80, trust: 50, log: [], met: [], path: [], secrets: {}, hull: 100, combo: 0, score: 0 };
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
    setbacks:s.setbacks, shipLevel:s.shipLevel, crewLevel:s.crewLevel,
    supply: clamp(s.supply + o.supply),
    trust: clamp(s.trust + o.trust),
    log: [...s.log, `${tag}：${o.text}`].slice(-40),
    met: [...s.met, { era, who, trust: o.trust }].slice(-40),
    path: s.path,
    secrets: s.secrets,
    hull: s.hull,
    combo: s.combo,
    score: s.score,
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

/* ---------------- 连击与分数 ---------------- */

/** 小游戏做成了：连击加一，分按连击翻倍；做砸了：连击清零 */
export function scoreOutcome(s: VoyageStats, won: boolean, base = 100): VoyageStats {
  if (!won) return { ...s, combo: 0 };
  const combo = s.combo + 1;
  const mult = Math.min(4, 1 + (combo - 1) * 0.5);
  return { ...s, combo, score: s.score + Math.round(base * mult) };
}

export function hullHit(s: VoyageStats, dmg: number): VoyageStats {
  return { ...s, hull: clamp(s.hull - dmg), score: Math.max(0, s.score - Math.round(dmg * 2)), combo: 0 };
}

export function repairHull(s: VoyageStats, n: number): VoyageStats {
  return { ...s, hull: clamp(s.hull + n) };
}

/* ---------------- 本机排行榜 ---------------- */

export interface BoardEntry {
  name: string;
  lane: string;
  score: number;
  combo: number;
  hull: number;
  at: number;
}

const BOARD = 'cv.board.v1';

export function loadBoard(): BoardEntry[] {
  try {
    return JSON.parse(localStorage.getItem(BOARD) || '[]') as BoardEntry[];
  } catch {
    return [];
  }
}

export function pushBoard(e: BoardEntry): BoardEntry[] {
  const all = [...loadBoard(), e].sort((a, b) => b.score - a.score).slice(0, 20);
  try {
    localStorage.setItem(BOARD, JSON.stringify(all));
  } catch {
    /* 存不下也能玩 */
  }
  return all;
}
