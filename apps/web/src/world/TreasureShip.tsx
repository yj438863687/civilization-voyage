import { useMemo } from 'react';
import * as THREE from 'three';

/** Conceptual 宝船 silhouette. Not a reconstruction of a named historical hull. Local bow = -z. */

function Mast({ z, h, sailW, sailH, sailY }: { z: number; h: number; sailW: number; sailH: number; sailY: number }) {
  const mast = useMemo(() => new THREE.MeshStandardMaterial({ color: '#24160e', roughness: 0.8 }), []);
  const sail = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#e4d2b0', roughness: 0.92, side: THREE.DoubleSide, metalness: 0 }),
    [],
  );
  const batten = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a2416', roughness: 0.7 }), []);
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c9a15a', roughness: 0.35, metalness: 0.7 }), []);
  const battens = [0.12, 0.32, 0.52, 0.72, 0.9];
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, h / 2, 0]} material={mast} castShadow>
        <cylinderGeometry args={[0.11, 0.16, h, 8]} />
      </mesh>
      <mesh position={[0, h + 0.15, 0]} material={gold}>
        <sphereGeometry args={[0.16, 8, 8]} />
      </mesh>
      <mesh position={[0, sailY, -0.12]} material={sail} castShadow>
        <planeGeometry args={[sailW, sailH]} />
      </mesh>
      {battens.map((t) => (
        <mesh key={t} position={[0, sailY - sailH / 2 + sailH * t, -0.14]} material={batten}>
          <boxGeometry args={[sailW + 0.15, 0.06, 0.06]} />
        </mesh>
      ))}
      <mesh position={[0, sailY + sailH / 2 + 0.08, -0.14]} material={gold}>
        <boxGeometry args={[sailW + 0.2, 0.08, 0.08]} />
      </mesh>
    </group>
  );
}

export function TreasureShip() {
  const hull = useMemo(() => new THREE.MeshStandardMaterial({ color: '#140e0a', roughness: 0.78, metalness: 0.08 }), []);
  const red = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7a2a1c', roughness: 0.55, metalness: 0.12 }), []);
  const redDeep = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4a1610', roughness: 0.6 }), []);
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d4b06a', roughness: 0.32, metalness: 0.72 }), []);
  const eye = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#f3e0b0', roughness: 0.28, metalness: 0.65, side: THREE.DoubleSide }),
    [],
  );
  const deck = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5a3a22', roughness: 0.85 }), []);
  const rail = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c9a15a', roughness: 0.4, metalness: 0.55 }), []);
  const lamp = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#f1d9a8', emissive: '#f1d9a8', emissiveIntensity: 1.4, roughness: 0.3 }),
    [],
  );

  return (
    <group>
      {/* hull — bow -z, stern +z */}
      <mesh position={[0, 0.35, 0.4]} material={hull} castShadow receiveShadow>
        <boxGeometry args={[3.8, 0.7, 15.6]} />
      </mesh>
      <mesh position={[0, 1.05, 0.2]} material={hull} castShadow>
        <boxGeometry args={[4.8, 0.85, 16.2]} />
      </mesh>
      <mesh position={[0, 1.7, 0.15]} material={deck} receiveShadow>
        <boxGeometry args={[5.1, 0.22, 16.4]} />
      </mesh>
      {/* bow flare */}
      <mesh position={[0, 1.35, -7.6]} rotation={[0.42, 0, 0]} material={hull} castShadow>
        <boxGeometry args={[3.2, 1.1, 2.8]} />
      </mesh>
      <mesh position={[0, 2.15, -8.3]} rotation={[0.55, 0, 0]} material={red} castShadow>
        <boxGeometry args={[2.4, 0.7, 1.6]} />
      </mesh>
      <mesh position={[0, 2.7, -8.7]} material={gold}>
        <boxGeometry args={[0.18, 1.6, 0.18]} />
      </mesh>
      {/* 船眼 */}
      <mesh position={[1.55, 1.9, -7.55]} rotation={[0, Math.PI / 2, 0]} material={eye}>
        <circleGeometry args={[0.3, 14]} />
      </mesh>
      <mesh position={[-1.55, 1.9, -7.55]} rotation={[0, -Math.PI / 2, 0]} material={eye}>
        <circleGeometry args={[0.3, 14]} />
      </mesh>
      {/* mid castle */}
      <mesh position={[0, 2.55, -1.1]} material={red} castShadow>
        <boxGeometry args={[3.6, 1.5, 3.4]} />
      </mesh>
      <mesh position={[0, 3.4, -1.1]} material={redDeep} castShadow>
        <boxGeometry args={[3.9, 0.18, 3.7]} />
      </mesh>
      {/* 艉楼 three storeys — the imposing mass */}
      <mesh position={[0, 2.7, 5.4]} material={red} castShadow>
        <boxGeometry args={[4.6, 2.0, 4.2]} />
      </mesh>
      <mesh position={[0, 4.15, 5.7]} material={red} castShadow>
        <boxGeometry args={[4.0, 1.5, 3.4]} />
      </mesh>
      <mesh position={[0, 5.4, 5.95]} material={redDeep} castShadow>
        <boxGeometry args={[3.3, 1.2, 2.7]} />
      </mesh>
      <mesh position={[0, 6.15, 5.95]} material={gold}>
        <boxGeometry args={[3.5, 0.12, 2.9]} />
      </mesh>
      {/* roof ridges */}
      <mesh position={[0, 6.45, 5.95]} rotation={[0, 0, 0.18]} material={redDeep}>
        <boxGeometry args={[3.6, 0.16, 0.35]} />
      </mesh>
      <mesh position={[0, 6.7, 5.95]} material={gold}>
        <boxGeometry args={[0.2, 0.7, 0.2]} />
      </mesh>
      {/* windows as gold slits */}
      {[-1.2, 0, 1.2].map((x) => (
        <mesh key={`w1-${x}`} position={[x, 2.75, 7.52]} material={lamp}>
          <boxGeometry args={[0.55, 0.4, 0.06]} />
        </mesh>
      ))}
      {[-0.8, 0.8].map((x) => (
        <mesh key={`w2-${x}`} position={[x, 4.2, 7.42]} material={lamp}>
          <boxGeometry args={[0.5, 0.35, 0.06]} />
        </mesh>
      ))}
      {/* rails */}
      <mesh position={[2.45, 2.05, 0.2]} material={rail}>
        <boxGeometry args={[0.07, 0.45, 15]} />
      </mesh>
      <mesh position={[-2.45, 2.05, 0.2]} material={rail}>
        <boxGeometry args={[0.07, 0.45, 15]} />
      </mesh>
      {/* stern lanterns */}
      <mesh position={[1.7, 4.9, 7.2]} material={lamp}>
        <sphereGeometry args={[0.22, 10, 10]} />
      </mesh>
      <mesh position={[-1.7, 4.9, 7.2]} material={lamp}>
        <sphereGeometry args={[0.22, 10, 10]} />
      </mesh>
      <pointLight position={[1.7, 4.9, 7.2]} color="#f1d9a8" intensity={2.4} distance={18} />
      <pointLight position={[-1.7, 4.9, 7.2]} color="#f1d9a8" intensity={2.4} distance={18} />
      {/* masts: fore / main / mizzen */}
      <Mast z={-5.1} h={9.2} sailW={3.6} sailH={4.6} sailY={5.4} />
      <Mast z={-0.6} h={13.2} sailW={4.8} sailH={6.4} sailY={7.2} />
      <Mast z={3.4} h={8.4} sailW={3.2} sailH={4.0} sailY={5.6} />
      {/* banner at main mast */}
      <mesh position={[0.9, 12.6, -0.6]} material={red}>
        <planeGeometry args={[1.4, 2.2]} />
      </mesh>
    </group>
  );
}
