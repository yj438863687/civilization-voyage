import { useMemo } from 'react';
import * as THREE from 'three';
import { STERN_HALL } from './hull';
import { SeaChart } from './chart';

function cssColor(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/**
 * 驾驶舱内景：自成一间的舱室，不依赖船体外壳。
 * 驾驶舱模式下船体隐藏，这间房单独渲染，镜头才能稳定坐在桌后。
 * 概念设计，不是考古复原。
 */
export function Cabin({ struck = [], sceneId }: { struck?: string[]; sceneId?: string }) {
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
      color: cssColor('--cv-surface-paper', '#f3ebdd'),
      roughness: 0.94,
    });
    const brass = new THREE.MeshStandardMaterial({
      color: cssColor('--cv-ship-trim', '#c9a15a'),
      roughness: 0.34,
      metalness: 0.68,
    });
    const lacquer = new THREE.MeshStandardMaterial({
      color: cssColor('--cv-ship-lacquer', '#b6452c'),
      roughness: 0.5,
      metalness: 0.1,
    });
    const lamp = new THREE.MeshStandardMaterial({
      color: cssColor('--cv-ship-lamp-core', '#ffd9a0'),
      emissive: cssColor('--cv-ship-lamp-warm', '#f0b46a'),
      emissiveIntensity: 2.2,
      toneMapped: false,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: '#dce6eb',
      emissive: cssColor('--cv-ship-lamp-cool', '#8fb6c8'),
      emissiveIntensity: 0.1,
      transparent: true,
      opacity: 0.08,
      roughness: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    return { wood, floor, paper, brass, lacquer, lamp, glass };
  }, []);

  const { z, w, d, h, wall, winW, winH, winY, floorY } = STERN_HALL;
  const topY = floorY + h;
  const frontZ = z - d / 2;
  const backZ = z + d / 2;
  const tableTop = floorY + 0.46;
  const tableZ = z - 1.55;
  const sideW = (w - winW) / 2;

  return (
    <group>
      {/* 地板：横向板条 */}
      <mesh position={[0, floorY - 0.03, z]} material={M.floor} receiveShadow>
        <boxGeometry args={[w, 0.06, d]} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={`f${i}`} position={[0, floorY + 0.005, frontZ + 0.4 + (i * (d - 0.8)) / 6]} material={M.wood}>
          <boxGeometry args={[w - 0.1, 0.012, 0.035]} />
        </mesh>
      ))}

      {/* 天花 + 两道横梁 */}
      <mesh position={[0, topY + 0.04, z]} material={M.wood}>
        <boxGeometry args={[w, 0.08, d]} />
      </mesh>
      {[z - d * 0.18, z + d * 0.22].map((bz) => (
        <mesh key={bz} position={[0, topY - 0.06, bz]} material={M.lacquer}>
          <boxGeometry args={[w, 0.12, 0.14]} />
        </mesh>
      ))}

      {/* 前壁：窗洞四周 + 两根竖棂，分成三扇 */}
      <mesh position={[-(winW / 2 + sideW / 2), (floorY + topY) / 2, frontZ]} material={M.wood} receiveShadow>
        <boxGeometry args={[sideW, h, wall]} />
      </mesh>
      <mesh position={[winW / 2 + sideW / 2, (floorY + topY) / 2, frontZ]} material={M.wood} receiveShadow>
        <boxGeometry args={[sideW, h, wall]} />
      </mesh>
      <mesh position={[0, (floorY + winY - winH / 2) / 2, frontZ]} material={M.wood}>
        <boxGeometry args={[winW, Math.max(0.06, winY - winH / 2 - floorY), wall]} />
      </mesh>
      <mesh position={[0, (winY + winH / 2 + topY) / 2, frontZ]} material={M.lacquer}>
        <boxGeometry args={[winW, Math.max(0.06, topY - (winY + winH / 2)), wall]} />
      </mesh>
      {[-winW / 6, winW / 6].map((mx) => (
        <mesh key={mx} position={[mx, winY, frontZ]} material={M.brass}>
          <boxGeometry args={[0.05, winH, wall * 1.2]} />
        </mesh>
      ))}
      <mesh position={[0, winY - winH / 2, frontZ + 0.04]} material={M.brass}>
        <boxGeometry args={[winW, 0.07, 0.1]} />
      </mesh>
      <mesh position={[0, winY + winH / 2, frontZ + 0.04]} material={M.brass}>
        <boxGeometry args={[winW, 0.06, 0.1]} />
      </mesh>
      <mesh position={[0, winY, frontZ - 0.005]} material={M.glass}>
        <planeGeometry args={[winW, winH]} />
      </mesh>

      {/* 后壁、左右壁：左壁留舱门 */}
      <mesh position={[0, (floorY + topY) / 2, backZ]} material={M.wood} receiveShadow>
        <boxGeometry args={[w, h, wall]} />
      </mesh>
      <mesh position={[-w / 2, (floorY + topY) / 2, z + d * 0.18]} material={M.wood} receiveShadow>
        <boxGeometry args={[wall, h, d * 0.62]} />
      </mesh>
      <mesh position={[-w / 2, (floorY + topY) / 2, z - d * 0.33]} material={M.wood} receiveShadow>
        <boxGeometry args={[wall, h, d * 0.32]} />
      </mesh>
      <mesh position={[w / 2, (floorY + topY) / 2, z]} material={M.wood} receiveShadow>
        <boxGeometry args={[wall, h, d]} />
      </mesh>
      {/* 舱门：左舷后侧的一道暗口，门框朱漆 */}
      <mesh position={[-w / 2 + 0.02, floorY + h * 0.36, z - d * 0.14]} material={M.lacquer}>
        <boxGeometry args={[0.06, h * 0.72, 0.06]} />
      </mesh>

      {/* 海图桌 */}
      <mesh position={[0, tableTop, tableZ]} material={M.wood} receiveShadow castShadow>
        <boxGeometry args={[w * 0.46, 0.08, d * 0.34]} />
      </mesh>
      <mesh position={[0, tableTop + 0.055, tableZ]} material={M.brass}>
        <boxGeometry args={[w * 0.46 + 0.06, 0.02, d * 0.34 + 0.06]} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[(sx * w * 0.62) / 2 - sx * 0.08, (floorY + tableTop) / 2, tableZ]} material={M.wood}>
          <boxGeometry args={[0.08, tableTop - floorY, d * 0.3]} />
        </mesh>
      ))}
      {/* 摊开的海图：四段共用这一张，每段添一笔 */}
      <group position={[0, tableTop + 0.075, tableZ - 0.05]}>
        <SeaChart struck={struck} activeEpoch={sceneId ?? ''} width={w * 0.4} height={d * 0.3} />
      </group>
      {/* 罗盘 */}
      <mesh position={[w * 0.19, tableTop + 0.08, tableZ + 0.35]} material={M.brass}>
        <cylinderGeometry args={[0.12, 0.12, 0.03, 16]} />
      </mesh>
      {/* 桌上灯：唯一暖光源 */}
      <group position={[-w * 0.2, tableTop + 0.08, tableZ + 0.4]}>
        <mesh position={[0, 0.04, 0]} material={M.brass}>
          <cylinderGeometry args={[0.07, 0.09, 0.08, 12]} />
        </mesh>
        <mesh position={[0, 0.2, 0]} material={M.brass}>
          <cylinderGeometry args={[0.02, 0.03, 0.24, 8]} />
        </mesh>
        <mesh position={[0, 0.36, 0]} material={M.lamp}>
          <sphereGeometry args={[0.055, 12, 12]} />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <sphereGeometry args={[0.14, 10, 10]} />
          <meshBasicMaterial color={cssColor('--cv-ship-lamp-warm', '#f0b46a')} transparent opacity={0.1} depthWrite={false} />
        </mesh>
      </group>
      <pointLight
        position={[0, tableTop + 0.75, tableZ + 0.35]}
        color={cssColor('--cv-ship-lamp-warm', '#f0b46a')}
        intensity={1.15}
        distance={6.5}
        decay={2}
      />
      {/* 从舷窗透进来的冷光 */}
      <pointLight
        position={[0, winY + 0.1, frontZ - 0.6]}
        color={cssColor('--cv-scene-light', '#f1d9a8')}
        intensity={0.55}
        distance={8}
        decay={2}
      />

      {/* 座位：一张矮凳 */}
      <mesh position={[0, floorY + 0.3, STERN_HALL.seatZ]} material={M.wood}>
        <boxGeometry args={[0.8, 0.6, 0.5]} />
      </mesh>
    </group>
  );
}
