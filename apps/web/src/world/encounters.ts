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
  /** 眼睛几只：仓颉相传「四目」，浑沌没有七窍 */
  eyes?: 0 | 2 | 4;
}

export interface Outcome {
  text: string;
  supply: number;
  trust: number;
  /** 这件事留下了什么：后面的危机、岸上的人、最后那一页都会读它 */
  set?: Record<string, string>;
}

/** 岛上的人在做什么：决定他的动作和岛上的景 */
export type Action = 'idle' | 'watch' | 'hammer' | 'shovel' | 'tap' | 'count';
export type Stage =
  | 'gate' | 'stakes' | 'tally' | 'jars' | 'well' | 'loom' | 'books' | 'press'
  | 'cave' | 'elephant' | 'beacon' | 'goose' | 'brooms' | 'hundun' | 'butterflies' | 'automaton';

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

/** 玩家自己的穿着：跟着时代换，但一直是同一个人（那块靛蓝）。 */
export const PLAYER_LOOK: Record<string, Look> = {
  test: { coat: '#2c3e50', trim: '#c9a15a', skin: '#c19474', pants: '#1e2a33', hat: 'none', prop: 'none' },
  'neutral-test': { coat: '#2c3e50', trim: '#c9a15a', skin: '#c19474', pants: '#1e2a33', hat: 'none', prop: 'none' },
  A: { coat: '#3a4a52', trim: '#b08a4a', skin: '#c19474', pants: '#2c2620', hat: 'straw', prop: 'none' },
  B: { coat: '#2f3a46', trim: '#c9a15a', skin: '#c19474', pants: '#232a32', hat: 'cap', prop: 'none' },
  C: { coat: '#2c4a56', trim: '#d7c59a', skin: '#c19474', pants: '#1f2d34', hat: 'none', prop: 'none' },
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
  gun: { coat: '#5a4a36', trim: '#3a2c1e', skin: '#a77c58', pants: '#3a2c1e', hat: 'wrap', prop: 'shovel' },
  yu: { coat: '#6a5a40', trim: '#8a7448', skin: '#a07450', pants: '#4a3a26', hat: 'straw', prop: 'hoe' },
  cangjie: { coat: '#7a6a4e', trim: '#c9a15a', skin: '#b98d66', pants: '#4a3a28', hat: 'wrap', prop: 'none', eyes: 4 },
  houji: { coat: '#7a6a3e', trim: '#5a4a28', skin: '#b38660', pants: '#4a3a24', hat: 'straw', prop: 'hoe' },
  elder: { coat: '#8a7a5e', trim: '#5a4a34', skin: '#b08a6a', pants: '#4a3e2c', hat: 'wrap', prop: 'urn' },
  weaver: { coat: '#4a4038', trim: '#8a7448', skin: '#b08870', pants: '#2e2a26', hat: 'cap', prop: 'mallet' },
  lin: { coat: '#2a3a4a', trim: '#c9a15a', skin: '#c49a76', pants: '#1e2630', hat: 'guan', prop: 'ledger' },
  wei: { coat: '#3a3a3e', trim: '#a89a7a', skin: '#c29a78', pants: '#24242a', hat: 'wrap', prop: 'ledger' },
  prisoner: { coat: '#4a4440', trim: '#2a2622', skin: '#a8866a', pants: '#2e2a26', hat: 'none', prop: 'none' },
  blind: { coat: '#6a5a48', trim: '#4a3e30', skin: '#b08a6a', pants: '#3a3026', hat: 'wrap', prop: 'pole', eyes: 0 },
  king: { coat: '#6a2a22', trim: '#d8b060', skin: '#c49a76', pants: '#3a1a14', hat: 'guan', prop: 'none' },
  suwu: { coat: '#5a5246', trim: '#c8a070', skin: '#a8805e', pants: '#3a342a', hat: 'wrap', prop: 'staff' },
  apprentice: { coat: '#3a3a5a', trim: '#c8b070', skin: '#d2a789', pants: '#24243a', hat: 'cap', prop: 'none' },
  hundun: { coat: '#c8b898', trim: '#8a7a5a', skin: '#d8c8a8', pants: '#8a7a5a', hat: 'none', prop: 'none', eyes: 0 },
  zhuang: { coat: '#6a6a5a', trim: '#a8a080', skin: '#c49a76', pants: '#3a3a30', hat: 'wrap', prop: 'none' },
  yanshi: { coat: '#5a4a3a', trim: '#c9a15a', skin: '#b88c6a', pants: '#3a2e22', hat: 'cap', prop: 'mallet' },
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

  /* ---------- B 工业 · 动力：汉阴丈人与卢德派 ---------- */
  'B-coal': {
    who: '汉阴丈人',
    role: '《庄子·天地》：「有机械者必有机事」',
    look: CL.elder,
    action: 'idle',
    stage: 'well',
    line: '岛上有一口井。一个老人抱着一只瓮，一趟一趟走下井去打水，再抱上来浇菜。',
    dialog: [
      { you: '旁边就有桔槔，一天能浇一百畦，你为什么不用？' },
      { them: '我知道它。「有机械者必有机事，有机事者必有机心。」' },
      { you: '机心？' },
      { them: '心里有了取巧的念头，就不再纯白了。——你要我用它吗？' },
    ],
    game: {
      kind: 'choice',
      ask: '桔槔用不用',
      options: [
        { label: '劝他用', note: '一天浇一百畦，省下力气', out: { text: '老人试了一下桔槔。水哗哗地上来了。他站着看了很久，说：「快是快了。」', supply: 10, trust: -4, set: { machine: 'yes' } } },
        { label: '帮他抱瓮', note: '慢，可他心里是安的', out: { text: '你陪他抱瓮打了一天水。菜浇完了，太阳也落了。他说：「你也看见了，慢的东西，心是静的。」', supply: -4, trust: 8, set: { machine: 'no' } } },
      ],
    },
  },
  'B-gauge': {
    who: '织工',
    role: '卢德运动（1811—1816，英国）',
    look: CL.weaver,
    action: 'hammer',
    stage: 'loom',
    line: '岛上的作坊里，一群织工举着锤子，围着一台新的织机。',
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

  /* ---------- C 信息 · 看见：洞穴与盲人摸象 ---------- */
  'C-screen': {
    who: '洞穴里的囚徒',
    role: '柏拉图《理想国》卷七',
    look: CL.prisoner,
    action: 'watch',
    stage: 'cave',
    line: '岛上有一个洞。洞里的人背对着洞口坐着，看着墙上晃动的影子。',
    dialog: [
      { you: '你在看什么？' },
      { them: '世界。墙上的这些，就是全部的世界。' },
      { you: '身后有火，还有洞口外的光。你不转过身看看吗？' },
      { them: '转过去……眼睛会疼的。你扶着我，慢慢转。' },
    ],
    game: { kind: 'hold', verb: '按住，扶他慢慢转过身', label: '看见火光', band: [0.62, 0.8], secs: 3.4, drift: 0.5 },
    win: { text: '他转过身，看见了火，又看见了洞口外的光。他哭了，说：原来墙上的都是影子。', supply: 2, trust: 10, set: { cave: 'turned' } },
    lose: { text: '光太刺眼了，他又转了回去，盯着墙上的影子说：还是这里好。', supply: 4, trust: -4, set: { cave: 'stayed' } },
  },
  'C-dark': {
    who: '摸象的盲人',
    role: '《大般涅槃经》：众盲摸象',
    look: CL.blind,
    action: 'idle',
    stage: 'elephant',
    line: '这座岛上站着一头大象。几个看不见的人围着它，各自摸着一块地方，吵个不停。',
    dialog: [
      { you: '你们在吵什么？' },
      { them: '象像一根柱子！——不对，像一把扇子！——明明像一条绳子！' },
      { you: '你们说的都对，又都不对。' },
      { them: '那你告诉我们，象到底是什么样子？' },
    ],
    game: {
      kind: 'choice',
      ask: '象',
      options: [
        { label: '牵着他们，一起摸一遍', note: '慢，但每个人都摸到了全身', out: { text: '你牵着他们，从象鼻摸到象尾。他们不吵了，过了很久，有人说：原来它这么大。', supply: -4, trust: 10, set: { elephant: 'whole' } } },
        { label: '直接告诉他们答案', note: '快，可他们只能信你', out: { text: '你说：象就是这样那样。他们点点头。可下一次，有人告诉他们别的样子，他们也点了点头。', supply: 4, trust: -4, set: { elephant: 'told' } } },
      ],
    },
  },

  /* ---------- C 信息 · 传信：烽火与鸿雁 ---------- */
  'C-relay': {
    who: '周幽王',
    role: '《史记·周本纪》：烽火戏诸侯',
    look: CL.king,
    action: 'idle',
    stage: 'beacon',
    line: '岛上的山头排着一座座烽火台。一个戴冠的人站在最高处，身边的人一直不笑。',
    dialog: [
      { you: '烽火是有敌人来时才点的，你为什么要点它？' },
      { them: '诸侯会带着兵马跑来，一个个慌慌张张。她看了，就会笑。' },
      { you: '可下一次，敌人真的来了呢？' },
      { them: '……下一次再说。你替我点吧。' },
    ],
    game: {
      kind: 'choice',
      ask: '烽火',
      options: [
        { label: '点火', note: '她会笑', out: { text: '烽火一座接一座亮起来。诸侯赶到，发现没有敌人。她笑了。后来敌人真的来了，烽火再亮，没有一个人来。', supply: 2, trust: -12, set: { beacon: 'lit' } } },
        { label: '不点', note: '信号只留给真的危险', out: { text: '你没有点火。烽火台一直黑着，安安静静地等着那一天。', supply: 0, trust: 8, set: { beacon: 'kept' } } },
      ],
    },
  },
  'C-tz': {
    who: '苏武',
    role: '《汉书》：「天子射上林中，得雁，足有系帛书」',
    look: CL.suwu,
    action: 'watch',
    stage: 'goose',
    line: '岛的北边是一片冰冷的湖，一个人拄着光秃秃的节杖，看着天上的雁。',
    dialog: [
      { you: '你在这里多久了？' },
      { them: '十九年。牧羊，持节，等一封信。' },
      { you: '你写过信吗？' },
      { them: '写不出去。听说汉家的使者告诉单于，天子在上林苑射下一只雁，雁脚上绑着我的信——其实没有那只雁，可那句话，把我救了回去。帮我接住那封信吧。' },
    ],
    game: { kind: 'catch', verb: '移动双手去接', good: '帛书', bad: '雁羽', need: 7, secs: 9 },
    win: { text: '你接住了那封帛书。上面一个字也没有。苏武笑了：有时候，人们愿意相信的消息，比真的消息走得更远。', supply: 4, trust: 8, set: { letter: 'got' } },
    lose: { text: '帛书落进了湖里。苏武说：不要紧，消息本来就不在帛上，在说它的人嘴里。', supply: 2, trust: 0, set: { letter: 'lost' } },
  },

  /* ---------- D 智能 · 目的：魔法师的学徒与浑沌 ---------- */
  'D-log': {
    who: '魔法师的学徒',
    role: '歌德《魔法师的学徒》（1797）',
    look: CL.apprentice,
    action: 'idle',
    stage: 'brooms',
    line: '岛上的屋子在冒水。一把把扫帚提着水桶，一趟一趟往屋里倒水，停不下来。',
    dialog: [
      { you: '这是怎么回事？' },
      { them: '师父出门了。我念了咒，让扫帚替我打水——它们打得太好了，可我忘了让它们停下的咒。' },
      { you: '那怎么办？' },
      { them: '我把扫帚劈成两半，结果变成了两把！帮我想起那句咒语，快——' },
    ],
    game: { kind: 'hold', verb: '按住，念出那句咒语', label: '咒语对上了', band: [0.5, 0.64], secs: 3.4, drift: 0.6 },
    win: { text: '咒语对上了，扫帚一把一把停了下来，靠回墙角。学徒坐在水里喘着气：原来最难的，是让它停。', supply: 2, trust: 10, set: { broom: 'stopped' } },
    lose: { text: '咒语没念对，水漫出了门。直到师父回来，一句话就让扫帚停了。学徒低着头：我只学会了开始。', supply: 0, trust: -4, set: { broom: 'flooded' } },
  },
  'D-skip': {
    who: '浑沌',
    role: '《庄子·应帝王》：「日凿一窍，七日而浑沌死」',
    look: CL.hundun,
    action: 'idle',
    stage: 'hundun',
    line: '这座岛上住着一个没有脸的人。他没有眼耳口鼻，却待每一个来客都很好。',
    dialog: [
      { you: '南海的儵和北海的忽想报答你，要给你凿出七窍。' },
      { them: '人皆有七窍，以视听食息。他们说，我没有，太可怜了。' },
      { you: '你自己想要吗？' },
      { them: '……我不知道。你替我决定吧。' },
    ],
    game: {
      kind: 'choice',
      ask: '凿不凿',
      options: [
        { label: '替他凿开', note: '好心：让他像别人一样', out: { text: '一天凿一窍。第七天，七窍都凿好了，浑沌却死了。凿的人，都是为了他好。', supply: 6, trust: -10, set: { hundun: 'carved' } } },
        { label: '让他保持原样', note: '他本来就好好的', out: { text: '你放下了凿子。浑沌还是没有脸，还是待每个人都很好。儵和忽不明白，可也没有再提。', supply: -2, trust: 10, set: { hundun: 'whole' } } },
      ],
    },
  },

  /* ---------- D 智能 · 思考：庄周梦蝶与偃师造人 ---------- */
  'D-star': {
    who: '庄周',
    role: '《庄子·齐物论》：庄周梦为胡蝶',
    look: CL.zhuang,
    action: 'watch',
    stage: 'butterflies',
    line: '岛上开满了花，一个人刚刚睡醒，看着满天的蝴蝶发呆。',
    dialog: [
      { you: '你在想什么？' },
      { them: '我梦见自己是一只蝴蝶，飞得很快活，不知道自己是庄周。' },
      { you: '现在你醒了。' },
      { them: '醒了吗？「不知周之梦为胡蝶与，胡蝶之梦为周与？」你帮我分一分：哪只是真的，哪只是梦里的。' },
    ],
    game: { kind: 'catch', verb: '移动双手去接', good: '真的蝴蝶', bad: '梦里的蝴蝶', need: 7, secs: 9 },
    win: { text: '你接住的都是真的蝴蝶。庄周看着你的手，笑了：你分得出来——可你怎么知道，你自己不在梦里？', supply: 4, trust: 8, set: { dream: 'awake' } },
    lose: { text: '真的和梦里的混在了一起，你分不清了。庄周说：分不清，也许才是真的醒了。', supply: 4, trust: 0, set: { dream: 'blurred' } },
  },
  'D-weight': {
    who: '偃师',
    role: '《列子·汤问》：偃师造倡',
    look: CL.yanshi,
    action: 'idle',
    stage: 'automaton',
    line: '岛上，一个工匠带着他造的「人」在王的面前跳舞唱歌，跳得和真人一模一样。',
    dialog: [
      { you: '它是人吗？' },
      { them: '它会走，会唱，会看人眼色。方才它对王的侍妾眨了眨眼，王大怒，要杀我。' },
      { you: '那你要怎么证明它不是人？' },
      { them: '我可以把它拆开给王看。——可你说，要拆吗？' },
    ],
    game: {
      kind: 'choice',
      ask: '拆不拆',
      options: [
        { label: '拆开给王看', note: '证明它只是革、木、胶、漆', out: { text: '拆开来，里面「皆傅会革、木、胶、漆、白、黑、丹、青之所为」。王惊叹：「人之巧乃可与造化者同功乎！」', supply: 6, trust: 4, set: { automaton: 'opened' } } },
        { label: '让它接着唱', note: '既然分不出来，又何必拆', out: { text: '它接着唱完了那支歌。王听完，没有再问它是什么。你也说不清，它最后那一眼，是不是在看你。', supply: 2, trust: 6, set: { automaton: 'kept' } } },
      ],
    },
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
  /** 暗线：比如桃花源（marked / kept） */
  secrets: Record<string, string>;
}

const KEY = 'cv.stats.v1';

export function loadStats(): VoyageStats {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as VoyageStats;
      if (typeof v.supply === 'number' && typeof v.trust === 'number') return { ...v, log: v.log ?? [], met: v.met ?? [], path: v.path ?? [], secrets: v.secrets ?? {} };
    }
  } catch {
    /* 私密窗口等情况：从默认值开始 */
  }
  return freshStats();
}

/** 新开一局：从启航港出发时，补给与人心回到起点 */
export function freshStats(): VoyageStats {
  return { supply: 80, trust: 50, log: [], met: [], path: [], secrets: {} };
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
    secrets: s.secrets,
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
