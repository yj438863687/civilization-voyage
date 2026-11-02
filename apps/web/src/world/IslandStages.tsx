import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { Look, Stage } from './encounters';
import { fableLive, type FableState } from './fable';
import { Person } from './People';
import type { CrisisStage } from './stories';

/**
 * 十四则故事的景，与七场危机的景。
 * 每一处都读两样东西：你做过的选择（state），和小游戏进行中的实时进度（fableLive.value）。
 */

type P = { id: string; state: FableState; reduceMotion: boolean };
const live = (id: string) => fableLive.island === id;

function mat(color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return <meshStandardMaterial color={color} roughness={0.85} {...extra} />;
}

/* ---------- 仓颉：一块刻字的石头；刻完，天雨粟 ---------- */
function Tally({ id, state, reduceMotion }: P) {
  const marks = useRef<THREE.Group>(null);
  const rain = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const n = live(id) ? Math.round(fableLive.value * 8) : state.tally === 'full' ? 8 : state.tally === 'missed' ? 5 : 0;
    marks.current?.children.forEach((c, i) => (c.visible = i < n));
    if (rain.current) {
      rain.current.visible = state.tally === 'full' || (live(id) && fableLive.value > 0.95);
      if (!reduceMotion)
        rain.current.children.forEach((c, i) => {
          c.position.y = 9 - ((clock.elapsedTime * 2.2 + i * 0.37) % 8);
        });
    }
  });
  return (
    <group>
      <mesh position={[0, 2.6, -1]} castShadow>
        <boxGeometry args={[2.6, 2.8, 0.5]} />
        {mat('#6a6458', { flatShading: true })}
      </mesh>
      <group ref={marks} position={[0, 2.6, -0.72]}>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} position={[-0.8 + (i % 4) * 0.55, 0.55 - Math.floor(i / 4) * 0.9, 0]} rotation={[0, 0, (i * 0.7) % 1.2]}>
            <boxGeometry args={[0.36, 0.08, 0.04]} />
            {mat('#2a2218')}
          </mesh>
        ))}
      </group>
      {/* 鸟兽的足迹 */}
      {[[-2, 1.6], [-1.4, 2.4], [1.8, 2], [2.4, 1]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.22, z]} rotation={[-Math.PI / 2, 0, i]}>
          <ringGeometry args={[0.08, 0.18, 3]} />
          <meshBasicMaterial color="#3a2e20" />
        </mesh>
      ))}
      <group ref={rain} visible={false}>
        {Array.from({ length: 40 }, (_, i) => (
          <mesh key={i} position={[Math.sin(i * 2.4) * 4, 6, Math.cos(i * 1.7) * 4]}>
            <sphereGeometry args={[0.06, 5, 4]} />
            <meshStandardMaterial color="#e8c878" emissive="#c8a050" emissiveIntensity={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ---------- 后稷：一片麦田，一排陶罐，罐里的谷子随你接住的多少涨上来 ---------- */
function Jars({ id, state }: P) {
  const fills = useRef<THREE.Group>(null);
  useFrame(() => {
    const f = live(id) ? fableLive.value : state.jars === 'full' ? 1 : state.jars === 'low' ? 0.45 : 0.1;
    fills.current?.children.forEach((c) => {
      c.scale.y += (Math.max(0.05, f) - c.scale.y) * 0.1;
    });
  });
  return (
    <group>
      <mesh position={[-1.2, 1.22, 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 3.6]} />
        {mat('#c8a848')}
      </mesh>
      {Array.from({ length: 30 }, (_, i) => (
        <mesh key={i} position={[-3.4 + (i % 10) * 0.48, 1.6, 0 + Math.floor(i / 10) * 0.9]}>
          <cylinderGeometry args={[0.02, 0.02, 0.8, 4]} />
          {mat('#d8b858')}
        </mesh>
      ))}
      <group ref={fills}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[2.4 + (i % 2) * 1.1, 1.22, -1.6 + Math.floor(i / 2) * 1.1]} scale={[1, 0.1, 1]}>
            <cylinderGeometry args={[0.36, 0.36, 1.1, 12]} />
            {mat('#e0c070')}
          </mesh>
        ))}
      </group>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[2.4 + (i % 2) * 1.1, 1.8, -1.6 + Math.floor(i / 2) * 1.1]}>
          <cylinderGeometry args={[0.42, 0.34, 1.2, 12, 1, true]} />
          {mat('#7d5a3c', { side: THREE.DoubleSide })}
        </mesh>
      ))}
    </group>
  );
}

/* ---------- 汉阴丈人：一口井，一架桔槔。用了，它就一上一下地打水 ---------- */
function Well({ state, reduceMotion }: P) {
  const lever = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!lever.current) return;
    lever.current.rotation.z = state.machine === 'yes' && !reduceMotion ? Math.sin(clock.elapsedTime * 1.6) * 0.35 : 0.25;
  });
  return (
    <group position={[1.2, 0, -0.6]}>
      <mesh position={[0, 1.55, 0]}>
        <cylinderGeometry args={[0.8, 0.85, 0.7, 16, 1, true]} />
        {mat('#6a6052', { side: THREE.DoubleSide })}
      </mesh>
      <mesh position={[0, 1.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.75, 16]} />
        <meshStandardMaterial color="#3a5a6a" roughness={0.2} />
      </mesh>
      <mesh position={[1.6, 2.2, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 2, 6]} />
        {mat('#5a4430')}
      </mesh>
      <group ref={lever} position={[1.6, 3.2, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 4, 6]} />
          {mat('#6a5034')}
        </mesh>
        <mesh position={[2, -0.2, 0]}>
          <sphereGeometry args={[0.28, 8, 6]} />
          {mat('#5a5048')}
        </mesh>
        <mesh position={[-2, -0.6, 0]}>
          <cylinderGeometry args={[0.18, 0.15, 0.3, 8]} />
          {mat('#6a5034')}
        </mesh>
      </group>
      {/* 菜畦：浇过的是深色 */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-2.4, 1.22, -1.6 + i * 1.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.2, 1]} />
          {mat(state.machine ? '#4a6a32' : '#7a6a42')}
        </mesh>
      ))}
    </group>
  );
}

/* ---------- 卢德派：一台织机。砸了，碎在地上；不砸，梭子来回飞 ---------- */
function Loom({ state, reduceMotion }: P) {
  const shuttle = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (shuttle.current) shuttle.current.position.x = state.loom === 'broken' || reduceMotion ? 0 : Math.sin(clock.elapsedTime * 4) * 1.1;
  });
  if (state.loom === 'broken')
    return (
      <group position={[0.6, 1.25, -0.6]}>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} position={[Math.sin(i * 2.1) * 1.6, 0.1, Math.cos(i * 1.3) * 1.2]} rotation={[i, i * 0.7, i * 0.3]}>
            <boxGeometry args={[0.9 - (i % 3) * 0.2, 0.12, 0.12]} />
            {mat('#5a4430')}
          </mesh>
        ))}
      </group>
    );
  return (
    <group position={[0.6, 1.2, -0.6]}>
      {[-1.4, 1.4].map((x) => (
        <mesh key={x} position={[x, 1, 0]}>
          <boxGeometry args={[0.16, 2, 0.16]} />
          {mat('#5a4430')}
        </mesh>
      ))}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[3, 0.16, 0.16]} />
        {mat('#5a4430')}
      </mesh>
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[-1.2 + i * 0.185, 1.05, 0]}>
          <boxGeometry args={[0.015, 1.8, 0.015]} />
          <meshBasicMaterial color="#e8dcc4" />
        </mesh>
      ))}
      <mesh ref={shuttle} position={[0, 0.9, 0.12]}>
        <boxGeometry args={[0.4, 0.08, 0.1]} />
        {mat('#8a6a42')}
      </mesh>
      <mesh position={[0, 0.5, 0.1]}>
        <boxGeometry args={[2.6, 0.5, 0.05]} />
        {mat(state.loom === 'running' ? '#a85a3a' : '#8a7058')}
      </mesh>
    </group>
  );
}

/* ---------- 林则徐 / 魏源：书。译稿越收越齐；书印出来就装满木箱 ---------- */
function Books({ id, state, kind }: P & { kind: 'books' | 'press' }) {
  const stacks = useRef<THREE.Group>(null);
  useFrame(() => {
    let f: number;
    if (kind === 'books') f = live(id) ? fableLive.value : state.eyes === 'open' ? 1 : state.eyes === 'half' ? 0.55 : 0.2;
    else f = state.book === 'printed' ? 1 : 0.15;
    stacks.current?.children.forEach((c, i) => (c.visible = i / 10 < f));
  });
  return (
    <group>
      <mesh position={[0, 1.7, -1.2]}>
        <boxGeometry args={[2.4, 1, 1.2]} />
        {mat('#5a4430')}
      </mesh>
      <mesh position={[0.4, 2.4, -1.2]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshStandardMaterial color="#fff1d0" emissive="#ffc070" emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <pointLight position={[0.4, 2.8, -0.6]} color="#ffc070" intensity={5} distance={9} decay={2} />
      <group ref={stacks}>
        {Array.from({ length: 10 }, (_, i) => (
          <mesh key={i} position={[kind === 'press' ? 2.6 : -2.2 + (i % 5) * 0.5, 1.3 + Math.floor(i / 5) * 0.22 + (kind === 'press' ? i * 0.0 : 0), kind === 'press' ? -1.8 + i * 0.42 : 0.6]}>
            <boxGeometry args={kind === 'press' ? [0.9, 0.5, 0.36] : [0.42, 0.18, 0.56]} />
            {mat(kind === 'press' ? '#6a5034' : ['#7a3a2a', '#3a4a6a', '#6a6a3a'][i % 3])}
          </mesh>
        ))}
      </group>
      {kind === 'press' && state.book === 'shelved' && (
        <mesh position={[-2, 2, -1.4]}>
          <boxGeometry args={[1.4, 1.8, 0.7]} />
          {mat('#3a2a1e')}
        </mesh>
      )}
    </group>
  );
}

/* ---------- 洞穴：洞壁上晃着影子，身后有火，洞口外有光 ---------- */
function Cave({ reduceMotion }: P) {
  const shadows = useRef<THREE.Group>(null);
  const fire = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!reduceMotion) shadows.current?.children.forEach((c, i) => (c.position.x = -1.6 + i * 1.1 + Math.sin(t * 0.8 + i) * 0.4));
    if (fire.current) fire.current.intensity = 7 + Math.sin(t * 9) * 2;
  });
  return (
    <group position={[0, 0, -0.6]}>
      <mesh position={[0, 1.2, -1.2]} scale={[1.3, 1, 1]}>
        <sphereGeometry args={[3, 24, 14, Math.PI, Math.PI, 0, Math.PI / 2]} />
        {mat('#3a342e', { side: THREE.BackSide })}
      </mesh>
      <mesh position={[0, 2.4, -3.6]}>
        <planeGeometry args={[5, 2.2]} />
        {mat('#8a7a62')}
      </mesh>
      <group ref={shadows} position={[0, 2.4, -3.55]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i}>
            <circleGeometry args={[0.35 + (i % 2) * 0.15, 8]} />
            <meshBasicMaterial color="#1a1612" transparent opacity={0.7} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 1.5, 1.2]}>
        <coneGeometry args={[0.3, 0.8, 7]} />
        <meshBasicMaterial color="#ff9a40" toneMapped={false} />
      </mesh>
      <pointLight ref={fire} position={[0, 1.8, 1.2]} color="#ff9a40" intensity={7} distance={10} decay={2} />
    </group>
  );
}

/* ---------- 盲人摸象：一头象，几个看不见的人围着它 ---------- */
function Elephant({ state, reduceMotion }: P) {
  const blind: Look = { coat: '#6a5a48', trim: '#4a3e30', skin: '#b08a6a', pants: '#3a3026', hat: 'wrap', prop: 'none', eyes: 0 };
  const spots: [number, number, number][] = [[-2.4, 0.4, 1.3], [2.6, -0.4, -1.4], [0.2, 2.2, 3.1], [-0.4, -2, 0]];
  return (
    <group position={[0.4, 1.2, -0.4]}>
      <mesh position={[0, 1.6, 0]} castShadow>
        <boxGeometry args={[3.2, 1.8, 1.8]} />
        {mat('#7a7670')}
      </mesh>
      <mesh position={[2, 1.9, 0]}>
        <boxGeometry args={[1.1, 1.1, 1.1]} />
        {mat('#7a7670')}
      </mesh>
      <mesh position={[2.7, 1.1, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.14, 0.2, 1.6, 8]} />
        {mat('#6a6660')}
      </mesh>
      {[-1, 1].map((z) => (
        <mesh key={z} position={[1.9, 1.9, z * 0.75]} rotation={[0, z * 0.5, 0]}>
          <planeGeometry args={[0.9, 1.1]} />
          {mat('#6a6660', { side: THREE.DoubleSide })}
        </mesh>
      ))}
      {[[-1.1, -0.6], [-1.1, 0.6], [1.1, -0.6], [1.1, 0.6]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.4, z]}>
          <cylinderGeometry args={[0.28, 0.3, 0.9, 8]} />
          {mat('#6e6a64')}
        </mesh>
      ))}
      {/* 摸全身时，他们围成一圈牵着手；只听答案时，各站一处 */}
      {spots.map(([x, z, r], i) => (
        <group key={i} position={state.elephant === 'whole' ? [Math.cos(i * 1.57) * 2.4, -1.2, Math.sin(i * 1.57) * 2.0] : [x, -1.2, z]} rotation={[0, r, 0]} scale={1.1}>
          <Person look={blind} action="idle" reduceMotion={reduceMotion} phase={i} />
        </group>
      ))}
    </group>
  );
}

/* ---------- 烽火：山头一排烽火台。点了，一座接一座烧起来 ---------- */
function Beacons({ state, reduceMotion }: P) {
  const flames = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    flames.current?.children.forEach((c, i) => {
      c.visible = state.beacon === 'lit';
      if (!reduceMotion) c.scale.y = 0.8 + Math.sin(clock.elapsedTime * 8 + i) * 0.25;
    });
  });
  return (
    <group>
      {[-2.6, 0, 2.6].map((x, i) => (
        <group key={x} position={[x, 1.2, -1.6 + i * 0.4]}>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.6, 0.8, 2.4, 8]} />
            {mat('#6a6052', { flatShading: true })}
          </mesh>
        </group>
      ))}
      <group ref={flames}>
        {[-2.6, 0, 2.6].map((x, i) => (
          <mesh key={x} position={[x, 4.2, -1.6 + i * 0.4]}>
            <coneGeometry args={[0.45, 1.4, 7]} />
            <meshBasicMaterial color="#ff8a30" toneMapped={false} />
          </mesh>
        ))}
      </group>
      {state.beacon === 'lit' && <pointLight position={[0, 5, 0]} color="#ff8a30" intensity={14} distance={24} decay={2} />}
    </group>
  );
}

/* ---------- 苏武：冰冷的北海，几只羊，天上的雁 ---------- */
function Goose({ reduceMotion }: P) {
  const geese = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!geese.current || reduceMotion) return;
    const t = clock.elapsedTime * 0.3;
    geese.current.rotation.y = t;
    geese.current.children.forEach((c, i) => (c.rotation.z = Math.sin(clock.elapsedTime * 6 + i) * 0.4));
  });
  return (
    <group>
      <mesh position={[-1.4, 1.23, 1.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.2, 24]} />
        <meshStandardMaterial color="#c8dce4" roughness={0.15} metalness={0.2} />
      </mesh>
      {[[2, 1], [2.8, -0.6], [1.4, -1.6]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.5, z]}>
          <sphereGeometry args={[0.38, 10, 8]} />
          {mat('#ece6da')}
        </mesh>
      ))}
      <group ref={geese} position={[0, 7, 0]}>
        {Array.from({ length: 7 }, (_, i) => {
          const side = i === 0 ? 0 : i % 2 ? 1 : -1;
          const k = Math.ceil(i / 2);
          return (
            <mesh key={i} position={[4 - k * 0.6, 0, side * k * 0.6]}>
              <boxGeometry args={[0.5, 0.04, 0.9]} />
              {mat('#3a3a38')}
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

/* ---------- 魔法师的学徒：扫帚提着水桶来回跑，屋里的水越涨越高 ---------- */
function Brooms({ id, state, reduceMotion }: P) {
  const g = useRef<THREE.Group>(null);
  const water = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const stopped = state.broom === 'stopped';
    const pace = live(id) ? 1 - Math.min(1, Math.abs(fableLive.value - 0.57) * 0) : stopped ? 0 : 1;
    if (g.current && !reduceMotion)
      g.current.children.forEach((c, i) => {
        const a = clock.elapsedTime * 0.9 * pace + i * 1.26;
        c.position.set(Math.cos(a) * 2.6, 1.6 + Math.abs(Math.sin(a * 3)) * 0.2 * pace, Math.sin(a) * 2);
        c.rotation.z = stopped ? 0.4 : Math.sin(a * 3) * 0.2;
      });
    if (water.current) {
      const want = state.broom === 'flooded' ? 2.1 : stopped ? 1.35 : 1.3 + ((clock.elapsedTime * 0.04) % 0.6);
      water.current.position.y += (want - water.current.position.y) * 0.03;
    }
  });
  return (
    <group>
      <mesh position={[0, 2, -2.2]}>
        <boxGeometry args={[3.4, 2.2, 1.8]} />
        {mat('#5a4a3e')}
      </mesh>
      <group ref={g}>
        {Array.from({ length: 5 }, (_, i) => (
          <group key={i}>
            <mesh position={[0, 0.5, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 1.4, 5]} />
              {mat('#8a6a42')}
            </mesh>
            <mesh position={[0, -0.3, 0]}>
              <coneGeometry args={[0.22, 0.5, 8]} />
              {mat('#c8a868')}
            </mesh>
            <mesh position={[0.25, 0.1, 0]}>
              <cylinderGeometry args={[0.14, 0.11, 0.26, 8]} />
              {mat('#6a6a6a', { metalness: 0.5 })}
            </mesh>
          </group>
        ))}
      </group>
      <mesh ref={water} position={[0, 1.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.8, 32]} />
        <meshStandardMaterial color="#5a8aa0" transparent opacity={0.55} roughness={0.15} />
      </mesh>
    </group>
  );
}

/* ---------- 浑沌：开满花的岛。凿了七窍，花就谢了 ---------- */
function Hundun({ state }: P) {
  const carved = state.hundun === 'carved';
  return (
    <group>
      {Array.from({ length: 22 }, (_, i) => (
        <mesh key={i} position={[Math.cos(i * 2.4) * (1.6 + (i % 4) * 0.7), 1.35, Math.sin(i * 2.4) * (1.4 + (i % 3) * 0.7)]}>
          <sphereGeometry args={[0.14, 8, 6]} />
          {mat(carved ? '#6a5a48' : ['#f0d0a0', '#e8b8c8', '#f8f0d8'][i % 3])}
        </mesh>
      ))}
      {/* 七把凿子：凿了，就插在地上 */}
      {carved &&
        Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} position={[-2.6 + i * 0.8, 1.6, 2.6]} rotation={[0.3, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.06, 0.8, 5]} />
            {mat('#4a4d50', { metalness: 0.6 })}
          </mesh>
        ))}
    </group>
  );
}

/* ---------- 庄周梦蝶：花田与蝴蝶。梦里的蝴蝶是半透明的 ---------- */
function Butterflies({ state, reduceMotion }: P) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!g.current || reduceMotion) return;
    const t = clock.elapsedTime;
    g.current.children.forEach((c, i) => {
      c.position.set(Math.sin(t * 0.4 + i * 1.3) * 3, 2.2 + Math.sin(t * 1.1 + i) * 0.8, Math.cos(t * 0.35 + i * 1.7) * 2.6);
      (c.children[0] as THREE.Object3D).rotation.y = Math.sin(t * 12 + i) * 0.9;
      (c.children[1] as THREE.Object3D).rotation.y = -Math.sin(t * 12 + i) * 0.9;
    });
  });
  return (
    <group>
      {Array.from({ length: 26 }, (_, i) => (
        <mesh key={i} position={[Math.cos(i * 2.4) * (1 + (i % 5) * 0.8), 1.32, Math.sin(i * 2.4) * (1 + (i % 4) * 0.8)]}>
          <sphereGeometry args={[0.12, 6, 5]} />
          {mat(['#f0c040', '#f8f0e0', '#e890a0'][i % 3])}
        </mesh>
      ))}
      <group ref={g}>
        {Array.from({ length: 9 }, (_, i) => {
          const dream = i % 3 === 0;
          const op = dream ? (state.dream === 'blurred' ? 0.7 : 0.3) : 0.95;
          return (
            <group key={i}>
              {[-1, 1].map((s) => (
                <mesh key={s} position={[s * 0.14, 0, 0]}>
                  <planeGeometry args={[0.28, 0.22]} />
                  <meshStandardMaterial color={dream ? '#c8d8ff' : '#f0a040'} transparent opacity={op} side={THREE.DoubleSide} emissive={dream ? '#9fb4ff' : '#000'} emissiveIntensity={dream ? 0.8 : 0} />
                </mesh>
              ))}
            </group>
          );
        })}
      </group>
    </group>
  );
}

/* ---------- 偃师造人：一个在跳舞的「人」。拆开了，零件摆在地上 ---------- */
function Automaton({ state, reduceMotion }: P) {
  const g = useRef<THREE.Group>(null);
  const look: Look = { coat: '#c8a070', trim: '#8a3a2a', skin: '#e0c0a0', pants: '#6a4a3a', hat: 'wrap', prop: 'none' };
  useFrame(({ clock }) => {
    if (!g.current || reduceMotion) return;
    const t = clock.elapsedTime;
    g.current.rotation.y = Math.sin(t * 1.4) * 1.2;
    g.current.position.y = 1.2 + Math.abs(Math.sin(t * 2.8)) * 0.15;
  });
  if (state.automaton === 'opened')
    return (
      <group position={[1.6, 1.3, -0.8]}>
        {['#c8a070', '#8a6a42', '#e0c0a0', '#3a2a1e', '#c83a2a', '#e8e0d0'].map((c, i) => (
          <mesh key={i} position={[(i % 3) * 0.6 - 0.6, 0.06, Math.floor(i / 3) * 0.6]}>
            <boxGeometry args={[0.4, 0.1, 0.3]} />
            {mat(c)}
          </mesh>
        ))}
      </group>
    );
  return (
    <group ref={g} position={[1.6, 1.2, -0.8]} scale={1.25}>
      <Person look={look} talking reduceMotion={reduceMotion} phase={3} />
    </group>
  );
}

export function IslandStage({ stage, id, state, reduceMotion }: { stage: Stage } & P) {
  const p = { id, state, reduceMotion };
  switch (stage) {
    case 'tally':
      return <Tally {...p} />;
    case 'jars':
      return <Jars {...p} />;
    case 'well':
      return <Well {...p} />;
    case 'loom':
      return <Loom {...p} />;
    case 'books':
      return <Books {...p} kind="books" />;
    case 'press':
      return <Books {...p} kind="press" />;
    case 'cave':
      return <Cave {...p} />;
    case 'elephant':
      return <Elephant {...p} />;
    case 'beacon':
      return <Beacons {...p} />;
    case 'goose':
      return <Goose {...p} />;
    case 'brooms':
      return <Brooms {...p} />;
    case 'hundun':
      return <Hundun {...p} />;
    case 'butterflies':
      return <Butterflies {...p} />;
    case 'automaton':
      return <Automaton {...p} />;
    default:
      return null;
  }
}

/* ================= 危机的景 ================= */

const CROWD: Record<string, Look> = {
  villager: { coat: '#7a5c3c', trim: '#4a3624', skin: '#b38660', pants: '#45331f', hat: 'straw', prop: 'none' },
  worker: { coat: '#4a4038', trim: '#1e1e1d', skin: '#a98770', pants: '#2b2b2a', hat: 'cap', prop: 'shovel' },
};

export function CrisisScene({
  stage,
  state,
  resolved,
  reduceMotion,
}: {
  stage: CrisisStage;
  state: FableState;
  resolved: boolean;
  reduceMotion: boolean;
}) {
  const flash = useRef<THREE.PointLight>(null);
  const steam = useRef<THREE.Group>(null);
  const pulse = useRef<THREE.MeshStandardMaterial>(null);
  const ghost = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const rising = resolved ? 0 : fableLive.flood;
    if (flash.current) flash.current.intensity = stage === 'storm' && !resolved && !reduceMotion && Math.sin(t * 7.3) > 0.97 ? 60 : 0;
    steam.current?.children.forEach((c, i) => {
      const burst = state.boiler === 'burst';
      const k = (t * 0.5 + i * 0.13) % 1;
      c.position.y = 4 + k * (burst ? 8 : 3 + rising * 6);
      c.scale.setScalar((burst ? 2.4 : 0.8 + rising * 1.6) * (0.5 + k));
      ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = (burst ? 0.5 : 0.15 + rising * 0.3) * (1 - k);
    });
    if (pulse.current) {
      const red = stage === 'grant' && !resolved;
      pulse.current.emissive.set(red ? '#ff4030' : state.grant === 'confirm' ? '#ffcf8a' : '#7f98ff');
      pulse.current.emissiveIntensity = red ? 1.5 + Math.sin(t * 6) : 1.8;
    }
    if (ghost.current) {
      const want = resolved ? (state.follow === 'went' ? 0.95 : 0) : 0.25 + Math.sin(t * 2) * 0.1;
      ghost.current.opacity += (want - ghost.current.opacity) * 0.03;
    }
  });

  const people = (look: Look, n: number, at: [number, number], spread = 1.2, faceAway = false) =>
    Array.from({ length: n }, (_, i) => (
      <group key={i} position={[at[0] + (i - (n - 1) / 2) * spread, 1.2, at[1] + (i % 2) * 0.6]} rotation={[0, faceAway ? Math.PI : 0, 0]} scale={1.3}>
        <Person look={look} action={look.prop === 'shovel' ? 'idle' : 'idle'} reduceMotion={reduceMotion} phase={i} />
      </group>
    ));

  const isle = (r = 6, color = '#4d4034') => (
    <group>
      <mesh position={[0, -0.9, 0]} scale={[1, 0.38, 1]}>
        <sphereGeometry args={[r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} roughness={0.97} />
      </mesh>
      <mesh position={[0, 1.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r * 0.93, 36]} />
        <meshStandardMaterial color="#5a4a36" roughness={0.98} />
      </mesh>
    </group>
  );

  return (
    <group>
      {stage === 'famine' && (
        <group>
          {isle(6)}
          {[[-2, -2], [-0.8, -2.4], [0.6, -2.2]].map(([x, z], i) => (
            <mesh key={i} position={[x, 1.8, z]}>
              <cylinderGeometry args={[0.42, 0.34, 1.2, 12, 1, true]} />
              <meshStandardMaterial color="#7d5a3c" side={THREE.DoubleSide} />
            </mesh>
          ))}
          {/* 分了粮，一家人留在岸边向船招手；没分，他们走到岛的另一头去了 */}
          <group position={resolved && state.famine === 'kept' ? [0, 0, -4] : [0, 0, 1.5]}>{people(CROWD.villager, 3, [0, 0], 1.1, resolved && state.famine === 'kept')}</group>
        </group>
      )}
      {stage === 'boiler' && (
        <group>
          {isle(5.5, '#2e3033')}
          <mesh position={[0, 2.6, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[1.3, 1.3, 4.4, 20]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 3.6, 1.32]}>
            <circleGeometry args={[0.4, 18]} />
            <meshStandardMaterial color="#e8e0cc" />
          </mesh>
          <group ref={steam} position={[1.6, 0, 0]}>
            {Array.from({ length: 8 }, (_, i) => (
              <mesh key={i}>
                <sphereGeometry args={[0.6, 10, 8]} />
                <meshStandardMaterial color="#e8e8e8" transparent opacity={0.2} depthWrite={false} />
              </mesh>
            ))}
          </group>
          {people(CROWD.worker, 2, [-1.6, 2.2], 1.4)}
        </group>
      )}
      {stage === 'strike' && (
        <group>
          {isle(6, '#2e3033')}
          <mesh position={[0, 2.2, -2]}>
            <boxGeometry args={[3, 2.2, 2]} />
            <meshStandardMaterial color="#2a2a2a" />
          </mesh>
          <mesh position={[0, 1.8, -0.99]}>
            <planeGeometry args={[1.2, 0.9]} />
            <meshStandardMaterial
              color={resolved ? '#ffb060' : '#1a1210'}
              emissive={resolved ? '#ff7a20' : '#000'}
              emissiveIntensity={resolved ? 2.4 : 0}
              toneMapped={!resolved}
            />
          </mesh>
          {people(CROWD.worker, state.strike === 'replaced' ? 2 : 4, [0, 1.2], 1.2)}
          {state.strike === 'replaced' && <group position={[0, 0, 4]}>{people(CROWD.worker, 3, [0, 0], 1.2, true)}</group>}
        </group>
      )}
      {stage === 'storm' && (
        <group>
          <pointLight ref={flash} position={[0, 18, 0]} color="#e8f0ff" intensity={0} distance={80} decay={1.5} />
          <group position={[-6, 0, 0]}>
            {isle(5, '#2c3034')}
            {[-1.6, 0, 1.6].map((x, i) => (
              <mesh key={x} position={[x, 3 + i, -1]}>
                <boxGeometry args={[1.4, 3 + i * 2, 1.4]} />
                <meshStandardMaterial color="#1e2328" emissive="#8fdfe8" emissiveIntensity={resolved && state.repair === 'big' ? 0.8 : 0.05} />
              </mesh>
            ))}
          </group>
          <group position={[7, 0, 2]}>
            {isle(3.4, '#2a2824')}
            <mesh position={[0, 1.8, 0]}>
              <sphereGeometry args={[0.24, 10, 8]} />
              <meshStandardMaterial color="#fff1d0" emissive="#ffb060" emissiveIntensity={resolved && state.repair === 'small' ? 4 : 1.2} toneMapped={false} />
            </mesh>
            {resolved && state.repair === 'small' && <pointLight position={[0, 2.4, 0]} color="#ffb060" intensity={10} distance={16} decay={2} />}
          </group>
        </group>
      )}
      {stage === 'wire' && (
        <group>
          {isle(6, '#2a3236')}
          {[-3, 0, 3].map((x) => (
            <mesh key={x} position={[x, 3.4, 0]}>
              <cylinderGeometry args={[0.08, 0.1, 4.4, 6]} />
              <meshStandardMaterial color="#4a3d30" />
            </mesh>
          ))}
          {[['#ffcf8a', state.wire === 'family', -3.4], ['#9fd0ff', state.wire === 'trade', 3.4]].map(([c, on, x], i) => (
            <group key={i} position={[x as number, 1.2, 2.6]}>
              <mesh position={[0, 0.9, 0]}>
                <boxGeometry args={[2, 1.8, 1.6]} />
                <meshStandardMaterial color={i === 0 ? '#5a4a3a' : '#3a3e48'} />
              </mesh>
              <mesh position={[0, 1, 0.81]}>
                <planeGeometry args={[0.6, 0.6]} />
                <meshStandardMaterial color={c as string} emissive={c as string} emissiveIntensity={resolved && on ? 3 : 0.1} toneMapped={!(resolved && on)} />
              </mesh>
            </group>
          ))}
        </group>
      )}
      {stage === 'grant' && (
        <group>
          {isle(6, '#181c26')}
          {[-2.4, 0, 2.4].map((x, i) => (
            <mesh key={x} position={[x, 1.2 + (5 + i) / 2, -1]}>
              <boxGeometry args={[1.6, 5 + i, 2]} />
              <meshStandardMaterial ref={i === 1 ? pulse : undefined} color="#111520" emissive="#7f98ff" emissiveIntensity={1} metalness={0.4} />
            </mesh>
          ))}
          {state.grant === 'confirm' && resolved && people({ coat: '#d8dde6', trim: '#5a6fa8', skin: '#c9a184', pants: '#6b7488', hat: 'none', prop: 'tablet' }, 1, [0, 2.4])}
        </group>
      )}
      {stage === 'proposal' && (
        <group>
          {/* 它算出来的那座岛：半透明，跟了它，它就变成真的 */}
          <mesh position={[0, 1, 0]} scale={[1, 0.5, 1]}>
            <sphereGeometry args={[7, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial ref={ghost} color="#c8d2f5" emissive="#7f98ff" emissiveIntensity={0.6} transparent opacity={0.25} roughness={0.3} />
          </mesh>
        </group>
      )}
    </group>
  );
}
