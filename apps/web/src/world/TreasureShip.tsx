import { useMemo } from 'react';
import * as THREE from 'three';

/** Conceptual 宝船. Not a historical reconstruction. Local bow = -z. L:B:mast = 4:1:2.5 */

export const SHIP_L = 20;
export const SHIP_B = 5;
const DECK_Y = 1.85;
const MAST_ABOVE_DECK = SHIP_B * 2.5;

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
}: {
  z: number;
  h: number;
  sailW: number;
  sailH: number;
  sail: THREE.Material;
  shade: THREE.Material;
  trim: THREE.Material;
  hull: THREE.Material;
}) {
  const sailY = DECK_Y + h * 0.52;
  const battens = [0.1, 0.28, 0.46, 0.64, 0.82];
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, DECK_Y + h / 2, 0]} material={hull} castShadow>
        <cylinderGeometry args={[0.09, 0.14, h, 8]} />
      </mesh>
      <mesh position={[0, DECK_Y + h + 0.12, 0]} material={trim}>
        <sphereGeometry args={[0.13, 8, 8]} />
      </mesh>
      {sailW > 0 && (
        <>
          <mesh position={[0, sailY, -0.1]} material={sail} castShadow>
            <planeGeometry args={[sailW, sailH]} />
          </mesh>
          {battens.map((t) => (
            <mesh key={t} position={[0, sailY - sailH / 2 + sailH * t, -0.12]} material={shade}>
              <boxGeometry args={[sailW + 0.12, 0.05, 0.05]} />
            </mesh>
          ))}
          <mesh position={[0, sailY + sailH / 2 + 0.06, -0.12]} material={trim}>
            <boxGeometry args={[sailW + 0.16, 0.07, 0.07]} />
          </mesh>
        </>
      )}
    </group>
  );
}

export function TreasureShip() {
  const M = useMemo(() => {
    const hull = mat(cssColor('--cv-ship-hull', '#2a211c'), { roughness: 0.78 });
    const deck = mat(cssColor('--cv-ship-hull-light', '#3b2f26'), { roughness: 0.85 });
    const lacquer = mat(cssColor('--cv-ship-lacquer', '#b6452c'), { roughness: 0.52, metalness: 0.1 });
    const trim = mat(cssColor('--cv-ship-trim', '#c9a15a'), { roughness: 0.32, metalness: 0.7 });
    const sail = mat(cssColor('--cv-ship-sail', '#e8dcc6'), { roughness: 0.92, side: THREE.DoubleSide, metalness: 0 });
    const shade = mat(cssColor('--cv-ship-sail-shade', '#cdb994'), { roughness: 0.85 });
    const eye = mat(cssColor('--cv-ship-eye', '#f3ebdd'), { roughness: 0.4, metalness: 0.15, side: THREE.DoubleSide });
    const pupil = mat(cssColor('--cv-ship-eye-pupil', '#14100d'), { roughness: 0.5, side: THREE.DoubleSide });
    const banner = mat(cssColor('--cv-ship-banner', '#c9a15a'), { roughness: 0.7, side: THREE.DoubleSide });
    return { hull, deck, lacquer, trim, sail, shade, eye, pupil, banner };
  }, []);

  const half = SHIP_L / 2;
  const mainH = MAST_ABOVE_DECK;
  const masts = [
    { z: -7.4, h: mainH * 0.62, sailW: 2.4, sailH: 3.4 },
    { z: -5.2, h: mainH * 0.78, sailW: 3.2, sailH: 4.4 },
    { z: -2.8, h: mainH * 0.92, sailW: 3.8, sailH: 5.4 },
    { z: -0.9, h: mainH, sailW: 4.4, sailH: 6.2 },
    { z: 1.4, h: mainH * 0.8, sailW: 3.2, sailH: 4.2 },
    { z: 3.2, h: mainH * 0.58, sailW: 2.2, sailH: 3.0 },
    { z: 4.4, h: mainH * 0.42, sailW: 0, sailH: 0 },
  ];

  return (
    <group>
      {/* hull, square transom at +z */}
      <mesh position={[0, 0.45, 0]} material={M.hull} castShadow receiveShadow>
        <boxGeometry args={[SHIP_B * 0.72, 0.9, SHIP_L * 0.92]} />
      </mesh>
      <mesh position={[0, 1.15, 0]} material={M.hull} castShadow>
        <boxGeometry args={[SHIP_B, 0.7, SHIP_L * 0.96]} />
      </mesh>
      <mesh position={[0, DECK_Y, 0]} material={M.deck} receiveShadow>
        <boxGeometry args={[SHIP_B + 0.15, 0.18, SHIP_L]} />
      </mesh>
      {/* 方形平艉 */}
      <mesh position={[0, 1.2, half - 0.08]} material={M.hull} castShadow>
        <boxGeometry args={[SHIP_B * 0.98, 2.2, 0.22]} />
      </mesh>
      {/* 艏楼 前 1/10，一层低矮 */}
      <mesh position={[0, DECK_Y + 0.55, -half + SHIP_L * 0.06]} material={M.lacquer} castShadow>
        <boxGeometry args={[SHIP_B * 0.62, 1.1, SHIP_L * 0.1]} />
      </mesh>
      {/* 船眼 白底墨瞳，不发光 */}
      <mesh position={[SHIP_B * 0.38, 1.55, -half + 1.35]} rotation={[0, Math.PI / 2, 0]} material={M.eye}>
        <circleGeometry args={[0.28, 16]} />
      </mesh>
      <mesh position={[SHIP_B * 0.382, 1.55, -half + 1.35]} rotation={[0, Math.PI / 2, 0]} material={M.pupil}>
        <circleGeometry args={[0.11, 12]} />
      </mesh>
      <mesh position={[-SHIP_B * 0.38, 1.55, -half + 1.35]} rotation={[0, -Math.PI / 2, 0]} material={M.eye}>
        <circleGeometry args={[0.28, 16]} />
      </mesh>
      <mesh position={[-SHIP_B * 0.382, 1.55, -half + 1.35]} rotation={[0, -Math.PI / 2, 0]} material={M.pupil}>
        <circleGeometry args={[0.11, 12]} />
      </mesh>
      {/* 艉楼 后 1/4，三层后退 */}
      <mesh position={[0, DECK_Y + 1.15, half - SHIP_L * 0.145]} material={M.lacquer} castShadow>
        <boxGeometry args={[SHIP_B * 0.92, 2.3, SHIP_L * 0.24]} />
      </mesh>
      <mesh position={[0, DECK_Y + 2.7, half - SHIP_L * 0.125]} material={M.lacquer} castShadow>
        <boxGeometry args={[SHIP_B * 0.78, 1.5, SHIP_L * 0.18]} />
      </mesh>
      <mesh position={[0, DECK_Y + 3.85, half - SHIP_L * 0.11]} material={M.lacquer} castShadow>
        <boxGeometry args={[SHIP_B * 0.62, 1.15, SHIP_L * 0.13]} />
      </mesh>
      <mesh position={[0, DECK_Y + 4.5, half - SHIP_L * 0.11]} material={M.trim}>
        <boxGeometry args={[SHIP_B * 0.66, 0.1, SHIP_L * 0.14]} />
      </mesh>
      {/* 栏杆 */}
      <mesh position={[SHIP_B * 0.5, DECK_Y + 0.28, 0]} material={M.lacquer}>
        <boxGeometry args={[0.06, 0.42, SHIP_L * 0.9]} />
      </mesh>
      <mesh position={[-SHIP_B * 0.5, DECK_Y + 0.28, 0]} material={M.lacquer}>
        <boxGeometry args={[0.06, 0.42, SHIP_L * 0.9]} />
      </mesh>
      {/* 大舵 */}
      <mesh position={[0, 0.2, half + 0.55]} material={M.hull} castShadow>
        <boxGeometry args={[0.16, 2.4, 1.3]} />
      </mesh>
      <mesh position={[0, 1.6, half + 0.2]} material={M.trim}>
        <cylinderGeometry args={[0.08, 0.08, 2.2, 8]} />
      </mesh>
      {masts.map((m) => (
        <Mast key={m.z} {...m} sail={M.sail} shade={M.shade} trim={M.trim} hull={M.hull} />
      ))}
      <mesh position={[0.85, DECK_Y + mainH - 0.4, -0.9]} material={M.banner}>
        <planeGeometry args={[1.2, 2.0]} />
      </mesh>
    </group>
  );
}
