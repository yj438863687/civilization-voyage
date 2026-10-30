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
      sunDirection: new THREE.Vector3(0.18, 0.62, 0.42).normalize(),
      sunColor: hex('--cv-scene-light', '#f1d9a8').multiplyScalar(0.22),
      waterColor: hex('--cv-scene-water', '#123039').multiplyScalar(0.34),
      distortionScale: 1.5,
      fog: true,
    });
    mesh.rotation.x = -Math.PI / 2;
    mesh.material.uniforms.size.value = 5.5;
    return mesh;
  }, [normals]);

  useEffect(() => {
    water.material.uniforms.waterColor.value.copy(hex('--cv-scene-water', '#123039').multiplyScalar(0.34));
    water.material.uniforms.sunColor.value.copy(hex('--cv-scene-light', '#f1d9a8').multiplyScalar(0.22));
  }, [sceneId, water]);

  useFrame((_, dt) => {
    water.material.uniforms.time.value += reduceMotion ? dt * 0.12 : dt;
    water.material.uniforms.distortionScale.value = reduceMotion ? 0.7 : 1.6;
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

function LampHead({
  shape,
  core,
  lamp,
  y = 8.1,
}: {
  shape: 'sphere' | 'box' | 'tube';
  core: string;
  lamp: string;
  y?: number;
}) {
  return (
    <mesh position={[0, y, 0]}>
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

/** 港口：可认路的剪影。突堤、仓库体块、灯杆、桅樯。不复原真实建筑。 */
function PortSilhouette({ port, sceneId }: { port: PortPlace; sceneId: string }) {
  const lamp = cssVar('--cv-ship-lamp-warm', '#f0b46a');
  const core = cssVar('--cv-ship-lamp-core', '#ffd9a0');
  const trim = cssVar('--cv-ship-trim', '#c9a15a');
  const cool = sceneId === 'B' || sceneId === 'C';
  const lampCol = cool ? cssVar('--cv-ship-lamp-cool', '#8fb6c8') : lamp;
  const kind = port.silhouette;

  const stone = kind === 'quanzhou' ? '#4b443b' : kind === 'container' ? '#3a4145' : kind === 'float' ? '#33474d' : '#433d36';
  const roof = kind === 'quanzhou' ? '#5d3223' : kind === 'container' ? '#8a4a1e' : kind === 'float' ? '#4a7a74' : '#5a4430';

  // 码头灯：同色同强，三种灯罩并排
  const pierLamps = [-6, -2, 2, 6];

  return (
    <group position={[port.x, 0, port.z]}>
      {/* 基础石台 / 浮台 */}
      <mesh position={[0, 0.34, 0]} receiveShadow>
        <boxGeometry args={[kind === 'container' ? 24 : 20, 0.68, 15]} />
        <meshStandardMaterial color={stone} roughness={0.95} />
      </mesh>
      {/* 前沿护木 */}
      <mesh position={[0, 0.7, 7.4]}>
        <boxGeometry args={[kind === 'container' ? 24 : 20, 0.18, 0.5]} />
        <meshStandardMaterial color="#2a2521" roughness={0.9} />
      </mesh>

      {kind === 'quanzhou' ? (
        <>
          {/* 几座低矮仓房 + 坡顶，只作体块 */}
          {[
            [-5.5, 2.4, -2.6, 6.4, 2.6, 4.2],
            [3.4, 1.9, -1.4, 5.2, 2.1, 3.6],
            [8.0, 1.4, 2.6, 3.0, 1.5, 2.4],
          ].map(([x, y, z, w, h, d], i) => (
            <group key={i}>
              <mesh position={[x, y, z]} castShadow>
                <boxGeometry args={[w, h, d]} />
                <meshStandardMaterial color={i === 0 ? '#6b6154' : '#544a3f'} roughness={0.9} />
              </mesh>
              <mesh position={[x, y + h / 2 + 0.12, z]} rotation={[0.16, 0, 0]}>
                <boxGeometry args={[w + 0.5, 0.16, d + 0.5]} />
                <meshStandardMaterial color={roof} roughness={0.72} />
              </mesh>
            </group>
          ))}
          {/* 塔：三层体块，轮廓醒目 */}
          {[0, 1, 2].map((i) => (
            <mesh key={`t${i}`} position={[1.6, 3.3 + i * 1.5, -4.6]} castShadow>
              <boxGeometry args={[1.9 - i * 0.34, 1.5, 1.9 - i * 0.34]} />
              <meshStandardMaterial color={i === 2 ? trim : '#7a4a33'} roughness={0.62} />
            </mesh>
          ))}
          {/* 桅樯：停靠的船 */}
          {[-7.5, -6.2].map((x, i) => (
            <mesh key={`m${i}`} position={[x, 4.4, 4.2]}>
              <cylinderGeometry args={[0.06, 0.09, 8.2, 6]} />
              <meshStandardMaterial color="#221b16" roughness={0.8} />
            </mesh>
          ))}
        </>
      ) : kind === 'container' ? (
        <>
          {[
            [-7.5, 0, -3, '#8a4a1e'],
            [-7.5, 1.25, -3, '#2f4a5c'],
            [-7.5, 2.5, -3, '#8a4a1e'],
            [-4.6, 0, -3, '#3a5a70'],
            [-4.6, 1.25, -3, '#8a4a1e'],
            [-1.7, 0, -3.2, '#2f4a5c'],
            [-1.7, 1.25, -3.2, '#3a5a70'],
            [1.2, 0, -2.6, '#8a4a1e'],
          ].map(([x, y, z, color], i) => (
            <mesh key={i} position={[x as number, 1.2 + (y as number), z as number]} castShadow>
              <boxGeometry args={[2.5, 1.15, 6.2]} />
              <meshStandardMaterial color={color as string} roughness={0.6} metalness={0.22} />
            </mesh>
          ))}
          {/* 两台门吊：腿、横梁、吊臂 */}
          {[5.2, 9.4].map((x, i) => (
            <group key={`c${i}`} position={[x, 0, 1.2]}>
              {[-1.4, 1.4].map((lz) => (
                <mesh key={lz} position={[0, 5.4, lz]}>
                  <boxGeometry args={[0.3, 10.8, 0.3]} />
                  <meshStandardMaterial color="#2b3236" roughness={0.42} metalness={0.55} />
                </mesh>
              ))}
              <mesh position={[0, 10.6, 0]}>
                <boxGeometry args={[0.5, 0.4, 3.4]} />
                <meshStandardMaterial color={roof} roughness={0.45} metalness={0.4} />
              </mesh>
              <mesh position={[0, 10.2, 4.2]} rotation={[0.34, 0, 0]}>
                <boxGeometry args={[0.34, 0.3, 6.4]} />
                <meshStandardMaterial color={roof} roughness={0.45} metalness={0.4} />
              </mesh>
              <mesh position={[0, 10.5, -1.4]}>
                <sphereGeometry args={[0.12, 8, 8]} />
                <meshStandardMaterial color={core} emissive={lampCol} emissiveIntensity={1.6} toneMapped={false} />
              </mesh>
            </group>
          ))}
        </>
      ) : kind === 'float' ? (
        <>
          {[
            [0, 0],
            [-7.2, 3.0],
            [6.8, 2.2],
            [-3.0, -5.2],
            [4.2, -4.4],
          ].map(([x, z], i) => (
            <group key={i} position={[x, 0, z]}>
              <mesh position={[0, 0.24, 0]} receiveShadow>
                <boxGeometry args={[5.4, 0.44, 4.2]} />
                <meshStandardMaterial color="#2c4148" roughness={0.72} metalness={0.14} />
              </mesh>
              <mesh position={[0, 1.15, -0.3]} castShadow>
                <boxGeometry args={[2.9, 1.4, 2.2]} />
                <meshStandardMaterial color="#46666e" roughness={0.8} />
              </mesh>
              <mesh position={[0, 1.95, -0.3]}>
                <boxGeometry args={[3.1, 0.06, 2.4]} />
                <meshStandardMaterial color="#5f9d95" roughness={0.6} />
              </mesh>
              {/* 浮体吃水线 */}
              <mesh position={[0, -0.02, 0]}>
                <boxGeometry args={[5.7, 0.12, 4.5]} />
                <meshStandardMaterial color="#16333a" roughness={0.9} />
              </mesh>
            </group>
          ))}
          {/* 连桥 */}
          <mesh position={[2.0, 0.4, 1.0]} rotation={[0, 0.3, 0]}>
            <boxGeometry args={[7.0, 0.1, 0.66]} />
            <meshStandardMaterial color="#5f9d95" roughness={0.55} />
          </mesh>
        </>
      ) : (
        <>
          {/* 默认：小型石港。仓库、钟楼、栈桥 */}
          <mesh position={[-1.6, 2.0, -3.2]} castShadow>
            <boxGeometry args={[8.0, 2.9, 4.6]} />
            <meshStandardMaterial color="#4a4238" roughness={0.88} />
          </mesh>
          <mesh position={[-1.6, 3.55, -3.2]} rotation={[0.18, 0, 0]}>
            <boxGeometry args={[8.6, 0.18, 5.2]} />
            <meshStandardMaterial color="#5e3a26" roughness={0.7} />
          </mesh>
          <mesh position={[5.4, 1.7, -2.2]} castShadow>
            <boxGeometry args={[4.2, 2.3, 3.4]} />
            <meshStandardMaterial color="#564c40" roughness={0.86} />
          </mesh>
          <mesh position={[5.4, 2.95, -2.2]} rotation={[0.14, 0, 0]}>
            <boxGeometry args={[4.7, 0.14, 3.8]} />
            <meshStandardMaterial color="#5e3a26" roughness={0.68} />
          </mesh>
          {/* 钟楼 */}
          <mesh position={[1.9, 4.2, -3.6]}>
            <boxGeometry args={[1.5, 4.2, 1.5]} />
            <meshStandardMaterial color="#6b6154" roughness={0.84} />
          </mesh>
          <mesh position={[1.9, 6.5, -3.6]}>
            <coneGeometry args={[1.15, 1.2, 4]} />
            <meshStandardMaterial color={roof} roughness={0.6} />
          </mesh>
          {/* 栈桥 */}
          <mesh position={[2.0, 0.62, 5.6]}>
            <boxGeometry args={[3.0, 0.16, 5.2]} />
            <meshStandardMaterial color="#3a332c" roughness={0.92} />
          </mesh>
          {[4.0, 6.4].map((z) => (
            <mesh key={z} position={[2.0, 0.3, z]}>
              <boxGeometry args={[3.0, 0.7, 0.24]} />
              <meshStandardMaterial color="#2a2521" roughness={0.94} />
            </mesh>
          ))}
        </>
      )}

      {/* 码头灯杆：同色同强，三种灯罩 */}
      {pierLamps.map((x, i) => (
        <group key={`pl${x}`} position={[x, 0, 6.6]}>
          <mesh position={[0, 2.1, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 4.2, 6]} />
            <meshStandardMaterial color={trim} roughness={0.44} metalness={0.55} />
          </mesh>
          <LampHead shape={PORT_LAMP_SHAPES[i % PORT_LAMP_SHAPES.length]} core={core} lamp={lampCol} y={4.3} />
        </group>
      ))}

      {/* 远灯：港口后方的暖点，无标签 */}
      {Array.from({ length: FAR_LAMPS.count }, (_, i) => {
        const t = FAR_LAMPS.count === 1 ? 0.5 : i / (FAR_LAMPS.count - 1);
        const x = -14 + t * 28;
        return (
          <mesh key={`fl${i}`} position={[x, 2.0 + (i % 2) * 0.8, -16 - (i % 3) * 5]}>
            <sphereGeometry args={[FAR_LAMPS.radius * 1.6, 8, 8]} />
            <meshStandardMaterial color={lampCol} emissive={lampCol} emissiveIntensity={FAR_LAMPS.emissive} toneMapped={false} />
          </mesh>
        );
      })}

      {/* 港口方向的一团柔光，让港口在雾里有存在感 */}
      <pointLight position={[0, 6, 2]} color={lampCol} intensity={9} distance={38} decay={2} />
    </group>
  );
}

/** 纸签：竖杆 + 纸面 + 一枚小暖灯，作为「还没照到的地方」的标记。 */
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
  const lamp = cssVar('--cv-ship-lamp-warm', '#f0b46a');
  const core = cssVar('--cv-ship-lamp-core', '#ffd9a0');
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  const glow = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const bob = reduceMotion ? 0 : Math.sin(t * 1.9) * 0.1;
    g.position.y = bob + (active ? 0.3 : 0);
    const s = active ? 1.14 : 1;
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, s, 0.14));
    if (ring.current) ring.current.opacity = active ? 0.2 + Math.sin(t * 3.2) * 0.05 : 0.1;
    if (glow.current) glow.current.emissiveIntensity = active ? 2.4 : 1.5;
  });

  return (
    <group ref={group} name={title}>
      {/* 杆 */}
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.055, 0.07, 2.8, 6]} />
        <meshStandardMaterial color="#8a7f70" roughness={0.66} />
      </mesh>
      {/* 纸面：略斜，朝向来船 */}
      <group position={[0, 2.5, 0]} rotation={[0, 0.22, 0.03]}>
        <mesh>
          <planeGeometry args={[1.5, 0.98]} />
          <meshStandardMaterial
            color={paper}
            side={THREE.DoubleSide}
            roughness={0.86}
            emissive={lamp}
            emissiveIntensity={active ? 0.22 : 0.1}
          />
        </mesh>
        {/* 纸上的一道墨线，暗示「写着字」 */}
        <mesh position={[0, 0.16, 0.005]}>
          <planeGeometry args={[1.0, 0.05]} />
          <meshBasicMaterial color="#5d5446" transparent opacity={0.55} />
        </mesh>
        <mesh position={[-0.1, -0.06, 0.005]}>
          <planeGeometry args={[0.78, 0.04]} />
          <meshBasicMaterial color="#5d5446" transparent opacity={0.4} />
        </mesh>
        {/* 纸签自己的小灯 */}
        <mesh position={[0, -0.62, 0]}>
          <sphereGeometry args={[0.09, 10, 10]} />
          <meshStandardMaterial
            ref={glow}
            color={core}
            emissive={lamp}
            emissiveIntensity={1.5}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, -0.62, 0]}>
          <sphereGeometry args={[0.28, 10, 10]} />
          <meshBasicMaterial color={lamp} transparent opacity={0.14} depthWrite={false} />
        </mesh>
      </group>
      {/* 地面光圈：可瞄准的落点 */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.9, 32]} />
        <meshBasicMaterial ref={ring} color={lamp} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <pointLight position={[0, 2.4, 0.4]} color={lamp} intensity={active ? 3.2 : 1.8} distance={9} decay={2} />
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
  // 夜空：竖向渐变 + 地平线暖带。不做体积云，行高处的雾由 fog 负责。
  const sky = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 256;
    const g = c.getContext('2d');
    if (g) {
      // 球面 UV：v=0 在天底，v=0.5 是地平线，v=1 在天顶。色标必须单调，否则出现硬带。
      const grad = g.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0.0, cssVar('--cv-scene-water', '#123039'));
      grad.addColorStop(0.44, cssVar('--cv-scene-fog', '#1c3139'));
      grad.addColorStop(0.5, cssVar('--cv-scene-sky-horizon', '#2b4650'));
      grad.addColorStop(0.62, cssVar('--cv-scene-sky-top', '#0d1a20'));
      grad.addColorStop(1.0, cssVar('--cv-scene-sky-top', '#0d1a20'));
      g.fillStyle = grad;
      g.fillRect(0, 0, 8, 256);
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
