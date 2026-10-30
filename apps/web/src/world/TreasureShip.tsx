import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { DeckCrew } from './CrewFigures';
import {
  buildBulwarkGeometry,
  buildDeckGeometry,
  buildHullGeometry,
  buildTransomGeometry,
  DECK_Y,
  SHIP_B,
  SHIP_L,
  STERN_HALL,
} from './hull';

export { SHIP_L, SHIP_B };

function cssColor(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function mat(color: string, extra?: THREE.MeshStandardMaterialParameters) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.06, ...extra });
}

/** 艉楼：三层递退体块 + 每层薄挑檐。不做宫殿屋顶、不做斗拱彩画。 */
function SternTower({
  lacquer,
  wood,
  trim,
  glow,
  deck,
}: {
  lacquer: THREE.Material;
  wood: THREE.Material;
  trim: THREE.Material;
  glow: THREE.MeshStandardMaterial;
  deck: number;
}) {
  const floors = [
    { w: STERN_HALL.w, d: STERN_HALL.d, h: 1.5, inset: 0 },
    { w: STERN_HALL.w * 0.84, d: STERN_HALL.d * 0.86, h: 1.34, inset: 0.06 },
    { w: STERN_HALL.w * 0.68, d: STERN_HALL.d * 0.7, h: 1.16, inset: 0.12 },
  ];
  const baseZ = STERN_HALL.z;
  let cursor = deck;

  return (
    <group>
      {floors.map((f, i) => {
        const yMid = cursor + f.h / 2;
        const zc = baseZ - i * STERN_HALL.d * 0.07;
        const eaves = (
          <group key={`e${i}`} position={[0, cursor + f.h, zc]}>
            {/* 四面挑檐：薄板 + 铜色檐口线，端部上翘 8° */}
            <mesh rotation={[0.14, 0, 0]} material={trim} castShadow>
              <boxGeometry args={[f.w + 0.34, 0.07, f.d + 0.32]} />
            </mesh>
            <mesh position={[0, -0.055, 0]} material={lacquer}>
              <boxGeometry args={[f.w + 0.28, 0.05, f.d + 0.26]} />
            </mesh>
            {[-1, 1].map((sx) => (
              <mesh key={sx} position={[(sx * (f.w + 0.34)) / 2, 0.03, 0]} rotation={[0, 0, -sx * 0.14]} material={trim}>
                <boxGeometry args={[0.1, 0.05, f.d + 0.34]} />
              </mesh>
            ))}
          </group>
        );
        const body = (
          <group key={`b${i}`}>
            <mesh position={[0, yMid, zc]} material={i === 0 ? lacquer : lacquer} castShadow receiveShadow>
              <boxGeometry args={[f.w, f.h, f.d]} />
            </mesh>
            {/* 窗棂：发光小矩形网格，纯 emissive 不做几何窗格 */}
            {[-1, 1].map((sx) => (
              <mesh
                key={sx}
                position={[(sx * f.w) / 2 + sx * 0.008, yMid + 0.1, zc]}
                rotation={[0, (sx * Math.PI) / 2, 0]}
                material={glow}
              >
                <planeGeometry args={[f.d * 0.62, f.h * 0.34]} />
              </mesh>
            ))}
            <mesh position={[0, yMid + 0.08, zc - f.d / 2 - 0.008]} rotation={[0, Math.PI, 0]} material={glow}>
              <planeGeometry args={[f.w * 0.6, f.h * 0.32]} />
            </mesh>
            {/* 栏杆 */}
            <mesh position={[0, cursor + f.h + 0.16, zc - f.d / 2 + 0.02]} material={lacquer}>
              <boxGeometry args={[f.w, 0.05, 0.05]} />
            </mesh>
            {[-1, 1].map((sx) => (
              <mesh key={sx} position={[(sx * f.w) / 2, cursor + f.h + 0.16, zc]} material={lacquer}>
                <boxGeometry args={[0.05, 0.05, f.d]} />
              </mesh>
            ))}
          </group>
        );
        cursor += f.h;
        return (
          <group key={i}>
            {body}
            {eaves}
          </group>
        );
      })}
      {/* 顶：四坡缓顶，只在四角轻抬，不做完整屋顶 */}
      <mesh position={[0, cursor + 0.14, baseZ - STERN_HALL.d * 0.14]} rotation={[0.09, 0, 0]} material={trim} castShadow>
        <boxGeometry args={[STERN_HALL.w * 0.6, 0.12, STERN_HALL.d * 0.6]} />
      </mesh>
      <mesh position={[0, cursor + 0.34, baseZ - STERN_HALL.d * 0.16]} material={trim}>
        <coneGeometry args={[0.16, 0.34, 4]} />
      </mesh>
      {/* 楼内暖光：唯一实体点光源之一 */}
      <pointLight
        position={[0, deck + 1.2, baseZ]}
        color={cssColor('--cv-ship-lamp-warm', '#f0b46a')}
        intensity={2.1}
        distance={11}
        decay={2}
      />
      <mesh position={[0, deck + 0.06, STERN_HALL.z]} material={wood} receiveShadow>
        <boxGeometry args={[STERN_HALL.w, 0.1, STERN_HALL.d]} />
      </mesh>
    </group>
  );
}

function Mast({
  z,
  h,
  sailW,
  sailH,
  sail,
  shade,
  trim,
  hull,
  reduceMotion,
  phase,
}: {
  z: number;
  h: number;
  sailW: number;
  sailH: number;
  sail: THREE.Material;
  shade: THREE.Material;
  trim: THREE.Material;
  hull: THREE.Material;
  reduceMotion: boolean;
  phase: number;
}) {
  const cloth = useRef<THREE.Group>(null);
  const rows = useRef<(THREE.Group | null)[]>([]);
  const sailY = DECK_Y + h * 0.5;

  // 帆按行分段，鼓风是逐段位移（不是整面弯曲）
  useFrame(({ clock }) => {
    const g = cloth.current;
    if (!g) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < rows.current.length; i++) {
      const m = rows.current[i];
      if (!m) continue;
      m.position.z = reduceMotion ? 0 : Math.sin((Math.PI * 2 * t) / 4.2 + phase + i * 0.55) * 0.036;
    }
    g.rotation.y = reduceMotion ? 0 : Math.sin(t * 0.55 + phase) * 0.022;
  });

  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, DECK_Y + h / 2, 0]} material={hull} castShadow>
        <cylinderGeometry args={[0.075, 0.14, h, 10]} />
      </mesh>
      <mesh position={[0, DECK_Y + h + 0.1, 0]} material={trim}>
        <sphereGeometry args={[0.1, 10, 10]} />
      </mesh>
      {sailW > 0 && (
        <group ref={cloth}>
          {[0, 1, 2, 3, 4].map((row) => (
            <group
              key={row}
              ref={(m) => {
                rows.current[row] = m;
              }}
            >
              <mesh
                position={[0, sailY - sailH / 2 + (sailH * (row + 0.5)) / 5, -0.06]}
                rotation={[0, Math.PI, 0]}
                material={sail}
              >
                <planeGeometry args={[sailW, (sailH / 5) * 1.02, 4, 3]} />
              </mesh>
              <mesh position={[0, sailY - sailH / 2 + (sailH * row) / 5, 0.01]} material={shade}>
                <boxGeometry args={[sailW + 0.14, 0.04, 0.05]} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, sailY + sailH / 2 + 0.05, 0.01]} material={trim}>
            <boxGeometry args={[sailW + 0.18, 0.05, 0.05]} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function Rigging({ masts }: { masts: { z: number; h: number }[] }) {
  const geo = useMemo(() => {
    const pts: number[] = [];
    const add = (a: number[], b: number[]) => pts.push(...a, ...b);
    const tops = masts.map((m) => [0, DECK_Y + m.h * 0.94, m.z]);
    for (let i = 0; i < tops.length - 1; i++) add(tops[i], tops[i + 1]);
    add([0, DECK_Y + 1.0, -SHIP_L / 2 + 0.4], tops[0]);
    add([0, DECK_Y + 2.0, SHIP_L / 2 - 2.2], tops[tops.length - 1]);
    for (const t of tops) {
      add([SHIP_B * 0.46, DECK_Y + 0.2, t[2] + 0.5], [t[0], t[1] - 0.1, t[2]]);
      add([-SHIP_B * 0.46, DECK_Y + 0.2, t[2] + 0.5], [t[0], t[1] - 0.1, t[2]]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    return g;
  }, [masts]);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#150f0c" transparent opacity={0.8} />
    </lineSegments>
  );
}

function Lantern({
  position,
  trim,
  glow,
  scale = 1,
}: {
  position: [number, number, number];
  trim: THREE.Material;
  glow: THREE.MeshStandardMaterial;
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh material={glow}>
        <sphereGeometry args={[0.115, 10, 10]} />
      </mesh>
      <mesh position={[0, 0.13, 0]} material={trim}>
        <boxGeometry args={[0.15, 0.04, 0.15]} />
      </mesh>
      {/* 唯一的软光晕：只给主灯 */}
      <mesh renderOrder={3} scale={1.9}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial
          color={cssColor('--cv-ship-lamp-warm', '#f0b46a')}
          transparent
          opacity={0.16}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function TreasureShip({ reduceMotion = false }: { reduceMotion?: boolean }) {
  const sailMap = useTexture('/textures/sail-canvas.jpg');
  useLayoutEffect(() => {
    sailMap.colorSpace = THREE.SRGBColorSpace;
    sailMap.wrapS = THREE.RepeatWrapping;
    sailMap.wrapT = THREE.RepeatWrapping;
    sailMap.repeat.set(1.2, 1.4);
    sailMap.anisotropy = 8;
  }, [sailMap]);

  const M = useMemo(() => {
    const hull = mat(cssColor('--cv-ship-hull', '#2a211c'), { roughness: 0.84 });
    const deck = mat(cssColor('--cv-ship-hull-light', '#3b2f26'), { roughness: 0.9 });
    const lacquer = mat(cssColor('--cv-ship-lacquer', '#b6452c'), { roughness: 0.46, metalness: 0.12 });
    const trim = mat(cssColor('--cv-ship-trim', '#c9a15a'), { roughness: 0.3, metalness: 0.72 });
    const sail = new THREE.MeshStandardMaterial({
      map: sailMap,
      color: '#cbb894',
      roughness: 0.96,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const shade = mat(cssColor('--cv-ship-sail-shade', '#cdb994'), { roughness: 0.88 });
    const eye = mat(cssColor('--cv-ship-eye', '#f3ebdd'), { roughness: 0.36, metalness: 0.1, side: THREE.DoubleSide });
    const pupil = mat(cssColor('--cv-ship-eye-pupil', '#14100d'), { roughness: 0.5, side: THREE.DoubleSide });
    const banner = mat(cssColor('--cv-ship-banner', '#c9a15a'), { roughness: 0.72, side: THREE.DoubleSide });
    const glow = new THREE.MeshStandardMaterial({
      color: cssColor('--cv-ship-lamp-core', '#ffd9a0'),
      emissive: cssColor('--cv-ship-lamp-warm', '#f0b46a'),
      emissiveIntensity: 2.1,
      roughness: 0.34,
      toneMapped: false,
    });
    return { hull, deck, lacquer, trim, sail, shade, eye, pupil, banner, glow };
  }, [sailMap]);

  const hullGeo = useMemo(() => buildHullGeometry(), []);
  const deckGeo = useMemo(() => buildDeckGeometry(), []);
  const bulR = useMemo(() => buildBulwarkGeometry(1), []);
  const bulL = useMemo(() => buildBulwarkGeometry(-1), []);
  const transom = useMemo(() => buildTransomGeometry(), []);
  const softBlob = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    if (g) {
      const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
      grad.addColorStop(0, 'rgba(255,255,255,0.9)');
      grad.addColorStop(0.55, 'rgba(255,255,255,0.45)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
    }
    const tex = new THREE.CanvasTexture(c);
    return tex;
  }, []);

  const half = SHIP_L / 2;
  const mainH = SHIP_B * 2.5;
  // 6 桅硬帆 + 1 无帆艏桅（更接近硬帆船的骨架）
  const masts = [
    { z: -6.6, h: mainH * 0.6, sailW: 2.2, sailH: 3.0 },
    { z: -4.4, h: mainH * 0.76, sailW: 2.9, sailH: 4.0 },
    { z: -2.0, h: mainH * 0.9, sailW: 3.5, sailH: 4.9 },
    { z: 0.5, h: mainH * 0.99, sailW: 4.0, sailH: 5.6 },
    { z: 2.9, h: mainH * 0.8, sailW: 2.9, sailH: 3.8 },
    { z: 4.8, h: mainH * 0.56, sailW: 1.9, sailH: 2.6 },
    { z: 6.2, h: mainH * 0.36, sailW: 0, sailH: 0 },
  ];

  const ribs = [];
  for (let i = 1; i < 14; i++) ribs.push(-half + (SHIP_L * i) / 14);

  return (
    <group>
      <mesh geometry={hullGeo} material={M.hull} castShadow receiveShadow />
      <mesh geometry={bulR} material={M.lacquer} castShadow />
      <mesh geometry={bulL} material={M.lacquer} castShadow />
      <mesh geometry={deckGeo} material={M.deck} receiveShadow />
      <mesh geometry={transom} material={M.hull} />

      {/* 舷侧横木分隔：只作造型节奏 */}
      {ribs.map((z) => {
        const t = (z + half) / SHIP_L;
        const w = SHIP_B * (t < 0.2 ? 0.6 + t * 2 : 1) * 0.99;
        return (
          <mesh key={z} position={[0, DECK_Y - 0.42, z]} material={M.hull}>
            <boxGeometry args={[w, 0.045, 0.06]} />
          </mesh>
        );
      })}

      {/* 艏楼：前 1/10，一层，低矮 */}
      <mesh position={[0, DECK_Y + 0.72, -half + SHIP_L * 0.055]} material={M.lacquer} castShadow>
        <boxGeometry args={[SHIP_B * 0.5, 0.9, SHIP_L * 0.1]} />
      </mesh>
      <mesh position={[0, DECK_Y + 1.2, -half + SHIP_L * 0.055]} material={M.trim}>
        <boxGeometry args={[SHIP_B * 0.54, 0.06, SHIP_L * 0.11]} />
      </mesh>

      {/* 船眼：白底墨瞳，不发光 */}
      {[1, -1].map((sx) => (
        <group key={sx} position={[sx * SHIP_B * 0.44, DECK_Y - 0.18, -half + 1.5]}>
          <mesh rotation={[0, (sx * Math.PI) / 2, 0]} material={M.eye}>
            <circleGeometry args={[0.31, 20]} />
          </mesh>
          <mesh position={[sx * 0.006, 0, 0]} rotation={[0, (sx * Math.PI) / 2, 0]} material={M.pupil}>
            <circleGeometry args={[0.13, 16]} />
          </mesh>
          <mesh position={[sx * 0.004, 0.24, 0.02]} rotation={[0, (sx * Math.PI) / 2, 0]} material={M.trim}>
            <torusGeometry args={[0.33, 0.02, 6, 20, Math.PI]} />
          </mesh>
        </group>
      ))}

      <SternTower
        lacquer={M.lacquer}
        wood={M.deck}
        trim={M.trim}
        glow={M.glow}
        deck={DECK_Y}
      />

      {/* 舵：船尾中央大舵，舵杆与舵叶可见 */}
      <group position={[0, 0, half + 0.55]}>
        <mesh position={[0, 0.1, 0]} material={M.hull} castShadow>
          <boxGeometry args={[0.16, 2.7, 1.5]} />
        </mesh>
        <mesh position={[0, 1.6, -0.1]} material={M.trim}>
          <cylinderGeometry args={[0.065, 0.065, 2.3, 8]} />
        </mesh>
      </group>

      {masts.map((m, i) => (
        <Mast
          key={m.z}
          {...m}
          sail={M.sail}
          shade={M.shade}
          trim={M.trim}
          hull={M.hull}
          reduceMotion={reduceMotion}
          phase={i * 0.7}
        />
      ))}
      <Rigging masts={masts} />
      <DeckCrew />

      {/* 主帆旁的旗：场景唯一可换的点缀 */}
      <mesh position={[0.9, DECK_Y + mainH * 0.99 - 0.6, 0.5]} material={M.banner}>
        <planeGeometry args={[0.95, 1.8]} />
      </mesh>

      <Lantern position={[SHIP_B * 0.4, DECK_Y + 0.85, half - 2.2]} trim={M.trim} glow={M.glow} />
      <Lantern position={[-SHIP_B * 0.4, DECK_Y + 0.85, half - 2.2]} trim={M.trim} glow={M.glow} />
      <Lantern position={[0, DECK_Y + 4.55, half - 2.6]} trim={M.trim} glow={M.glow} scale={1.25} />
      <Lantern position={[SHIP_B * 0.26, DECK_Y + 0.5, -half + 2.2]} trim={M.trim} glow={M.glow} scale={0.85} />

      {/* 舷灯：一排小 emissive，节奏参考概念图 */}
      {Array.from({ length: 7 }, (_, i) => {
        const z = -half + 3 + (i * SHIP_L * 0.7) / 6;
        return (
          <mesh key={`l${i}`} position={[SHIP_B * 0.47, DECK_Y - 0.34, z]}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshStandardMaterial
              color={cssColor('--cv-ship-lamp-core', '#ffd9a0')}
              emissive={cssColor('--cv-ship-lamp-warm', '#f0b46a')}
              emissiveIntensity={1.0}
              toneMapped={false}
            />
          </mesh>
        );
      })}

      {/* 接触阴影：径向柔边，船身压在水上，避免「浮在空气里」 */}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
        <planeGeometry args={[SHIP_B * 2.4, SHIP_L * 1.15]} />
        <meshBasicMaterial map={softBlob} color="#04161a" transparent opacity={0.55} depthWrite={false} />
      </mesh>

      {/* 水线雾：船像从雾里出来 */}
      <mesh position={[0, 0.62, 0]} renderOrder={1}>
        <cylinderGeometry args={[SHIP_B * 1.25, SHIP_B * 1.5, 1.1, 20, 1, true]} />
        <meshBasicMaterial
          color={cssColor('--cv-scene-fog', '#24343c')}
          transparent
          opacity={0.3}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
