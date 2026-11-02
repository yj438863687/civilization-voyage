import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { TAOYUAN } from './taoyuan';

/**
 * 暗线 · 桃花源的景。
 * 农业段：一路漂着的桃花瓣，一座山，山脚一片桃林，山口里透出一点光。
 * 之后的时代：同一个地方，变成矿坑、无信号的空白、「无数据」的线框。
 */

function Petals({ reduceMotion }: { reduceMotion: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const N = 160;
  const seeds = useMemo(() => {
    const pts = TAOYUAN.trail;
    return Array.from({ length: N }, (_, i) => {
      const seg = (i / N) * (pts.length - 1);
      const a = pts[Math.floor(seg)];
      const b = pts[Math.min(pts.length - 1, Math.floor(seg) + 1)];
      const f = seg - Math.floor(seg);
      return {
        x: a.x + (b.x - a.x) * f + (Math.sin(i * 12.9) * 2.2),
        z: a.z + (b.z - a.z) * f + (Math.cos(i * 7.3) * 2.2),
        r: i * 1.7,
        s: 0.16 + ((i * 37) % 10) / 60,
      };
    });
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = reduceMotion ? 0 : clock.elapsedTime;
    seeds.forEach((p, i) => {
      // 花瓣顺着水往西漂：慢慢漂出去，再从头漂过来
      const drift = ((t * 0.35 + i * 0.7) % 9) - 4.5;
      dummy.position.set(p.x - drift * 0.6, 0.09 + Math.sin(t * 1.4 + i) * 0.03, p.z + Math.sin(t * 0.5 + i) * 0.4);
      dummy.rotation.set(-Math.PI / 2 + Math.sin(t + i) * 0.2, 0, p.r + t * 0.2);
      dummy.scale.setScalar(p.s);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, N]}>
      <circleGeometry args={[1, 5]} />
      <meshStandardMaterial color="#f4b8c4" emissive="#e88aa0" emissiveIntensity={0.35} side={THREE.DoubleSide} roughness={0.7} />
    </instancedMesh>
  );
}

function PeachTree({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.22, 2.8, 7]} />
        <meshStandardMaterial color="#4a3426" roughness={0.95} />
      </mesh>
      {[[0, 3.2, 0, 1.3], [0.8, 2.8, 0.3, 0.9], [-0.7, 2.9, -0.2, 1.0], [0.2, 3.7, -0.5, 0.8]].map(([px, py, pz, r], i) => (
        <mesh key={i} position={[px, py, pz]} castShadow>
          <icosahedronGeometry args={[r, 1]} />
          <meshStandardMaterial color="#f2b0c0" emissive="#d87890" emissiveIntensity={0.25} roughness={0.8} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Mountain({ reduceMotion }: { reduceMotion: boolean }) {
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (glow.current && !reduceMotion) glow.current.opacity = 0.75 + Math.sin(clock.elapsedTime * 0.9) * 0.15;
  });
  return (
    <group>
      {/* 山：几块叠起来的峰，背后更高 */}
      {[
        [0, -6, 14, 22],
        [-9, -3, 10, 15],
        [9, -4, 11, 17],
        [-4, -12, 12, 26],
      ].map(([x, z, r, h], i) => (
        <mesh key={i} position={[x, h / 2 - 1, z]} castShadow receiveShadow>
          <coneGeometry args={[r, h, 9, 3]} />
          <meshStandardMaterial color={i % 2 ? '#3c4a3a' : '#465440'} roughness={0.95} flatShading />
        </mesh>
      ))}
      {/* 山口：一道窄缝，里面透出光 */}
      <mesh position={[0, 2.2, 4.4]}>
        <planeGeometry args={[1.4, 3.2]} />
        <meshBasicMaterial ref={glow} color="#ffe6b8" transparent opacity={0.8} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 2.4, 6]} color="#ffd8a8" intensity={10} distance={22} decay={2} />
      {/* 夹岸数百步，中无杂树 */}
      {Array.from({ length: 12 }, (_, i) => {
        const side = i % 2 ? 1 : -1;
        return <PeachTree key={i} x={side * (4 + (i % 3) * 1.6)} z={6 + Math.floor(i / 2) * 2.6} s={0.8 + (i % 4) * 0.12} />;
      })}
      {/* 山脚的雾 */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[(i - 1.5) * 7, 1.2, 2 + (i % 2) * 3]}>
          <sphereGeometry args={[4.5, 12, 8]} />
          <meshStandardMaterial color="#e8e2d6" transparent opacity={0.12} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function Pit() {
  return (
    <group>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[9, 7, 0.8, 24]} />
        <meshStandardMaterial color="#2a2522" roughness={1} />
      </mesh>
      <mesh position={[0, 0.82, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[6, 24]} />
        <meshStandardMaterial color="#111" roughness={1} />
      </mesh>
      <mesh position={[4, 7, -3]}>
        <cylinderGeometry args={[0.6, 0.9, 13, 10]} />
        <meshStandardMaterial color="#4a3a30" />
      </mesh>
      {/* 还开着花的那一棵 */}
      <PeachTree x={-5} z={4} s={0.7} />
    </group>
  );
}

function Blank({ reduceMotion }: { reduceMotion: boolean }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ring.current && !reduceMotion) ring.current.rotation.z = clock.elapsedTime * 0.1;
  });
  return (
    <group>
      {/* 一块没有反光的水：信号绕开了它 */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[10, 40]} />
        <meshBasicMaterial color="#0a1418" transparent opacity={0.7} />
      </mesh>
      <mesh ref={ring} position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[10, 10.4, 40, 1, 0, Math.PI * 1.7]} />
        <meshBasicMaterial color="#8fdfe8" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function NoData({ reduceMotion }: { reduceMotion: boolean }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    if (mat.current && !reduceMotion) mat.current.opacity = Math.random() > 0.96 ? 0.1 : 0.45;
  });
  return (
    <mesh position={[0, 6, 0]}>
      <boxGeometry args={[14, 12, 14]} />
      <meshBasicMaterial ref={mat} color="#9fb4ff" wireframe transparent opacity={0.45} />
    </mesh>
  );
}

export function TaoyuanScene({
  era,
  found,
  reduceMotion,
}: {
  era: string;
  /** 在农业段进过桃花源吗：只有进过的人，才看得见后来的回声 */
  found: boolean;
  reduceMotion: boolean;
}) {
  const { x, z } = TAOYUAN.at;
  if (era === 'A') {
    return (
      <group>
        <Petals reduceMotion={reduceMotion} />
        {/* 山口朝东：从航线那边顺着花瓣过来，正好看见那一点光 */}
        <group position={[x - 6, 0, z]} rotation={[0, Math.PI / 2, 0]}>
          <Mountain reduceMotion={reduceMotion} />
        </group>
      </group>
    );
  }
  if (!found) return null;
  return (
    <group position={[x, 0, z]}>
      {era === 'B' && <Pit />}
      {era === 'C' && <Blank reduceMotion={reduceMotion} />}
      {era === 'D' && <NoData reduceMotion={reduceMotion} />}
    </group>
  );
}
