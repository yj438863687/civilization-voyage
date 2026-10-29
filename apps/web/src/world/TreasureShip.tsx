import { useMemo } from 'react';
import * as THREE from 'three';
import { bentSail, buildHullGeometry, DECK_Y, SHIP_B, SHIP_L, STERN_HALL } from './hull';

export { SHIP_L, SHIP_B };

function cssColor(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function mat(color: string, extra?: THREE.MeshStandardMaterialParameters) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.08, ...extra });
}

function Mast({
  z,
  h,
  sailW,
  sailH,
  sail,
  shade,
  trim,
  hull,
  sailGeo,
}: {
  z: number;
  h: number;
  sailW: number;
  sailH: number;
  sail: THREE.Material;
  shade: THREE.Material;
  trim: THREE.Material;
  hull: THREE.Material;
  sailGeo: THREE.BufferGeometry;
}) {
  const sailY = DECK_Y + h * 0.52;
  const battens = [0.1, 0.28, 0.46, 0.64, 0.82];
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, DECK_Y + h / 2, 0]} material={hull} castShadow>
        <cylinderGeometry args={[0.08, 0.13, h, 8]} />
      </mesh>
      <mesh position={[0, DECK_Y + h + 0.12, 0]} material={trim}>
        <sphereGeometry args={[0.12, 8, 8]} />
      </mesh>
      {sailW > 0 && (
        <>
          <mesh position={[0, sailY, -0.08]} rotation={[0, Math.PI, 0]} material={sail} geometry={sailGeo} />
          {battens.map((t) => (
            <mesh key={t} position={[0, sailY - sailH / 2 + sailH * t, 0.02]} material={shade}>
              <boxGeometry args={[sailW + 0.12, 0.045, 0.05]} />
            </mesh>
          ))}
          <mesh position={[0, sailY + sailH / 2 + 0.06, 0.02]} material={trim}>
            <boxGeometry args={[sailW + 0.16, 0.06, 0.06]} />
          </mesh>
        </>
      )}
    </group>
  );
}

function WallBox({
  pos,
  size,
  material,
}: {
  pos: [number, number, number];
  size: [number, number, number];
  material: THREE.Material;
}) {
  return (
    <mesh position={pos} material={material} castShadow receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}

function SternHall({ lacquer }: { lacquer: THREE.Material }) {
  const { w, d, h, z, wall, winW, winH, winY } = STERN_HALL;
  const yMid = DECK_Y + h / 2;
  const y0 = DECK_Y;
  const y1 = DECK_Y + h;
  const frontZ = z - d / 2 + wall / 2;
  const backZ = z + d / 2 - wall / 2;
  const side = (w - winW) / 2;
  const winBot = winY - winH / 2;
  const winTop = winY + winH / 2;
  return (
    <group>
      <WallBox pos={[-(winW / 2 + side / 2), yMid, frontZ]} size={[side, h, wall]} material={lacquer} />
      <WallBox pos={[winW / 2 + side / 2, yMid, frontZ]} size={[side, h, wall]} material={lacquer} />
      <WallBox pos={[0, (y0 + winBot) / 2, frontZ]} size={[winW, Math.max(0.08, winBot - y0), wall]} material={lacquer} />
      <WallBox pos={[0, (winTop + y1) / 2, frontZ]} size={[winW, Math.max(0.08, y1 - winTop), wall]} material={lacquer} />
      <WallBox pos={[0, yMid, backZ]} size={[w, h, wall]} material={lacquer} />
      <WallBox pos={[-w / 2 + wall / 2, yMid, z]} size={[wall, h, d]} material={lacquer} />
      <WallBox pos={[w / 2 - wall / 2, yMid, z]} size={[wall, h, d]} material={lacquer} />
    </group>
  );
}

function Roof({ w, d, y, z, trim }: { w: number; d: number; y: number; z: number; trim: THREE.Material }) {
  return (
    <group position={[0, y, z]}>
      <mesh rotation={[0.18, 0, 0]} material={trim} castShadow>
        <boxGeometry args={[w + 0.28, 0.08, d + 0.32]} />
      </mesh>
      <mesh position={[0, 0.22, 0]} material={trim}>
        <boxGeometry args={[0.08, 0.28, d * 0.7]} />
      </mesh>
    </group>
  );
}

function Lantern({ position, trim, glow }: { position: [number, number, number]; trim: THREE.Material; glow: THREE.Material }) {
  return (
    <group position={position}>
      <mesh material={glow}>
        <sphereGeometry args={[0.11, 8, 8]} />
      </mesh>
      <mesh position={[0, 0.14, 0]} material={trim}>
        <boxGeometry args={[0.16, 0.05, 0.16]} />
      </mesh>
    </group>
  );
}

export function TreasureShip() {
  const M = useMemo(() => {
    const hull = mat(cssColor('--cv-ship-hull', '#2a211c'), { roughness: 0.78 });
    const deck = mat(cssColor('--cv-ship-hull-light', '#3b2f26'), { roughness: 0.85 });
    const lacquer = mat(cssColor('--cv-ship-lacquer', '#b6452c'), { roughness: 0.52, metalness: 0.1 });
    const trim = mat(cssColor('--cv-ship-trim', '#c9a15a'), { roughness: 0.32, metalness: 0.7 });
    const sail = mat(cssColor('--cv-ship-sail', '#e8dcc6'), {
      roughness: 1,
      side: THREE.DoubleSide,
      metalness: 0,
      emissive: cssColor('--cv-ship-sail', '#e8dcc6'),
      emissiveIntensity: 0.28,
    });
    const shade = mat(cssColor('--cv-ship-sail-shade', '#cdb994'), { roughness: 0.85 });
    const eye = mat(cssColor('--cv-ship-eye', '#f3ebdd'), { roughness: 0.4, metalness: 0.15, side: THREE.DoubleSide });
    const pupil = mat(cssColor('--cv-ship-eye-pupil', '#14100d'), { roughness: 0.5, side: THREE.DoubleSide });
    const banner = mat(cssColor('--cv-ship-banner', '#c9a15a'), { roughness: 0.7, side: THREE.DoubleSide });
    const glow = new THREE.MeshStandardMaterial({
      color: cssColor('--cv-ship-lamp-core', '#ffd9a0'),
      emissive: cssColor('--cv-ship-lamp-warm', '#f0b46a'),
      emissiveIntensity: 2.0,
      roughness: 0.35,
    });
    return { hull, deck, lacquer, trim, sail, shade, eye, pupil, banner, glow };
  }, []);

  const hullGeo = useMemo(() => buildHullGeometry(), []);
  const half = SHIP_L / 2;
  const mainH = SHIP_B * 2.5;
  const masts = [
    { z: -7.4, h: mainH * 0.62, sailW: 2.4, sailH: 3.4, curve: 0.28 },
    { z: -5.2, h: mainH * 0.78, sailW: 3.2, sailH: 4.4, curve: 0.34 },
    { z: -2.8, h: mainH * 0.92, sailW: 3.8, sailH: 5.4, curve: 0.4 },
    { z: -0.9, h: mainH, sailW: 4.4, sailH: 6.2, curve: 0.45 },
    { z: 1.4, h: mainH * 0.8, sailW: 3.2, sailH: 4.2, curve: 0.32 },
    { z: 3.2, h: mainH * 0.58, sailW: 2.2, sailH: 3.0, curve: 0.24 },
    { z: 4.4, h: mainH * 0.42, sailW: 0, sailH: 0, curve: 0 },
  ];
  const sailGeos = useMemo(
    () => masts.map((m) => (m.sailW > 0 ? bentSail(m.sailW, m.sailH, m.curve) : new THREE.BufferGeometry())),
    [],
  );

  const ribs = [];
  for (let i = 1; i < 12; i++) {
    const z = -half + (SHIP_L * i) / 12;
    ribs.push(z);
  }

  return (
    <group>
      <mesh geometry={hullGeo} material={M.hull} castShadow receiveShadow />
      {ribs.map((z) => (
        <mesh key={z} position={[0, 0.85, z]} material={M.hull}>
          <boxGeometry args={[SHIP_B * 1.02, 0.04, 0.05]} />
        </mesh>
      ))}
      <mesh position={[0, 1.15, half - 0.04]} material={M.hull} castShadow>
        <boxGeometry args={[SHIP_B * 0.98, 2.15, 0.18]} />
      </mesh>
      <mesh position={[0, DECK_Y + 0.5, -half + SHIP_L * 0.07]} material={M.lacquer} castShadow>
        <boxGeometry args={[SHIP_B * 0.58, 1.0, SHIP_L * 0.1]} />
      </mesh>
      <mesh position={[SHIP_B * 0.36, 1.42, -half + 1.15]} rotation={[0, Math.PI / 2, 0]} material={M.eye}>
        <circleGeometry args={[0.3, 16]} />
      </mesh>
      <mesh position={[SHIP_B * 0.362, 1.42, -half + 1.15]} rotation={[0, Math.PI / 2, 0]} material={M.pupil}>
        <circleGeometry args={[0.12, 12]} />
      </mesh>
      <mesh position={[-SHIP_B * 0.36, 1.42, -half + 1.15]} rotation={[0, -Math.PI / 2, 0]} material={M.eye}>
        <circleGeometry args={[0.3, 16]} />
      </mesh>
      <mesh position={[-SHIP_B * 0.362, 1.42, -half + 1.15]} rotation={[0, -Math.PI / 2, 0]} material={M.pupil}>
        <circleGeometry args={[0.12, 12]} />
      </mesh>
      <SternHall lacquer={M.lacquer} />
      <Roof w={SHIP_B * 0.92} d={SHIP_L * 0.24} y={DECK_Y + 2.45} z={half - SHIP_L * 0.145} trim={M.trim} />
      <mesh position={[0, DECK_Y + 2.85, half - SHIP_L * 0.12]} material={M.lacquer} castShadow>
        <boxGeometry args={[SHIP_B * 0.74, 1.45, SHIP_L * 0.17]} />
      </mesh>
      <Roof w={SHIP_B * 0.74} d={SHIP_L * 0.17} y={DECK_Y + 3.62} z={half - SHIP_L * 0.12} trim={M.trim} />
      <mesh position={[0, DECK_Y + 4.05, half - SHIP_L * 0.105]} material={M.lacquer} castShadow>
        <boxGeometry args={[SHIP_B * 0.56, 1.1, SHIP_L * 0.12]} />
      </mesh>
      <Roof w={SHIP_B * 0.56} d={SHIP_L * 0.12} y={DECK_Y + 4.65} z={half - SHIP_L * 0.105} trim={M.trim} />
      <mesh position={[SHIP_B * 0.5, DECK_Y + 0.3, 0]} material={M.lacquer}>
        <boxGeometry args={[0.06, 0.46, SHIP_L * 0.88]} />
      </mesh>
      <mesh position={[-SHIP_B * 0.5, DECK_Y + 0.3, 0]} material={M.lacquer}>
        <boxGeometry args={[0.06, 0.46, SHIP_L * 0.88]} />
      </mesh>
      <mesh position={[0, 0.15, half + 0.6]} material={M.hull} castShadow>
        <boxGeometry args={[0.18, 2.5, 1.4]} />
      </mesh>
      <mesh position={[0, 1.55, half + 0.18]} material={M.trim}>
        <cylinderGeometry args={[0.07, 0.07, 2.3, 8]} />
      </mesh>
      {masts.map((m, i) => (
        <Mast key={m.z} {...m} sail={M.sail} shade={M.shade} trim={M.trim} hull={M.hull} sailGeo={sailGeos[i]} />
      ))}
      <mesh position={[0.9, DECK_Y + mainH - 0.5, -0.9]} material={M.banner}>
        <planeGeometry args={[1.15, 2.1]} />
      </mesh>
      <Lantern position={[SHIP_B * 0.38, DECK_Y + 2.5, half - SHIP_L * 0.08]} trim={M.trim} glow={M.glow} />
      <Lantern position={[-SHIP_B * 0.38, DECK_Y + 2.5, half - SHIP_L * 0.08]} trim={M.trim} glow={M.glow} />
      <Lantern position={[0, DECK_Y + 4.9, half - SHIP_L * 0.1]} trim={M.trim} glow={M.glow} />
      <Lantern position={[SHIP_B * 0.22, DECK_Y + 1.15, -half + 1.6]} trim={M.trim} glow={M.glow} />
      <pointLight position={[0, DECK_Y + 3.2, half - 2]} color={cssColor('--cv-ship-lamp-warm', '#f0b46a')} intensity={2.6} distance={24} decay={2} />
      <pointLight position={[0, 2.2, -half + 2]} color={cssColor('--cv-ship-lamp-warm', '#f0b46a')} intensity={1.0} distance={14} decay={2} />
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
        <circleGeometry args={[SHIP_B * 0.85, 20]} />
        <meshBasicMaterial color="#061014" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.55, 0]} rotation={[0, 0, 0]} renderOrder={1}>
        <cylinderGeometry args={[SHIP_B * 1.15, SHIP_B * 1.35, 1.0, 16, 1, true]} />
        <meshBasicMaterial color={cssColor('--cv-scene-fog', '#24343c')} transparent opacity={0.28} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.9, half - SHIP_L * 0.12]} renderOrder={2}>
        <planeGeometry args={[0.18, 2.2]} />
        <meshBasicMaterial color={cssColor('--cv-ship-lamp-warm', '#f0b46a')} transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
