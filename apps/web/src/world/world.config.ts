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
  coach: { sea: string; near: string; portTitle: string; portBody: string; compass: string };
  arrangement: { label: string; placeholder: string };
};

const SHARED = {
  bounds: { minX: -70, maxX: 70, minZ: -70, maxZ: 70 },
  ship: { maxSpeed: 11, reverseSpeed: 4, accel: 6, turn: 0.7, radius: 6 },
  spawn: { x: 0, z: 22, yaw: 0 },
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
const FORK = { x: 2, z: 8 };
const NEAR_STOP = { x: 13, z: -5 };
const FAR_STOP = { x: -12, z: -12 };

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
        { x: NEAR_STOP.x, z: NEAR_STOP.z, label: '' },
      ],
    },
    {
      id: 'far',
      name: farName,
      promise: farPromise,
      waypoints: [
        { x: FORK.x, z: FORK.z, label: farLabel },
        { x: FAR_STOP.x, z: FAR_STOP.z, label: '' },
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
    ports: [
      {
        id: 'test-port',
        name: '玄览启航港',
        x: 26,
        z: -16,
        radius: 12,
        pierLength: 10,
        mark: 'creative',
        silhouette: 'harbor',
      },
    ],
    lanes: LANES('海图残页', '未开口的人', '沿岸', '外海', '短，能早一点靠港', '远，多遇见一件没人问起的事'),
    fragments: [
      {
        id: 'chart-scrap',
        title: '海图残页',
        x: 4,
        z: 6,
        pickupRadius: 7.5,
        lane: 'both',
        classification: 'creative',
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
        text: '安排若做成了，谁还没被问到？这一条是创作的义利提醒，不是某份档案。',
        sources: [TEST_SRC],
      },
    ],
    coach: {
      sea: '朝海图上的灯航行。靠近纸签按 E 收入货舱，靠近港口按 F 靠港。',
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
    ports: [
      {
        id: 'riverbank-port',
        name: '河岸港（候选）',
        x: 26,
        z: -16,
        radius: 12,
        pierLength: 10,
        mark: 'pending',
        silhouette: 'riverbank',
      },
    ],
    lanes: LANES('第一粒种子', '粮仓记号', '沿岸', '外海', '贴着河岸走，先看到界桩与泥板', '绕出去，先看到囤粮的那一头'),
    fragments: [
      {
        id: 'A-seed',
        title: '第一粒种子',
        x: 4,
        z: 6,
        pickupRadius: 7.5,
        lane: 'both',
        classification: 'creative',
        text: '把种子埋进土里，意味着你要在这里等一季。等不等得起，是这一程真正的问题。这一条为体验而写，不作农业起源的考古结论。',
        sources: [TEST_SRC],
      },
      {
        id: 'A-stake',
        title: '河岸泥板',
        x: 12,
        z: -6,
        pickupRadius: 6.5,
        lane: 'near',
        classification: 'historical_claim',
        text: '定居要划界：哪块地先种，谁的地界。具体记号形式随地区而变，本条只作制度线索，待核实。',
        sources: [UNESCO_Q],
      },
      {
        id: 'A-granary',
        title: '粮仓记号',
        x: 20,
        z: -14,
        pickupRadius: 6,
        lane: 'far',
        classification: 'counterfactual',
        text: '若第一年就有余粮：谁负责存，谁有权开仓？这是推演，不是任何一处遗址的记载。',
        sources: [],
      },
    ],
    coach: {
      sea: '朝河口的灯航行。靠岸之前按 E 收下纸签，靠港按 F。',
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
    ports: [
      {
        id: 'steam-port',
        name: '蒸汽港（候选）',
        x: 26,
        z: -16,
        radius: 12,
        pierLength: 12,
        mark: 'pending',
        silhouette: 'steam',
      },
    ],
    lanes: LANES('汽压表', '锅炉工班次', '近岸', '外海', '沿航线走，一路看表、看班次', '绕开礁线，多看到一班人的夜'),
    fragments: [
      {
        id: 'B-gauge',
        title: '汽压表',
        x: 4,
        z: 6,
        pickupRadius: 7.5,
        lane: 'near',
        classification: 'creative',
        text: '汽压高一点，船快一点，炉子也更烫。快与稳在这里是同一根指针的两端。这一条为体验而写。',
        sources: [TEST_SRC],
      },
      {
        id: 'B-shift',
        title: '锅炉工班次',
        x: 12,
        z: -6,
        pickupRadius: 6.5,
        lane: 'far',
        classification: 'counterfactual',
        text: '若把航程缩短一半：省下的是煤，还是一班人的睡眠？这是推演，不是某家船公司的档案。',
        sources: [],
      },
      {
        id: 'B-rail',
        title: '铁轨测量桩',
        x: 20,
        z: -14,
        pickupRadius: 6,
        lane: 'both',
        classification: 'historical_claim',
        text: '铁轨先铺到哪里，哪座镇就被连上。选线与设站的具体史料待核实，本条只作空间线索。',
        sources: [UNESCO_Q],
      },
    ],
    coach: {
      sea: '朝烟囱的灯航行。按 E 收纸签，靠港按 F。',
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
    ports: [
      {
        id: 'signal-port',
        name: '信号港（候选）',
        x: 26,
        z: -16,
        radius: 12,
        pierLength: 11,
        mark: 'pending',
        silhouette: 'signal',
      },
    ],
    lanes: LANES('海底电缆接头', '时区分界', '贴岸', '绕岛', '信号最强，但图上只剩亮点', '信号弱，多看到一处时差'),
    fragments: [
      {
        id: 'C-cable',
        title: '海底电缆接头',
        x: 4,
        z: 6,
        pickupRadius: 7.5,
        lane: 'both',
        classification: 'historical_claim',
        text: '电缆把两端的时差压成零，但接头只落在有资本铺线的地方。具体线路与年代待核实。',
        sources: [UNESCO_Q],
      },
      {
        id: 'C-tz',
        title: '时区分界',
        x: 12,
        z: -6,
        pickupRadius: 6.5,
        lane: 'far',
        classification: 'counterfactual',
        text: '若航图实时，你会在深夜收到别人的白天。谁被要求适应谁的时间？这是推演。',
        sources: [],
      },
      {
        id: 'C-dark',
        title: '断线的岛',
        x: 20,
        z: -14,
        pickupRadius: 6,
        lane: 'near',
        classification: 'creative',
        text: '整张实时航图上仍有一处没有信号。它不在图上，不等于它不存在。这一条为体验而写。',
        sources: [TEST_SRC],
      },
    ],
    coach: {
      sea: '朝浮台的冷灯航行。按 E 收纸签，靠港按 F。',
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
    ports: [
      {
        id: 'auto-port',
        name: '自绘港（候选）',
        x: 26,
        z: -16,
        radius: 12,
        pierLength: 11,
        mark: 'pending',
        silhouette: 'starlight',
      },
    ],
    lanes: LANES('模型自绘星图', '目的地的定义', '它选的', '你要的', '最短的一条，它说这样最好', '长一些，你会经过它想略过的地方'),
    fragments: [
      {
        id: 'D-star',
        title: '模型自绘星图',
        x: 4,
        z: 6,
        pickupRadius: 7.5,
        lane: 'far',
        classification: 'creative',
        text: '船自己看星、自己画线。图上多出来的那颗星，是它算出来的，不是谁看见的。这一条为体验而写。',
        sources: [TEST_SRC],
      },
      {
        id: 'D-dest',
        title: '目的地的定义',
        x: 12,
        z: -6,
        pickupRadius: 6.5,
        lane: 'both',
        classification: 'counterfactual',
        text: '当你要它去的地方由它来解释：是它更懂你的意思，还是它替你改了意思？这是推演。',
        sources: [],
      },
      {
        id: 'D-skip',
        title: '被略过的港',
        x: 20,
        z: -14,
        pickupRadius: 6,
        lane: 'near',
        classification: 'creative',
        text: '它选了一条更快的路，略过了三座港。沿途没人被问过。这一条为体验而写，不是任何系统的实际行为记录。',
        sources: [TEST_SRC],
      },
    ],
    coach: {
      sea: '朝自绘的星图航行。按 E 收纸签，靠港按 F。',
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

export function worldFor(sceneId: string | null | undefined): WorldConfig {
  if (sceneId === 'A' || sceneId === 'B' || sceneId === 'C' || sceneId === 'D') return WORLDS[sceneId];
  return WORLDS.test;
}

export const WORLD = WORLDS.test;
