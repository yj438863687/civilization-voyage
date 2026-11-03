import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { waterLive, type WaterSpec } from './waterGame';

/**
 * 水上玩法的样子：浮标门、光环、漂着的东西。
 * 它们读 waterLive 来决定自己亮不亮、还在不在。
 */

function makeLabel(text: string, sub = '', warm = true) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = sub ? 160 : 112;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(18,16,12,0.78)';
  g.fillRect(8, 8, 496, c.height - 16);
  g.strokeStyle = warm ? 'rgba(201,161,90,0.9)' : 'rgba(224,122,98,0.9)';
  g.lineWidth = 4;
  g.strokeRect(10, 10, 492, c.height - 20);
  g.fillStyle = '#f6efe0';
  g.font = '600 46px "Noto Serif SC", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text.slice(0, 10), 256, sub ? 56 : 56);
  if (sub) {
    g.fillStyle = 'rgba(232,226,210,0.75)';
    g.font = '26px "Noto Sans SC", sans-serif';
    g.fillText(sub.slice(0, 18), 256, 114);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return { map: t, aspect: c.width / c.height };
}

function Label({ text, sub, y = 3.2, w = 5, warm = true }: { text: string; sub?: string; y?: number; w?: number; warm?: boolean }) {
  const { map, aspect } = useMemo(() => makeLabel(text, sub, warm), [text, sub, warm]);
  return (
    <sprite position={[0, y, 0]} scale={[w, w / aspect, 1]}>
      <spriteMaterial map={map} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

function Buoy({ color = '#f0d59a' }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.35, 0.45, 1.2, 10]} />
        <meshStandardMaterial color="#2a2118" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 1.2, 6]} />
        <meshStandardMaterial color="#2a2118" />
      </mesh>
      <mesh position={[0, 2.3, 0]}>
        <sphereGeometry args={[0.24, 10, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function WaterGameScene({ spec, reduceMotion }: { spec: WaterSpec; reduceMotion: boolean }) {
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const fill = useRef<THREE.Mesh>(null);
  const drops = useRef<THREE.Group>(null);
  const gatesRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ringMat.current) ringMat.current.opacity = waterLive.inside ? 0.75 : 0.35 + (reduceMotion ? 0 : Math.sin(t * 2) * 0.1);
    if (fill.current && spec.ring) {
      const k = Math.min(1, waterLive.insideSec / spec.ring.secs);
      fill.current.scale.setScalar(Math.max(0.01, k));
      (fill.current.material as THREE.MeshBasicMaterial).opacity = 0.18 + k * 0.3;
    }
    drops.current?.children.forEach((g, i) => {
      const d = spec.drops?.[i];
      if (!d) return;
      g.visible = !waterLive.taken.has(d.id);
      if (!reduceMotion) g.position.y = Math.sin(t * 1.4 + i) * 0.08;
      g.rotation.y = t * 0.3 + i;
    });
    gatesRef.current?.children.forEach((g, i) => {
      // 门过了就灭
      g.visible = !(waterLive.done && spec.gates && spec.gates[i] && false);
    });
  });

  return (
    <group>
      {spec.kind === 'gates' && (
        <group ref={gatesRef}>
          {spec.gates!.map((gt, i) => {
            // 门的朝向：正对另一道门的垂线，船从两门之间的方向开来
            const other = spec.gates![(i + 1) % spec.gates!.length];
            const yaw = Math.atan2(other.x - gt.x, other.z - gt.z) + Math.PI / 2;
            return (
              <group key={i} position={[gt.x, 0, gt.z]} rotation={[0, yaw, 0]}>
                <group position={[-2.4, 0, 0]}>
                  <Buoy />
                </group>
                <group position={[2.4, 0, 0]}>
                  <Buoy />
                </group>
                {/* 门槛：水面上一道光 */}
                <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[4.6, 1.2]} />
                  <meshBasicMaterial color="#f0d59a" transparent opacity={0.35} depthWrite={false} />
                </mesh>
                <Label text={gt.label} sub={gt.note} y={4.2} w={6.5} />
              </group>
            );
          })}
        </group>
      )}
      {spec.kind === 'ring' && spec.ring && (
        <group position={[spec.ring.x, 0, spec.ring.z]}>
          <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[spec.ring.r - 0.25, spec.ring.r + 0.25, 48]} />
            <meshBasicMaterial ref={ringMat} color="#f0d59a" transparent opacity={0.4} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh ref={fill} position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[spec.ring.r - 0.3, 40]} />
            <meshBasicMaterial color="#f0d59a" transparent opacity={0.2} depthWrite={false} />
          </mesh>
          <Label text={spec.ring.label} sub="把船停在圈里" y={3.6} w={6} />
        </group>
      )}
      {spec.kind === 'catch' && (
        <group ref={drops}>
          {spec.drops!.map((d) => (
            <group key={d.id} position={[d.x, 0, d.z]}>
              <mesh position={[0, 0.5, 0]}>
                {d.good ? <icosahedronGeometry args={[0.55, 0]} /> : <dodecahedronGeometry args={[0.6, 0]} />}
                <meshStandardMaterial
                  color={d.good ? '#f0d59a' : '#7a3a2e'}
                  emissive={d.good ? '#ffcf8a' : '#c2604a'}
                  emissiveIntensity={d.good ? 1.2 : 0.8}
                  toneMapped={false}
                  flatShading
                />
              </mesh>
              <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.9, 1.2, 24]} />
                <meshBasicMaterial color={d.good ? '#f0d59a' : '#e07a62'} transparent opacity={0.3} depthWrite={false} />
              </mesh>
              <Label text={d.label} y={2.2} w={2.6} warm={d.good} />
            </group>
          ))}
        </group>
      )}
    </group>
  );
}
