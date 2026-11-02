import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * 开局的大殿。
 *
 * 船停在一座石砌大殿中央：背后一圈尖拱，拱上是穹顶的肋，光从顶上落下来。
 * 四个时代是四扇彩绘玻璃窗——农业的土与河、工业的铁与火、信息的电与网、智能的星与眼。
 * 正中最高的那扇，是启航港：一张还没画满的海图。
 *
 * 选哪个时代，哪扇窗就亮起来，一道光从那扇窗落到船上。
 * 全部程序化，不复原任何真实建筑。
 */

export type EraKey = 'A' | 'B' | 'C' | 'D' | 'test';

const ERA: Record<EraKey, { panes: string[]; lead: string; glow: string; name: string }> = {
  A: { panes: ['#c8742a', '#e8a04a', '#8a4a22', '#f0c070', '#5a7a3a'], lead: '#2a1a0e', glow: '#ffb060', name: '农业' },
  B: { panes: ['#3a4a5a', '#c84a2a', '#8a8a8a', '#f08a3a', '#2a2a30'], lead: '#141414', glow: '#ff8a40', name: '工业' },
  C: { panes: ['#1a5a7a', '#3ab8d8', '#0a2a3a', '#8fdfe8', '#2a7a9a'], lead: '#0a1a22', glow: '#8fdfe8', name: '信息' },
  D: { panes: ['#1a2050', '#5a6fa8', '#c8d2f5', '#0a0e2a', '#9fb4ff'], lead: '#0a0c1e', glow: '#c8d2f5', name: '智能' },
  test: { panes: ['#e8dcc4', '#c9a15a', '#8a7448', '#f6efe0', '#5a6a70'], lead: '#2a2418', glow: '#ffd9a0', name: '启航港' },
};

/** 一扇彩绘玻璃：铅条网格、彩色玻璃片、中间一个时代的图样 */
function makeGlass(era: EraKey): THREE.CanvasTexture {
  const W = 256;
  const H = 768;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const E = ERA[era];
  // 玻璃片
  const cell = 32;
  let i = 0;
  for (let y = 0; y < H; y += cell) {
    for (let x = 0; x < W; x += cell) {
      const col = E.panes[(i * 7 + Math.floor(y / cell) * 3) % E.panes.length];
      g.fillStyle = col;
      g.fillRect(x, y, cell, cell);
      // 每片玻璃有点厚薄不匀
      g.fillStyle = `rgba(255,255,255,${0.04 + ((i * 13) % 7) / 60})`;
      g.fillRect(x, y, cell, cell * 0.4);
      i++;
    }
  }
  // 铅条
  g.strokeStyle = E.lead;
  g.lineWidth = 3;
  for (let y = 0; y <= H; y += cell) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }
  for (let x = 0; x <= W; x += cell) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, H);
    g.stroke();
  }
  // 中间的图样：一个圆形的"玫瑰"，里面是这个时代的记号
  const cx = W / 2;
  const cy = H * 0.42;
  const R = 92;
  g.fillStyle = E.lead;
  g.beginPath();
  g.arc(cx, cy, R + 6, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = E.panes[3];
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = E.lead;
  g.lineWidth = 4;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    g.stroke();
  }
  g.fillStyle = E.panes[0];
  g.beginPath();
  g.arc(cx, cy, R * 0.55, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = E.lead;
  g.lineWidth = 5;
  g.fillStyle = E.lead;
  if (era === 'A') {
    // 河与两岸的田：一道分水的鱼嘴
    g.beginPath();
    g.moveTo(cx, cy - 40);
    g.lineTo(cx - 26, cy + 36);
    g.moveTo(cx, cy - 40);
    g.lineTo(cx + 26, cy + 36);
    g.stroke();
    g.fillRect(cx - 44, cy + 10, 16, 16);
    g.fillRect(cx + 28, cy + 10, 16, 16);
  } else if (era === 'B') {
    // 齿轮
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      g.fillRect(cx + Math.cos(a) * 34 - 6, cy + Math.sin(a) * 34 - 6, 12, 12);
    }
    g.beginPath();
    g.arc(cx, cy, 28, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(cx, cy, 8, 0, Math.PI * 2);
    g.fill();
  } else if (era === 'C') {
    // 电波：三道弧，中间一点
    for (const r of [14, 28, 42]) {
      g.beginPath();
      g.arc(cx, cy + 10, r, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
    }
    g.beginPath();
    g.arc(cx, cy + 10, 5, 0, Math.PI * 2);
    g.fill();
  } else if (era === 'D') {
    // 一颗算出来的星：四角星 + 一只眼
    g.beginPath();
    g.moveTo(cx, cy - 44);
    g.lineTo(cx + 9, cy - 9);
    g.lineTo(cx + 44, cy);
    g.lineTo(cx + 9, cy + 9);
    g.lineTo(cx, cy + 44);
    g.lineTo(cx - 9, cy + 9);
    g.lineTo(cx - 44, cy);
    g.lineTo(cx - 9, cy - 9);
    g.closePath();
    g.fill();
    g.fillStyle = E.panes[2];
    g.beginPath();
    g.arc(cx, cy, 7, 0, Math.PI * 2);
    g.fill();
  } else {
    // 启航港：铜针
    g.beginPath();
    g.moveTo(cx, cy - 46);
    g.lineTo(cx + 10, cy);
    g.lineTo(cx, cy + 46);
    g.lineTo(cx - 10, cy);
    g.closePath();
    g.fill();
  }
  // 尖拱的顶部：拱外涂成铅色，让窗是尖的
  g.fillStyle = E.lead;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(0, 150);
  g.quadraticCurveTo(0, 20, W / 2, 0);
  g.quadraticCurveTo(W, 20, W, 150);
  g.lineTo(W, 0);
  g.closePath();
  g.fill();
  // 上下压暗一点，玻璃不会一片平光
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(0,0,0,0.35)');
  grad.addColorStop(0.3, 'rgba(0,0,0,0)');
  grad.addColorStop(0.75, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** 尖拱的轮廓：两段圆弧在顶上交成一个尖 */
function archShape(w: number, h: number) {
  const s = new THREE.Shape();
  const half = w / 2;
  s.moveTo(-half, 0);
  s.lineTo(-half, h - half * 1.4);
  s.quadraticCurveTo(-half, h, 0, h + half * 0.35);
  s.quadraticCurveTo(half, h, half, h - half * 1.4);
  s.lineTo(half, 0);
  s.closePath();
  return s;
}

const STONE = '#6a655c';
const STONE_DARK = '#4a463f';

function Column({ h, r = 0.7 }: { h: number; r?: number }) {
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r * 1.08, h, 14]} />
        <meshStandardMaterial color={STONE} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[r * 1.5, r * 1.6, 1, 8]} />
        <meshStandardMaterial color={STONE_DARK} roughness={0.95} />
      </mesh>
      {/* 柱头 */}
      <mesh position={[0, h + 0.5, 0]}>
        <cylinderGeometry args={[r * 1.45, r * 1.05, 1, 8]} />
        <meshStandardMaterial color={STONE_DARK} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** 一道穹顶的肋：从柱顶弯向顶心 */
function Rib({ from, apex }: { from: THREE.Vector3; apex: THREE.Vector3 }) {
  const geo = useMemo(() => {
    const mid = from.clone().lerp(apex, 0.5);
    mid.y = apex.y - 2;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, apex);
    return new THREE.TubeGeometry(curve, 16, 0.38, 8, false);
  }, [from, apex]);
  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial color={STONE} roughness={0.9} />
    </mesh>
  );
}

function Window({
  era,
  w,
  h,
  lit,
  reduceMotion,
}: {
  era: EraKey;
  w: number;
  h: number;
  lit: boolean;
  reduceMotion: boolean;
}) {
  const map = useMemo(() => makeGlass(era), [era]);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const shaft = useRef<THREE.MeshBasicMaterial>(null);
  const pool = useRef<THREE.MeshBasicMaterial>(null);
  const shape = useMemo(() => archShape(w, h), [w, h]);
  const glassGeo = useMemo(() => {
    const g = new THREE.ShapeGeometry(shape, 24);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const pos = g.attributes.position as THREE.BufferAttribute;
    const top = h + (w / 2) * 0.35;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (pos.getX(i) + w / 2) / w, pos.getY(i) / top);
    }
    uv.needsUpdate = true;
    return g;
  }, [shape, w, h]);
  // 石框是镂空的拱环：外轮廓减去窗洞
  const frame = useMemo(() => {
    const f = archShape(w + 1.2, h + 0.6);
    const hole = archShape(w, h);
    const path = new THREE.Path(hole.getPoints(32).reverse());
    f.holes.push(path);
    return f;
  }, [w, h]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const k = 1 - Math.exp(-(1 / 60) / 0.35);
    const want = lit ? 1.65 : 0.62;
    if (mat.current) {
      const cur = mat.current.color.r;
      const v = cur + (want - cur) * k;
      mat.current.color.setScalar(v);
    }
    if (light.current) light.current.intensity += ((lit ? 26 : 5) - light.current.intensity) * k;
    if (shaft.current) shaft.current.opacity += ((lit ? 0.11 + (reduceMotion ? 0 : Math.sin(t * 0.8) * 0.02) : 0) - shaft.current.opacity) * k;
    if (pool.current) pool.current.opacity += ((lit ? 0.2 : 0.05) - pool.current.opacity) * k;
  });
  return (
    <group>
      {/* 石框 */}
      <mesh position={[0, 0, 0]}>
        <extrudeGeometry args={[frame, { depth: 0.7, bevelEnabled: false }]} />
        <meshStandardMaterial color={STONE_DARK} roughness={0.9} />
      </mesh>
      {/* 玻璃：不受光，自己发光。放在框的内侧，面朝大殿中央 */}
      <mesh position={[0, 0, 0.36]} geometry={glassGeo}>
        <meshBasicMaterial ref={mat} map={map} color={0.62} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <pointLight ref={light} position={[0, h * 0.5, 2.5]} color={ERA[era].glow} intensity={5} distance={30} decay={2} />
      {/* 窗投在地面上的彩色光斑：不是真的光照，只是让人看见「这里有一扇窗」 */}
      <mesh position={[0, 0.06, 10]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w * 1.6, 9]} />
        <meshBasicMaterial ref={pool} color={ERA[era].glow} transparent opacity={0.05} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* 一道从窗落下来的光 */}
      <mesh position={[0, h * 0.35, 7]} rotation={[-0.55, 0, 0]}>
        <cylinderGeometry args={[w * 0.22, w * 0.9, 18, 16, 1, true]} />
        <meshBasicMaterial ref={shaft} color={ERA[era].glow} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * 大殿。以船为中心：后方（+z）是半圆的后殿，五个开间，中间最高。
 * highlight 是当前选中的时代：那扇窗亮起来。
 */
export function Hall({
  center,
  yaw = 0,
  highlight,
  reduceMotion,
}: {
  center: { x: number; z: number };
  /** 船的朝向：后殿永远在船的左舷——码头在船头，两舷才是开阔的 */
  yaw?: number;
  highlight: EraKey | null;
  reduceMotion: boolean;
}) {
  const R = 30;
  const H = 24;
  const apex = useMemo(() => new THREE.Vector3(0, H + 16, 2), []);
  // 后殿五个开间，从左到右：农业 · 工业 · 启航港 · 信息 · 智能
  const bays: { era: EraKey; a: number; h: number }[] = [
    { era: 'A', a: Math.PI * 0.14, h: H * 0.62 },
    { era: 'B', a: Math.PI * 0.32, h: H * 0.72 },
    { era: 'test', a: Math.PI * 0.5, h: H * 0.86 },
    { era: 'C', a: Math.PI * 0.68, h: H * 0.72 },
    { era: 'D', a: Math.PI * 0.86, h: H * 0.62 },
  ];
  const cols = useMemo(() => Array.from({ length: 7 }, (_, i) => Math.PI * (0.05 + (i / 6) * 0.9)), []);
  const dust = useRef<THREE.Points>(null);
  const dustGeo = useMemo(() => {
    const n = 500;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = 2 + Math.random() * 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  useFrame(({ clock }) => {
    if (dust.current && !reduceMotion) dust.current.rotation.y = clock.elapsedTime * 0.01;
  });
  // 大殿里雾收得很近：远处的港口、门、航道都隐进雾里，只剩石头和光
  const scene = useThree((st) => st.scene);
  useEffect(() => {
    const fog = scene.fog;
    if (!(fog instanceof THREE.Fog)) return;
    const prev = { near: fog.near, far: fog.far };
    fog.near = 14;
    fog.far = 64;
    return () => {
      fog.near = prev.near;
      fog.far = prev.far;
    };
  }, [scene]);

  return (
    <group position={[center.x, 0, center.z]} rotation={[0, yaw - Math.PI / 2, 0]}>
      {/* 后殿的柱子 */}
      {cols.map((a, i) => (
        <group key={i} position={[Math.cos(a) * R, 0, Math.sin(a) * R]}>
          <Column h={H} />
        </group>
      ))}
      {/* 肋：每根柱顶弯向顶心 */}
      {cols.map((a, i) => (
        <Rib key={`r${i}`} from={new THREE.Vector3(Math.cos(a) * R, H + 1, Math.sin(a) * R)} apex={apex} />
      ))}
      {/* 顶心的石饰 */}
      <mesh position={apex}>
        <sphereGeometry args={[1.4, 12, 10]} />
        <meshStandardMaterial color={STONE_DARK} roughness={0.9} />
      </mesh>
      {/* 后殿的墙：柱子之间一段弧墙，窗开在墙上。
          group 的 +z 轴统一转向大殿中心，墙在后、窗在前，再不会侧过来变成一条缝。 */}
      {bays.map((b) => {
        const x = Math.cos(b.a) * (R + 1.2);
        const z = Math.sin(b.a) * (R + 1.2);
        const yaw = Math.atan2(-Math.cos(b.a), -Math.sin(b.a));
        return (
          <group key={b.era} position={[x, 0, z]} rotation={[0, yaw, 0]}>
            <mesh position={[0, H / 2, -1.4]} receiveShadow>
              <boxGeometry args={[15, H + 2, 1.8]} />
              <meshStandardMaterial color={STONE} roughness={0.95} />
            </mesh>
            <group position={[0, 5.2, 0.2]}>
              <Window era={b.era} w={5.4} h={b.h * 1.05} lit={highlight === b.era} reduceMotion={reduceMotion} />
            </group>
            {/* 窗下一行小拱：画里那一层回廊 */}
            {[-4.6, -2.3, 0, 2.3, 4.6].map((x2) => (
              <mesh key={x2} position={[x2, 2.3, 0.1]}>
                <extrudeGeometry args={[archShape(1.4, 2.4), { depth: 0.4, bevelEnabled: false }]} />
                <meshStandardMaterial color="#2a2824" roughness={0.95} />
              </mesh>
            ))}
          </group>
        );
      })}
      {/* 顶上落下来的主光：照在船上 */}
      <mesh position={[0, 20, 0]}>
        <cylinderGeometry args={[2.5, 9, 36, 24, 1, true]} />
        <meshBasicMaterial color="#f6ead0" transparent opacity={0.04} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} fog={false} />
      </mesh>
      <spotLight position={[0, 40, 2]} angle={0.42} penumbra={0.8} intensity={70} color="#f6ead0" distance={70} decay={1.6} castShadow target-position={[0, 0, 0]} />
      {/* 光里的尘 */}
      <points ref={dust} geometry={dustGeo}>
        <pointsMaterial color="#f6ead0" size={0.09} transparent opacity={0.5} sizeAttenuation depthWrite={false} />
      </points>
    </group>
  );
}
