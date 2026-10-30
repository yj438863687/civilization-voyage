import { useTexture } from '@react-three/drei';
import { useLayoutEffect } from 'react';
import * as THREE from 'three';
import { DECK_Y, STERN_HALL } from './hull';

function useCrewMaps() {
  const [first, second] = useTexture([
    '/crew/first-mate-body.png',
    '/crew/second-mate-body.png',
  ]);
  useLayoutEffect(() => {
    for (const t of [first, second]) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.minFilter = THREE.LinearMipmapLinearFilter;
    }
  }, [first, second]);
  return { first, second };
}

function Figure({
  map,
  position,
  height,
}: {
  map: THREE.Texture;
  position: [number, number, number];
  height: number;
}) {
  const aspect = (map.image?.width ?? 278) / (map.image?.height ?? 720);
  const w = height * aspect;
  return (
    <sprite position={position} scale={[w, height, 1]}>
      <spriteMaterial map={map} transparent alphaTest={0.18} depthWrite toneMapped />
    </sprite>
  );
}

/** Deck officers. Concept crew, not a reconstruction of named historical persons. */
export function DeckCrew() {
  const { first, second } = useCrewMaps();
  return (
    <group>
      <Figure map={first} position={[1.58, DECK_Y + 1.12, -1.55]} height={2.24} />
      <Figure map={second} position={[1.48, DECK_Y + 1.06, 1.05]} height={2.12} />
    </group>
  );
}

/** Chart-room seats, left 大副 / right 二副. */
export function CabinCrew() {
  const { first, second } = useCrewMaps();
  const z = STERN_HALL.z - 0.58;
  return (
    <group>
      <Figure map={first} position={[-0.72, DECK_Y + 0.64, z]} height={0.98} />
      <Figure map={second} position={[0.72, DECK_Y + 0.62, z]} height={0.94} />
    </group>
  );
}
