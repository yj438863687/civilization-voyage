import * as THREE from 'three';

export const SHIP_L = 20;
export const SHIP_B = 5;
export const DECK_Y = 1.85;

/** Conceptual hull. Bow = local −z, square transom = +z. */
export function buildHullGeometry() {
  const L = SHIP_L;
  const B = SHIP_B;
  const nZ = 28;
  const nArc = 10;
  const positions: number[] = [];
  const uvs: number[] = [];

  function station(t: number) {
    let beam = 1;
    if (t < 0.13) beam = 0.1 + 0.9 * Math.pow(t / 0.13, 0.8);
    const bow = Math.max(0, 1 - t / 0.18);
    const sternRise = Math.max(0, (t - 0.8) / 0.2);
    return {
      z: -L / 2 + t * L,
      keelY: -0.45 + bow * 0.62,
      deckY: DECK_Y + bow * 0.32 + sternRise * 0.28,
      half: (B / 2) * beam,
      t,
    };
  }

  const rings: THREE.Vector3[][] = [];
  for (let i = 0; i <= nZ; i++) {
    const s = station(i / nZ);
    const ring: THREE.Vector3[] = [];
    for (let j = 0; j <= nArc; j++) {
      const u = j / nArc;
      const fromDeck = u <= 0.5 ? u * 2 : (1 - u) * 2;
      const side = u <= 0.5 ? 1 : -1;
      const x = side * s.half * Math.pow(1 - fromDeck, 1.28);
      const y = s.deckY + (s.keelY - s.deckY) * (fromDeck * 0.55 + fromDeck * fromDeck * 0.45);
      ring.push(new THREE.Vector3(x, y, s.z));
    }
    rings.push(ring);
  }

  const index: number[] = [];
  const vIndex = (i: number, j: number) => i * (nArc + 1) + j;
  for (const ring of rings) {
    for (const p of ring) {
      positions.push(p.x, p.y, p.z);
    }
  }
  for (let i = 0; i <= nZ; i++) {
    for (let j = 0; j <= nArc; j++) {
      uvs.push(i / nZ, j / nArc);
    }
  }
  for (let i = 0; i < nZ; i++) {
    for (let j = 0; j < nArc; j++) {
      const a = vIndex(i, j);
      const b = vIndex(i, j + 1);
      const c = vIndex(i + 1, j);
      const d = vIndex(i + 1, j + 1);
      index.push(a, c, b, b, c, d);
    }
  }

  const deckA: number[] = [];
  for (let i = 0; i <= nZ; i++) {
    const s = station(i / nZ);
    const topR = vIndex(i, 0);
    const topL = vIndex(i, nArc);
    deckA.push(positions[topR * 3], s.deckY, positions[topR * 3 + 2]);
    deckA.push(positions[topL * 3], s.deckY, positions[topL * 3 + 2]);
  }
  const deckOffset = positions.length / 3;
  positions.push(...deckA);
  for (let i = 0; i <= nZ; i++) {
    uvs.push(i / nZ, 0);
    uvs.push(i / nZ, 1);
  }
  for (let i = 0; i < nZ; i++) {
    const a = deckOffset + i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    index.push(a, c, b, b, c, d);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  const n = geo.getAttribute('normal');
  let ny = 0;
  let count = 0;
  for (let i = 0; i < n.count; i++) {
    ny += n.getY(i);
    count++;
  }
  if (ny / count < 0) {
    const idx = geo.getIndex();
    if (idx) {
      const arr = idx.array;
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

export function bentSail(w: number, h: number, curve = 0.42) {
  const g = new THREE.PlaneGeometry(w, h, 2, 12);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const x = pos.getX(i);
    const t = (y + h / 2) / h;
    pos.setZ(i, Math.sin(t * Math.PI) * curve + Math.abs(x) * 0.04);
  }
  g.computeVertexNormals();
  return g;
}
