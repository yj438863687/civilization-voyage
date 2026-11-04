import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { ShipRefit } from './ShipRefit';
import * as THREE from 'three';
import { EraDeckCrew } from './Figure';
import type { Look } from './encounters';
import {
  buildBulwarkGeometry,
  buildDeckGeometry,
  buildHullGeometry,
  buildTransomGeometry,
  DECK_Y,
  HULL_STYLES,
  SHIP_B,
  SHIP_L,
  STERN_HALL,
  type HullStyle,
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
  floors: floorCount = 3,
  scale = 1,
}: {
  lacquer: THREE.Material;
  wood: THREE.Material;
  trim: THREE.Material;
  glow: THREE.MeshStandardMaterial;
  deck: number;
  floors?: number;
  scale?: number;
}) {
  const all = [
    { w: STERN_HALL.w, d: STERN_HALL.d, h: 1.5, inset: 0 },
    { w: STERN_HALL.w * 0.84, d: STERN_HALL.d * 0.86, h: 1.34, inset: 0.06 },
    { w: STERN_HALL.w * 0.68, d: STERN_HALL.d * 0.7, h: 1.16, inset: 0.12 },
  ];
  const floors = all.slice(0, Math.max(1, Math.min(3, floorCount))).map((f) => ({
    ...f,
    w: f.w * scale,
    d: f.d * scale,
    h: f.h * scale,
  }));
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
  deck = DECK_Y,
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
  deck?: number;
}) {
  const cloth = useRef<THREE.Group>(null);
  const rows = useRef<(THREE.Group | null)[]>([]);
  const sailY = deck + h * 0.5;

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
      <mesh position={[0, deck + h / 2, 0]} material={hull} castShadow>
        <cylinderGeometry args={[0.075, 0.14, h, 10]} />
      </mesh>
      <mesh position={[0, deck + h + 0.1, 0]} material={trim}>
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

function Rigging({ masts, style }: { masts: { z: number; h: number }[]; style: HullStyle }) {
  const geo = useMemo(() => {
    const pts: number[] = [];
    const add = (a: number[], b: number[]) => pts.push(...a, ...b);
    if (masts.length === 0) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([]), 3));
      return g;
    }
    const tops = masts.map((m) => [0, style.deckY + m.h * 0.94, m.z] as number[]);
    for (let i = 0; i < tops.length - 1; i++) add(tops[i], tops[i + 1]);
    add([0, style.deckY + 1.0, -style.length / 2 + 0.4], tops[0]);
    add([0, style.deckY + 2.0, style.length / 2 - 2.2], tops[tops.length - 1]);
    for (const t of tops) {
      add([style.beam * 0.46, style.deckY + 0.2, t[2] + 0.5], [t[0], t[1] - 0.1, t[2]]);
      add([-style.beam * 0.46, style.deckY + 0.2, t[2] + 0.5], [t[0], t[1] - 0.1, t[2]]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    return g;
  }, [masts, style]);
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
      <mesh position={[0,-.39,0]} material={trim}><cylinderGeometry args={[.035,.045,.55,6]}/></mesh>
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

export function TreasureShip({
  shipLevel = 0,
  crewLevel = 0,
  reduceMotion = false,
  style = HULL_STYLES.junk,
  crew,
  player,
}: {
  reduceMotion?: boolean;
  style?: HullStyle;
  shipLevel?: number;
  crewLevel?: number;
  /** 甲板上的两个人：每个时代不同 */
  crew: [Look, Look];
  /** 玩家：名字浮在头顶，衣服跟着时代换 */
  player?: { name: string; look: Look } | null;
}) {
  const sailMap = useTexture('/textures/sail-canvas.jpg');
  useLayoutEffect(() => {
    sailMap.colorSpace = THREE.SRGBColorSpace;
    sailMap.wrapS = THREE.RepeatWrapping;
    sailMap.wrapT = THREE.RepeatWrapping;
    sailMap.repeat.set(1.2, 1.4);
    sailMap.anisotropy = 8;
  }, [sailMap]);

  const M = useMemo(() => {
    const hull = mat(shipLevel>0?style.id==='steamer'?'#263c46':style.id==='sailnet'?'#254e58':style.id==='selfnav'?'#a9c3bd':'#4b543b':cssColor('--cv-ship-hull', '#2a211c'), { roughness: 0.84 });
    const deck = mat(cssColor('--cv-ship-hull-light', '#3b2f26'), { roughness: 0.9 });
    const lacquer = mat(cssColor('--cv-ship-lacquer', '#b6452c'), { roughness: 0.46, metalness: 0.12 });
    const trim = mat(cssColor('--cv-ship-trim', '#c9a15a'), { roughness: 0.3, metalness: 0.72 });
    const sail = new THREE.MeshStandardMaterial({
      map: sailMap,
      color: shipLevel>=2?'#9d583c':shipLevel>=1?'#d7c591':'#cbb894',
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
  }, [sailMap, shipLevel, style.id]);
  useEffect(()=>()=>Object.values(M).forEach(material=>material.dispose()),[M]);

  const hullGeo = useMemo(() => buildHullGeometry(style), [style]);
  const deckGeo = useMemo(() => buildDeckGeometry(style), [style]);
  const bulR = useMemo(() => buildBulwarkGeometry(1, style), [style]);
  const bulL = useMemo(() => buildBulwarkGeometry(-1, style), [style]);
  const transom = useMemo(() => buildTransomGeometry(style), [style]);
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

  const half = style.length / 2;
  const spinRef = useRef<THREE.Group>(null);
  // 推进器空转：转速慢，只用来让人看见「有机器在动」，不代表真实航速。
  useFrame((_, dt) => {
    const g = spinRef.current;
    if (!g || reduceMotion) return;
    g.rotation.x -= Math.min(dt, 0.05) * 2.4;
  });
  const span = style.length;
  const mainH = style.beam * 2.5;

  // 每段航程的桅：木筏一张草席帆，蒸汽船两桅备用帆，缆线船单桅，自航体无桅。
  const mastSpec: Record<string, { z: number; h: number; sailW: number; sailH: number }[]> = {
    junk: [
      { z: -6.6, h: mainH * 0.6, sailW: 2.2, sailH: 3.0 },
      { z: -4.4, h: mainH * 0.76, sailW: 2.9, sailH: 4.0 },
      { z: -2.0, h: mainH * 0.9, sailW: 3.5, sailH: 4.9 },
      { z: 0.5, h: mainH * 0.99, sailW: 4.0, sailH: 5.6 },
      { z: 2.9, h: mainH * 0.8, sailW: 2.9, sailH: 3.8 },
      { z: 4.8, h: mainH * 0.56, sailW: 1.9, sailH: 2.6 },
      { z: 6.2, h: mainH * 0.36, sailW: 0, sailH: 0 },
    ],
    raft: [{ z: -1.2, h: 4.4, sailW: 3.4, sailH: 3.0 }],
    steamer: [
      { z: -5.0, h: 9.5, sailW: 2.6, sailH: 3.2 },
      { z: 4.6, h: 7.6, sailW: 2.2, sailH: 2.6 },
    ],
    sailnet: [{ z: -1.4, h: 13.4, sailW: 4.2, sailH: 6.4 }],
    selfnav: [],
  };
  const masts = (mastSpec[style.id] ?? mastSpec.junk).map((m) => ({
    ...m,
    z: (m.z / SHIP_L) * span,
    h: (m.h / (SHIP_B * 2.5)) * mainH,
    sailW: (m.sailW / SHIP_B) * style.beam,
    sailH: (m.sailH / (SHIP_B * 2.5)) * mainH,
  }));

  const ribs = [];
  for (let i = 1; i < 14; i++) ribs.push(-half + (span * i) / 14);

  const isRaft = style.id === 'raft';
  const isSteam = style.id === 'steamer';
  const isNet = style.id === 'sailnet';
  const isSelf = style.id === 'selfnav';

  return (
    <group>
      <mesh geometry={hullGeo} material={M.hull} castShadow receiveShadow />
      <mesh geometry={bulR} material={isSteam ? M.trim : M.lacquer} castShadow />
      <mesh geometry={bulL} material={isSteam ? M.trim : M.lacquer} castShadow />
      <mesh geometry={deckGeo} material={M.deck} receiveShadow />
      <mesh geometry={transom} material={M.hull} />

      {/* 舷侧横木分隔：只作造型节奏 */}
      {!isSteam &&
        !isSelf &&
        ribs.map((z) => {
          const t = (z + half) / span;
          const w = style.beam * (t < 0.2 ? 0.6 + t * 2 : 1) * 0.99;
          return (
            <mesh key={z} position={[0, style.deckY - 0.42 * (isRaft ? 0.4 : 1), z]} material={M.hull}>
              <boxGeometry args={[w, 0.045, 0.06]} />
            </mesh>
          );
        })}
      {/* 蒸汽船：铆接列板 */}
      {isSteam &&
        [-0.7, -0.35, 0].map((dy) => (
          <mesh key={dy} position={[0, style.deckY + dy, 0]} material={M.trim}>
            <boxGeometry args={[style.beam * 1.005, 0.035, span * 0.8]} />
          </mesh>
        ))}

      {/* 艏楼：只给宝船。其他船型不叠楼 */}
      {style.id === 'junk' && (
        <>
          <mesh position={[0, DECK_Y + 0.72, -half + span * 0.055]} material={M.lacquer} castShadow>
            <boxGeometry args={[style.beam * 0.5, 0.9, span * 0.1]} />
          </mesh>
          <mesh position={[0, DECK_Y + 1.2, -half + span * 0.055]} material={M.trim}>
            <boxGeometry args={[style.beam * 0.54, 0.06, span * 0.11]} />
          </mesh>
        </>
      )}

      {/* 首部装饰 */}
      {style.prow === 'eye' &&
        [1, -1].map((sx) => (
          <group key={sx} position={[sx * style.beam * 0.44, DECK_Y - 0.18, -half + 1.5]}>
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
      {style.prow === 'ram' && (
        <mesh position={[0, style.deckY - 0.45, -half - 0.35]} rotation={[0, 0, Math.PI / 2]} material={M.trim}>
          <coneGeometry args={[0.34, 1.1, 10]} />
        </mesh>
      )}

      {/* 楼：宝船三层，其余一层的驾驶舱体块 */}
      {style.towerFloors > 0 && (
        <SternTower
          lacquer={M.lacquer}
          wood={M.deck}
          trim={M.trim}
          glow={M.glow}
          deck={DECK_Y}
          floors={style.towerFloors}
          scale={style.towerScale}
        />
      )}

      {/* 蒸汽船：单烟囱 + 明轮罩 */}
      {isSteam && (
        <>
          <mesh position={[0, style.deckY + 3.4, -1.2]} material={M.trim} castShadow>
            <cylinderGeometry args={[0.55, 0.72, 6.4, 12]} />
          </mesh>
          <mesh position={[0, style.deckY + 6.7, -1.2]} material={M.lacquer}>
            <cylinderGeometry args={[0.6, 0.6, 0.36, 12]} />
          </mesh>
          {[1, -1].map((sx) => (
            // 明轮装在舷侧轴上：轮面竖直（法线朝 x），下半浸水。
            <group key={sx} position={[sx * (style.beam / 2 + 0.98), style.deckY - 0.75, span * 0.16]}>
              <group ref={sx === 1 ? spinRef : undefined}>
              {/* 轮毂 + 八片轮叶，绕 x 轴转：下缘擦水，上缘高出舷墙 */}
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.3, 0.3, 1.2, 12]} />
                <meshStandardMaterial color="#262a2d" roughness={0.7} metalness={0.25} />
              </mesh>
              {Array.from({ length: 8 }, (_, i) => (
                <group key={i} rotation={[(i * Math.PI) / 4, 0, 0]}>
                  <mesh position={[0, 1.32, 0]} castShadow>
                    <boxGeometry args={[1.15, 0.62, 0.1]} />
                    <meshStandardMaterial color="#3a4044" roughness={0.55} metalness={0.35} />
                  </mesh>
                </group>
              ))}
              {/* 外舷支架：两根斜撑连到舷墙 */}
              {[-0.34, 0.34].map((dz) => (
                <mesh key={dz} position={[-sx * 0.52, 0.72, dz]} rotation={[0, 0, (sx * Math.PI) / 5]}>
                  <boxGeometry args={[1.1, 0.09, 0.09]} />
                  <meshStandardMaterial color="#2f3438" roughness={0.6} metalness={0.3} />
                </mesh>
              ))}
              </group>
            </group>
          ))}
        </>
      )}

      {/* 缆线船：天线与拉索 */}
      {isNet && (
        <>
          {[-0.3, 0.5].map((t, i) => (
            <mesh key={i} position={[style.beam * 0.3 * (i ? 1 : -1), style.deckY + 3.2 + i * 0.8, t * span]}>
              <cylinderGeometry args={[0.035, 0.05, 6.4, 6]} />
              <meshStandardMaterial color="#8fa6ae" roughness={0.42} metalness={0.5} />
            </mesh>
          ))}
          <mesh position={[style.beam * 0.3, style.deckY + 6.5, -0.3 * span]}>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshStandardMaterial color={cssColor('--cv-ship-lamp-core', '#ffd9a0')} emissive={cssColor('--cv-ship-lamp-cool', '#8fb6c8')} emissiveIntensity={1.8} toneMapped={false} />
          </mesh>
        </>
      )}

      {/* 自航体：一排冷光点，无桅无帆 */}
      {isSelf &&
        Array.from({ length: 6 }, (_, i) => (
          <mesh key={i} position={[0, style.deckY + 0.3, -span * 0.35 + (i * span * 0.7) / 5]}>
            <boxGeometry args={[style.beam * 0.5, 0.06, 0.16]} />
            <meshStandardMaterial color={cssColor('--cv-ship-lamp-core', '#ffd9a0')} emissive={cssColor('--cv-ship-lamp-cool', '#8fb6c8')} emissiveIntensity={1.4} toneMapped={false} />
          </mesh>
        ))}
      {isSelf && (
        <mesh position={[0, style.deckY + 0.55, -1.0]}>
          <sphereGeometry args={[0.28, 12, 12]} />
          <meshStandardMaterial color={cssColor('--cv-ship-lamp-core', '#ffd9a0')} emissive={cssColor('--cv-ship-lamp-cool', '#8fb6c8')} emissiveIntensity={2.0} toneMapped={false} />
        </mesh>
      )}

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
          deck={style.deckY}
          phase={i * 0.7}
        />
      ))}
      <Rigging masts={masts} style={style} />
      <ShipRefit style={style} level={shipLevel} reduceMotion={reduceMotion}/>
      {shipLevel >= 1 && [-1, 1].map(side => <mesh key={side} position={[side * style.beam * 0.48, style.deckY + 0.15, 0]} material={M.trim}><boxGeometry args={[0.09, 0.12, span * 0.7]} /></mesh>)}
      {shipLevel >= 2 && [-1, 1].map(side => <Lantern key={side} position={[side * style.beam * 0.39, style.deckY + 0.65, -span * 0.2]} trim={M.trim} glow={M.glow} scale={1.5} />)}
      {shipLevel >= 3 && <group position={[0, style.deckY + 1, span * 0.38]}><mesh material={M.trim}><cylinderGeometry args={[0.07, 0.07, 3.6, 8]} /></mesh><mesh position={[0.65, 1.2, 0]}><boxGeometry args={[1.3, 0.75, 0.04]} /><meshStandardMaterial color="#2c3e50" roughness={0.8} /></mesh><mesh position={[0.65, 1.2, 0.03]} material={M.trim}><torusGeometry args={[0.19, 0.035, 6, 20]} /></mesh></group>}
      <EraDeckCrew crew={crew} crewLevel={crewLevel} player={player} deckY={style.deckY} reduceMotion={reduceMotion} />

      {/* 旗与灯按实际甲板、桅顶定位，不能悬在船型之外。 */}
      {masts.length>0&&<mesh position={[.45,style.deckY+Math.max(...masts.map(m=>m.h))-.7,masts.reduce((best,m)=>m.h>best.h?m:best,masts[0]).z]} material={M.banner}><planeGeometry args={[.9,1.3]}/></mesh>}
      {[-1,1].map(side=><Lantern key={side} position={[side*style.beam*.4,style.deckY+.65,half-span*.1]} trim={M.trim} glow={M.glow}/>)}
      <Lantern position={[style.beam*.26,style.deckY+.65,-half+span*.1]} trim={M.trim} glow={M.glow} scale={.85}/>
      {Array.from({length:7},(_,i)=><mesh key={`l${i}`} position={[style.beam*.47,style.deckY-.25,-half+span*.12+i*span*.7/6]}><sphereGeometry args={[.055,8,8]}/><meshStandardMaterial color="#ffd9a0" emissive="#f0b46a" emissiveIntensity={1} toneMapped={false}/></mesh>)}

      {/* 接触阴影：径向柔边，船身压在水上，避免「浮在空气里」 */}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
        <planeGeometry args={[style.beam * 2.4, span * 1.15]} />
        <meshBasicMaterial map={softBlob} color="#04161a" transparent opacity={0.55} depthWrite={false} />
      </mesh>

      {/* 水线雾：船像从雾里出来 */}
      <mesh position={[0, 0.42, 0]} renderOrder={1}>
        <cylinderGeometry args={[style.beam * 1.25, style.beam * 1.5, 0.9, 20, 1, true]} />
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
