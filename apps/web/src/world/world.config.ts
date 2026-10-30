/** World data is configuration, not render code. Scene-keyed, stamps stay honest. */

import { STERN_HALL } from './hull';
import type { Classification, Source } from '../api/types';

export type PortSilhouette = 'harbor' | 'quanzhou' | 'container' | 'float';

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

export type FragmentPlace = {
  id: string;
  title: string;
  x: number;
  z: number;
  pickupRadius: number;
  classification: Classification;
  text: string;
  sources: Source[];
};

export type WorldConfig = {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  ship: { maxSpeed: number; reverseSpeed: number; accel: number; turn: number; radius: number };
  spawn: { x: number; z: number; yaw: number };
  camera: { followDistance: number; followHeight: number; cockpitHeight: number; cockpitForward: number };
  ports: PortPlace[];
  fragments: FragmentPlace[];
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

const UNESCO_Q: Source = {
  id: 'A-unesco-1561',
  title: 'UNESCO World Heritage: Quanzhou: Emporium of the World in Song-Yuan China',
  url: 'https://whc.unesco.org/en/list/1561/',
  license: '仅链接与原创概述；原文及图像授权待核实',
  verification: 'unverified',
};

const ISO_BOX: Source = {
  id: 'B-iso-668',
  title: 'ISO 668 系列集装箱尺寸标准（公开摘要）',
  url: 'https://www.iso.org/standard/83558.html',
  license: '仅链接与原创概述；标准全文需购买',
  verification: 'unverified',
};

const IPCC: Source = {
  id: 'C-ipcc-ar6-wg1',
  title: 'IPCC AR6 WGI Chapter 9 / SPM: sea level',
  url: 'https://www.ipcc.ch/report/ar6/wg1/',
  license: '仅链接与原创概述；引用哪一组情景待组员确认',
  verification: 'unverified',
};

const TEST_SRC: Source = {
  id: 'fixture',
  title: 'content/scenes/neutral-test.json',
  url: 'https://github.com/yj438863687/civilization-voyage',
  license: 'MIT',
  verification: 'unverified',
};

const WORLDS: Record<'test' | 'A' | 'B' | 'C', WorldConfig> = {
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
    fragments: [
      {
        id: 'chart-scrap',
        title: '海图残页',
        x: 10,
        z: 8,
        pickupRadius: 5.2,
        classification: 'creative',
        text: '铜针指向有灯的地方。纸签是材料，不是风景。这一页是为体验写的，不作航路史实。',
        sources: [TEST_SRC],
      },
      {
        id: 'seal-maxim',
        title: '落印口诀',
        x: 22,
        z: -4,
        pickupRadius: 5.2,
        classification: 'creative',
        text: '先看来源，再听船员，最后由你落印。口诀是创作，提醒判断在你手里。',
        sources: [TEST_SRC],
      },
      {
        id: 'unseen-name',
        title: '未开口的人',
        x: 18,
        z: -12,
        pickupRadius: 5,
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
        id: 'quanzhou-port',
        name: '刺桐港（候选）',
        x: 26,
        z: -16,
        radius: 12,
        pierLength: 10,
        mark: 'pending',
        silhouette: 'quanzhou',
      },
    ],
    fragments: [
      {
        id: 'A-shibo',
        title: '市舶抽解残页',
        x: 10,
        z: 8,
        pickupRadius: 5.2,
        classification: 'historical_claim',
        text: '市舶司对进出港货物登记、抽解。具体税率随时期而变，本条只作制度线索，不作税率结论。待核实。',
        sources: [UNESCO_Q],
      },
      {
        id: 'A-stele',
        title: '多语宗教石刻说明',
        x: 22,
        z: -4,
        pickupRadius: 5.2,
        classification: 'historical_claim',
        text: '泉州港遗存中有多种文字与宗教石刻。它们证明长期共处，但不能单独证明「和谐」或「冲突」的单一叙事。待核实。',
        sources: [UNESCO_Q],
      },
      {
        id: 'A-bulkhead',
        title: '水密隔舱笔记',
        x: 18,
        z: -12,
        pickupRadius: 5,
        classification: 'historical_claim',
        text: '海船以隔舱限制进水。本条只说明结构原理，不把任何一艘现代复原船当成宋元原船。待核实。',
        sources: [UNESCO_Q],
      },
    ],
    coach: {
      sea: '朝海图上的灯航行。靠近纸签按 E 收入货舱，靠近港口按 F 靠港。',
      near: '靠港后，用市舶或石刻材料说明：这座港如何让不同习惯的人一起做事。',
      portTitle: '刺桐港（候选）',
      portBody: '体块与剪影，不复原建筑。先看来源，再写安排。货物到了，理解也到了吗？',
      compass: '铜针指向刺桐港灯',
    },
    arrangement: {
      label: '港口安排（推演）',
      placeholder: '选一份材料，说明这座港如何让不同习惯的人一起做事。这是推演，不是史实。',
    },
  },
  B: {
    ...SHARED,
    ports: [
      {
        id: 'box-port',
        name: '标准港（候选）',
        x: 26,
        z: -16,
        radius: 12,
        pierLength: 12,
        mark: 'pending',
        silhouette: 'container',
      },
    ],
    fragments: [
      {
        id: 'B-iso',
        title: '标准箱尺寸摘录',
        x: 10,
        z: 8,
        pickupRadius: 5.2,
        classification: 'historical_claim',
        text: '国际标准把箱子的长宽高写成可互换的尺寸。标准本身是公开制度，不是某家公司的发明故事。待核实具体条款。',
        sources: [ISO_BOX],
      },
      {
        id: 'B-time',
        title: '装卸时间对照',
        x: 22,
        z: -4,
        pickupRadius: 5.2,
        classification: 'test',
        text: '散货：测试 5 个工班。集装箱：测试 1 个工班。这些数字是虚构对照，用来问效率落在谁身上，不是历史统计。',
        sources: [TEST_SRC],
      },
      {
        id: 'B-voice',
        title: '工人口述残句',
        x: 18,
        z: -12,
        pickupRadius: 5,
        classification: 'creative',
        text: '「箱子来了以后，手活少了，人也少了。」这是为体验写的句子，不是某位工人的真实口述，不作口述史。',
        sources: [],
      },
    ],
    coach: {
      sea: '朝堆场的钠灯航行。靠近纸签按 E 收入货舱，靠近港口按 F 靠港。',
      near: '靠港后，用标准或口述材料说明：效率落在谁身上。',
      portTitle: '标准港（候选）',
      portBody: '集装箱是几何体，没有船公司标志。标准带来效率，也改写劳动。先看来源。',
      compass: '铜针指向标准港吊机',
    },
    arrangement: {
      label: '港口安排（推演）',
      placeholder: '选一份材料，说明效率落在谁身上。这是推演，数字是测试。',
    },
  },
  C: {
    ...SHARED,
    ports: [
      {
        id: 'float-port',
        name: '漂浮港（候选）',
        x: 26,
        z: -16,
        radius: 12,
        pierLength: 11,
        mark: 'pending',
        silhouette: 'float',
      },
    ],
    fragments: [
      {
        id: 'C-slr',
        title: '海平面情景摘录',
        x: 10,
        z: 8,
        pickupRadius: 5.2,
        classification: 'historical_claim',
        text: '评估报告给出的是情景与不确定性范围，不是单一预测年份。本条只提醒「有范围」，不把某一年写成注定。待核实引用组别。',
        sources: [IPCC],
      },
      {
        id: 'C-memory',
        title: '应携带的记忆',
        x: 22,
        z: -4,
        pickupRadius: 5.2,
        classification: 'creative',
        text: '一张族谱抄件、一袋种子、一口钟。这些物件是为体验写的，不是某个真实社区的行李清单。',
        sources: [],
      },
      {
        id: 'C-who',
        title: '谁来决定',
        x: 18,
        z: -12,
        pickupRadius: 5,
        classification: 'counterfactual',
        text: '若浮力只够带走三成物件：谁投票，谁缺席，后来的人还能不能改这份名单？这是推演，不是预测。',
        sources: [IPCC],
      },
    ],
    coach: {
      sea: '朝浮体上的冷灯航行。靠近纸签按 E 收入货舱，靠近港口按 F 靠港。',
      near: '靠港后，用情景或记忆材料说明：迁徙时保留什么、放弃什么。',
      portTitle: '漂浮港（候选）',
      portBody: '模块化浮体，不是赛博霓虹。先分清科学依据、推演和创作，再写安排。',
      compass: '铜针指向漂浮港',
    },
    arrangement: {
      label: '港口安排（创作 / 推演）',
      placeholder: '选一份材料，说明迁徙时保留什么、放弃什么、由谁决定。后来的人还能改吗？',
    },
  },
};

export function worldFor(sceneId: string | null | undefined): WorldConfig {
  if (sceneId === 'A' || sceneId === 'B' || sceneId === 'C') return WORLDS[sceneId];
  return WORLDS.test;
}

export const WORLD = WORLDS.test;
