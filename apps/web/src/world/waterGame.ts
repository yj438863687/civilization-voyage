import type { Game } from './encounters';

/**
 * 水上的玩法：所有动作都用船来做。
 *
 *   gates  二选一：水面上立两道浮标门，各挂一个词，开进哪道就是哪个答案
 *   ring   停住：水面上一圈光环，风浪往外推，把船在圈里停够几秒
 *   catch  接住：东西真的漂在水上，开过去就接到；混在里面的坏东西要绕开
 *
 * 节拍类并进 catch：按顺序漂着几样东西，一样一样接。
 * 位置都相对船开始时的位置与朝向摆，所以永远在船头前方，看得见。
 */

export type WaterKind = 'gates' | 'ring' | 'catch';

export interface Gate {
  x: number;
  z: number;
  label: string;
  note: string;
  idx: number;
}

export interface Drop {
  id: number;
  x: number;
  z: number;
  good: boolean;
  label: string;
}

export interface WaterSpec {
  kind: WaterKind;
  /** 一句话：现在该做什么 */
  verb: string;
  gates?: Gate[];
  ring?: { x: number; z: number; r: number; secs: number; drift: number; label: string };
  drops?: Drop[];
  need?: number;
  /** 超过这个时间（performance.now 毫秒）还没完成：按 fallback 算 */
  deadline?: number;
  /** 到点没做成时算哪一项（gates 用索引；其它为 false=没做成） */
  fallbackIdx?: number;
  /** 接住类的总时限（秒） */
  secs?: number;
  startedAt: number;
}

export type WaterResult = { kind: 'gates'; idx: number } | { kind: 'ring'; won: boolean } | { kind: 'catch'; won: boolean; got: number };

/** 每帧写、界面 10Hz 读的进度 */
export const waterLive = {
  active: false,
  inside: false,
  insideSec: 0,
  got: 0,
  bad: 0,
  taken: new Set<number>(),
  /** 铜针该指的地方 */
  target: null as { x: number; z: number } | null,
  /** 剩余秒数（有时限时） */
  left: 0,
  done: false,
};

export function resetWaterLive() {
  waterLive.active = false;
  waterLive.inside = false;
  waterLive.insideSec = 0;
  waterLive.got = 0;
  waterLive.bad = 0;
  waterLive.taken = new Set();
  waterLive.target = null;
  waterLive.left = 0;
  waterLive.done = false;
}

/** 从船的位置与朝向出发摆东西：ahead 是船头方向的距离，side 是右舷方向的距离 */
function place(ship: { x: number; z: number; headingDeg: number }, ahead: number, side: number) {
  const h = (ship.headingDeg * Math.PI) / 180;
  // headingDeg = atan2(fwd.x, -fwd.z) → fwd = (sin h, -cos h)；right = (cos h, sin h)
  const fx = Math.sin(h);
  const fz = -Math.cos(h);
  const rx = Math.cos(h);
  const rz = Math.sin(h);
  return { x: ship.x + fx * ahead + rx * side, z: ship.z + fz * ahead + rz * side };
}

export interface Obstacle {
  x: number;
  z: number;
  r: number;
}

/** 以船为中心，每隔 30° 试一个方向，取「离岛、礁、码头最远」的那个：永远有答案，不会把东西摆到岸上 */
function clearHeading(ship: { x: number; z: number; headingDeg: number }, obstacles: Obstacle[], reach: number, halfWidth: number): number {
  const tries = [0, 30, -30, 60, -60, 90, -90, 120, -120, 150, -150, 180];
  let best = ship.headingDeg;
  let bestScore = -Infinity;
  for (const off of tries) {
    const h = ((ship.headingDeg + off) * Math.PI) / 180;
    const fx = Math.sin(h);
    const fz = -Math.cos(h);
    const rx = Math.cos(h);
    const rz = Math.sin(h);
    let score = Infinity;
    // 不只看中线：门在两边、东西左右错落，整条带子都要是空水
    for (let d = 8; d <= reach; d += 4) {
      for (const side of [-halfWidth, 0, halfWidth]) {
        const px = ship.x + fx * d + rx * side;
        const pz = ship.z + fz * d + rz * side;
        for (const o of obstacles) score = Math.min(score, Math.hypot(px - o.x, pz - o.z) - o.r);
      }
    }
    // 正前方略占便宜：清一样时，不要无故转头
    score += off === 0 ? 1.5 : 0;
    if (score > bestScore) {
      bestScore = score;
      best = ship.headingDeg + off;
    }
  }
  return best;
}

export function buildWaterSpec(
  game: Game,
  shipIn: { x: number; z: number; headingDeg: number },
  opts: { timeLimit?: number; obstacles?: Obstacle[] } = {},
): WaterSpec {
  const now = performance.now();
  const reach = game.kind === 'choice' ? 22 : game.kind === 'hold' ? 22 : 12 + ((game.kind === 'rhythm' ? game.beats : game.need) + 3) * 7;
  const halfWidth = game.kind === 'choice' ? 14 : game.kind === 'hold' ? 5 : 6;
  const ship = { ...shipIn, headingDeg: clearHeading(shipIn, opts.obstacles ?? [], reach, halfWidth) };
  if (game.kind === 'choice') {
    const n = game.options.length;
    const gates: Gate[] = game.options.map((o, i) => {
      const side = (i - (n - 1) / 2) * 13;
      const p = place(ship, 18, side);
      return { ...p, label: o.label, note: o.note, idx: i };
    });
    return {
      kind: 'gates',
      verb: game.ask,
      gates,
      startedAt: now,
      deadline: opts.timeLimit ? now + opts.timeLimit * 1000 : undefined,
      fallbackIdx: n - 1,
    };
  }
  if (game.kind === 'hold') {
    const p = place(ship, 16, 0);
    return {
      kind: 'ring',
      verb: game.verb,
      ring: { ...p, r: 4.2, secs: game.secs, drift: game.drift, label: game.label },
      startedAt: now,
      deadline: now + 26000,
    };
  }
  // catch 与 rhythm：东西沿船头方向排开，左右错落
  const beats = game.kind === 'rhythm' ? game.beats : game.need;
  const total = game.kind === 'rhythm' ? beats : beats + 3;
  const bads = game.kind === 'rhythm' ? 2 : 4;
  const drops: Drop[] = [];
  let id = 0;
  for (let i = 0; i < total; i++) {
    const p = place(ship, 12 + i * 7, ((i * 7919) % 11) - 5);
    drops.push({ id: id++, ...p, good: true, label: game.kind === 'rhythm' ? game.verb : game.good });
  }
  for (let i = 0; i < bads; i++) {
    const p = place(ship, 15 + i * 9 + 3, (i % 2 ? 1 : -1) * (3 + (i % 3)));
    drops.push({ id: id++, ...p, good: false, label: game.kind === 'rhythm' ? '偏' : game.bad });
  }
  const secs = game.kind === 'rhythm' ? 24 : game.secs + 14;
  return {
    kind: 'catch',
    verb: game.kind === 'rhythm' ? `${game.verb} · ${game.label}` : game.verb,
    drops,
    need: beats,
    secs,
    startedAt: now,
    deadline: now + secs * 1000,
  };
}
