import * as THREE from 'three';

/** 船长。L : B : 桅高 ≈ 4 : 1 : 2.5（见 docs/design/ART_DIRECTION.md §通用船外形）。 */
export const SHIP_L = 22;
export const SHIP_B = 5.5;
export const DECK_Y = 2.05;

/**
 * 四段航程的船型参数。船仍是「同一艘船」的容器，
 * 但每段有自己的轮廓与帆制：木筏 → 明轮蒸汽船 → 缆线单桅船 → 无帆自航体。
 * 全部为概念设计，不是任何历史原船的复原。
 */
export type HullStyle = {
  id: 'raft' | 'junk' | 'steamer' | 'sailnet' | 'selfnav';
  /** 长宽比与干舷 */
  length: number;
  beam: number;
  deckY: number;
  /** 船底最低点（负值）；越小吃水越深 */
  keelMin: number;
  /** 船头抬升 */
  bowLift: number;
  /** 舷侧外张强度 */
  flare: number;
  /** 帆：数量、类型 */
  masts: number;
  sail: 'mat' | 'batten' | 'canvas' | 'none';
  /** 楼：层数与宽度比 */
  towerFloors: number;
  towerScale: number;
  /** 首部装饰：船眼 / 撞角 / 无 */
  prow: 'eye' | 'ram' | 'none';
  /** 推进：桨 / 明轮 / 螺旋 / 无 */
  drive: 'oar' | 'paddle' | 'prop' | 'none';
};

export const HULL_STYLES: Record<string, HullStyle> = {
  // 农业：木筏与独木舟之间。低干舷、平底、一张草席帆。
  raft: {
    id: 'raft', length: 14, beam: 6.4, deckY: 0.92, keelMin: -0.18, bowLift: 0.1,
    flare: 0.25, masts: 1, sail: 'mat', towerFloors: 0, towerScale: 0.5,
    prow: 'none', drive: 'oar',
  },
  // 启航港：宝船气势的通用容器（现有）
  junk: {
    id: 'junk', length: 22, beam: 5.5, deckY: 2.05, keelMin: -0.52, bowLift: 1.05,
    flare: 1, masts: 7, sail: 'batten', towerFloors: 3, towerScale: 1,
    prow: 'eye', drive: 'prop',
  },
  // 工业：铁壳蒸汽船。高干舷、单烟囱、明轮或螺旋桨、两张帆备用。
  steamer: {
    id: 'steamer', length: 26, beam: 5.2, deckY: 2.5, keelMin: -0.62, bowLift: 0.55,
    flare: 0.55, masts: 2, sail: 'canvas', towerFloors: 1, towerScale: 0.62,
    prow: 'ram', drive: 'paddle',
  },
  // 信息：轻壳单桅。细长、低楼、天线与缆线。
  sailnet: {
    id: 'sailnet', length: 24, beam: 4.4, deckY: 1.9, keelMin: -0.44, bowLift: 0.5,
    flare: 0.5, masts: 1, sail: 'canvas', towerFloors: 1, towerScale: 0.5,
    prow: 'none', drive: 'prop',
  },
  // 智能：无帆自航体。低矮、对称、无桅，靠光点与推进器。
  selfnav: {
    id: 'selfnav', length: 20, beam: 6.6, deckY: 1.5, keelMin: -0.34, bowLift: 0.18,
    flare: 0.3, masts: 0, sail: 'none', towerFloors: 0, towerScale: 0.4,
    prow: 'none', drive: 'prop',
  },
};

export const STYLE_BY_SCENE: Record<string, HullStyle['id']> = {
  test: 'junk',
  A: 'raft',
  B: 'steamer',
  C: 'sailnet',
  D: 'selfnav',
};

/** 「霸气」主要来自艉楼：占船长后 1/4，三层递退，逐层挑檐。 */
/**
 * 驾驶舱：艉楼第一层的内部空间。相机坐在桌后向前看，前窗三扇朝船头。
 * 尺寸与算术在 docs/design/ART_DIRECTION.md 的驾驶舱体块里；这里按 L=22 缩放。
 */
export const STERN_HALL = {
  z: SHIP_L / 2 - SHIP_L * 0.135,
  w: SHIP_B * 0.9,
  d: SHIP_L * 0.225,
  h: 1.62,
  wall: 0.11,
  winW: SHIP_B * 0.5,
  winH: 0.8,
  /** 窗台高于桌面，坐下后视线不被桌沿切断 */
  winY: DECK_Y + 1.28,
  floorY: DECK_Y + 0.06,
  /** 座位靠后壁，离开前窗约 3.9 个单位，镜头才不会贴墙 */
  seatZ: SHIP_L / 2 - SHIP_L * 0.09,
  /** 眼位高度：地板以上 1.12 */
  eyeY: DECK_Y + 1.18,
};

/**
 * 干舷与吃水。水线在 y = 0：船体只在水下露 0.5 左右，
 * 甲板离水 deckY，看起来是浮着而不是快淹了。
 */
function makeSheer(st: HullStyle) {
  return (t: number) => {
    const bow = Math.max(0, 1 - t / 0.22);
    const stern = Math.max(0, (t - 0.86) / 0.14);
    return {
      deck: st.deckY + Math.pow(bow, 1.6) * st.bowLift + Math.pow(stern, 2) * st.bowLift * 0.25,
      keel: st.keelMin + Math.pow(bow, 2.2) * st.keelMin * -0.88 + Math.pow(stern, 2.4) * st.keelMin * -0.38,
    };
  };
}

/** 舷弧：船头收窄收尖，舯部最宽，船尾保留方形平艉。 */
function makeBeam(st: HullStyle) {
  return (t: number) => {
    if (t < 0.2) return (st.beam / 2) * Math.pow(t / 0.2, 0.66);
    if (t > 0.965) return (st.beam / 2) * 0.965;
    return (st.beam / 2) * (1 - Math.pow((t - 0.2) / 0.8, 6) * 0.22);
  };
}

const N_Z = 40;
const N_ARC = 16;

/**
 * 船体放样：外张舷侧 + 内收船底 + 船头抬升。
 * 只做体块与弧度，不复原任何具体船只。概念设计。
 */
export function buildHullGeometry(st: HullStyle = HULL_STYLES.junk) {
  const sheer = makeSheer(st);
  const halfBeam = makeBeam(st);
  const station = (t: number) => {
    const s = sheer(t);
    return { z: -st.length / 2 + t * st.length, deckY: s.deck, keelY: s.keel, half: halfBeam(t), t };
  };

  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  const rings: THREE.Vector3[][] = [];

  for (let i = 0; i <= N_Z; i++) {
    const s = station(i / N_Z);
    const ring: THREE.Vector3[] = [];
    for (let j = 0; j <= N_ARC; j++) {
      const u = j / N_ARC;
      const fromDeck = u <= 0.5 ? u * 2 : (1 - u) * 2;
      const side = u <= 0.5 ? 1 : -1;
      // 舷侧上部外张（flare 越小越直，像铁壳），接近船底快速内收
      const flare = 1 - Math.pow(fromDeck, 1.55) * (0.985 - (1 - st.flare) * 0.35);
      const x = side * s.half * flare;
      const y = s.deckY + (s.keelY - s.deckY) * (fromDeck * 0.42 + fromDeck * fromDeck * 0.58);
      ring.push(new THREE.Vector3(x, y, s.z));
    }
    rings.push(ring);
  }

  const vIndex = (i: number, j: number) => i * (N_ARC + 1) + j;
  for (const ring of rings) for (const p of ring) positions.push(p.x, p.y, p.z);
  for (let i = 0; i <= N_Z; i++) for (let j = 0; j <= N_ARC; j++) uvs.push(i / N_Z, j / N_ARC);

  for (let i = 0; i < N_Z; i++) {
    for (let j = 0; j < N_ARC; j++) {
      const a = vIndex(i, j);
      const b = vIndex(i, j + 1);
      const c = vIndex(i + 1, j);
      const d = vIndex(i + 1, j + 1);
      index.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();

  const n = geo.getAttribute('normal');
  let ny = 0;
  for (let i = 0; i < n.count; i++) ny += n.getY(i);
  if (ny / n.count < 0) {
    const idx = geo.getIndex();
    if (idx) {
      const arr = idx.array as unknown as number[];
      for (let i = 0; i < arr.length; i += 3) {
        const t = arr[i + 1];
        arr[i + 1] = arr[i + 2];
        arr[i + 2] = t;
      }
      geo.computeVertexNormals();
    }
  }
  return geo;
}

/** 甲板：带中拱的曲面，不是平板。 */
export function buildDeckGeometry(st: HullStyle = HULL_STYLES.junk) {
  const sheer = makeSheer(st);
  const g = new THREE.PlaneGeometry(st.beam, st.length, 12, N_Z);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getY(i);
    const x = pos.getX(i);
    const t = (z + st.length / 2) / st.length;
    const camber = 0.09 * st.flare * (1 - Math.pow((x / (st.beam / 2)) * 1, 2)) * (1 - Math.pow(Math.abs(t - 0.5) * 2, 4));
    pos.setZ(i, sheer(t).deck + camber);
  }
  g.rotateX(-Math.PI / 2);
  g.deleteAttribute('normal');
  g.computeVertexNormals();
  return g;
}

/** 舷墙：沿舷弧起伏的一圈朱漆墙，带顶栏。 */
export function buildBulwarkGeometry(side: 1 | -1, st: HullStyle = HULL_STYLES.junk, height = 0.62) {
  const sheer = makeSheer(st);
  const halfBeam = makeBeam(st);
  const positions: number[] = [];
  const index: number[] = [];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const t = 0.02 + (i / n) * 0.96;
    const s = sheer(t);
    const z = -st.length / 2 + t * st.length;
    const x = side * (halfBeam(t) - 0.02);
    const h = height * (st.id === 'raft' ? 0.25 : 1);
    positions.push(x, s.deck, z);
    positions.push(x, s.deck + h, z);
  }
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/** 方形平艉板。 */
export function buildTransomGeometry(st: HullStyle = HULL_STYLES.junk) {
  const sheer = makeSheer(st);
  const halfBeam = makeBeam(st);
  const s = sheer(1);
  const half = halfBeam(1);
  const shape = new THREE.Shape();
  shape.moveTo(-half, s.deck);
  shape.lineTo(half, s.deck);
  shape.lineTo(half * 0.88, s.keel + 0.16);
  shape.lineTo(-half * 0.88, s.keel + 0.16);
  shape.closePath();
  const g = new THREE.ShapeGeometry(shape);
  g.translate(0, 0, st.length / 2 - 0.001);
  return g;
}

/** 硬帆：横杆之间的折面，不是布幔。 */
export function bentSail(w: number, h: number, curve = 0.42) {
  const g = new THREE.PlaneGeometry(w, h, 6, 18);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const x = pos.getX(i);
    const t = (y + h / 2) / h;
    // 逐段折面：每 1/5 高度一个折点，折线两侧明暗不同
    const fold = Math.sin((t * 5 - Math.floor(t * 5)) * Math.PI) * 0.22;
    pos.setZ(i, (Math.sin(t * Math.PI) * 0.55 + fold) * curve + Math.pow(Math.abs(x) / (w / 2), 2) * 0.05);
  }
  g.computeVertexNormals();
  return g;
}
