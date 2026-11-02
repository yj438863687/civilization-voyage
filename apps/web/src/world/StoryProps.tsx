import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { DECK_CREW, type Look } from './encounters';
import { Person } from './People';
import type { Beat, Figure, PropKind } from './stories';

/**
 * 沿途的景：岸上看得见的那个时代。
 * 每一处都是一块「岸」（低矮的陆地）加上那个时代的东西。全部程序化，不复原具体遗址。
 */

function Land({ w = 16, d = 12, color = '#3d3328' }: { w?: number; d?: number; color?: string }) {
  return (
    <group>
      <mesh position={[0, 0.35, 0]} receiveShadow>
        <boxGeometry args={[w, 0.7, d]} />
        <meshStandardMaterial color={color} roughness={0.98} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.max(w, d) * 0.5, Math.max(w, d) * 0.62, 32]} />
        <meshBasicMaterial color="#e8dcc4" transparent opacity={0.05} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Hut({ lit, x, z, s = 1 }: { lit: boolean; x: number; z: number; s?: number }) {
  return (
    <group position={[x, 0.7, z]} scale={s}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[1.3, 1.4, 1.8, 10]} />
        <meshStandardMaterial color="#6a5038" roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.4, 0]} castShadow>
        <coneGeometry args={[1.8, 1.4, 10]} />
        <meshStandardMaterial color="#8a7448" roughness={0.98} />
      </mesh>
      <mesh position={[0, 0.7, 1.36]}>
        <planeGeometry args={[0.6, 1.0]} />
        <meshStandardMaterial
          color={lit ? '#ffcf8a' : '#141210'}
          emissive={lit ? '#ffb060' : '#000'}
          emissiveIntensity={lit ? 2.2 : 0}
          toneMapped={!lit}
        />
      </mesh>
    </group>
  );
}

function Fire({ reduceMotion }: { reduceMotion: boolean }) {
  const g = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const flames = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ x: (i % 7) * 1.8 - 5.4, z: Math.floor(i / 7) * 2.4 - 1.2, h: 0.5 + ((i * 37) % 10) / 14 })), []);
  useFrame(({ clock }) => {
    if (reduceMotion) return;
    const t = clock.elapsedTime;
    g.current?.children.forEach((c, i) => {
      c.scale.y = 0.75 + Math.sin(t * 7 + i * 1.7) * 0.25 + Math.sin(t * 13 + i) * 0.1;
    });
    if (light.current) light.current.intensity = 10 + Math.sin(t * 9) * 3;
  });
  return (
    <group>
      <Land w={16} d={8} color="#2e2418" />
      <group ref={g} position={[0, 0.7, 0]}>
        {flames.map((f, i) => (
          <mesh key={i} position={[f.x, f.h / 2, f.z]}>
            <coneGeometry args={[0.26, f.h, 6]} />
            <meshBasicMaterial color="#ff8a30" transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <pointLight ref={light} position={[0, 2, 0]} color="#ff8a3a" intensity={10} distance={22} decay={2} />
      {/* 烟 */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-1.5 + i * 1.5, 2.6 + i * 1.1, -0.5]}>
          <sphereGeometry args={[0.9 + i * 0.3, 10, 8]} />
          <meshStandardMaterial color="#4a423a" transparent opacity={0.16} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function Reeds() {
  const r = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({ x: Math.cos(i * 2.4) * (2 + (i % 7)), z: Math.sin(i * 2.4) * (1.5 + (i % 5)), h: 1.4 + ((i * 13) % 10) / 6 })),
    [],
  );
  return (
    <group>
      {r.map((p, i) => (
        <mesh key={i} position={[p.x, p.h / 2, p.z]} rotation={[0, 0, Math.sin(i) * 0.12]}>
          <cylinderGeometry args={[0.03, 0.05, p.h, 4]} />
          <meshStandardMaterial color="#7a6a42" roughness={0.95} />
        </mesh>
      ))}
      {/* 芦苇深处的一点火 */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshStandardMaterial color="#ffd090" emissive="#ff9a40" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.2, 0]} color="#ff9a40" intensity={6} distance={14} decay={2} />
    </group>
  );
}

function Crowd({ era, reduceMotion }: { era: string; reduceMotion: boolean }) {
  const looks = DECK_CREW[era] ?? DECK_CREW.test;
  const people = useMemo(
    () => Array.from({ length: 9 }, (_, i) => ({ x: (i % 5) * 1.4 - 2.8, z: Math.floor(i / 5) * 1.6 - 0.8, r: Math.sin(i * 3) * 0.6, s: 1.2 + (i % 3) * 0.08 })),
    [],
  );
  return (
    <group>
      <Land w={12} d={7} color="#3a3128" />
      {people.map((p, i) => (
        <group key={i} position={[p.x, 0.7, p.z]} rotation={[0, Math.PI + p.r, 0]} scale={p.s}>
          <Person look={looks[i % 2] as Look} reduceMotion={reduceMotion} phase={i} />
        </group>
      ))}
      <pointLight position={[0, 4, 2]} color="#ffd0a0" intensity={5} distance={18} decay={2} />
    </group>
  );
}

function Chimneys({ reduceMotion }: { reduceMotion: boolean }) {
  const smoke = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!smoke.current || reduceMotion) return;
    const t = clock.elapsedTime;
    smoke.current.children.forEach((c, i) => {
      const k = ((t * 0.25 + i * 0.17) % 1);
      c.position.y = 14 + k * 10;
      c.position.x = (i % 3) * 4 - 4 + k * 3;
      c.scale.setScalar(1 + k * 2.2);
      ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.3 * (1 - k);
    });
  });
  return (
    <group>
      <Land w={18} d={10} color="#2e3033" />
      {/* 厂房 */}
      <mesh position={[0, 2.7, 1.5]} castShadow>
        <boxGeometry args={[14, 4, 5]} />
        <meshStandardMaterial color="#4a3a30" roughness={0.9} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-5 + i * 2, 2.6, 4.05]}>
          <planeGeometry args={[1, 1.4]} />
          <meshStandardMaterial color="#ffd8a0" emissive="#ffb060" emissiveIntensity={1.8} toneMapped={false} />
        </mesh>
      ))}
      {[-4, 0, 4].map((x, i) => (
        <mesh key={x} position={[x, 7.5, -1.5]} castShadow>
          <cylinderGeometry args={[0.7, 1.0, 14 + i, 12]} />
          <meshStandardMaterial color="#5a4436" roughness={0.88} />
        </mesh>
      ))}
      <group ref={smoke}>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} position={[0, 15, -1.5]}>
            <sphereGeometry args={[1.2, 10, 8]} />
            <meshStandardMaterial color="#2a2826" transparent opacity={0.3} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Trestle({ reduceMotion }: { reduceMotion: boolean }) {
  const train = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!train.current || reduceMotion) return;
    train.current.position.x = ((clock.elapsedTime * 3) % 36) - 18;
  });
  return (
    <group>
      {Array.from({ length: 7 }, (_, i) => (
        <group key={i} position={[-15 + i * 5, 0, 0]}>
          <mesh position={[0, 2.4, 0]}>
            <boxGeometry args={[0.5, 4.8, 2.6]} />
            <meshStandardMaterial color="#3a3530" roughness={0.9} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 5, 0]}>
        <boxGeometry args={[34, 0.4, 2.4]} />
        <meshStandardMaterial color="#4a4038" roughness={0.85} />
      </mesh>
      <group ref={train} position={[0, 5.9, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[3, 1.6, 1.8]} />
          <meshStandardMaterial color="#1e1e1e" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[0.8, 1.7, 0]}>
          <cylinderGeometry args={[0.25, 0.3, 1, 8]} />
          <meshStandardMaterial color="#1e1e1e" />
        </mesh>
        <mesh position={[1.55, 0.6, 0]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial color="#fff2c0" emissive="#ffd070" emissiveIntensity={3} toneMapped={false} />
        </mesh>
        {[1, 2, 3].map((i) => (
          <mesh key={i} position={[-i * 3.3, 0.4, 0]}>
            <boxGeometry args={[3, 1.3, 1.7]} />
            <meshStandardMaterial color="#2a2622" roughness={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Poles() {
  const xs = Array.from({ length: 9 }, (_, i) => -16 + i * 4);
  return (
    <group>
      {xs.map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 3.5, 0]}>
            <cylinderGeometry args={[0.1, 0.14, 7, 6]} />
            <meshStandardMaterial color="#4a3d30" roughness={0.9} />
          </mesh>
          <mesh position={[0, 6.6, 0]}>
            <boxGeometry args={[1.6, 0.12, 0.12]} />
            <meshStandardMaterial color="#4a3d30" />
          </mesh>
          {[-0.7, 0.7].map((o) => (
            <mesh key={o} position={[o, 6.75, 0]}>
              <sphereGeometry args={[0.08, 6, 6]} />
              <meshStandardMaterial color="#d8e8f0" emissive="#9fd0e0" emissiveIntensity={1.2} />
            </mesh>
          ))}
        </group>
      ))}
      {[-0.7, 0.7].map((o) => (
        <mesh key={o} position={[0, 6.7, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 32, 4]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  );
}

function Tower({ reduceMotion }: { reduceMotion: boolean }) {
  const lamp = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!lamp.current) return;
    lamp.current.emissiveIntensity = reduceMotion ? 2 : Math.sin(clock.elapsedTime * 3) > 0.2 ? 4 : 0.2;
  });
  return (
    <group>
      <Land w={8} d={8} color="#2a3236" />
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.2, 8, Math.sin(a) * 1.2]} rotation={[Math.sin(a) * 0.08, 0, -Math.cos(a) * 0.08]}>
            <cylinderGeometry args={[0.08, 0.12, 15, 5]} />
            <meshStandardMaterial color="#6a7076" metalness={0.6} roughness={0.5} />
          </mesh>
        );
      })}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[0, 2 + i * 2.4, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
          <ringGeometry args={[1.1 - i * 0.08, 1.2 - i * 0.08, 4]} />
          <meshStandardMaterial color="#6a7076" side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, 15.8, 0]}>
        <sphereGeometry args={[0.35, 10, 10]} />
        <meshStandardMaterial ref={lamp} color="#ff5040" emissive="#ff2a1a" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      {/* 守站人的小屋 */}
      <mesh position={[2.6, 1.6, 1.8]}>
        <boxGeometry args={[2.4, 1.8, 2]} />
        <meshStandardMaterial color="#3a4248" roughness={0.9} />
      </mesh>
      <mesh position={[2.6, 1.6, 2.81]}>
        <planeGeometry args={[0.7, 0.7]} />
        <meshStandardMaterial color="#ffe0b0" emissive="#ffc070" emissiveIntensity={2} toneMapped={false} />
      </mesh>
    </group>
  );
}

function CableShip({ reduceMotion }: { reduceMotion: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!g.current || reduceMotion) return;
    const t = clock.elapsedTime;
    g.current.position.y = Math.sin(t * 0.9) * 0.15;
    g.current.rotation.z = Math.sin(t * 0.7) * 0.02;
  });
  return (
    <group ref={g}>
      <mesh position={[0, 1, 0]} castShadow>
        <boxGeometry args={[4.5, 2, 16]} />
        <meshStandardMaterial color="#2a2e33" roughness={0.8} />
      </mesh>
      <mesh position={[0, 3, -2]}>
        <boxGeometry args={[3, 2, 4]} />
        <meshStandardMaterial color="#d8d4c8" roughness={0.8} />
      </mesh>
      <mesh position={[0, 5.2, -2]}>
        <cylinderGeometry args={[0.4, 0.5, 2.4, 10]} />
        <meshStandardMaterial color="#8a3a2a" />
      </mesh>
      {/* 缆盘 */}
      <mesh position={[0, 2.8, 4.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1.4, 1.4, 2.6, 18]} />
        <meshStandardMaterial color="#1a1c1e" roughness={0.9} />
      </mesh>
      {/* 缆从船尾沉进海里 */}
      <mesh position={[0, 0.6, 10]} rotation={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 6, 5]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0, 4.6, -2]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#fff0d0" emissive="#ffd080" emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Island({ lit }: { lit: boolean }) {
  const wins = useMemo(
    () => Array.from({ length: lit ? 28 : 1 }, (_, i) => ({ x: ((i * 37) % 11) - 5, y: 1.6 + ((i * 13) % 5) * 1.1, z: ((i * 7) % 5) - 2 })),
    [lit],
  );
  return (
    <group>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[7, 8.5, 1.4, 18]} />
        <meshStandardMaterial color={lit ? '#2c3034' : '#2a2824'} roughness={0.98} />
      </mesh>
      {lit &&
        [-3, 0, 3].map((x, i) => (
          <mesh key={x} position={[x, 3 + i, -1]}>
            <boxGeometry args={[2.4, 5 + i * 2, 2.4]} />
            <meshStandardMaterial color="#1e2328" roughness={0.8} />
          </mesh>
        ))}
      {!lit && <Hut lit x={0} z={0} s={0.8} />}
      {lit &&
        wins.map((w, i) => (
          <mesh key={i} position={[w.x * 0.6, w.y, 0.25 + w.z * 0.1]}>
            <boxGeometry args={[0.4, 0.3, 0.05]} />
            <meshStandardMaterial color="#d8f0ff" emissive="#8fdfe8" emissiveIntensity={2.4} toneMapped={false} />
          </mesh>
        ))}
      <pointLight position={[0, 4, 3]} color={lit ? '#8fdfe8' : '#ffb060'} intensity={lit ? 10 : 4} distance={lit ? 30 : 12} decay={2} />
    </group>
  );
}

function Servers({ reduceMotion }: { reduceMotion: boolean }) {
  const strips = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!strips.current || reduceMotion) return;
    const t = clock.elapsedTime;
    strips.current.children.forEach((c, i) => {
      ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 1.4 + Math.sin(t * 2 + i * 0.9) * 0.9;
    });
  });
  return (
    <group>
      <Land w={20} d={8} color="#181c26" />
      {[-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].map((x, i) => (
        <mesh key={x} position={[x, 0.7 + (8 + (i % 3) * 2) / 2, 0]} castShadow>
          <boxGeometry args={[2.2, 8 + (i % 3) * 2, 4]} />
          <meshStandardMaterial color="#111520" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
      <group ref={strips}>
        {[-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].map((x, i) => (
          <mesh key={x} position={[x, 1.5 + (i % 3), 2.02]}>
            <planeGeometry args={[1.6, 0.12]} />
            <meshStandardMaterial color="#c8d2f5" emissive="#7f98ff" emissiveIntensity={1.6} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Drones({ reduceMotion }: { reduceMotion: boolean }) {
  const g = useRef<THREE.Group>(null);
  const pts = useMemo(() => Array.from({ length: 18 }, (_, i) => ({ a: i * 2.4, r: 3 + (i % 5) * 1.6, y: 6 + (i % 4) * 2.2 })), []);
  useFrame(({ clock }) => {
    if (!g.current || reduceMotion) return;
    const t = clock.elapsedTime * 0.3;
    g.current.children.forEach((c, i) => {
      const p = pts[i];
      c.position.set(Math.cos(p.a + t) * p.r, p.y + Math.sin(t * 3 + i) * 0.4, Math.sin(p.a + t) * p.r);
    });
  });
  return (
    <group ref={g}>
      {pts.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.16, 8, 8]} />
          <meshStandardMaterial color="#e6ecff" emissive="#9fb4ff" emissiveIntensity={3} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function PropFor({ kind, era, reduceMotion }: { kind: PropKind; era: string; reduceMotion: boolean }) {
  switch (kind) {
    case 'huts':
    case 'huts-dark': {
      const lit = kind === 'huts';
      return (
        <group>
          <Land w={16} d={11} color="#3d3226" />
          <Hut lit={lit} x={-4} z={-1} />
          <Hut lit={lit} x={0.5} z={1.5} s={1.15} />
          <Hut lit={lit} x={4.5} z={-1.5} s={0.9} />
          {/* 被脚踩出来的路 */}
          <mesh position={[0, 0.72, 3.4]} rotation={[-Math.PI / 2, 0, 0.1]}>
            <planeGeometry args={[12, 0.9]} />
            <meshStandardMaterial color="#5a4a36" roughness={1} />
          </mesh>
          {lit && <pointLight position={[0, 3, 4]} color="#ffb060" intensity={6} distance={20} decay={2} />}
        </group>
      );
    }
    case 'fire':
      return <Fire reduceMotion={reduceMotion} />;
    case 'reeds':
      return <Reeds />;
    case 'crowd':
      return <Crowd era={era} reduceMotion={reduceMotion} />;
    case 'chimneys':
      return <Chimneys reduceMotion={reduceMotion} />;
    case 'trestle':
      return <Trestle reduceMotion={reduceMotion} />;
    case 'poles':
      return <Poles />;
    case 'tower':
      return <Tower reduceMotion={reduceMotion} />;
    case 'cableship':
      return <CableShip reduceMotion={reduceMotion} />;
    case 'island-lit':
      return <Island lit />;
    case 'island-dark':
      return <Island lit={false} />;
    case 'servers':
      return <Servers reduceMotion={reduceMotion} />;
    case 'drones':
      return <Drones reduceMotion={reduceMotion} />;
  }
}

export function StoryProps({
  beats,
  era,
  reduceMotion,
}: {
  beats: Beat[];
  era: string;
  reduceMotion: boolean;
}) {
  return (
    <group>
      {beats.map((b) => (
        <group
          key={b.id}
          position={[b.propAt.x, 0, b.propAt.z]}
          // 景的正面朝着航线
          rotation={[0, Math.atan2(b.at.x - b.propAt.x, b.at.z - b.propAt.z), 0]}
        >
          <PropFor kind={b.prop} era={era} reduceMotion={reduceMotion} />
        </group>
      ))}
    </group>
  );
}

/** 码头上的那个人：比船员高一点，有一盏灯照着，面朝来船 */
export function ShoreFigure({
  figure,
  at,
  face,
  reduceMotion,
}: {
  figure: Figure;
  at: { x: number; z: number };
  face: number;
  reduceMotion: boolean;
}) {
  return (
    <group position={[at.x, 0.68, at.z]} rotation={[0, face, 0]}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[1.1, 1.2, 0.24, 18]} />
        <meshStandardMaterial color="#4a4238" roughness={0.9} />
      </mesh>
      <group position={[0, 0.24, 0]} scale={1.9}>
        <Person look={figure.look} reduceMotion={reduceMotion} phase={2.2} />
      </group>
      {/* 一盏立灯：远远就看见岸上站着一个人 */}
      <mesh position={[1.3, 1.6, 0.3]}>
        <cylinderGeometry args={[0.05, 0.06, 3.2, 6]} />
        <meshStandardMaterial color="#2a2118" />
      </mesh>
      <mesh position={[1.3, 3.3, 0.3]}>
        <sphereGeometry args={[0.24, 12, 10]} />
        <meshStandardMaterial color="#fff1d0" emissive="#ffcf8a" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <pointLight position={[1.0, 3.4, 1.2]} color="#ffcf8a" intensity={8} distance={12} decay={2} />
    </group>
  );
}
