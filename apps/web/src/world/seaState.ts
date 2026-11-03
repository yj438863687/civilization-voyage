import { FAR_CRISIS, FAR_MID, FAR_STOP, FORK, NEAR_CRISIS, NEAR_MID, NEAR_STOP } from './stories';

/**
 * 海况：风、礁石、暗流。
 *
 * 开船本身要有玩法：顺风快、逆风慢，礁石要绕，暗流会把船往旁边推。
 * 每个时代的风向不同——农业段是河口的下行风，工业段是逆风（所以才需要蒸汽），
 * 信息段风向多变，智能段几乎无风（船自己会算）。
 *
 * 礁石沿两条航线的外侧散布，正对航道中心留一条干净的水路；
 * 想抄近路的人，要自己看白浪。
 */

export interface Reef {
  x: number;
  z: number;
  r: number;
  /** 露出水面的高度：0 是暗礁，只有白浪 */
  h: number;
}

export interface Current {
  x: number;
  z: number;
  /** 影响半径 */
  r: number;
  /** 推力方向（单位向量）与强度 */
  dx: number;
  dz: number;
  k: number;
}

export interface SeaState {
  /** 风向：风往哪里吹（单位向量），风力 0..1 */
  wind: { dx: number; dz: number; k: number };
  reefs: Reef[];
  currents: Current[];
}

const n = (dx: number, dz: number) => {
  const l = Math.hypot(dx, dz) || 1;
  return { dx: dx / l, dz: dz / l };
};

/** 礁石群：沿一条线的两侧，按固定种子摆，每局一样（玩家可以记路） */
function reefLine(a: { x: number; z: number }, b: { x: number; z: number }, side: 1 | -1, seed: number, count = 4, offset = 7): Reef[] {
  const out: Reef[] = [];
  // 出生点附近是大殿，礁石离它远一点
  const SP = { x: 0, z: 34 };
  const nx = -(b.z - a.z);
  const nz = b.x - a.x;
  const nl = Math.hypot(nx, nz) || 1;
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const jitter = ((seed * 31 + i * 17) % 10) / 10 - 0.5;
    const off = offset + jitter * 3;
    const rx = a.x + (b.x - a.x) * t + (nx / nl) * off * side + jitter * 2;
    const rz = a.z + (b.z - a.z) * t + (nz / nl) * off * side - jitter * 1.5;
    if (Math.hypot(rx - SP.x, rz - SP.z) < 24) continue;
    out.push({ x: rx, z: rz, r: 1.6 + ((seed + i) % 3) * 0.5, h: (seed + i) % 2 === 0 ? 0.9 : 0 });
  }
  return out;
}

// 出港那一段留干净的水；分叉之后，礁石在航道外侧 11 左右，直走不会碰到，抄近路会
const BASE_REEFS: Reef[] = [
  ...reefLine(FORK, NEAR_MID, 1, 3, 3, 11),
  ...reefLine(NEAR_MID, NEAR_STOP, 1, 4, 3, 11),
  ...reefLine(NEAR_STOP, NEAR_CRISIS, -1, 5, 2, 10),
  ...reefLine(FORK, FAR_MID, -1, 6, 3, 11),
  ...reefLine(FAR_MID, FAR_STOP, -1, 7, 3, 11),
  ...reefLine(FAR_STOP, FAR_CRISIS, 1, 8, 2, 10),
  // 两条航道之间的那片三角水域：走直线从分叉点直冲港口的人，会撞上这几块
  // （出生点周围 22 以内不放：那里是开局的大殿）
  { x: 8, z: -6, r: 2.2, h: 1.1 },
  { x: -4, z: -2, r: 1.8, h: 0 },
  { x: 14, z: -12, r: 2.0, h: 0.8 },
];

export const SEA_STATES: Record<string, SeaState> = {
  test: {
    wind: { ...n(0, -1), k: 0.35 },
    reefs: BASE_REEFS.slice(0, 4),
    currents: [],
  },
  A: {
    // 河口：水往外海流，风从岸上来
    wind: { ...n(-0.3, -1), k: 0.45 },
    reefs: BASE_REEFS,
    currents: [{ x: FORK.x, z: FORK.z - 6, r: 14, ...n(-1, -0.2), k: 2.2 }],
  },
  B: {
    // 逆风：帆船在这里吃力，蒸汽才有意义
    wind: { ...n(0.2, 1), k: 0.7 },
    reefs: BASE_REEFS,
    currents: [{ x: NEAR_MID.x, z: NEAR_MID.z, r: 12, ...n(1, 0.3), k: 2.6 }],
  },
  C: {
    // 风向多变：信号时代，连风都在换
    wind: { ...n(1, -0.4), k: 0.5 },
    reefs: BASE_REEFS,
    currents: [
      { x: FAR_MID.x, z: FAR_MID.z, r: 12, ...n(-0.6, -1), k: 2.4 },
      { x: NEAR_STOP.x, z: NEAR_STOP.z + 6, r: 10, ...n(0.8, 0.6), k: 2.0 },
    ],
  },
  D: {
    // 几乎无风：船自己会算，可暗流更多
    wind: { ...n(0, -1), k: 0.15 },
    reefs: BASE_REEFS,
    currents: [
      { x: FORK.x + 6, z: FORK.z - 4, r: 16, ...n(1, -0.5), k: 3.0 },
      { x: FAR_STOP.x, z: FAR_STOP.z, r: 12, ...n(0.3, 1), k: 2.6 },
    ],
  },
};

export function seaStateFor(sceneId: string | null | undefined): SeaState {
  return SEA_STATES[sceneId ?? 'test'] ?? SEA_STATES.test;
}


/** 船的状态：耐久会被礁石磕掉，连击在小游戏里累加 */
export interface Hull {
  hp: number;
  /** 上一次撞礁的时间（毫秒），用来做屏幕的红闪 */
  lastHit: number;
}

export const HULL_MAX = 100;
export const REEF_DAMAGE = 12;
