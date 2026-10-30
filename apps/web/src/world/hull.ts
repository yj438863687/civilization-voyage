import * as THREE from 'three';

/** 船长。L : B : 桅高 ≈ 4 : 1 : 2.5（见 docs/design/ART_DIRECTION.md §通用船外形）。 */
export const SHIP_L = 22;
export const SHIP_B = 5.5;
export const DECK_Y = 2.05;

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

/** 干舷与吃水。船头抬高、船尾微抬，中段最深。 */
function sheer(t: number) {
  const bow = Math.max(0, 1 - t / 0.22);
  const stern = Math.max(0, (t - 0.86) / 0.14);
  return {
    deck: DECK_Y + Math.pow(bow, 1.6) * 1.05 + Math.pow(stern, 2) * 0.26,
    keel: -0.86 + Math.pow(bow, 2.2) * 0.78 + Math.pow(stern, 2.4) * 0.34,
  };
}

/** 舷弧：船头收窄收尖，舯部最宽，船尾保留方形平艉。 */
function halfBeam(t: number) {
  if (t < 0.2) return (SHIP_B / 2) * Math.pow(t / 0.2, 0.66);
  if (t > 0.965) return (SHIP_B / 2) * 0.965;
  return (SHIP_B / 2) * (1 - Math.pow((t - 0.2) / 0.8, 6) * 0.22);
}

const N_Z = 40;
const N_ARC = 16;

function station(t: number) {
  const s = sheer(t);
  return { z: -SHIP_L / 2 + t * SHIP_L, deckY: s.deck, keelY: s.keel, half: halfBeam(t), t };
}

/**
 * 船体放样：外张舷侧 + 内收船底 + 船头抬升。
 * 只做体块与弧度，不复原任何具体船只。概念设计。
 */
export function buildHullGeometry() {
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  const rings: THREE.Vector3[][] = [];

  for (let i = 0; i <= N_Z; i++) {
    const s = station(i / N_Z);
    const ring: THREE.Vector3[] = [];
    for (let j = 0; j <= N_ARC; j++) {
      const u = j / N_ARC; // 0 = 右舷甲板边 → 0.5 龙骨 → 1 左舷甲板边
      const fromDeck = u <= 0.5 ? u * 2 : (1 - u) * 2;
      const side = u <= 0.5 ? 1 : -1;
      // 舷侧上部外张，接近船底快速内收
      const flare = 1 - Math.pow(fromDeck, 1.55) * 0.985;
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

  // 朝向自检：法线整体应朝外（+y 成分）
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
export function buildDeckGeometry() {
  const g = new THREE.PlaneGeometry(SHIP_B, SHIP_L, 12, N_Z);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getY(i);
    const x = pos.getX(i);
    const t = (z + SHIP_L / 2) / SHIP_L;
    const camber = 0.09 * (1 - Math.pow((x / (SHIP_B / 2)) * 1, 2)) * (1 - Math.pow(Math.abs(t - 0.5) * 2, 4));
    pos.setZ(i, sheer(t).deck + camber);
  }
  g.rotateX(-Math.PI / 2);
  g.deleteAttribute('normal');
  g.computeVertexNormals();
  return g;
}

/** 舷墙：沿舷弧起伏的一圈朱漆墙，带顶栏。 */
export function buildBulwarkGeometry(side: 1 | -1, height = 0.62) {
  const positions: number[] = [];
  const index: number[] = [];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const t = 0.02 + (i / n) * 0.96;
    const s = station(t);
    const x = side * (s.half - 0.02);
    positions.push(x, s.deckY, s.z);
    positions.push(x, s.deckY + height, s.z);
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
export function buildTransomGeometry() {
  const s = station(1);
  const shape = new THREE.Shape();
  shape.moveTo(-s.half, s.deckY);
  shape.lineTo(s.half, s.deckY);
  shape.lineTo(s.half * 0.88, s.keelY + 0.16);
  shape.lineTo(-s.half * 0.88, s.keelY + 0.16);
  shape.closePath();
  const g = new THREE.ShapeGeometry(shape);
  g.translate(0, 0, s.z - 0.001);
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
