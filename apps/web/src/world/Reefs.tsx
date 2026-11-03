import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { seaStateFor } from './seaState';

/**
 * 礁石与暗流的样子。
 * 露出水面的礁石是几块黑石；暗礁只有一圈白浪在翻；暗流是水面上一道道顺着推力方向流的纹。
 * 它们都是「看得见的危险」：先看见，再决定绕不绕。
 */
export function Reefs({ sceneId, reduceMotion, clear }: { sceneId: string; reduceMotion: boolean; /** 大殿立在这儿：这一圈不画礁 */ clear?: { x: number; z: number } | null }) {
  const sea = useMemo(() => {
    const st = seaStateFor(sceneId);
    if (!clear) return st;
    return { ...st, reefs: st.reefs.filter((r) => Math.hypot(r.x - clear.x, r.z - clear.z) > 26) };
  }, [sceneId, clear]);
  const foam = useRef<THREE.Group>(null);
  const flow = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (reduceMotion) return;
    const t = clock.elapsedTime;
    foam.current?.children.forEach((c, i) => {
      c.scale.setScalar(1 + Math.sin(t * 2.2 + i) * 0.12);
      ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(t * 3 + i * 1.3) * 0.1;
    });
    flow.current?.children.forEach((g, i) => {
      const cur = sea.currents[i];
      g.children.forEach((m, j) => {
        const k = (t * 0.25 + j * 0.11) % 1;
        m.position.set(cur.dx * (k - 0.5) * cur.r * 1.6 + Math.sin(j * 7) * cur.r * 0.5 * -cur.dz, 0.08, cur.dz * (k - 0.5) * cur.r * 1.6 + Math.sin(j * 7) * cur.r * 0.5 * cur.dx);
        ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.25 * Math.sin(k * Math.PI);
      });
    });
  });
  return (
    <group>
      {sea.reefs.map((r, i) => (
        <group key={i} position={[r.x, 0, r.z]}>
          {r.h > 0 &&
            [0, 1, 2].map((k) => (
              <mesh key={k} position={[Math.cos(k * 2.1) * r.r * 0.4, r.h * (0.5 + k * 0.2) - 0.3, Math.sin(k * 2.1) * r.r * 0.4]} rotation={[k * 0.4, k * 1.3, k * 0.2]} castShadow>
                <dodecahedronGeometry args={[r.r * (0.7 - k * 0.12), 0]} />
                <meshStandardMaterial color="#2a2622" roughness={0.95} flatShading />
              </mesh>
            ))}
        </group>
      ))}
      {/* 白浪：露出的与暗礁都有，暗礁只靠它示警 */}
      <group ref={foam}>
        {sea.reefs.map((r, i) => (
          <mesh key={i} position={[r.x, 0.07, r.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r.r * 0.95, r.r * 1.25, 24]} />
            <meshBasicMaterial color="#f2ead8" transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      {/* 暗流：一道道流动的纹 */}
      <group ref={flow}>
        {sea.currents.map((c, i) => (
          <group key={i} position={[c.x, 0, c.z]} rotation={[0, Math.atan2(c.dx, c.dz), 0]}>
            {Array.from({ length: 9 }, (_, j) => (
              <mesh key={j} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.35, c.r * 0.5]} />
                <meshBasicMaterial color="#cfe8ee" transparent opacity={0.2} depthWrite={false} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </group>
  );
}

/** 风：船尾一面旗，永远指向风去的方向；旗面随风力抖 */
export function WindVane({ sceneId, reduceMotion }: { sceneId: string; reduceMotion: boolean }) {
  const sea = useMemo(() => seaStateFor(sceneId), [sceneId]);
  const flag = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!flag.current || reduceMotion) return;
    flag.current.rotation.y = Math.sin(clock.elapsedTime * (4 + sea.wind.k * 6)) * 0.25 * sea.wind.k;
  });
  const yaw = Math.atan2(sea.wind.dx, sea.wind.dz);
  return (
    <group rotation={[0, yaw, 0]}>
      <mesh ref={flag} position={[0, 0, 0.45]}>
        <planeGeometry args={[0.08, 0.9]} />
        <meshStandardMaterial color="#e8dcc4" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
