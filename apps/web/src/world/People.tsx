import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Look } from './encounters';

/**
 * 程序化的人：没有贴图，只靠体块、颜色、帽子和手里的工具认出时代。
 * 农业的草帽与锄头、工业的鸭舌帽与煤锹、信息的耳机与电键、智能额前的一道冷光。
 * 高约 1.75（世界单位 ≈ 米），脚底在 y=0。
 */
export function Person({
  look,
  reduceMotion = false,
  phase = 0,
  /** 说话时轻轻点头、抬手 */
  talking = false,
}: {
  look: Look;
  reduceMotion?: boolean;
  phase?: number;
  talking?: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);

  const M = useMemo(() => {
    const m = (c: string, r = 0.85, metal = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: metal });
    return {
      coat: m(look.coat),
      trim: m(look.trim, 0.6, 0.2),
      skin: m(look.skin, 0.7),
      pants: m(look.pants),
      dark: m('#1a1612', 0.9),
      wood: m('#6a5034', 0.9),
      iron: m('#4a4d50', 0.45, 0.7),
      straw: m('#c8a868', 0.95),
      paper: m('#e8dcc4', 0.9),
      glow: look.glow
        ? new THREE.MeshStandardMaterial({ color: look.glow, emissive: look.glow, emissiveIntensity: 2.2, toneMapped: false })
        : null,
    };
  }, [look]);

  useFrame(({ clock }) => {
    if (reduceMotion) return;
    const t = clock.elapsedTime + phase;
    if (root.current) root.current.rotation.z = Math.sin(t * 0.9) * 0.025;
    if (head.current) head.current.rotation.x = talking ? Math.sin(t * 5) * 0.08 : Math.sin(t * 0.7) * 0.03;
    if (armR.current) armR.current.rotation.x = talking ? -0.9 + Math.sin(t * 3) * 0.25 : -0.15 + Math.sin(t * 0.8) * 0.05;
  });

  return (
    <group ref={root}>
      {/* 腿 */}
      {[-0.11, 0.11].map((x) => (
        <mesh key={x} position={[x, 0.42, 0]} material={M.pants} castShadow>
          <boxGeometry args={[0.16, 0.84, 0.2]} />
        </mesh>
      ))}
      {[-0.11, 0.11].map((x) => (
        <mesh key={`f${x}`} position={[x, 0.04, 0.04]} material={M.dark}>
          <boxGeometry args={[0.17, 0.08, 0.28]} />
        </mesh>
      ))}
      {/* 上身：下摆略宽，像外衣 */}
      <mesh position={[0, 1.12, 0]} material={M.coat} castShadow>
        <cylinderGeometry args={[0.2, 0.27, 0.62, 10]} />
      </mesh>
      <mesh position={[0, 0.8, 0]} material={M.trim}>
        <cylinderGeometry args={[0.275, 0.275, 0.06, 10]} />
      </mesh>
      {/* 左臂垂着 */}
      <group position={[-0.28, 1.36, 0]} rotation={[0.1, 0, 0.12]}>
        <mesh position={[0, -0.28, 0]} material={M.coat}>
          <cylinderGeometry args={[0.06, 0.055, 0.56, 6]} />
        </mesh>
        <mesh position={[0, -0.6, 0]} material={M.skin}>
          <sphereGeometry args={[0.06, 8, 6]} />
        </mesh>
      </group>
      {/* 右臂拿着工具 */}
      <group ref={armR} position={[0.28, 1.36, 0]} rotation={[-0.15, 0, -0.12]}>
        <mesh position={[0, -0.28, 0]} material={M.coat}>
          <cylinderGeometry args={[0.06, 0.055, 0.56, 6]} />
        </mesh>
        <mesh position={[0, -0.6, 0]} material={M.skin}>
          <sphereGeometry args={[0.06, 8, 6]} />
        </mesh>
        <group position={[0, -0.6, 0.02]}>
          <PropMesh prop={look.prop} M={M} />
        </group>
      </group>
      {/* 头 */}
      <group ref={head} position={[0, 1.58, 0]}>
        <mesh position={[0, -0.1, 0]} material={M.skin}>
          <cylinderGeometry args={[0.06, 0.07, 0.1, 8]} />
        </mesh>
        <mesh position={[0, 0.06, 0]} material={M.skin} castShadow>
          <sphereGeometry args={[0.13, 14, 12]} />
        </mesh>
        <HatMesh hat={look.hat} M={M} />
        {M.glow && (
          <mesh position={[0, 0.08, 0.125]} material={M.glow}>
            <boxGeometry args={[0.2, 0.025, 0.02]} />
          </mesh>
        )}
      </group>
    </group>
  );
}

type Mats = Record<string, THREE.MeshStandardMaterial | null>;

function HatMesh({ hat, M }: { hat: Look['hat']; M: Mats }) {
  if (hat === 'straw')
    return (
      <group position={[0, 0.15, 0]}>
        <mesh material={M.straw!}>
          <coneGeometry args={[0.34, 0.2, 16, 1, true]} />
        </mesh>
        <mesh position={[0, -0.09, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.straw!}>
          <ringGeometry args={[0.12, 0.36, 16]} />
        </mesh>
      </group>
    );
  if (hat === 'wrap')
    return (
      <mesh position={[0, 0.12, 0]} material={M.trim!}>
        <sphereGeometry args={[0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      </mesh>
    );
  if (hat === 'cap')
    return (
      <group position={[0, 0.14, 0]}>
        <mesh material={M.dark!}>
          <cylinderGeometry args={[0.135, 0.14, 0.08, 14]} />
        </mesh>
        <mesh position={[0, -0.03, 0.12]} rotation={[0.25, 0, 0]} material={M.dark!}>
          <boxGeometry args={[0.2, 0.015, 0.12]} />
        </mesh>
      </group>
    );
  if (hat === 'bowler')
    return (
      <group position={[0, 0.17, 0]}>
        <mesh material={M.dark!}>
          <sphereGeometry args={[0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        </mesh>
        <mesh position={[0, 0, 0]} material={M.dark!}>
          <cylinderGeometry args={[0.2, 0.2, 0.015, 16]} />
        </mesh>
      </group>
    );
  if (hat === 'headset')
    return (
      <group position={[0, 0.06, 0]}>
        <mesh rotation={[0, 0, 0]} material={M.dark!}>
          <torusGeometry args={[0.145, 0.014, 6, 16, Math.PI]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.14, -0.01, 0]} rotation={[0, 0, Math.PI / 2]} material={M.trim!}>
            <cylinderGeometry args={[0.05, 0.05, 0.04, 10]} />
          </mesh>
        ))}
      </group>
    );
  if (hat === 'visor')
    return (
      <mesh position={[0, 0.1, 0.02]} material={M.coat!}>
        <sphereGeometry args={[0.145, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
      </mesh>
    );
  return null;
}

function PropMesh({ prop, M }: { prop: Look['prop']; M: Mats }) {
  if (prop === 'hoe')
    return (
      <group rotation={[0.2, 0, 0]}>
        <mesh position={[0, 0.2, 0]} material={M.wood!}>
          <cylinderGeometry args={[0.02, 0.02, 1.3, 6]} />
        </mesh>
        <mesh position={[0, -0.44, 0.08]} material={M.iron!}>
          <boxGeometry args={[0.18, 0.05, 0.18]} />
        </mesh>
      </group>
    );
  if (prop === 'pole')
    return (
      <mesh position={[0, 0.3, 0]} material={M.wood!}>
        <cylinderGeometry args={[0.022, 0.026, 1.7, 6]} />
      </mesh>
    );
  if (prop === 'shovel')
    return (
      <group rotation={[0.5, 0, 0]}>
        <mesh position={[0, 0.1, 0]} material={M.wood!}>
          <cylinderGeometry args={[0.02, 0.02, 0.9, 6]} />
        </mesh>
        <mesh position={[0, -0.42, 0]} material={M.iron!}>
          <boxGeometry args={[0.2, 0.26, 0.03]} />
        </mesh>
      </group>
    );
  if (prop === 'ledger')
    return (
      <mesh position={[0, 0.04, 0.1]} rotation={[-0.9, 0, 0]} material={M.paper!}>
        <boxGeometry args={[0.24, 0.32, 0.03]} />
      </mesh>
    );
  if (prop === 'key')
    return (
      <mesh position={[0, 0.02, 0.1]} material={M.iron!}>
        <boxGeometry args={[0.16, 0.05, 0.22]} />
      </mesh>
    );
  if (prop === 'tablet')
    return (
      <group position={[0, 0.06, 0.12]} rotation={[-0.9, 0, 0]}>
        <mesh material={M.dark!}>
          <boxGeometry args={[0.26, 0.34, 0.02]} />
        </mesh>
        {M.glow && (
          <mesh position={[0, 0, 0.012]} material={M.glow}>
            <planeGeometry args={[0.22, 0.29]} />
          </mesh>
        )}
      </group>
    );
  return null;
}

/** 甲板上的一对船员。sceneId 决定他们是谁。 */
export function EraDeckCrew({
  crew,
  deckY,
  reduceMotion,
}: {
  crew: [Look, Look];
  deckY: number;
  reduceMotion?: boolean;
}) {
  return (
    <group>
      <group position={[1.58, deckY, -1.55]} rotation={[0, -0.5, 0]} scale={1.28}>
        <Person look={crew[0]} reduceMotion={reduceMotion} phase={0.3} />
      </group>
      <group position={[1.48, deckY, 1.05]} rotation={[0, -0.9, 0]} scale={1.22}>
        <Person look={crew[1]} reduceMotion={reduceMotion} phase={1.7} />
      </group>
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
        <Person look={look} reduceMotion={reduceMotion} talking={active} />
      </group>
    </group>
  );
}
