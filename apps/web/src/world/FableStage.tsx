import { HistoryMarker } from './HistoryMarker';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Encounter, Stage } from './encounters';
import { fableLive, type FableState } from './fable';
import { Figure } from './Figure';
import { IslandStage } from './IslandStages';

/**
 * 童话里的小岛：每座岛只住一个人，岛上的景就是他的执念。
 * 你在岛上做的事会留在岛上——田是湿的还是裂的，桩围死了还是留了口子。
 * 危机里的村子读同一份记忆：水往哪里走，是前面那两座岛决定的。
 */

const DRY = new THREE.Color('#8a6a44');
const WET = new THREE.Color('#5e8a3a');
const DROWN = new THREE.Color('#4a7a8c');
const CRACK = new THREE.Color('#a07a4a');

/** 一座小行星似的圆岛：顶面平，边缘圆 */
function Mound({ r = 5.5, color = '#5a4a32' }: { r?: number; color?: string }) {
  return (
    <group>
      <mesh position={[0, -0.9, 0]} scale={[1, 0.38, 1]} receiveShadow castShadow>
        <sphereGeometry args={[r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} roughness={0.97} />
      </mesh>
      <mesh position={[0, 1.18, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[r * 0.93, 40]} />
        <meshStandardMaterial color="#6a5a3a" roughness={0.98} />
      </mesh>
      {/* 岛边一圈浪花 */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r * 1.0, r * 1.16, 48]} />
        <meshBasicMaterial color="#f2ead8" transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** 一块田：颜色就是它的命运 */
function Field({
  at,
  size,
  wet,
  live,
  side,
}: {
  at: [number, number];
  size: [number, number];
  /** 结束后的状态：dry / wet / drown / crack */
  wet: 'dry' | 'wet' | 'drown' | 'crack';
  /** 正在分水时，随指针实时变化 */
  live: boolean;
  side: 'left' | 'right';
}) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const water = useRef<THREE.Mesh>(null);
  const target = useMemo(() => new THREE.Color(), []);
  useFrame(() => {
    if (!mat.current) return;
    let w: number;
    if (live) {
      // 指针 0 = 水全去左边，1 = 全去右边
      const v = fableLive.value;
      w = side === 'left' ? 1 - v : v;
    } else {
      w = wet === 'drown' ? 1 : wet === 'wet' ? 0.5 : wet === 'crack' ? 0 : 0.15;
    }
    // 0 干裂 → 0.5 正好 → 1 淹了
    if (w < 0.5) target.copy(wet === 'crack' && !live ? CRACK : DRY).lerp(WET, w / 0.5);
    else target.copy(WET).lerp(DROWN, (w - 0.5) / 0.5);
    mat.current.color.lerp(target, 0.08);
    if (water.current) {
      water.current.visible = w > 0.62;
      water.current.position.y = 1.24 + (w - 0.6) * 0.3;
    }
  });
  return (
    <group position={[at[0], 0, at[1]]}>
      <mesh position={[0, 1.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={size} />
        <meshStandardMaterial ref={mat} color={DRY} roughness={0.9} />
      </mesh>
      {/* 田垄 */}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[0, 1.25, -size[1] / 2 + (i + 0.5) * (size[1] / 5)]}>
          <boxGeometry args={[size[0] * 0.92, 0.06, 0.08]} />
          <meshStandardMaterial color="#4a3a24" roughness={1} />
        </mesh>
      ))}
      {/* 淹水时的一层水面 */}
      <mesh ref={water} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <planeGeometry args={[size[0] * 1.06, size[1] * 1.06]} />
        <meshStandardMaterial color="#6a9aac" transparent opacity={0.55} roughness={0.2} metalness={0.2} />
      </mesh>
    </group>
  );
}

/** 一道流动的水：小亮点沿着水道往下游走 */
function Stream({ from, to, on, reduceMotion }: { from: [number, number]; to: [number, number]; on: boolean; reduceMotion: boolean }) {
  const g = useRef<THREE.Group>(null);
  const N = 14;
  useFrame(({ clock }) => {
    if (!g.current) return;
    g.current.visible = on;
    if (reduceMotion) return;
    const t = clock.elapsedTime * 0.35;
    g.current.children.forEach((c, i) => {
      const k = (t + i / N) % 1;
      c.position.set(from[0] + (to[0] - from[0]) * k, 1.3, from[1] + (to[1] - from[1]) * k);
    });
  });
  return (
    <group ref={g}>
      {Array.from({ length: N }, (_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.07, 8, 6]} />
          <meshStandardMaterial color="#bfe2ec" emissive="#6fb8cc" emissiveIntensity={0.45} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- 看水的人的岛：一道闸，两块田 ---------- */
function GateIsland({ id, state, reduceMotion }: { id: string; state: FableState; reduceMotion: boolean }) {
  const gate = useRef<THREE.Mesh>(null);
  const done = state.gate;
  useFrame(() => {
    if (!gate.current) return;
    const live = fableLive.island === id;
    const v = live ? fableLive.value : done === 'even' ? 0.5 : done === 'tilt' ? 0.15 : 0.3;
    // 闸板跟着指针左右偏
    gate.current.position.x += ((v - 0.5) * 1.6 - gate.current.position.x) * 0.15;
  });
  const live = fableLive.island === id;
  const left = done === 'even' ? 'wet' : done === 'tilt' ? 'drown' : 'dry';
  const right = done === 'even' ? 'wet' : done === 'tilt' ? 'crack' : 'dry';
  return (
    <group>
      {/* 河道：从岛的上游流进来，在闸前分成两股 */}
      <mesh position={[0, 1.21, -2.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.4, 3.6]} />
        <meshStandardMaterial color="#5a8a9a" roughness={0.25} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.6, -0.8]} castShadow>
        <boxGeometry args={[2.6, 0.9, 0.24]} />
        <meshStandardMaterial color="#5a4630" roughness={0.9} />
      </mesh>
      <mesh ref={gate} position={[0, 1.7, -0.62]}>
        <boxGeometry args={[1.0, 0.8, 0.12]} />
        <meshStandardMaterial color="#8a6a42" roughness={0.85} />
      </mesh>
      <Field at={[-2.4, 1.4]} size={[3.2, 3.2]} wet={left} live={live || false} side="left" />
      <Field at={[2.4, 1.4]} size={[3.2, 3.2]} wet={right} live={live || false} side="right" />
      <Stream from={[0, -0.6]} to={[-2.4, 1.4]} on={live || done === 'even' || done === 'tilt'} reduceMotion={reduceMotion} />
      <Stream from={[0, -0.6]} to={[2.4, 1.4]} on={live || done === 'even'} reduceMotion={reduceMotion} />
    </group>
  );
}

/* ---------- 立桩的人的岛：一圈桩，留不留口子 ---------- */
function StakesIsland({ state, reduceMotion }: { state: FableState; reduceMotion: boolean }) {
  const N = 18;
  const st = state.stakes;
  // 口子开在下游一侧（+x）
  const gapIdx = new Set([0, 1, 17]);
  const visible = (i: number) => {
    if (st === 'closed') return true;
    if (st === 'gap') return !gapIdx.has(i);
    // 还没决定：最后一段还空着
    return i > 2 && i < 16;
  };
  const pool = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!pool.current) return;
    pool.current.visible = st === 'closed';
    if (!reduceMotion) pool.current.rotation.z = clock.elapsedTime * 0.4;
  });
  return (
    <group>
      <Field at={[0, 0]} size={[5, 5]} wet={st === 'gap' ? 'wet' : st === 'closed' ? 'dry' : 'dry'} live={false} side="left" />
      {Array.from({ length: N }, (_, i) => {
        const a = (i / N) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 3.4, 1.7, Math.sin(a) * 3.4]} visible={visible(i)} castShadow>
            <cylinderGeometry args={[0.08, 0.11, 1.1, 6]} />
            <meshStandardMaterial color="#6a5034" roughness={0.9} />
          </mesh>
        );
      })}
      {/* 还没钉的桩堆在一边 */}
      {!st && (
        <group position={[3.6, 1.3, 2.6]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[i * 0.18, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.08, 0.08, 1.1, 6]} />
              <meshStandardMaterial color="#6a5034" />
            </mesh>
          ))}
        </group>
      )}
      {/* 有口子：水穿过田流向下游；围死：水在桩外打转 */}
      <Stream from={[-4.6, 0]} to={[4.8, 0]} on={st === 'gap'} reduceMotion={reduceMotion} />
      <mesh ref={pool} position={[-4.4, 1.22, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.3, 1.3, 20, 1, 0, Math.PI * 1.6]} />
        <meshStandardMaterial color="#6a9aac" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

const STAGE_RESULTS: Partial<Record<Stage,[string,string,string]>> = {
  stakes:['stakes','gap','closed'],gate:['gate','even','tilt'],
  jars:['jars','full','low'],tally:['tally','full','missed'],
  books:['eyes','open','half'],press:['book','printed','shelved'],
};

/** 一座有人住的小岛。stage 决定岛上的景，action 决定他在做什么 */
export function FableIsland({
  id,
  onEnter,
  enc,
  state,
  active,
  shipAt,
  reduceMotion,
}: {
  id: string;
  onEnter?: ()=>void;
  enc: Encounter;
  state: FableState;
  active: boolean;
  /** 船在哪：他会转过头来看你 */
  shipAt: { x: number; z: number } | null;
  reduceMotion: boolean;
}) {
  const decision=state[`history:${id}`],result=enc.stage&&STAGE_RESULTS[enc.stage];
  const sceneState=enc.history&&decision&&result?{...state,[result[0]]:result[decision==='care'?1:2]}:state;
  return (
    <group>
      <Mound />
      {enc.history&&<group position={[3.6,1.2,-2.8]} rotation={[0,Math.PI*.75,0]} scale={.4}><HistoryMarker title={enc.history.title} onEnter={onEnter} image={enc.history.image} completed={!!state[`history:${id}`]}/></group>}
      {enc.stage === 'gate' && <GateIsland id={id} state={sceneState} reduceMotion={reduceMotion} />}
      {enc.stage === 'stakes' && <StakesIsland state={sceneState} reduceMotion={reduceMotion} />}
      {enc.stage && enc.stage !== 'gate' && enc.stage !== 'stakes' && <IslandStage stage={enc.stage} id={id} state={sceneState} reduceMotion={reduceMotion} />}
      <group position={enc.stage === 'gate' ? [1.4, 1.2, -1.0] : [-1.2, 1.2, 0.6]} rotation={[0, Math.PI * 0.75, 0]} scale={1.3}>
        <Figure look={enc.look} action={enc.action ?? 'idle'} talking={active} reduceMotion={reduceMotion} lookAt={shipAt} />
      </group>
      {/* 岛上一盏灯：远远看见有人住 */}
      <mesh position={[-3.4, 2.6, -2.4]}>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial color="#fff1d0" emissive="#ffcf8a" emissiveIntensity={active ? 3.4 : 1.8} toneMapped={false} />
      </mesh>
      <mesh position={[-3.4, 1.9, -2.4]}>
        <cylinderGeometry args={[0.03, 0.04, 1.4, 5]} />
        <meshStandardMaterial color="#2a2118" />
      </mesh>
      <pointLight position={[-2.6, 3.2, -1.6]} color="#ffcf8a" intensity={active ? 9 : 4} distance={14} decay={2} />
    </group>
  );
}

/* ---------- 危机里的村子：水往哪里走，是前面两座岛决定的 ---------- */
export function FloodVillage({
  state,
  resolved,
  reduceMotion,
}: {
  state: FableState;
  /** 危机已经过去 */
  resolved: boolean;
  reduceMotion: boolean;
}) {
  const water = useRef<THREE.Mesh>(null);
  const huts = useRef<THREE.Group>(null);
  const downField = useRef<THREE.MeshStandardMaterial>(null);
  const tmp = useMemo(() => new THREE.Color(), []);
  // 最终水位：没留口子、又守住了闸 → 漫进上游村子；开了闸 → 冲掉下游的田
  const final = useMemo(() => {
    const blocked = state.stakes !== 'gap';
    if (state.flood === 'held') return { level: blocked ? 1.0 : 0.35, downDrown: false, upDrown: blocked };
    if (state.flood === 'open') return { level: 0.45, downDrown: true, upDrown: false };
    return { level: 0, downDrown: false, upDrown: false };
  }, [state.stakes, state.flood]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // 危机进行中：水一点点涨；结束后停在命运给它的位置
    const lv = resolved ? final.level : fableLive.flood;
    if (water.current) {
      const y = 0.2 + lv * 1.6 + (reduceMotion ? 0 : Math.sin(t * 1.3) * 0.05);
      water.current.position.y += (y - water.current.position.y) * 0.04;
    }
    if (huts.current && resolved && final.upDrown) {
      huts.current.rotation.z += (0.06 - huts.current.rotation.z) * 0.02;
    }
    if (downField.current) {
      tmp.copy(resolved && final.downDrown ? DROWN : WET);
      downField.current.color.lerp(tmp, 0.04);
    }
  });

  return (
    <group>
      {/* 上游村子：三间茅屋 */}
      <group position={[-5, 0, 0]}>
        <Mound r={5} color="#4d4034" />
        <group ref={huts}>
          {[[-1.8, -1], [1.2, 0.6], [-0.2, 2.2]].map(([x, z], i) => (
            <group key={i} position={[x, 1.2, z]}>
              <mesh position={[0, 0.7, 0]} castShadow>
                <cylinderGeometry args={[0.9, 1, 1.4, 10]} />
                <meshStandardMaterial color="#6a5038" roughness={0.95} />
              </mesh>
              <mesh position={[0, 1.8, 0]} castShadow>
                <coneGeometry args={[1.3, 1.1, 10]} />
                <meshStandardMaterial color="#8a7448" roughness={0.98} />
              </mesh>
              <mesh position={[0, 0.5, 0.92]}>
                <planeGeometry args={[0.4, 0.7]} />
                <meshStandardMaterial color="#ffcf8a" emissive="#ffb060" emissiveIntensity={1.8} toneMapped={false} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
      {/* 下游的田 */}
      <group position={[6, 0, 0]}>
        <Mound r={4.6} color="#4d4034" />
        <mesh position={[0, 1.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[6, 6]} />
          <meshStandardMaterial ref={downField} color={WET} roughness={0.9} />
        </mesh>
      </group>
      {/* 闸 */}
      <mesh position={[0.6, 1.2, 0]}>
        <boxGeometry args={[0.4, 2.4, 3.6]} />
        <meshStandardMaterial color="#5a4630" roughness={0.9} />
      </mesh>
      {/* 涨起来的水 */}
      <mesh ref={water} position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[13, 40]} />
        <meshStandardMaterial color="#6a8a96" transparent opacity={0.62} roughness={0.15} metalness={0.25} />
      </mesh>
    </group>
  );
}
