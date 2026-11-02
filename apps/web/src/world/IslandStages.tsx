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

/* ---------- 唐胥铁路：一段铁轨，骡子拉煤车；推出龙号，机车喷汽往前走 ---------- */
function Mules({ state, reduceMotion }: P) {
  const train = useRef<THREE.Group>(null);
  const steam = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (reduceMotion) return;
    const t = clock.elapsedTime;
    const speed = state.machine === 'yes' ? 1.6 : state.machine === 'no' ? 0.35 : 0;
    if (train.current) train.current.position.x = ((t * speed + 3) % 6) - 3;
    steam.current?.children.forEach((c, i) => {
      const k = (t * 0.8 + i * 0.25) % 1;
      c.visible = state.machine === 'yes';
      c.position.set(train.current ? train.current.position.x + 0.9 - k * 0.6 : 0, 2.4 + k * 1.6, -0.6);
      c.scale.setScalar(0.25 + k * 0.5);
      ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.5 * (1 - k);
    });
  });
  return (
    <group>
      {/* 枕木与钢轨 */}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[-3.6 + i * 0.55, 1.24, -0.6]}>
          <boxGeometry args={[0.18, 0.06, 1.1]} />
          {mat('#4a3a2a')}
        </mesh>
      ))}
      {[-0.4, 0.4].map((z) => (
        <mesh key={z} position={[0, 1.3, -0.6 + z]}>
          <boxGeometry args={[7.6, 0.06, 0.06]} />
          {mat('#6a6a6a', { metalness: 0.6, roughness: 0.4 })}
        </mesh>
      ))}
      <group ref={train} position={[0, 1.3, -0.6]}>
        {/* 龙号：推出来才在轨道上；否则停在棚里 */}
        {state.machine === 'yes' && (
          <group position={[1.3, 0, 0]}>
            <mesh position={[0, 0.45, 0]}>
              <boxGeometry args={[1.3, 0.7, 0.8]} />
              {mat('#2a2a2a', { metalness: 0.5, roughness: 0.5 })}
            </mesh>
            <mesh position={[0.4, 0.95, 0]}>
              <cylinderGeometry args={[0.12, 0.14, 0.5, 8]} />
              {mat('#1e1e1e')}
            </mesh>
          </group>
        )}
        {/* 骡子：没推出龙号时在前面拉 */}
        {state.machine !== 'yes' &&
          [0, 1].map((i) => (
            <group key={i} position={[1.2 + i * 0.9, 0.35, 0]}>
              <mesh>
                <boxGeometry args={[0.7, 0.4, 0.3]} />
                {mat('#5a4a3a')}
              </mesh>
              <mesh position={[0.4, 0.2, 0]}>
                <boxGeometry args={[0.3, 0.26, 0.22]} />
                {mat('#4a3a2c')}
              </mesh>
            </group>
          ))}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[-0.2 - i * 1.0, 0.35, 0]}>
            <boxGeometry args={[0.9, 0.5, 0.7]} />
            {mat('#2e2a26')}
          </mesh>
        ))}
      </group>
      <group ref={steam}>
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.5, 8, 6]} />
            <meshStandardMaterial color="#e8e8e8" transparent opacity={0.3} depthWrite={false} />
          </mesh>
        ))}
      </group>
      {/* 藏龙号的棚子 */}
      <mesh position={[-2.6, 1.9, 1.8]}>
        <boxGeometry args={[2.4, 1.4, 1.6]} />
        {mat('#5a4a3a')}
      </mesh>
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

/* ---------- 电缆登陆：江心一条船，缆从船上拉向岸；成了，缆绷直，灯亮 ---------- */
function Landing({ id, state, reduceMotion }: P) {
  const cable = useRef<THREE.Mesh>(null);
  const boat = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const tight = live(id) ? fableLive.value : state.cable === 'landed' ? 0.55 : state.cable === 'snapped' ? 0 : 0.3;
    if (cable.current) {
      cable.current.visible = !(state.cable === 'snapped' && !live(id));
      cable.current.scale.y = 0.5 + tight * 0.5;
      cable.current.position.y = 1.0 - (1 - tight) * 0.35;
    }
    if (boat.current && !reduceMotion) boat.current.position.y = Math.sin(clock.elapsedTime * 1.2) * 0.08;
  });
  return (
    <group>
      <group ref={boat} position={[-4.6, 0, 1.2]}>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[1.6, 0.4, 3]} />
          {mat('#3a2e24')}
        </mesh>
        <mesh position={[0, 0.7, -0.6]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.5, 0.5, 0.9, 14]} />
          {mat('#1a1c1e')}
        </mesh>
      </group>
      <mesh ref={cable} position={[-1.6, 1.0, 1.0]} rotation={[0, 0, Math.PI / 2 - 0.12]}>
        <cylinderGeometry args={[0.05, 0.05, 5.6, 6]} />
        {mat('#111')}
      </mesh>
      {/* 岸上的接线房：缆拴稳了，灯就亮 */}
      <mesh position={[1.8, 1.9, 0.4]}>
        <boxGeometry args={[2, 1.4, 1.6]} />
        {mat('#3a4248')}
      </mesh>
      <mesh position={[1.8, 1.9, 1.21]}>
        <planeGeometry args={[0.6, 0.6]} />
        <meshStandardMaterial color="#ffe0b0" emissive="#ffc070" emissiveIntensity={state.cable === 'landed' ? 2.2 : 0.1} toneMapped={state.cable !== 'landed'} />
      </mesh>
    </group>
  );
}

/* ---------- 报务室：耳机、电键、窗外的浮冰。一直发，天线上就一直有火花 ---------- */
function Wireless({ state, reduceMotion }: P) {
  const spark = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!spark.current) return;
    const on = state.warning === 'kept' || !state.warning;
    spark.current.emissiveIntensity = on && !reduceMotion && Math.sin(clock.elapsedTime * 11) > 0.6 ? 4 : 0.2;
  });
  return (
    <group>
      <mesh position={[0, 2, -1.4]}>
        <boxGeometry args={[3, 1.6, 2]} />
        {mat('#3a3e46')}
      </mesh>
      <mesh position={[0, 2.1, -0.39]}>
        <planeGeometry args={[1, 0.7]} />
        <meshStandardMaterial color="#ffe0b0" emissive="#ffc070" emissiveIntensity={state.warning === 'off' ? 0.1 : 1.6} toneMapped={state.warning === 'off'} />
      </mesh>
      <mesh position={[0, 4.2, -1.4]}>
        <cylinderGeometry args={[0.03, 0.04, 2.6, 5]} />
        {mat('#6a7076', { metalness: 0.6 })}
      </mesh>
      <mesh position={[0, 5.55, -1.4]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial ref={spark} color="#dff0ff" emissive="#9fd0ff" emissiveIntensity={0.2} toneMapped={false} />
      </mesh>
      {/* 浮冰 */}
      {[[3.2, 1.8, 0.9], [-3.4, 2.4, 0.7], [2.4, -2.6, 1.2]].map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0.3, z]}>
          <dodecahedronGeometry args={[r, 0]} />
          {mat('#dfe8ee', { roughness: 0.4 })}
        </mesh>
      ))}
    </group>
  );
}

/* ---------- 信鸽：鸽棚，鸽子飞回来落进棚里 ---------- */
function Pigeons({ id, state, reduceMotion }: P) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!g.current) return;
    const home = live(id) ? fableLive.value : state.pigeons === 'home' ? 1 : state.pigeons === 'lost' ? 0.3 : 0;
    const t = clock.elapsedTime;
    g.current.children.forEach((c, i) => {
      const back = i / g.current!.children.length < home;
      if (back) c.position.set(-1.6 + (i % 4) * 0.5, 2.1 + Math.floor(i / 4) * 0.4, 0.6);
      else if (!reduceMotion) c.position.set(Math.cos(t * 0.5 + i) * 4, 4 + Math.sin(t * 0.9 + i) * 0.8, Math.sin(t * 0.5 + i) * 3);
      if (!reduceMotion && !back) c.rotation.z = Math.sin(t * 9 + i) * 0.5;
    });
  });
  return (
    <group>
      <mesh position={[-1, 2.1, 0]}>
        <boxGeometry args={[2.6, 1.6, 1.2]} />
        {mat('#6a5a48')}
      </mesh>
      <mesh position={[-1, 3.1, 0]}>
        <coneGeometry args={[1.8, 0.7, 4]} />
        {mat('#4a3e30')}
      </mesh>
      <group ref={g}>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i}>
            <boxGeometry args={[0.32, 0.05, 0.14]} />
            {mat(i % 3 ? '#cfd4d8' : '#8a8f94')}
          </mesh>
        ))}
      </group>
      {/* 城墙与气球 */}
      <mesh position={[2.6, 1.8, -1.6]}>
        <boxGeometry args={[0.6, 1.2, 4]} />
        {mat('#5a5650')}
      </mesh>
      <mesh position={[3.2, 6, -1]}>
        <sphereGeometry args={[0.9, 12, 10]} />
        {mat('#c8a060')}
      </mesh>
    </group>
  );
}

/* ---------- 驿马快信：一根新电线杆，一匹马。跑完了，马就不在岛上了 ---------- */
function Pony({ state, reduceMotion }: P) {
  const horse = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!horse.current || reduceMotion) return;
    if (state.ride) horse.current.position.x = Math.min(9, horse.current.position.x + 0.03);
    else horse.current.position.y = 1.2 + Math.abs(Math.sin(clock.elapsedTime * 2)) * 0.03;
  });
  return (
    <group>
      {[-2.4, 1.2, 4.8].map((x) => (
        <group key={x} position={[x, 0, -1.6]}>
          <mesh position={[0, 3.2, 0]}>
            <cylinderGeometry args={[0.08, 0.11, 4, 6]} />
            {mat('#5a4a3a')}
          </mesh>
          <mesh position={[0, 5, 0]}>
            <boxGeometry args={[1, 0.1, 0.1]} />
            {mat('#5a4a3a')}
          </mesh>
        </group>
      ))}
      <mesh position={[1.2, 5.05, -1.6]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 8, 4]} />
        <meshBasicMaterial color="#111" />
      </mesh>
      <group ref={horse} position={[-0.6, 1.2, 0.8]}>
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[1.3, 0.55, 0.4]} />
          {mat('#5a3a26')}
        </mesh>
        <mesh position={[0.7, 0.95, 0]} rotation={[0, 0, -0.5]}>
          <boxGeometry args={[0.5, 0.3, 0.25]} />
          {mat('#4a2e1e')}
        </mesh>
        {[-0.4, 0.4].map((x) => (
          <mesh key={x} position={[x, 0.15, 0]}>
            <boxGeometry args={[0.12, 0.5, 0.32]} />
            {mat('#4a2e1e')}
          </mesh>
        ))}
        <mesh position={[-0.1, 0.95, 0]}>
          <boxGeometry args={[0.5, 0.25, 0.42]} />
          {mat('#8a6a42')}
        </mesh>
      </group>
    </group>
  );
}

/* ---------- 掩体：没有窗的房子，屏幕在红。撑住了，屏幕回到绿 ---------- */
function Bunker({ id, state, reduceMotion }: P) {
  const screen = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!screen.current) return;
    const red = live(id) ? true : state.alarm === 'reported' ? true : state.alarm === 'held' ? false : true;
    const c = red ? '#ff3a2a' : '#5ae08a';
    screen.current.emissive.set(c);
    screen.current.color.set(c);
    screen.current.emissiveIntensity = red && !reduceMotion ? 1.6 + Math.sin(clock.elapsedTime * 6) * 1 : 1.4;
  });
  return (
    <group>
      <mesh position={[0, 2.4, -0.8]}>
        <boxGeometry args={[4.4, 2.4, 3]} />
        {mat('#2e3230', { roughness: 0.95 })}
      </mesh>
      <mesh position={[0, 2.5, 0.71]}>
        <planeGeometry args={[1.8, 1]} />
        <meshStandardMaterial ref={screen} color="#ff3a2a" emissive="#ff3a2a" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <mesh position={[1.6, 1.6, 1.2]}>
        <boxGeometry args={[0.5, 0.2, 0.3]} />
        {mat('#1a1a1a')}
      </mesh>
    </group>
  );
}

/* ---------- 深蓝：一张棋桌，一台黑色机柜。记录给看了，桌上摊着一摞纸 ---------- */
function Chess({ state, reduceMotion }: P) {
  const lamp = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (lamp.current && !reduceMotion) lamp.current.emissiveIntensity = 1 + Math.sin(clock.elapsedTime * 3) * 0.6;
  });
  return (
    <group>
      <mesh position={[0, 1.7, 0]}>
        <boxGeometry args={[2, 0.1, 2]} />
        {mat('#5a4a3a')}
      </mesh>
      {Array.from({ length: 64 }, (_, i) => (
        <mesh key={i} position={[-0.7 + (i % 8) * 0.2, 1.76, -0.7 + Math.floor(i / 8) * 0.2]}>
          <boxGeometry args={[0.2, 0.02, 0.2]} />
          {mat((i + Math.floor(i / 8)) % 2 ? '#2a2420' : '#e8dcc4')}
        </mesh>
      ))}
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} position={[-0.6 + (i % 5) * 0.3, 1.9, i < 5 ? -0.5 : 0.5]}>
          <cylinderGeometry args={[0.06, 0.08, 0.22, 8]} />
          {mat(i < 5 ? '#f0e8d8' : '#1a1612')}
        </mesh>
      ))}
      <mesh position={[2.6, 2.2, -0.6]}>
        <boxGeometry args={[1.2, 2.2, 1.2]} />
        {mat('#101418', { metalness: 0.5, roughness: 0.5 })}
      </mesh>
      <mesh position={[2.6, 2.6, 0.01]}>
        <planeGeometry args={[0.5, 0.08]} />
        <meshStandardMaterial ref={lamp} color="#7f98ff" emissive="#7f98ff" emissiveIntensity={1} toneMapped={false} />
      </mesh>
      {state.log === 'shown' && (
        <mesh position={[-1.8, 1.5, 0.6]} rotation={[0, 0.3, 0]}>
          <boxGeometry args={[0.9, 0.5, 1.2]} />
          {mat('#e8e0cc')}
        </mesh>
      )}
    </group>
  );
}

/* ---------- ELIZA：一台终端，纸带哒哒往外吐。门开着还是关着 ---------- */
function Terminal({ state, reduceMotion }: P) {
  const paper = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!paper.current) return;
    const typing = state.eliza !== 'stayed';
    paper.current.scale.y = typing && !reduceMotion ? 0.6 + ((clock.elapsedTime * 0.1) % 0.6) : 0.6;
  });
  return (
    <group>
      <mesh position={[0, 1.7, 0]}>
        <boxGeometry args={[2.2, 0.1, 1.2]} />
        {mat('#5a4a3a')}
      </mesh>
      <mesh position={[0, 2.05, 0]}>
        <boxGeometry args={[1.2, 0.5, 0.8]} />
        {mat('#c8c4b8')}
      </mesh>
      <mesh ref={paper} position={[0, 2.3, -0.3]} rotation={[0.3, 0, 0]}>
        <planeGeometry args={[0.7, 1.2]} />
        <meshStandardMaterial color="#f6f0e0" side={THREE.DoubleSide} />
      </mesh>
      {/* 门：带上了就关着 */}
      <group position={[2.6, 0, 0.8]}>
        <mesh position={[0, 2.1, 0]}>
          <boxGeometry args={[0.2, 1.8, 2.4]} />
          {mat('#3a3028')}
        </mesh>
        <mesh position={[0, 2.1, state.eliza === 'left' ? 0.6 : 0.2]} rotation={[0, state.eliza === 'left' ? 0 : 1.2, 0]}>
          <boxGeometry args={[0.08, 1.7, 1.0]} />
          {mat('#6a5034')}
        </mesh>
      </group>
    </group>
  );
}

/* ---------- 第 37 手：一张棋盘，右边五路一颗白子亮着 ---------- */
function GoBoard({ id, state, reduceMotion }: P) {
  const star = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!star.current) return;
    const seen = live(id) ? fableLive.value > 0.5 : state.move === 'seen';
    star.current.emissiveIntensity = seen ? 2.6 + (reduceMotion ? 0 : Math.sin(clock.elapsedTime * 2) * 0.6) : 0.3;
  });
  const stones = [[3, 3, 0], [15, 3, 1], [3, 15, 1], [15, 15, 0], [9, 9, 0], [4, 10, 1], [10, 4, 0], [6, 6, 1], [12, 12, 0], [8, 13, 1]];
  return (
    <group>
      <mesh position={[0, 1.7, 0]}>
        <boxGeometry args={[2.4, 0.16, 2.4]} />
        {mat('#c8a060')}
      </mesh>
      {Array.from({ length: 19 }, (_, i) => (
        <group key={i}>
          <mesh position={[-1.08 + i * 0.12, 1.79, 0]}>
            <boxGeometry args={[0.01, 0.005, 2.16]} />
            <meshBasicMaterial color="#3a2a1a" />
          </mesh>
          <mesh position={[0, 1.79, -1.08 + i * 0.12]}>
            <boxGeometry args={[2.16, 0.005, 0.01]} />
            <meshBasicMaterial color="#3a2a1a" />
          </mesh>
        </group>
      ))}
      {stones.map(([x, y, b], i) => (
        <mesh key={i} position={[-1.08 + x * 0.12, 1.82, -1.08 + y * 0.12]}>
          <sphereGeometry args={[0.055, 10, 8]} />
          {mat(b ? '#1a1612' : '#f0ece4', { roughness: 0.3 })}
        </mesh>
      ))}
      {/* 第 37 手：右边五路，肩冲 */}
      <mesh position={[-1.08 + 14 * 0.12, 1.82, -1.08 + 9 * 0.12]}>
        <sphereGeometry args={[0.06, 10, 8]} />
        <meshStandardMaterial ref={star} color="#f0ece4" emissive="#9fb4ff" emissiveIntensity={0.3} toneMapped={false} />
      </mesh>
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
    case 'mules':
      return <Mules {...p} />;
    case 'loom':
      return <Loom {...p} />;
    case 'books':
      return <Books {...p} kind="books" />;
    case 'press':
      return <Books {...p} kind="press" />;
    case 'landing':
      return <Landing {...p} />;
    case 'wireless':
      return <Wireless {...p} />;
    case 'pigeons':
      return <Pigeons {...p} />;
    case 'pony':
      return <Pony {...p} />;
    case 'bunker':
      return <Bunker {...p} />;
    case 'chess':
      return <Chess {...p} />;
    case 'terminal':
      return <Terminal {...p} />;
    case 'goboard':
      return <GoBoard {...p} />;
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
            <pointLight position={[0, 2.4, 0]} color="#ffb060" intensity={resolved && state.repair === 'small' ? 10 : 0} distance={16} decay={2} />
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
