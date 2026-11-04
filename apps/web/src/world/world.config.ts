/** World data is configuration, not render code. Scene-keyed, stamps stay honest. */

import { STERN_HALL } from './hull';
import type { Classification, Source } from '../api/types';

export type PortSilhouette =
  | 'harbor'
  | 'riverbank'
  | 'steam'
  | 'signal'
  | 'starlight'
  /* 保留旧剪影，便于以后复用 */
  | 'quanzhou'
  | 'container'
  | 'float';

export type PortPlace = {
  id: string;
  name: string;
  x: number;
  z: number;
  radius: number;
  pierLength: number;
  mark: 'test' | 'pending' | 'creative';
  silhouette: PortSilhouette;
};

/** 两条航道：近道贴着岸走，远路绕去外海。只有选中的那条亮着。 */
export type LaneId = 'near' | 'far';

export type FragmentPlace = {
  id: string;
  title: string;
  x: number;
  z: number;
  pickupRadius: number;
  classification: Classification;
  text: string;
  /** 这是什么物件 */
  what?: string;
  /** 它为什么重要。一句，不训人 */
  why?: string;
  sources: Source[];
  /** 这段材料只在哪条航道上遇到。'both' = 两条都会碰到 */
  lane: LaneId | 'both';
};

/** 一条航道：从出生点出发，经过几个航标，汇到港口。渲染时按点串成一条光路。 */
export type Lane = {
  id: LaneId;
  name: string;
  /** 一句话说清这条路会让你多看见什么 */
  promise: string;
  /** 沿途会遇到几件东西，也用来读秒：走得久不久 */
  waypoints: { x: number; z: number; label: string }[];
};

export type WorldConfig = {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  ship: { maxSpeed: number; reverseSpeed: number; accel: number; turn: number; radius: number };
  spawn: { x: number; z: number; yaw: number };
  camera: { followDistance: number; followHeight: number; cockpitHeight: number; cockpitForward: number };
  ports: PortPlace[];
  fragments: FragmentPlace[];
  lanes: Lane[];
  /** 通往下一段的门。最后一段没有门：这趟航程没有下一个港。 */
  portal?: { x: number; z: number; radius: number; to: string; label: string };
  coach: { sea: string; near: string; portTitle: string; portBody: string; compass: string };
  arrangement: { label: string; placeholder: string };
};

const SHARED = {
  bounds: { minX: -150, maxX: 150, minZ: -160, maxZ: 70 },
  ship: { maxSpeed: 17, reverseSpeed: 7, accel: 6, turn: 1.1, radius: 6 },
  spawn: { x: SPAWN.x, z: SPAWN.z, yaw: 0 },
  camera: {
    followDistance: 27,
    followHeight: 9.5,
    cockpitHeight: STERN_HALL.winY,
    cockpitForward: -(STERN_HALL.z + STERN_HALL.d * 0.22),
  },
};


/**
 * 两条航道共用一套几何：从出生点出发，在分叉点分开，一条沿岸直去，一条绕出去。
 * 港口对所有纪元都在 (26,-16)，所以分叉与转折点可以共用；只有名字和承诺各自不同。
 * 概念设计，不是任何真实航路。
 */
// 几何与故事共用：故事里的旁白点、危机点都沿着这几段线走
import { FAR_CRISIS, FAR_MID, FAR_STOP, FORK, NEAR_CRISIS, NEAR_MID, NEAR_STOP, SPAWN } from './stories';

function LANES(
  nearLabel: string,
  farLabel: string,
  nearName: string,
  farName: string,
  nearPromise: string,
  farPromise: string,
): Lane[] {
  return [
    {
      id: 'near',
      name: nearName,
      promise: nearPromise,
      waypoints: [
        { x: FORK.x, z: FORK.z, label: nearLabel },
        { x: NEAR_MID.x, z: NEAR_MID.z, label: '' },
        { x: NEAR_STOP.x, z: NEAR_STOP.z, label: '' },
        { x: NEAR_CRISIS.x, z: NEAR_CRISIS.z, label: '' },
      ],
    },
    {
      id: 'far',
      name: farName,
      promise: farPromise,
      waypoints: [
        { x: FORK.x, z: FORK.z, label: farLabel },
        { x: FAR_MID.x, z: FAR_MID.z, label: '' },
        { x: FAR_STOP.x, z: FAR_STOP.z, label: '' },
        { x: FAR_CRISIS.x, z: FAR_CRISIS.z, label: '' },
      ],
    },
  ];
}

const UNESCO_Q: Source = {
  id: 'A-unesco-1561',
  title: 'UNESCO World Heritage: Quanzhou: Emporium of the World in Song-Yuan China',
  url: 'https://whc.unesco.org/en/list/1561/',
  license: '仅链接与原创概述；原文及图像授权待核实',
  verification: 'unverified',
};

const TEST_SRC: Source = {
  id: 'fixture',
  title: 'content/scenes/neutral-test.json',
  url: 'https://github.com/yj438863687/civilization-voyage',
  license: 'MIT',
  verification: 'unverified',
};

const WORLDS: Record<'test' | 'A' | 'B' | 'C' | 'D', WorldConfig> = {
  test: {
    ...SHARED,
    ship: { maxSpeed: 16, reverseSpeed: 6, accel: 3.2, turn: 1.15, radius: 6 }, // 帆船：起步稍慢，跑起来快
    ports: [
      {
        id: 'test-port',
        name: '玄览启航港',
        x: 22,
        z: -96,
        radius: 12,
        pierLength: 10,
        mark: 'creative',
        silhouette: 'harbor',
      },
    ],
    lanes: LANES('海图残页', '未开口的人', '沿岸', '外海', '短，能早一点靠港', '远，多遇见一件没人问起的事'),
    portal: { x: 6, z: -130, radius: 8, to: 'A', label: '农业 · 从漂流到靠岸' },
    fragments: [
      {
        id: 'chart-scrap',
        title: '海图残页',
        x: 4,
        z: 6,
        pickupRadius: 7.5,
        lane: 'both',
        classification: 'creative',
        what: '海图残页',
        why: '铜针指向有灯的地方。',
        text: '铜针指向有灯的地方。纸签是材料，不是风景。这一页是为体验写的，不作航路史实。',
        sources: [TEST_SRC],
      },
      {
        id: 'seal-maxim',
        title: '落印口诀',
        x: 12,
        z: -6,
        pickupRadius: 6.5,
        lane: 'both',
        classification: 'creative',
        what: '一枚旧印',
        why: '先看来源，再听船员，最后由你落印。',
        text: '先看来源，再听船员，最后由你落印。口诀是创作，提醒判断在你手里。',
        sources: [TEST_SRC],
      },
      {
        id: 'unseen-name',
        title: '未开口的人',
        x: 20,
        z: -14,
        pickupRadius: 6,
        lane: 'both',
        classification: 'creative',
        what: '一份没有署名的名单',
        why: '安排若做成了，谁还没被问到？',
        text: '安排若做成了，谁还没被问到？这一条是创作的义利提醒，不是某份档案。',
        sources: [TEST_SRC],
      },
    ],
    coach: {
      sea: '朝海图上的灯航行。靠近漂着的东西按 E 收入货舱，靠近港口按 F 靠港。',
      near: '靠港后，用你带的材料做一件事。买卖不是这一步的主事。',
      portTitle: '玄览启航港',
      portBody: '这是创作的第一程。先看来源，再用材料说明安排。补给数字仍是虚构，盖「测试」印。',
      compass: '铜针指向启航港的灯',
    },
    arrangement: {
      label: '港口安排（创作）',
      placeholder: '选一份材料，说明你这一程问清了什么、还缺什么。这是创作，不是史实。',
    },
  },
  A: {
    ...SHARED,
    ship: { maxSpeed: 13, reverseSpeed: 5, accel: 3.0, turn: 1.15, radius: 6 }, // 木船靠桨与风：比帆船慢一点，但转得动
    ports: [
      {
        id: 'riverbank-port',
        name: '河岸港（候选）',
        x: 22,
        z: -96,
        radius: 12,
        pierLength: 10,
        mark: 'pending',
        silhouette: 'riverbank',
      },
    ],
    lanes: LANES('第一粒种子', '粮仓记号', '沿岸', '外海', '贴着河岸走，先看到界桩与泥板', '绕出去，先看到囤粮的那一头'),
    portal: { x: 6, z: -130, radius: 8, to: 'B', label: '工业 · 从风帆到蒸汽' },
    fragments: [
      {
        id: 'A-water',
        title: '鲧堙洪水',
        x: 0,
        z: 0,
        pickupRadius: 7,
        lane: 'near',
        what: '鲧堙洪水',
        why: '《山海经·海内经》：洪水滔天，鲧窃帝之息壤以堙洪水。',
        classification: 'creative',
        text: '《山海经·海内经》：洪水滔天，鲧窃帝之息壤以堙洪水。',
        sources: [],
      },
      {
        id: 'A-bone',
        title: '仓颉作书',
        x: 0,
        z: 0,
        pickupRadius: 7,
        lane: 'far',
        what: '仓颉作书',
        why: '《淮南子·本经训》：昔者仓颉作书，而天雨粟，鬼夜哭。',
        classification: 'creative',
        text: '《淮南子·本经训》：昔者仓颉作书，而天雨粟，鬼夜哭。',
        sources: [],
      },
      {
        id: 'A-stake',
        title: '大禹治水',
        x: 12,
        z: -6,
        pickupRadius: 6.5,
        lane: 'near',
        classification: 'historical_claim',
        what: '大禹治水',
        why: '《史记·夏本纪》：禹劳身焦思，居外十三年，过家门不敢入。',
        text: '《史记·夏本纪》：禹劳身焦思，居外十三年，过家门不敢入。',
        sources: [UNESCO_Q],
      },
      {
        id: 'A-granary',
        title: '后稷教稼',
        x: 20,
        z: -14,
        pickupRadius: 6,
        lane: 'far',
        classification: 'counterfactual',
        what: '后稷教稼',
        why: '《史记·周本纪》：弃好耕农，相地之宜，宜谷者稼穑焉，民皆法则之。',
        text: '《史记·周本纪》：弃好耕农，相地之宜，宜谷者稼穑焉，民皆法则之。',
        sources: [],
      },
    ],
    coach: {
      sea: '朝河口的灯航行。靠岸之前按 E 收下沿途的东西，靠港按 F。',
      near: '靠港后，用种子或泥板说明：这块地能养几年，留下的人谁说了算。',
      portTitle: '河岸港（候选）',
      portBody: '岸、粮仓、桩界都是体块与剪影，不代表任何真实遗址。先看来源，再写安排。',
      compass: '铜针指向河口',
    },
    arrangement: {
      label: '河岸安排（推演）',
      placeholder: '选一份材料，说明你为什么留下、留到什么时候。这是推演，不是史实。',
    },
  },
  B: {
    ...SHARED,
    ship: { maxSpeed: 24, reverseSpeed: 7, accel: 2.2, turn: 0.95, radius: 6 }, // 蒸汽船：起步略沉，跑起来最快，转弯略笨
    ports: [
      {
        id: 'steam-port',
        name: '蒸汽港（候选）',
        x: 22,
        z: -96,
        radius: 12,
        pierLength: 12,
        mark: 'pending',
        silhouette: 'steam',
      },
    ],
    lanes: LANES('汽压表', '锅炉工班次', '近岸', '外海', '沿航线走，一路看表、看班次', '绕开礁线，多看到一班人的夜'),
    portal: { x: 6, z: -130, radius: 8, to: 'C', label: '信息 · 从海上到电波' },
    fragments: [
      {
        id: 'B-coal',
        title: '马拉火车',
        x: 0,
        z: 0,
        pickupRadius: 7,
        lane: 'near',
        what: '马拉火车',
        why: '1881 年唐胥铁路通车。机车被禁，火车由骡马拉着走；工程师用废锅炉拼出「龙号」。',
        classification: 'creative',
        text: '1881 年唐胥铁路通车。机车被禁，火车由骡马拉着走；工程师用废锅炉拼出「龙号」。',
        sources: [],
      },
      {
        id: 'B-ticket',
        title: '开眼看世界',
        x: 0,
        z: 0,
        pickupRadius: 7,
        lane: 'far',
        what: '开眼看世界',
        why: '林则徐组织翻译《四洲志》，介绍世界各国地理与时势。',
        classification: 'creative',
        text: '林则徐组织翻译《四洲志》，介绍世界各国地理与时势。',
        sources: [],
      },
      {
        id: 'B-gauge',
        title: '卢德派织工',
        x: 4,
        z: 6,
        pickupRadius: 7.5,
        lane: 'near',
        classification: 'creative',
        what: '卢德派织工',
        why: '1811—1816 年，英国织工捣毁织机，抗议机器夺走生计。',
        text: '1811—1816 年，英国织工捣毁织机，抗议机器夺走生计。',
        sources: [TEST_SRC],
      },
      {
        id: 'B-shift',
        title: '海国图志',
        x: 12,
        z: -6,
        pickupRadius: 6.5,
        lane: 'far',
        classification: 'counterfactual',
        what: '海国图志',
        why: '魏源《海国图志》：师夷之长技以制夷。',
        text: '魏源《海国图志》：师夷之长技以制夷。',
        sources: [],
      },
    ],
    coach: {
      sea: '朝烟囱的灯航行。按 E 收下沿途的东西，靠港按 F。',
      near: '靠港后，用汽压或班次说明：这份动力烧的是谁的煤、谁的时间。',
      portTitle: '蒸汽港（候选）',
      portBody: '吊机与锅炉是几何体，不出现任何公司标志。效率与代价要写在同一张纸上。',
      compass: '铜针指向烟囱',
    },
    arrangement: {
      label: '动力安排（推演）',
      placeholder: '选一份材料，说明你选快还是稳，以及代价落在谁身上。这是推演。',
    },
  },
  C: {
    ...SHARED,
    ship: { maxSpeed: 20, reverseSpeed: 7, accel: 3.2, turn: 1.1, radius: 6 }, // 电报时代的轮船：快而稳
    ports: [
      {
        id: 'signal-port',
        name: '信号港（候选）',
        x: 22,
        z: -96,
        radius: 12,
        pierLength: 11,
        mark: 'pending',
        silhouette: 'signal',
      },
    ],
    lanes: LANES('海底电缆接头', '时区分界', '贴岸', '绕岛', '信号最强，但图上只剩亮点', '信号弱，多看到一处时差'),
    portal: { x: 6, z: -130, radius: 8, to: 'D', label: '智能 · 从驾驶到设定目的地' },
    fragments: [
      {
        id: 'C-relay',
        title: '巴黎围城的信鸽',
        x: 0,
        z: 0,
        pickupRadius: 7,
        lane: 'far',
        what: '巴黎围城的信鸽',
        why: '1870—1871 年，气球把信带出巴黎，鸽子带着缩成薄片的几千封信飞回来。',
        classification: 'creative',
        text: '1870—1871 年，气球把信带出巴黎，鸽子带着缩成薄片的几千封信飞回来。',
        sources: [],
      },
      {
        id: 'C-screen',
        title: '一根不准上岸的线',
        x: 0,
        z: 0,
        pickupRadius: 7,
        lane: 'near',
        what: '一根不准上岸的线',
        why: '1871 年，大北电报公司的海底电缆趁夜在上海登陆，缆头先拴在江心的船上。',
        classification: 'creative',
        text: '1871 年，大北电报公司的海底电缆趁夜在上海登陆，缆头先拴在江心的船上。',
        sources: [],
      },
      {
        id: 'C-tz',
        title: '驿马快信的最后一程',
        x: 12,
        z: -6,
        pickupRadius: 6.5,
        lane: 'far',
        classification: 'counterfactual',
        what: '驿马快信的最后一程',
        why: '1861 年 10 月，横贯大陆的电报线接通。两天后，驿马快信停业。',
        text: '1861 年 10 月，横贯大陆的电报线接通。两天后，驿马快信停业。',
        sources: [],
      },
      {
        id: 'C-dark',
        title: '泰坦尼克前夜',
        x: 20,
        z: -14,
        pickupRadius: 6,
        lane: 'near',
        classification: 'creative',
        what: '泰坦尼克前夜',
        why: '1912 年 4 月 14 日，加利福尼亚号报务员发出冰山警报，对方回：「闭嘴，我在忙。」',
        text: '1912 年 4 月 14 日，加利福尼亚号报务员发出冰山警报，对方回：「闭嘴，我在忙。」',
        sources: [TEST_SRC],
      },
    ],
    coach: {
      sea: '朝浮台的冷灯航行。按 E 收下沿途的东西，靠港按 F。',
      near: '靠港后，用电缆或断线说明：谁能被看见，谁只剩一个断点。',
      portTitle: '信号港（候选）',
      portBody: '模块化浮体，不是赛博霓虹。连通不等于文明，断点也要画在图上。',
      compass: '铜针指向信号塔',
    },
    arrangement: {
      label: '连接安排（推演）',
      placeholder: '选一份材料，说明先连哪里、谁会被落下。这是推演，不是预测。',
    },
  },
  D: {
    ...SHARED,
    ship: { maxSpeed: 24, reverseSpeed: 9, accel: 5.0, turn: 1.4, radius: 6 }, // 自主船：几乎没有惯性
    ports: [
      {
        id: 'auto-port',
        name: '自绘港（候选）',
        x: 22,
        z: -96,
        radius: 12,
        pierLength: 11,
        mark: 'pending',
        silhouette: 'starlight',
      },
    ],
    lanes: LANES('模型自绘星图', '目的地的定义', '它选的', '你要的', '最短的一条，它说这样最好', '长一些，你会经过它想略过的地方'),
    fragments: [
      {
        id: 'D-weight',
        title: '第 37 手',
        x: 0,
        z: 0,
        pickupRadius: 7,
        lane: 'far',
        what: '第 37 手',
        why: '2016 年 3 月，AlphaGo 对李世石第二局第 37 手。职业棋手说：没有人会这样下。',
        classification: 'creative',
        text: '2016 年 3 月，AlphaGo 对李世石第二局第 37 手。职业棋手说：没有人会这样下。',
        sources: [],
      },
      {
        id: 'D-log',
        title: '1983 年的误报',
        x: 0,
        z: 0,
        pickupRadius: 7,
        lane: 'near',
        what: '1983 年的误报',
        why: '1983 年 9 月 26 日，预警系统报告五枚导弹来袭。值班军官判定为误报，没有上报。',
        classification: 'creative',
        text: '1983 年 9 月 26 日，预警系统报告五枚导弹来袭。值班军官判定为误报，没有上报。',
        sources: [],
      },
      {
        id: 'D-star',
        title: 'ELIZA',
        x: 4,
        z: 6,
        pickupRadius: 7.5,
        lane: 'far',
        classification: 'creative',
        what: 'ELIZA',
        why: '1966 年，一个只会复述和提问的程序。秘书请它的作者离开房间，好单独和它说话。',
        text: '1966 年，一个只会复述和提问的程序。秘书请它的作者离开房间，好单独和它说话。',
        sources: [TEST_SRC],
      },
      {
        id: 'D-skip',
        title: '深蓝',
        x: 20,
        z: -14,
        pickupRadius: 6,
        lane: 'near',
        classification: 'creative',
        what: '深蓝',
        why: '1997 年，IBM 的深蓝战胜国际象棋世界冠军。棋手怀疑那一步棋里有人。',
        text: '1997 年，IBM 的深蓝战胜国际象棋世界冠军。棋手怀疑那一步棋里有人。',
        sources: [TEST_SRC],
      },
    ],
    coach: {
      sea: '朝自绘的星图航行。按 E 收下沿途的东西，靠港按 F。',
      near: '靠港后，说明你交给它的目的地，以及它替你略过了什么。',
      portTitle: '自绘港（候选）',
      portBody: '浮体与光点都是体块。方向由谁设定、路径由谁审，是这一段真正的问题。',
      compass: '铜针指向自绘的港',
    },
    arrangement: {
      label: '目的地安排（创作 / 推演）',
      placeholder: '选一份材料，写下你给它的目的地，以及它替你略过了什么。',
    },
  },
};

/**
 * 把材料摆到它所属的航道上：'both' 落在分叉点，沿岸的落在沿岸转折点，
 * 外海的落在外海转折点。之前三件东西排成一条直线，外海那条路根本碰不到外海的东西。
 */
// 每条航道上依次排开：先是分叉点与转折点之间的中途，再是转折点本身
// 启航港是练习：三件东西都摆在两条线共用的那一段上，再往前就各走各的
{
  const at: Record<string, { x: number; z: number }> = {
    'chart-scrap': { x: 0, z: 29 },
    'seal-maxim': { x: 0, z: 23.5 },
    'unseen-name': { x: FORK.x, z: FORK.z },
  };
  for (const f of WORLDS.test.fragments) {
    const p = at[f.id];
    if (p) {
      f.x = p.x;
      f.z = p.z;
      f.pickupRadius = 3.6;
    }
  }
}
for (const id of ['A', 'B', 'C', 'D'] as const) {
  const seen: Record<string, number> = { near: 0, far: 0, both: 0 };
  for (const f of WORLDS[id].fragments) {
    const n = seen[f.lane]++;
    const at =
      f.lane === 'both'
        ? FORK
        : f.lane === 'near'
          ? n === 0 ? NEAR_MID : NEAR_STOP
          : n === 0 ? FAR_MID : FAR_STOP;
    f.x = at.x;
    f.z = at.z;
    f.pickupRadius = 7;
  }
}

/** 一条航道上要按顺序经过的材料：先分叉点，再这条路自己的那件。 */
export function laneStops(world: WorldConfig, laneId: string): FragmentPlace[] {
  const both = world.fragments.filter((f) => f.lane === 'both');
  const own = world.fragments.filter((f) => f.lane === laneId);
  return [...both, ...own];
}

export function worldFor(sceneId: string | null | undefined): WorldConfig {
  if (sceneId === 'A' || sceneId === 'B' || sceneId === 'C' || sceneId === 'D') return WORLDS[sceneId];
  return WORLDS.test;
}

export const WORLD = WORLDS.test;
