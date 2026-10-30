import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import type { PortPlace, WorldConfig } from './world.config';
import { FAR_LAMPS, PORT_LAMP_SHAPES } from './voyageConstants';

function cssVar(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function hex(name: string, fallback: string) {
  return new THREE.Color(cssVar(name, fallback));
}

/** three.js examples Water + MIT waternormals (mrdoob/three.js r170). Night 墨海 tint via --cv-scene-water. */
function HarborWater({ reduceMotion, sceneId }: { reduceMotion: boolean; sceneId: string }) {
  const normals = useTexture('/textures/waternormals.jpg');
  const water = useMemo(() => {
    normals.wrapS = normals.wrapT = THREE.RepeatWrapping;
    normals.anisotropy = 8;
    const mesh = new Water(new THREE.PlaneGeometry(220, 220), {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: normals,
      sunDirection: new THREE.Vector3(0.18, 0.78, 0.42).normalize(),
      sunColor: hex('--cv-scene-light', '#f1d9a8').multiplyScalar(0.42),
      waterColor: hex('--cv-scene-water', '#123039').multiplyScalar(0.55),
      distortionScale: 2.2,
      fog: true,
    });
    mesh.rotation.x = -Math.PI / 2;
    mesh.material.uniforms.size.value = 3.2;
    return mesh;
  }, [normals]);

  useEffect(() => {
    water.material.uniforms.waterColor.value.copy(hex('--cv-scene-water', '#123039').multiplyScalar(0.55));
    water.material.uniforms.sunColor.value.copy(hex('--cv-scene-light', '#f1d9a8').multiplyScalar(0.42));
  }, [sceneId, water]);

  useFrame((_, dt) => {
    water.material.uniforms.time.value += reduceMotion ? dt * 0.12 : dt;
    water.material.uniforms.distortionScale.value = reduceMotion ? 0.8 : 2.6;
  });

  return <primitive object={water} />;
}

function WaterFallback() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
      <planeGeometry args={[220, 220]} />
      <meshBasicMaterial color={hex('--cv-scene-water', '#123039')} />
    </mesh>
  );
}

function LampHead({ shape, core, lamp }: { shape: 'sphere' | 'box' | 'tube'; core: string; lamp: string }) {
  return (
    <mesh position={[0, 8.1, 0]}>
      {shape === 'box' ? (
        <boxGeometry args={[0.22, 0.22, 0.22]} />
      ) : shape === 'tube' ? (
        <cylinderGeometry args={[0.08, 0.08, 0.38, 8]} />
      ) : (
        <sphereGeometry args={[0.14, 8, 8]} />
      )}
      <meshStandardMaterial color={core} emissive={lamp} emissiveIntensity={1.55} toneMapped={false} />
    </mesh>
  );
}

function PortSilhouette({ port, sceneId }: { port: PortPlace; sceneId: string }) {
  const lamp = cssVar('--cv-ship-lamp-warm', '#f0b46a');
  const core = cssVar('--cv-ship-lamp-core', '#ffd9a0');
  const trim = cssVar('--cv-ship-trim', '#c9a15a');
  const kind = port.silhouette;
  const stone = kind === 'quanzhou' ? '#6d6458' : kind === 'container' ? '#4a5156' : kind === 'float' ? '#3d555c' : '#5c6164';
  const roof = kind === 'quanzhou' ? '#8a4a32' : kind === 'container' ? '#c56a2a' : kind === 'float' ? '#6aa8a0' : '#6a6e70';

  return (
    <group position={[port.x, 0, port.z]}>
      {kind === 'quanzhou' ? (
        <>
          <mesh position={[0, 0.42, 0]} receiveShadow>
            <boxGeometry args={[18, 0.84, 13]} />
            <meshStandardMaterial color={stone} roughness={0.94} />
          </mesh>
          <mesh position={[-3.2, 2.2, -2.6]} castShadow>
            <boxGeometry args={[6.4, 2.6, 4.2]} />
            <meshStandardMaterial color="#8f8678" roughness={0.88} />
          </mesh>
          <mesh position={[-3.2, 3.62, -2.6]} rotation={[0.18, 0, 0]} castShadow>
            <boxGeometry args={[7.0, 0.18, 4.8]} />
            <meshStandardMaterial color={roof} roughness={0.7} />
          </mesh>
          <mesh position={[4.4, 1.8, -2.1]} castShadow>
            <boxGeometry args={[4.6, 2.0, 3.4]} />
            <meshStandardMaterial color="#d8cfc0" roughness={0.82} />
          </mesh>
          <mesh position={[4.4, 2.95, -2.1]} rotation={[0.16, 0, 0]}>
            <boxGeometry args={[5.1, 0.14, 3.9]} />
            <meshStandardMaterial color={roof} roughness={0.68} />
          </mesh>
          <mesh position={[8.6, 0.22, 2.4]}>
            <boxGeometry args={[7.2, 0.32, 2.4]} />
            <meshStandardMaterial color="#5a5348" roughness={0.9} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0.2, 1.1 + i * 0.85, -5.4]} castShadow>
              <boxGeometry args={[1.6 - i * 0.28, 0.82, 1.6 - i * 0.28]} />
              <meshStandardMaterial color={i === 2 ? trim : '#7a5340'} roughness={0.6} />
            </mesh>
          ))}
        </>
      ) : kind === 'container' ? (
        <>
          <mesh position={[0, 0.38, 0]} receiveShadow>
            <boxGeometry args={[20, 0.76, 14]} />
            <meshStandardMaterial color="#3d4448" roughness={0.92} />
          </mesh>
          {[
            [-5.2, 0, -2.2, '#c56a2a'],
            [-5.2, 1.15, -2.2, '#3e5a72'],
            [-5.2, 2.3, -2.2, '#c56a2a'],
            [-2.4, 0, -2.2, '#4a6578'],
            [-2.4, 1.15, -2.2, '#c56a2a'],
            [0.4, 0, -2.4, '#3e5a72'],
            [0.4, 1.15, -2.4, '#4a6578'],
            [3.2, 0, -1.8, '#c56a2a'],
          ].map(([x, y, z, color], i) => (
            <mesh key={i} position={[x as number, 1.05 + (y as number), z as number]} castShadow>
              <boxGeometry args={[2.4, 1.1, 6.1]} />
              <meshStandardMaterial color={color as string} roughness={0.55} metalness={0.25} />
            </mesh>
          ))}
          <mesh position={[8.4, 6.2, -1]} castShadow>
            <boxGeometry args={[0.28, 12.2, 0.28]} />
            <meshStandardMaterial color="#2c3236" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[8.4, 6.2, 4.2]} castShadow>
            <boxGeometry args={[0.28, 12.2, 0.28]} />
            <meshStandardMaterial color="#2c3236" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[8.4, 12.2, 1.6]}>
            <boxGeometry args={[0.35, 0.28, 6.8]} />
            <meshStandardMaterial color="#c56a2a" roughness={0.45} metalness={0.4} />
          </mesh>
          <mesh position={[9.2, 0.2, 3.2]}>
            <boxGeometry args={[6.4, 0.28, 2.2]} />
            <meshStandardMaterial color="#2f3538" roughness={0.9} />
          </mesh>
        </>
      ) : kind === 'float' ? (
        <>
          {[
            [0, 0],
            [-6.4, 2.2],
            [6.2, 1.4],
            [-2.2, -4.6],
          ].map(([x, z], i) => (
            <group key={i} position={[x, 0, z]}>
              <mesh position={[0, 0.28, 0]} receiveShadow>
                <boxGeometry args={[5.6, 0.5, 4.4]} />
                <meshStandardMaterial color={stone} roughness={0.7} metalness={0.12} />
              </mesh>
              <mesh position={[0, 1.35, -0.4]} castShadow>
                <boxGeometry args={[3.2, 1.6, 2.4]} />
                <meshStandardMaterial color="#5d7a80" roughness={0.78} />
              </mesh>
              <mesh position={[0, 0.06, 0]}>
                <boxGeometry args={[6.0, 0.08, 4.8]} />
                <meshStandardMaterial color="#1a333a" roughness={0.9} />
              </mesh>
            </group>
          ))}
          <mesh position={[3.1, 0.42, 0.7]} rotation={[0, 0.3, 0]}>
            <boxGeometry args={[6.8, 0.12, 0.7]} />
            <meshStandardMaterial color="#6aa8a0" roughness={0.55} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 0.38, 0]} receiveShadow>
            <boxGeometry args={[17, 0.72, 12]} />
            <meshStandardMaterial color="#4a4036" roughness={0.9} />
          </mesh>
          <mesh position={[-2.6, 2.15, -2.8]} castShadow>
            <boxGeometry args={[7.2, 2.8, 4.4]} />
            <meshStandardMaterial color="#3a2f28" roughness={0.78} />
          </mesh>
          <mesh position={[-2.6, 3.7, -2.8]} rotation={[0.2, 0, 0]} castShadow>
            <boxGeometry args={[8.0, 0.16, 5.0]} />
            <meshStandardMaterial color="#8a4a32" roughness={0.62} />
          </mesh>
          <mesh position={[4.8, 1.55, -1.6]} castShadow>
            <boxGeometry args={[4.2, 1.7, 3.2]} />
            <meshStandardMaterial color="#5c4638" roughness={0.82} />
          </mesh>
          <mesh position={[4.8, 2.55, -1.6]} rotation={[0.14, 0, 0]}>
            <boxGeometry args={[4.7, 0.12, 3.6]} />
            <meshStandardMaterial color="#c9a15a" roughness={0.5} metalness={0.25} />
          </mesh>
          <mesh position={[8.8, 0.2, 2.6]}>
            <boxGeometry args={[7.6, 0.28, 2.6]} />
            <meshStandardMaterial color="#3d342c" roughness={0.88} />
          </mesh>
          <mesh position={[0.4, 5.4, -5.2]} castShadow>
            <cylinderGeometry args={[0.22, 0.32, 10.4, 8]} />
            <meshStandardMaterial color="#2c241e" roughness={0.7} />
          </mesh>
          <mesh position={[0.4, 10.7, -5.2]}>
            <sphereGeometry args={[0.55, 10, 10]} />
            <meshStandardMaterial color={core} emissive={lamp} emissiveIntensity={1.8} toneMapped={false} />
          </mesh>
          <mesh position={[0.4, 10.7, -5.2]}>
            <sphereGeometry args={[1.6, 12, 12]} />
            <meshBasicMaterial color={lamp} transparent opacity={0.12} depthWrite={false} />
          </mesh>
        </>
      )}
      {[-4, -1, 2, 5].map((x, i) => {
        const shape = PORT_LAMP_SHAPES[i] ?? 'sphere';
        const cool = sceneId === 'C' || sceneId === 'B';
        const lampCol = cool ? cssVar('--cv-ship-lamp-cool', '#8fb6c8') : lamp;
        const coreCol = cool ? '#d7eef4' : core;
        return (
          <group key={x} position={[x, 0, 4.5]}>
            <mesh position={[0, 4, 0]}>
              <cylinderGeometry args={[0.07, 0.09, 8, 6]} />
              <meshStandardMaterial color={trim} roughness={0.4} metalness={0.6} />
            </mesh>
            <LampHead shape={shape} core={coreCol} lamp={lampCol} />
          </group>
        );
      })}
      {Array.from({ length: FAR_LAMPS.count }, (_, i) => {
        const t = FAR_LAMPS.count === 1 ? 0.5 : i / (FAR_LAMPS.count - 1);
        const dist = FAR_LAMPS.distMin + (FAR_LAMPS.distMax - FAR_LAMPS.distMin) * t;
        const side = (i - (FAR_LAMPS.count - 1) / 2) * 6;
        const far = sceneId === 'C' ? cssVar('--cv-ship-lamp-cool', '#8fb6c8') : lamp;
        return (
          <mesh key={`far-${i}`} position={[side, 2.4, -dist]}>
            <sphereGeometry args={[FAR_LAMPS.radius, 8, 8]} />
            <meshStandardMaterial color={far} emissive={far} emissiveIntensity={FAR_LAMPS.emissive} toneMapped={false} />
          </mesh>
        );
      })}
      <mesh position={[0.8, 7.5, -2.2]}>
        <planeGeometry args={[1.6, 1.1]} />
        <meshStandardMaterial color={trim} side={THREE.DoubleSide} roughness={0.7} />
      </mesh>
      <mesh position={[0, 9, 0]}>
        <cylinderGeometry args={[0.04, 0.18, 18, 6]} />
        <meshBasicMaterial color={lamp} transparent opacity={sceneId === 'B' ? 0.14 : 0.22} depthWrite={false} />
      </mesh>
      <mesh position={[0, 18.2, 0]} rotation={[0, 0.6, 0]}>
        <coneGeometry args={[0.9, 1.6, 4]} />
        <meshStandardMaterial color={trim} emissive={lamp} emissiveIntensity={0.55} />
      </mesh>
    </group>
  );
}

function PaperSign({
  title,
  active,
  reduceMotion,
}: {
  title: string;
  active: boolean;
  reduceMotion: boolean;
}) {
  const paper = cssVar('--cv-paper-100', '#e8dcc6');
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const bob = reduceMotion ? 0 : Math.sin(t * 2.05) * 0.14;
    const lift = active ? 0.35 : 0;
    g.position.y = bob + lift;
    const s = active ? 1.16 : 1;
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, s, 0.12));
    if (ring.current) ring.current.opacity = active ? 0.22 + Math.sin(t * 3.2) * 0.06 : 0;
  });
  return (
    <group ref={group} name={title}>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[0.08, 3.0, 0.08]} />
        <meshStandardMaterial color="#b3bdc1" roughness={0.5} />
      </mesh>
      <mesh position={[0.48, 2.35, 0]} rotation={[0, 0.4, 0]}>
        <planeGeometry args={[1.55, 1.0]} />
        <meshStandardMaterial
          color={paper}
          side={THREE.DoubleSide}
          roughness={0.82}
          emissive={active ? '#c9a15a' : '#000000'}
          emissiveIntensity={active ? 0.18 : 0}
        />
      </mesh>
      <mesh position={[0.48, 2.9, 0.02]} rotation={[0, 0.4, 0]}>
        <planeGeometry args={[0.7, 0.12]} />
        <meshStandardMaterial color={cssVar('--cv-scene-accent', '#c9a15a')} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshBasicMaterial color={cssVar('--cv-ship-lamp-warm', '#f0b46a')} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.1, 1.55, 24]} />
        <meshBasicMaterial ref={ring} color="#c9a15a" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function Atmosphere({
  reduceMotion,
  sceneId,
  world,
  collectedIds,
  nearFragmentId,
}: {
  reduceMotion: boolean;
  sceneId: string;
  world: WorldConfig;
  collectedIds: string[];
  nearFragmentId: string | null;
}) {
  const sky = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 64;
    const g = c.getContext('2d');
    if (g) {
      const grad = g.createLinearGradient(0, 0, 0, 64);
      grad.addColorStop(0, cssVar('--cv-scene-sky-top', '#0d1a20'));
      grad.addColorStop(0.55, cssVar('--cv-scene-sky-horizon', '#2b4650'));
      grad.addColorStop(1, cssVar('--cv-scene-water', '#123039'));
      g.fillStyle = grad;
      g.fillRect(0, 0, 4, 64);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
  }, [sceneId]);

  const sun = sceneId === 'A' ? cssVar('--cv-scene-light', '#f3c98b') : sceneId === 'B' ? '#e6d7a8' : cssVar('--cv-ship-lamp-cool', '#8fb6c8');

  return (
    <group>
      <mesh material={sky} rotation={[0, 0, 0]}>
        <sphereGeometry args={[170, 24, 16]} />
      </mesh>
      <Suspense fallback={<WaterFallback />}>
        <HarborWater reduceMotion={reduceMotion} sceneId={sceneId} />
      </Suspense>
      <mesh position={sceneId === 'A' ? [36, 22, -48] : [-40, 38, -50]}>
        <sphereGeometry args={[sceneId === 'A' ? 5.4 : 4.5, 16, 12]} />
        <meshBasicMaterial color={sun} fog={false} />
      </mesh>
      {world.ports.map((p) => (
        <PortSilhouette key={p.id} port={p} sceneId={sceneId} />
      ))}
      {world.fragments
        .filter((f) => !collectedIds.includes(f.id))
        .map((f) => (
          <group key={f.id} position={[f.x, 0, f.z]}>
            <PaperSign title={f.title} active={nearFragmentId === f.id} reduceMotion={reduceMotion} />
          </group>
        ))}
    </group>
  );
}
