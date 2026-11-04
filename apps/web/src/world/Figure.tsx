import { Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Action, Look } from './encounters';
import { Person } from './People';
import { RiggedPerson } from './RiggedPerson';

/**
 * 一个人：骨骼模型加载好之前，先用积木人顶着，画面不空。
 */
export function Figure(props: {
  look: Look;
  reduceMotion?: boolean;
  phase?: number;
  talking?: boolean;
  action?: Action;
  lookAt?: { x: number; z: number } | null;
}) {
  return (
    <Suspense fallback={<Person {...props} />}>
      <RiggedPerson {...props} />
    </Suspense>
  );
}

/**
 * 甲板上的人：右边是船员（那个时代的活），左边是玩家自己（那个时代的衣服）。
 * 玩家头顶浮着自己的名字——这一程是你的。
 */
export function EraDeckCrew({
  crew,
  crewLevel = 0,
  player,
  deckY,
  reduceMotion,
}: {
  crew: [Look, Look];
  crewLevel?: number;
  player?: { name: string; look: Look } | null;
  deckY: number;
  reduceMotion?: boolean;
}) {
  return (
    <group>
      {player && (
        <group position={[-1.62, deckY, -0.9]} rotation={[0, 0.5, 0]} scale={1.3}>
          <Figure look={player.look} action="idle" reduceMotion={reduceMotion} phase={0.9} />
          <NameTag text={player.name} y={2.28} />
        </group>
      )}
      {/* 大副与二副：戴着这个时代的帽子，站在船的右舷。两人会互相看 */}
      <group position={[1.58, deckY, -1.55]} rotation={[0, -0.5, 0]} scale={1.45}>
        <Person look={crew[0]} reduceMotion={reduceMotion} phase={0.3} action="watch" />
        {crewLevel >= 3 && <CrewBadge />}
      </group>
      <group position={[1.48, deckY, 1.05]} rotation={[0, -0.9, 0]} scale={1.45}>
        <Person look={crew[1]} reduceMotion={reduceMotion} phase={1.7} action="count" />
        {crewLevel >= 3 && <CrewBadge />}
      </group>
    </group>
  );
}

/** 头顶的名字：一块小小的铜牌，随船轻轻晃 */
function NameTag({ text, y }: { text: string; y: number }) {
  const g = useRef<THREE.Group>(null);
  const map = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 256, 64);
      ctx.fillStyle = 'rgba(18,16,12,0.72)';
      ctx.roundRect?.(6, 8, 244, 48, 10);
      if (!ctx.roundRect) ctx.fillRect(6, 8, 244, 48);
      ctx.fill();
      ctx.strokeStyle = 'rgba(201,161,90,0.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(8, 10, 240, 44);
      ctx.fillStyle = '#f6efe0';
      ctx.font = '500 30px "Noto Serif SC", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text.slice(0, 8), 128, 34);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text]);
  useFrame(({ clock, camera }) => {
    if (!g.current) return;
    g.current.position.y = y + Math.sin(clock.elapsedTime * 1.4) * 0.02;
    g.current.quaternion.copy(camera.quaternion);
  });
  return (
    <group ref={g} position={[0, y, 0]}>
      <mesh>
        <planeGeometry args={[1.0, 0.25]} />
        <meshBasicMaterial map={map} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * 航线上的人：站在一只小舢板上，守着漂着的那件东西。
 * 船靠近时他转过来看你。
 */
export function LaneKeeper({
  look,
  active,
  reduceMotion,
}: {
  look: Look;
  active: boolean;
  reduceMotion?: boolean;
}) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!g.current || reduceMotion) return;
    const t = clock.elapsedTime;
    g.current.position.y = Math.sin(t * 1.1) * 0.06;
    g.current.rotation.z = Math.sin(t * 0.8) * 0.02;
  });
  return (
    <group ref={g}>
      {/* 舢板 */}
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.24, 3.0]} />
        <meshStandardMaterial color="#3a2e24" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[1.62, 0.06, 3.12]} />
        <meshStandardMaterial color="#5a4630" roughness={0.9} />
      </mesh>
      {/* 船头一盏小灯：远远看见有人 */}
      <mesh position={[0, 0.75, 1.3]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#fff1d0" emissive="#ffcf8a" emissiveIntensity={active ? 3 : 1.4} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.48, 1.3]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 5]} />
        <meshStandardMaterial color="#2a2118" />
      </mesh>
      <group position={[0, 0.28, -0.2]} scale={1.3}>
        <Figure look={look} reduceMotion={reduceMotion} talking={active} />
      </group>
    </group>
  );
}


function CrewBadge() {
  return <mesh position={[-0.1, 1.38, 0.24]}><torusGeometry args={[0.075, 0.018, 6, 16]} /><meshStandardMaterial color="#dcbd84" metalness={0.65} roughness={0.35} /></mesh>;
}
