import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * 海上的实物：每一段航道上漂着的东西，形状与材质各自属于那个时代。
 * 全部为概念设计，不复原任何具体文物，也不使用任何遗址纹样。
 *
 * 为什么不做统一的「纸签」：纸签只说明"这里有一个可拾取物"，
 * 而泥板、汽压表、电缆接头会先告诉你这是哪个时代，文字是后补的。
 */

function cssVar(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export type RelicKind =
  | 'chart-scrap'   // 启航港：海图残页
  | 'clay-tablet'   // 农业：泥板
  | 'seed'          // 农业：种子
  | 'granary'       // 农业：粮仓记号
  | 'gauge'         // 工业：汽压表
  | 'shift'         // 工业：班次牌
  | 'spike'         // 工业：测量桩
  | 'cable'         // 信息：电缆接头
  | 'clock'         // 信息：时区
  | 'broken-line'   // 信息：断线的岛
  | 'starchart'     // 智能：自绘星图
  | 'dest'          // 智能：目的地的定义
  | 'skipped'       // 智能：被略过的港
  | 'buoy';         // 兜底

/** 每段航道上的物件：用 id 决定形状，免得再改一层数据。 */
export function relicKindOf(id: string): RelicKind {
  const map: Record<string, RelicKind> = {
    'chart-scrap': 'chart-scrap',
    'A-seed': 'seed',
    'A-stake': 'clay-tablet',
    'A-granary': 'granary',
    'B-gauge': 'gauge',
    'B-shift': 'shift',
    'B-rail': 'spike',
    'C-cable': 'cable',
    'C-tz': 'clock',
    'C-dark': 'broken-line',
    'D-star': 'starchart',
    'D-dest': 'dest',
    'D-skip': 'skipped',
    // 每条航道上的第二件
    'A-water': 'spike',
    'A-bone': 'clay-tablet',
    'B-coal': 'shift',
    'B-ticket': 'chart-scrap',
    'C-relay': 'cable',
    'C-screen': 'starchart',
    'D-weight': 'dest',
    'D-log': 'starchart',
  };
  return map[id] ?? 'buoy';
}

/** 每个时代的材质：农业土与陶、工业铁与铜、信息玻璃与铜、智能冷光。 */
function paletteFor(kind: RelicKind) {
  const clay = cssVar('--cv-ship-hull-light', '#3b2f26');
  const brass = cssVar('--cv-ship-trim', '#c9a15a');
  const warm = cssVar('--cv-ship-lamp-core', '#ffd9a0');
  const cool = cssVar('--cv-ship-lamp-cool', '#8fb6c8');
  if (kind.startsWith('A-') || ['clay-tablet', 'seed', 'granary'].includes(kind)) {
    return { body: '#7a5a3f', edge: clay, lit: warm, metal: 0.04 };
  }
  if (['gauge', 'shift', 'spike'].includes(kind)) {
    return { body: '#4a4f52', edge: brass, lit: warm, metal: 0.62 };
  }
  if (['cable', 'clock', 'broken-line'].includes(kind)) {
    return { body: '#22303a', edge: brass, lit: cool, metal: 0.4 };
  }
  if (['starchart', 'dest', 'skipped'].includes(kind)) {
    return { body: '#141c2e', edge: cool, lit: cool, metal: 0.25 };
  }
  return { body: '#4b443b', edge: brass, lit: warm, metal: 0.2 };
}

export function Relic({
  kind,
  active,
  reduceMotion,
  hero = false,
}: {
  kind: RelicKind;
  active: boolean;
  reduceMotion: boolean;
  /** 靠港戏的主角：不要托板，不要地面光圈，让它真的浮在水面上 */
  hero?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const lit = useRef<THREE.MeshStandardMaterial>(null);
  const P = useMemo(() => paletteFor(kind), [kind]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    // 靠近时：整件东西从水里被提上来，立住，才停在水面上
    // 不是"靠近就变大"，是被捞起来给你看
    const liftTarget = active ? 0.42 : 0;
    g.position.y += (liftTarget - g.position.y) * 0.04;
    const settle = g.position.y;
    g.position.y = settle + (reduceMotion ? 0 : Math.sin(t * 1.1 + kind.length) * 0.05);
    g.rotation.y = reduceMotion ? 0 : Math.sin(t * 0.23 + kind.length) * 0.06;
    // 出水时略微前倾，像刚从水里提起来还挂着水
    g.rotation.x = active ? Math.sin(t * 0.6) * 0.012 : 0;
    if (lit.current) {
      const target = active ? 2.6 : 0.55;
      lit.current.emissiveIntensity += (target - lit.current.emissiveIntensity) * 0.08;
    }
  });

  const bodyMat = (
    <meshStandardMaterial color={P.body} roughness={0.82} metalness={P.metal} />
  );

  return (
    <group ref={group}>
      {/* 水面上的托板：海里那些物件需要它，戏里的主角不需要 */}
      {!hero && (
        <mesh position={[0, 0.06, 0]} receiveShadow>
          <cylinderGeometry args={[1.15, 1.15, 0.12, 20]} />
          <meshStandardMaterial color="#1b1712" roughness={0.95} />
        </mesh>
      )}

      {kind === 'clay-tablet' && (
        <group position={[0, 0.62, 0]} rotation={[0, 0.3, 0.12]}>
          {/* 一块略圆的泥板，上面几道刻痕 */}
          <mesh castShadow>
            <boxGeometry args={[1.5, 1.9, 0.28]} />
            {bodyMat}
          </mesh>
          <mesh position={[0, 0, 0.16]}>
            <boxGeometry args={[1.3, 1.7, 0.04]} />
            <meshStandardMaterial color="#8d6b4a" roughness={0.95} />
          </mesh>
          {[0.5, 0.2, -0.1, -0.4].map((y, i) => (
            <mesh key={i} position={[0, y, 0.19]}>
              <boxGeometry args={[0.9 - i * 0.12, 0.06, 0.02]} />
              <meshStandardMaterial color="#4a3524" roughness={0.9} />
            </mesh>
          ))}
        </group>
      )}

      {kind === 'seed' && (
        <group position={[0, 0.36, 0]}>
          {/* 一小堆种子 + 一支插在地里的穗 */}
          {Array.from({ length: 9 }, (_, i) => {
            const a = i * 2.399;
            const r = 0.18 + (i % 3) * 0.14;
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * r, 0.06 + (i % 2) * 0.04, Math.sin(a) * r]}
                rotation={[a, a * 0.7, 0]}
              >
                <sphereGeometry args={[0.09, 8, 6]} />
                <meshStandardMaterial color="#b8964e" roughness={0.75} emissive={P.lit} emissiveIntensity={0.12} />
              </mesh>
            );
          })}
          <mesh position={[0, 0.62, 0]} rotation={[0.22, 0, -0.12]}>
            <cylinderGeometry args={[0.035, 0.045, 1.1, 6]} />
            <meshStandardMaterial color="#8a7a4a" roughness={0.8} />
          </mesh>
        </group>
      )}

      {kind === 'granary' && (
        <group position={[0, 0.3, 0]}>
          {/* 一只储粮的陶罐：鼓腹、窄口 */}
          <mesh position={[0, 0.55, 0]} castShadow>
            <sphereGeometry args={[0.62, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
            <meshStandardMaterial color="#7d5a3c" roughness={0.84} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.42, 0.36, 0.1, 16]} />
            <meshStandardMaterial color="#5d4229" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.98, 0]}>
            <cylinderGeometry args={[0.24, 0.26, 0.16, 14]} />
            <meshStandardMaterial color="#6d4d31" roughness={0.85} />
          </mesh>
          {/* 封口的一道麻绳 */}
          <mesh position={[0, 0.9, 0]}>
            <torusGeometry args={[0.25, 0.035, 6, 16]} />
            <meshStandardMaterial color="#a08b62" roughness={0.95} />
          </mesh>
        </group>
      )}

      {kind === 'gauge' && (
        <group position={[0, 0.86, 0]} rotation={[0, 0.34, 0]}>
          {/* 铜壳压力表：圆盘 + 指针 + 刻度 */}
          <mesh>
            <cylinderGeometry args={[0.62, 0.62, 0.22, 24]} />
            <meshStandardMaterial color="#8d7444" roughness={0.42} metalness={0.75} />
          </mesh>
          <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.52, 0.52, 0.04, 24]} />
            <meshStandardMaterial color="#e8e0cc" roughness={0.5} />
          </mesh>
          {Array.from({ length: 9 }, (_, i) => {
            const a = (i / 8) * Math.PI * 1.4 - Math.PI * 0.2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.42, 0.15, Math.sin(a) * 0.42]} rotation={[Math.PI / 2, 0, -a]}>
                <boxGeometry args={[0.02, 0.01, 0.1]} />
                <meshStandardMaterial color="#3a342a" />
              </mesh>
            );
          })}
          {/* 指针：停在高位，指的就是"快" */}
          <mesh position={[0.11, 0.17, 0.12]} rotation={[0, -0.5, 0]}>
            <boxGeometry args={[0.42, 0.02, 0.035]} />
            <meshStandardMaterial color="#1c1a16" />
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#1c1a16" />
          </mesh>
          <mesh position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.09, 0.11, 0.34, 10]} />
            <meshStandardMaterial color="#6b5a3a" roughness={0.5} metalness={0.7} />
          </mesh>
        </group>
      )}

      {kind === 'shift' && (
        <group position={[0, 0.5, 0]} rotation={[0, -0.24, 0]}>
          {/* 班次牌架：一排铜牌，谁上夜班谁挂上去 */}
          <mesh position={[0, 0.9, 0]}>
            <boxGeometry args={[1.5, 0.12, 0.1]} />
            <meshStandardMaterial color="#5a5041" roughness={0.55} metalness={0.6} />
          </mesh>
          {[-0.5, -0.17, 0.17, 0.5].map((x, i) => (
            <group key={i} position={[x, 0.72 - i * 0.05, 0]}>
              <mesh>
                <boxGeometry args={[0.24, 0.3, 0.03]} />
                <meshStandardMaterial
                  color={i === 3 ? '#b8925a' : '#8a7448'}
                  roughness={0.45}
                  metalness={0.8}
                  emissive={P.lit}
                  emissiveIntensity={i === 3 ? 0.35 : 0}
                />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 0.32, 0]}>
            <boxGeometry args={[1.6, 0.1, 0.14]} />
            <meshStandardMaterial color="#4a4034" roughness={0.7} />
          </mesh>
        </group>
      )}

      {kind === 'spike' && (
        <group position={[0, 0.4, 0]}>
          {/* 测量桩：一根木桩，钉着一小块铁牌 */}
          <mesh position={[0, 0.85, 0]} rotation={[0.06, 0, 0.04]} castShadow>
            <cylinderGeometry args={[0.07, 0.1, 1.8, 8]} />
            <meshStandardMaterial color="#6a5337" roughness={0.88} />
          </mesh>
          <mesh position={[0, 1.5, 0.09]} rotation={[0, 0, 0.04]}>
            <boxGeometry args={[0.36, 0.26, 0.04]} />
            <meshStandardMaterial color="#8d7444" roughness={0.4} metalness={0.8} emissive={P.lit} emissiveIntensity={0.15} />
          </mesh>
          {/* 铁轨断面：一小段工字钢 */}
          <mesh position={[0.42, 0.12, 0.1]} rotation={[0, 0.4, 0]}>
            <boxGeometry args={[0.7, 0.16, 0.22]} />
            <meshStandardMaterial color="#43484b" roughness={0.5} metalness={0.8} />
          </mesh>
        </group>
      )}

      {kind === 'cable' && (
        <group position={[0, 0.4, 0]} rotation={[0, 0.5, 0]}>
          {/* 海底电缆接头：粗缆、铜箍、几根散出的芯线 */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.3, 0.3, 2.2, 16]} />
            <meshStandardMaterial color="#1d2024" roughness={0.9} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.38, 0.38, 0.6, 16]} />
            <meshStandardMaterial color="#a1864e" roughness={0.35} metalness={0.85} emissive={P.lit} emissiveIntensity={0.3} />
          </mesh>
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <mesh key={i} position={[0.36, Math.cos(a) * 0.26, Math.sin(a) * 0.26]} rotation={[a, 0, 0.3]}>
                <cylinderGeometry args={[0.02, 0.02, 0.5, 5]} />
                <meshStandardMaterial color="#c99a5e" metalness={0.9} roughness={0.3} />
              </mesh>
            );
          })}
        </group>
      )}

      {kind === 'clock' && (
        <group position={[0, 0.9, 0]} rotation={[0, 0.3, 0]}>
          {/* 钟面：时区的具象。指针指向"别人的白天" */}
          <mesh>
            <cylinderGeometry args={[0.66, 0.66, 0.16, 26]} />
            <meshStandardMaterial color="#2a3038" roughness={0.5} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.56, 0.56, 0.03, 26]} />
            <meshStandardMaterial color="#e6e2d6" roughness={0.55} />
          </mesh>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.46, 0.13, Math.sin(a) * 0.46]} rotation={[Math.PI / 2, 0, -a]}>
                <boxGeometry args={[0.018, 0.01, i % 3 === 0 ? 0.11 : 0.06]} />
                <meshStandardMaterial color="#2b2b28" />
              </mesh>
            );
          })}
          <mesh position={[0.09, 0.15, -0.12]} rotation={[0, 0.9, 0]}>
            <boxGeometry args={[0.34, 0.02, 0.03]} />
            <meshStandardMaterial color="#1b1b18" />
          </mesh>
          <mesh position={[-0.08, 0.16, 0.16]} rotation={[0, -0.4, 0]}>
            <boxGeometry args={[0.44, 0.02, 0.025]} />
            <meshStandardMaterial color="#1b1b18" />
          </mesh>
          <mesh position={[0, 0.17, 0]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color={P.lit} emissive={P.lit} emissiveIntensity={1.4} toneMapped={false} />
          </mesh>
        </group>
      )}

      {kind === 'broken-line' && (
        <group position={[0, 0.45, 0]} rotation={[0, -0.3, 0]}>
          {/* 断缆：一头还连着，一头垂进水里 */}
          <mesh position={[-0.5, 0.16, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.16, 0.18, 1.1, 12]} />
            <meshStandardMaterial color="#1d2024" roughness={0.9} />
          </mesh>
          <mesh position={[0.28, -0.32, 0]} rotation={[0.5, 0, 1.2]}>
            <cylinderGeometry args={[0.14, 0.05, 1.2, 10]} />
            <meshStandardMaterial color="#1d2024" roughness={0.9} />
          </mesh>
          {/* 断口：几根翘出来的芯线，是这张图上唯一的断点 */}
          {Array.from({ length: 5 }, (_, i) => (
            <mesh key={i} position={[0.03 + i * 0.02, 0.1 + i * 0.05, (i - 2) * 0.06]} rotation={[(i - 2) * 0.3, 0, 0.6 + i * 0.1]}>
              <cylinderGeometry args={[0.012, 0.012, 0.28, 4]} />
              <meshStandardMaterial color={P.lit} emissive={P.lit} emissiveIntensity={0.9} toneMapped={false} />
            </mesh>
          ))}
        </group>
      )}

      {kind === 'starchart' && (
        <group position={[0, 0.75, 0]} rotation={[-0.5, 0.25, 0.04]}>
          {/* 自绘星图：一块暗板，上面是被算出来的点，不是谁看见的 */}
          <mesh castShadow>
            <boxGeometry args={[1.6, 1.6, 0.08]} />
            <meshStandardMaterial color="#0e1524" roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <planeGeometry args={[1.42, 1.42]} />
            <meshStandardMaterial color="#16213a" roughness={0.6} emissive="#0d1626" emissiveIntensity={0.6} />
          </mesh>
          {Array.from({ length: 22 }, (_, i) => {
            const a = i * 2.399;
            const r = 0.12 + ((i * 13) % 60) / 100;
            return (
              <mesh key={i} position={[Math.cos(a) * r, Math.sin(a) * r, 0.07]}>
                <sphereGeometry args={[0.016 + (i % 3) * 0.008, 5, 5]} />
                <meshStandardMaterial color="#dde4ff" emissive={P.lit} emissiveIntensity={1.6} toneMapped={false} />
              </mesh>
            );
          })}
          {/* 它自己连的线 */}
          {Array.from({ length: 7 }, (_, i) => {
            const a = i * 2.399, b = (i + 3) * 2.399;
            const r1 = 0.12 + ((i * 13) % 60) / 100;
            const r2 = 0.12 + (((i + 3) * 13) % 60) / 100;
            const x1 = Math.cos(a) * r1, y1 = Math.sin(a) * r1;
            const x2 = Math.cos(b) * r2, y2 = Math.sin(b) * r2;
            const len = Math.hypot(x2 - x1, y2 - y1);
            const ang = Math.atan2(y2 - y1, x2 - x1);
            return (
              <mesh key={`l${i}`} position={[(x1 + x2) / 2, (y1 + y2) / 2, 0.065]} rotation={[0, 0, ang]}>
                <planeGeometry args={[len, 0.006]} />
                <meshBasicMaterial color={P.lit} transparent opacity={0.5} />
              </mesh>
            );
          })}
        </group>
      )}

      {kind === 'dest' && (
        <group position={[0, 0.62, 0]}>
          {/* 目的地：一个坐标框。你要它去的地方，就是这样一个框 */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[0.9, 1.02, 4]} />
            <meshBasicMaterial color={P.lit} transparent opacity={0.85} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 1.15, 0]}>
            <boxGeometry args={[0.05, 2.3, 0.05]} />
            <meshStandardMaterial color={P.edge} emissive={P.lit} emissiveIntensity={0.8} metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 2.3, 0]}>
            <sphereGeometry args={[0.12, 10, 10]} />
            <meshStandardMaterial color="#fff4dc" emissive={P.lit} emissiveIntensity={2.4} toneMapped={false} />
          </mesh>
        </group>
      )}

      {kind === 'skipped' && (
        <group position={[0, 0.5, 0]}>
          {/* 被略过的港：一个被划掉的位置。桩还在，灯灭了 */}
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.06, 0.09, 2.2, 7]} />
            <meshStandardMaterial color="#3a3a3c" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.75, 0.02]} rotation={[0, 0, 0.35]}>
            <boxGeometry args={[1.15, 0.09, 0.05]} />
            <meshStandardMaterial color={P.lit} emissive={P.lit} emissiveIntensity={0.7} toneMapped={false} />
          </mesh>
          <mesh position={[0, 1.75, 0.02]} rotation={[0, 0, -0.35]}>
            <boxGeometry args={[1.15, 0.09, 0.05]} />
            <meshStandardMaterial color={P.lit} emissive={P.lit} emissiveIntensity={0.7} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.3, 1.42, 24]} />
            <meshBasicMaterial color="#4a4a4c" transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {(kind === 'chart-scrap' || kind === 'buoy') && (
        <group position={[0, 0.7, 0]} rotation={[0, 0.3, 0.05]}>
          {/* 海图残页：一张卷边的纸 */}
          <mesh>
            <planeGeometry args={[1.3, 1.6]} />
            <meshStandardMaterial color="#e8dcc6" roughness={0.9} side={THREE.DoubleSide} emissive={P.lit} emissiveIntensity={0.12} />
          </mesh>
          {[0.45, 0.1, -0.25].map((y, i) => (
            <mesh key={i} position={[0, y, 0.006]}>
              <planeGeometry args={[0.95 - i * 0.15, 0.04]} />
              <meshBasicMaterial color="#5d5446" transparent opacity={0.5} />
            </mesh>
          ))}
        </group>
      )}

      {/* 靠近时的一圈光：只在 active 时出现，告诉玩家"就是它" */}
      {!hero && (
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.35, 1.75, 40]} />
          <meshBasicMaterial
            color={P.lit}
            transparent
            opacity={active ? 0.34 : 0.1}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      <pointLight position={[0, 1.6, 0]} color={P.lit} intensity={active ? 2.2 : 0.5} distance={7} decay={2} />
    </group>
  );
}
