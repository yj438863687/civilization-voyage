import { useMemo } from 'react';
import * as THREE from 'three';
import { DECK_Y, STERN_HALL } from './hull';

function cssColor(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Chart desk, lamp, mullions. Hall walls live on the ship hull. Concept, not a reconstruction. */
export function Cabin() {
  const M = useMemo(() => {
    const wood = new THREE.MeshStandardMaterial({
      color: cssColor('--cv-ship-hull', '#2a211c'),
      roughness: 0.82,
    });
    const floor = new THREE.MeshStandardMaterial({
      color: cssColor('--cv-ship-hull-light', '#3b2f26'),
      roughness: 0.88,
    });
    const paper = new THREE.MeshStandardMaterial({
      color: cssColor('--cv-ship-sail', '#e8dcc6'),
      roughness: 0.92,
    });
    const brass = new THREE.MeshStandardMaterial({
      color: cssColor('--cv-ship-trim', '#c9a15a'),
      roughness: 0.35,
      metalness: 0.65,
    });
    const lacquer = new THREE.MeshStandardMaterial({
      color: cssColor('--cv-ship-lacquer', '#b6452c'),
      roughness: 0.55,
      metalness: 0.08,
    });
    const lamp = new THREE.MeshStandardMaterial({
      color: cssColor('--cv-ship-lamp-core', '#ffd9a0'),
      emissive: cssColor('--cv-ship-lamp-warm', '#f0b46a'),
      emissiveIntensity: 2,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: '#dce6eb',
      emissive: cssColor('--cv-ship-lamp-cool', '#8fb6c8'),
      emissiveIntensity: 0.18,
      transparent: true,
      opacity: 0.1,
      roughness: 0.12,
      metalness: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    return { wood, floor, paper, brass, lacquer, lamp, glass };
  }, []);

  const { z, w, d, h, wall, winW, winH, winY } = STERN_HALL;
  const tableY = DECK_Y + 0.72;
  const tableZ = z - 0.55;
  const frontZ = z - d / 2 + wall + 0.02;

  return (
    <group>
      <mesh position={[0, DECK_Y + 0.03, z]} material={M.floor} receiveShadow>
        <boxGeometry args={[w - wall * 2, 0.06, d - wall * 2]} />
      </mesh>
      <mesh position={[0, DECK_Y + h - 0.05, z]} material={M.wood}>
        <boxGeometry args={[w - 0.28, 0.08, d - 0.28]} />
      </mesh>
      <mesh position={[0, DECK_Y + h - 0.18, z - 0.7]} material={M.lacquer}>
        <boxGeometry args={[w - 0.4, 0.1, 0.1]} />
      </mesh>
      <mesh position={[0, DECK_Y + h - 0.18, z + 0.55]} material={M.lacquer}>
        <boxGeometry args={[w - 0.4, 0.1, 0.1]} />
      </mesh>

      <mesh position={[0, tableY, tableZ]} material={M.wood} receiveShadow castShadow>
        <boxGeometry args={[1.4, 0.12, 2.2]} />
      </mesh>
      <mesh position={[0, tableY + 0.07, tableZ]} material={M.brass}>
        <boxGeometry args={[1.48, 0.02, 2.28]} />
      </mesh>
      <mesh position={[-0.58, (DECK_Y + tableY) / 2, tableZ - 0.85]} material={M.wood}>
        <boxGeometry args={[0.1, tableY - DECK_Y, 0.12]} />
      </mesh>
      <mesh position={[0.58, (DECK_Y + tableY) / 2, tableZ - 0.85]} material={M.wood}>
        <boxGeometry args={[0.1, tableY - DECK_Y, 0.12]} />
      </mesh>
      <mesh position={[-0.58, (DECK_Y + tableY) / 2, tableZ + 0.85]} material={M.wood}>
        <boxGeometry args={[0.1, tableY - DECK_Y, 0.12]} />
      </mesh>
      <mesh position={[0.58, (DECK_Y + tableY) / 2, tableZ + 0.85]} material={M.wood}>
        <boxGeometry args={[0.1, tableY - DECK_Y, 0.12]} />
      </mesh>
      <mesh position={[0, (DECK_Y + tableY - 0.2) / 2, tableZ]} material={M.wood}>
        <boxGeometry args={[1.2, 0.32, 1.6]} />
      </mesh>
      <mesh position={[0, tableY + 0.09, tableZ - 0.05]} rotation={[-Math.PI / 2, 0, 0.04]} material={M.paper}>
        <planeGeometry args={[1.15, 1.8]} />
      </mesh>
      <mesh position={[0, tableY + 0.095, tableZ - 0.05]} rotation={[-Math.PI / 2, 0, 0.04]} material={M.brass}>
        <planeGeometry args={[1.15, 0.012]} />
      </mesh>
      <mesh position={[0.48, tableY + 0.1, tableZ + 0.7]} material={M.brass}>
        <cylinderGeometry args={[0.13, 0.13, 0.035, 16]} />
      </mesh>

      <mesh position={[-0.58, tableY + 0.4, tableZ + 0.55]} material={M.lamp}>
        <sphereGeometry args={[0.08, 10, 10]} />
      </mesh>
      <mesh position={[-0.58, tableY + 0.22, tableZ + 0.55]} material={M.brass}>
        <cylinderGeometry args={[0.035, 0.06, 0.28, 8]} />
      </mesh>
      <pointLight
        position={[-0.35, tableY + 0.62, tableZ + 0.2]}
        color={cssColor('--cv-ship-lamp-warm', '#f0b46a')}
        intensity={1.35}
        distance={6.5}
        decay={2}
      />

      <mesh position={[0, winY, frontZ]} material={M.glass}>
        <planeGeometry args={[winW, winH]} />
      </mesh>
      <mesh position={[-0.32, winY, frontZ + 0.02]} material={M.brass}>
        <boxGeometry args={[0.045, winH + 0.04, 0.05]} />
      </mesh>
      <mesh position={[0.32, winY, frontZ + 0.02]} material={M.brass}>
        <boxGeometry args={[0.045, winH + 0.04, 0.05]} />
      </mesh>
      <mesh position={[0, winY + winH / 2, frontZ + 0.02]} material={M.brass}>
        <boxGeometry args={[winW + 0.08, 0.05, 0.06]} />
      </mesh>
      <mesh position={[0, winY - winH / 2, frontZ + 0.02]} material={M.brass}>
        <boxGeometry args={[winW + 0.08, 0.05, 0.06]} />
      </mesh>
    </group>
  );
}
