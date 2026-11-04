import { HistoryMarker } from './HistoryMarker';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import type { Lane, PortPlace, WorldConfig } from './world.config';
import { Relic, relicKindOf } from './relics';
import { encounterFor } from './encounters';
import { SPAWN, storyFor } from './stories';
import { ShoreFigure } from './ShoreFigure';
import { CrisisScene } from './IslandStages';
import { FableIsland, FloodVillage } from './FableStage';
import { TaoyuanScene } from './TaoyuanScene';
import { Reefs } from './Reefs';
import { ISLAND_OFFSET, VILLAGE_OFFSET, fableLive, type FableState } from './fable';
import { LaneKeeper } from './Figure';
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
    const mesh = new Water(new THREE.PlaneGeometry(1600, 1600), {
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
    // 每段海不一样：农业段是浑的河水泥黄，工业段是灰绿的港水，
    // 信息段是发青的深水，智能段近乎墨黑。水色先于任何文字告诉你到了哪个时代。
    const tint: Record<string, { water: number; sun: number; size: number; wave: number }> = {
      A: { water: 0.52, sun: 0.3, size: 6.5, wave: 1.9 },
      B: { water: 0.3, sun: 0.18, size: 4.6, wave: 1.25 },
      C: { water: 0.24, sun: 0.14, size: 5.2, wave: 1.1 },
      D: { water: 0.14, sun: 0.08, size: 3.6, wave: 0.6 },
      test: { water: 0.34, sun: 0.22, size: 5.5, wave: 1.5 },
    };
    const t = tint[sceneId] ?? tint.test;
    water.material.uniforms.waterColor.value.copy(hex('--cv-scene-water', '#123039').multiplyScalar(t.water));
    water.material.uniforms.sunColor.value.copy(hex('--cv-scene-light', '#f1d9a8').multiplyScalar(t.sun));
    water.material.uniforms.size.value = t.size;
    water.material.uniforms.distortionScale.value = t.wave;
  }, [sceneId, water]);

  useFrame((_, dt) => {
    water.material.uniforms.time.value += reduceMotion ? dt * 0.12 : dt;
    // 浪也不一样：农业段是活的河，智能段的海几乎不动
    const calm: Record<string, number> = { A: 1.9, B: 1.3, C: 1.1, D: 0.55, test: 1.6 };
    water.material.uniforms.distortionScale.value = reduceMotion ? 0.7 : calm[sceneId] ?? 1.6;
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
  const coolMode = sceneId === 'B' || sceneId === 'C' || sceneId === 'D';
  const lampCol = coolMode ? cssVar('--cv-ship-lamp-cool', '#8fb6c8') : lamp;
  const cool = cssVar('--cv-ship-lamp-cool', '#8fb6c8');
  const kind = port.silhouette;
  const WIDE_PORTS = new Set<string>(['container', 'steam', 'signal']);

  const palette: Record<string, { stone: string; roof: string }> = {
    quanzhou: { stone: '#4b443b', roof: '#5d3223' },
    float: { stone: '#33474d', roof: '#4a7a74' },
    harbor: { stone: '#433d36', roof: '#5a4430' },
    riverbank: { stone: '#4d4034', roof: '#7d6238' },
    steam: { stone: '#3a3f43', roof: '#8a4a28' },
    signal: { stone: '#243a42', roof: '#35596a' },
    starlight: { stone: '#1b2740', roof: '#4a5a86' },
    container: { stone: '#3a4145', roof: '#8a4a1e' },
  };
  const stone = (palette[kind] ?? palette.harbor).stone;
  const roof = (palette[kind] ?? palette.harbor).roof;

  // 码头灯：同色同强，三种灯罩并排
  const pierLamps = [-6, -2, 2, 6];

  return (
    <group position={[port.x, 0, port.z]}>
      {/* 基础石台 / 浮台 */}
      <mesh position={[0, 0.34, 0]} receiveShadow>
        <boxGeometry args={[WIDE_PORTS.has(kind) ? 24 : 20, 0.68, 15]} />
        <meshStandardMaterial color={stone} roughness={0.95} />
      </mesh>
      {/* 前沿护木 */}
      <mesh position={[0, 0.7, 7.4]}>
        <boxGeometry args={[WIDE_PORTS.has(kind) ? 24 : 20, 0.18, 0.5]} />
        <meshStandardMaterial color="#2a2521" roughness={0.9} />
      </mesh>

      {kind === 'riverbank' ? (
        <>
          {/* 农业：缓坡河岸、木桩、粮仓、低矮茅顶 */}
          <mesh position={[0, 0.34, 0]} rotation={[0, 0.12, 0]} receiveShadow>
            <boxGeometry args={[22, 0.68, 16]} />
            <meshStandardMaterial color="#4d4034" roughness={0.98} />
          </mesh>
          {/* 河岸缓坡 */}
          <mesh position={[0, 0.95, -7.5]} rotation={[-0.34, 0, 0]}>
            <boxGeometry args={[24, 0.3, 5.5]} />
            <meshStandardMaterial color="#5d4d3c" roughness={0.98} />
          </mesh>
          {/* 粮仓：圆筒 + 草顶 */}
          {[-6.2, -2.4].map((x, i) => (
            <group key={i} position={[x, 0, -3.6]}>
              <mesh position={[0, 1.4, 0]} castShadow>
                <cylinderGeometry args={[1.65, 1.85, 2.8, 14]} />
                <meshStandardMaterial color="#7a6144" roughness={0.95} />
              </mesh>
              <mesh position={[0, 3.1, 0]} castShadow>
                <coneGeometry args={[2.05, 1.35, 14]} />
                <meshStandardMaterial color="#6d5734" roughness={0.9} />
              </mesh>
            </group>
          ))}
          {/* 长屋 */}
          <mesh position={[4.6, 1.15, -3.2]} castShadow>
            <boxGeometry args={[7.4, 2.3, 4.0]} />
            <meshStandardMaterial color="#5a4a39" roughness={0.96} />
          </mesh>
          <mesh position={[4.6, 2.45, -3.2]} rotation={[0.2, 0, 0]} castShadow>
            <boxGeometry args={[8.0, 0.16, 4.6]} />
            <meshStandardMaterial color="#7d6238" roughness={0.88} />
          </mesh>
          {/* 界桩：一排短木桩 */}
          {Array.from({ length: 7 }, (_, i) => (
            <mesh key={`st${i}`} position={[-9 + i * 3.1, 0.68, 3.4]} castShadow>
              <cylinderGeometry args={[0.09, 0.12, 1.2, 6]} />
              <meshStandardMaterial color="#3f3226" roughness={0.95} />
            </mesh>
          ))}
          {/* 火塘：农业唯一的暖光点 */}
          <mesh position={[2.0, 0.72, 2.6]}>
            <sphereGeometry args={[0.16, 8, 8]} />
            <meshStandardMaterial color={core} emissive={lampCol} emissiveIntensity={2.2} toneMapped={false} />
          </mesh>
        </>
      ) : kind === 'steam' ? (
        <>
          {/* 工业：铁厂、烟囱、栈桥式铁轨、龙门吊 */}
          <mesh position={[0, 0.34, 0]} receiveShadow>
            <boxGeometry args={[24, 0.68, 14]} />
            <meshStandardMaterial color="#3a3f43" roughness={0.9} />
          </mesh>
          {[
            [-6.4, 2.6, -3.4, 8.0, 4.4, 5.0],
            [1.6, 2.0, -3.0, 6.0, 3.2, 4.2],
          ].map(([x, y, z, w, h, d], i) => (
            <group key={i}>
              <mesh position={[x, y, z]} castShadow>
                <boxGeometry args={[w, h, d]} />
                <meshStandardMaterial color={i === 0 ? '#4a3f36' : '#434a4e'} roughness={0.86} />
              </mesh>
              <mesh position={[x, y + h / 2 + 0.1, z]} rotation={[0.1, 0, 0]}>
                <boxGeometry args={[w + 0.4, 0.14, d + 0.4]} />
                <meshStandardMaterial color="#2c3134" roughness={0.8} />
              </mesh>
            </group>
          ))}
          {/* 三根烟囱，高度不同 */}
          {[
            [6.6, 7.8, -2.2, 0.75],
            [8.4, 6.0, 0.8, 0.6],
            [-8.6, 5.2, 1.4, 0.55],
          ].map(([x, h, z, r], i) => (
            <group key={`ch${i}`} position={[x, 0, z]}>
              <mesh position={[0, h / 2 + 0.6, 0]} castShadow>
                <cylinderGeometry args={[r * 0.72, r, h, 10]} />
                <meshStandardMaterial color="#4b3a32" roughness={0.88} />
              </mesh>
              <mesh position={[0, h * 0.72 + 0.6, 0]}>
                <cylinderGeometry args={[r * 0.78, r * 0.78, 0.3, 10]} />
                <meshStandardMaterial color="#8a4a28" roughness={0.7} />
              </mesh>
            </group>
          ))}
          {/* 铁轨：两条平行钢轨 + 枕木 */}
          {[-0.6, 0.6].map((x) => (
            <mesh key={`r${x}`} position={[x, 0.78, 2.2]} rotation={[0, 0, 0]}>
              <boxGeometry args={[0.12, 0.1, 12]} />
              <meshStandardMaterial color="#6a6f73" roughness={0.4} metalness={0.6} />
            </mesh>
          ))}
          {Array.from({ length: 9 }, (_, i) => (
            <mesh key={`t${i}`} position={[0, 0.72, -3.4 + i * 1.4]}>
              <boxGeometry args={[1.8, 0.08, 0.22]} />
              <meshStandardMaterial color="#3b3028" roughness={0.95} />
            </mesh>
          ))}
          {/* 吊臂 */}
          <group position={[9.2, 0, 4.0]}>
            <mesh position={[0, 4.4, 0]}>
              <boxGeometry args={[0.3, 8.8, 0.3]} />
              <meshStandardMaterial color="#2c3236" roughness={0.45} metalness={0.55} />
            </mesh>
            <mesh position={[-2.6, 8.4, 0]} rotation={[0, 0, 0.28]}>
              <boxGeometry args={[5.6, 0.26, 0.26]} />
              <meshStandardMaterial color={roof} roughness={0.5} metalness={0.4} />
            </mesh>
            <mesh position={[0, 4.5, 0]}>
              <sphereGeometry args={[0.14, 8, 8]} />
              <meshStandardMaterial color={core} emissive={lampCol} emissiveIntensity={1.7} toneMapped={false} />
            </mesh>
          </group>
        </>
      ) : kind === 'signal' ? (
        <>
          {/* 信息：浮台 + 天线阵列 + 光缆接驳 + 屏幕墙 */}
          <mesh position={[0, 0.3, 0]} receiveShadow>
            <boxGeometry args={[22, 0.6, 14]} />
            <meshStandardMaterial color="#243a42" roughness={0.72} metalness={0.2} />
          </mesh>
          {/* 机柜方阵：整齐、重复，暗示机房 */}
          {[-6.4, -4.4, -2.4, 0.4, 2.4].map((x, i) => (
            <mesh key={i} position={[x, 1.5, -3.4]} castShadow>
              <boxGeometry args={[1.5, 2.0, 2.2]} />
              <meshStandardMaterial color="#2c4450" roughness={0.6} metalness={0.28} />
            </mesh>
          ))}
          {/* 屏幕墙：一块竖起的冷光面 */}
          <mesh position={[6.6, 3.0, -3.0]} rotation={[0, -0.32, 0]}>
            <planeGeometry args={[5.0, 3.2]} />
            <meshStandardMaterial color={core} emissive={cool} emissiveIntensity={0.5} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
          {/* 三根天线 */}
          {[
            [-8.4, 9.0],
            [4.2, 7.0],
            [8.8, 8.2],
          ].map(([x, h], i) => (
            <group key={`an${i}`} position={[x, 0, 1.4]}>
              <mesh position={[0, h / 2, 0]}>
                <cylinderGeometry args={[0.05, 0.09, h, 6]} />
                <meshStandardMaterial color="#8fa6ae" roughness={0.4} metalness={0.5} />
              </mesh>
              <mesh position={[0, h, 0]}>
                <sphereGeometry args={[0.13, 8, 8]} />
                <meshStandardMaterial color={core} emissive={cool} emissiveIntensity={1.9} toneMapped={false} />
              </mesh>
            </group>
          ))}
          {/* 光缆接驳：一段露出水面的缆 */}
          <mesh position={[0, 0.12, 6.6]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.0, 9]} />
            <meshStandardMaterial color="#7a8f96" roughness={0.5} metalness={0.4} side={THREE.DoubleSide} />
          </mesh>
        </>
      ) : kind === 'starlight' ? (
        <>
          {/* 智能：无固定建筑，只有浮体、桩、与自绘的星点 */}
          <mesh position={[0, 0.26, 0]} receiveShadow>
            <boxGeometry args={[20, 0.52, 12]} />
            <meshStandardMaterial color="#1b2740" roughness={0.62} metalness={0.24} />
          </mesh>
          {[
            [-6.0, -2.0, 4.2],
            [2.0, -5.0, 3.4],
            [7.0, 1.0, 3.0],
          ].map(([x, z, r], i) => (
            <mesh key={i} position={[x, 0.9, z]} castShadow>
              <boxGeometry args={[r, 1.2, r * 0.8]} />
              <meshStandardMaterial color="#26334f" roughness={0.7} metalness={0.2} />
            </mesh>
          ))}
          {/* 自绘星图：一组悬空冷光点，位置不对称 */}
          {Array.from({ length: 14 }, (_, i) => {
            const a = i * 2.399;
            const rad = 3 + (i % 5) * 2.4;
            return (
              <mesh key={`s${i}`} position={[Math.cos(a) * rad, 5.5 + ((i * 1.7) % 6), Math.sin(a) * rad * 0.7 - 3]}>
                <sphereGeometry args={[0.07 + (i % 3) * 0.03, 6, 6]} />
                <meshStandardMaterial color={core} emissive={cool} emissiveIntensity={1.6} toneMapped={false} />
              </mesh>
            );
          })}
          {/* 一根引航柱 */}
          <group position={[0, 0, 2.0]}>
            <mesh position={[0, 3.4, 0]}>
              <cylinderGeometry args={[0.08, 0.12, 6.8, 8]} />
              <meshStandardMaterial color={trim} roughness={0.4} metalness={0.5} />
            </mesh>
            <mesh position={[0, 6.9, 0]}>
              <sphereGeometry args={[0.18, 10, 10]} />
              <meshStandardMaterial color={core} emissive={cool} emissiveIntensity={2.2} toneMapped={false} />
            </mesh>
          </group>
        </>
      ) : kind === 'container' ? (
        <>
          <mesh position={[0, 0.38, 0]} receiveShadow>
            <boxGeometry args={[24, 0.76, 14]} />
            <meshStandardMaterial color="#3d4448" roughness={0.92} />
          </mesh>
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
            </group>
          ))}
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
          <mesh position={[0.4, 5.4, -5.2]} castShadow>
            <cylinderGeometry args={[0.22, 0.32, 10.4, 8]} />
            <meshStandardMaterial color="#2c241e" roughness={0.7} />
          </mesh>
          <mesh position={[0.4, 10.7, -5.2]}>
            <sphereGeometry args={[0.55, 10, 10]} />
            <meshStandardMaterial color={core} emissive={lamp} emissiveIntensity={1.8} toneMapped={false} />
          </mesh>
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

/** 每段航程独有的空气/海面天气层。便宜的效果：粒子 + 低面数面片，不做体积雾。 */
function WeatherField({ sceneId, reduceMotion }: { sceneId: string; reduceMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const spec = useMemo(() => {
    // count/高度/漂移速度/颜色/尺寸。A 河雾、B 煤烟、C 电波静电、D 星尘。
    const table: Record<string, { n: number; y: [number, number]; drift: number; color: string; size: number; opacity: number; spread: number }> = {
      A: { n: 90, y: [0.4, 3.2], drift: 0.5, color: '#e8c79a', size: 0.5, opacity: 0.16, spread: 62 },
      B: { n: 110, y: [1.5, 14], drift: 0.9, color: '#8d8578', size: 1.4, opacity: 0.2, spread: 70 },
      C: { n: 120, y: [6, 30], drift: 0.22, color: '#9fdfe8', size: 0.3, opacity: 0.5, spread: 74 },
      D: { n: 150, y: [2, 26], drift: 0.14, color: '#c6cff5', size: 0.26, opacity: 0.5, spread: 80 },
    };
    return table[sceneId] ?? null;
  }, [sceneId]);

  const geo = useMemo(() => {
    if (!spec) return null;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(spec.n * 3);
    for (let i = 0; i < spec.n; i++) {
      const a = i * 2.399963;
      const rad = 6 + ((i * 41) % 100) / 100 * spec.spread;
      pos[i * 3] = Math.cos(a) * rad;
      pos[i * 3 + 1] = spec.y[0] + ((i * 29) % 100) / 100 * (spec.y[1] - spec.y[0]);
      pos[i * 3 + 2] = Math.sin(a) * rad;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [spec]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g || !spec || reduceMotion) return;
    const t = clock.elapsedTime;
    // 整体缓慢平移，粒子之间不做逐点动画：看起来是雾在走，不是点在飞。
    g.position.x = Math.sin(t * 0.07 * spec.drift) * 6;
    g.position.z = Math.cos(t * 0.05 * spec.drift) * 6;
  });

  if (!spec || !geo) return null;
  return (
    <group ref={group}>
      <points geometry={geo}>
        <pointsMaterial
          color={spec.color}
          size={spec.size}
          sizeAttenuation
          transparent
          opacity={spec.opacity}
          depthWrite={false}
          fog
        />
      </points>
    </group>
  );
}


/**
 * 航道：从出生点串到港口的一条水面光路。
 * 选中的那条亮、有流动光点；没走的留一条暗线，不消失 —— 没走的路也记在海图上。
 * 概念设计，不是任何真实航路。
 */

/** 航道的光按时代上色：农业陶土暖光，工业铁青，信息冷蓝，智能近白。 */
function laneColor(active: boolean, sceneId: string) {
  const on: Record<string, string> = {
    A: '#ffb877',
    B: '#d8dde2',
    C: '#8fdfe8',
    D: '#c8d2f5',
    test: '#ffd9a0',
  };
  const off: Record<string, string> = {
    A: '#7a5a3c',
    B: '#5a6066',
    C: '#3f5a62',
    D: '#3a4460',
    test: '#5a6a70',
  };
  return active ? on[sceneId] ?? on.test : off[sceneId] ?? off.test;
}

function SeaLane({
  lane,
  active,
  color,
  reduceMotion,
}: {
  lane: Lane;
  active: boolean;
  color: string;
  reduceMotion: boolean;
}) {
  const motes = useRef<THREE.Points>(null);

  // 航道从出生点出发，经分叉点，到自己的转折点，再汇向港口
  const curve = useMemo(() => {
    const pts = [
      new THREE.Vector3(SPAWN.x, 0.34, SPAWN.z),
      ...lane.waypoints.map((w) => new THREE.Vector3(w.x, 0.34, w.z)),
      new THREE.Vector3(26, 0.34, -16),
    ];
    return new THREE.CatmullRomCurve3(pts);
  }, [lane]);

  // 水面光带：宽一点、亮一点，是"这条路"的本体
  const ribbon = useMemo(() => {
    const N = 120;
    const W = active ? 3.2 : 1.4;
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const len = Math.hypot(-tan.z, tan.x) || 1;
      const ox = (-tan.z / len) * W;
      const oz = (tan.x / len) * W;
      pos.push(p.x + ox, p.y, p.z + oz, p.x - ox, p.y, p.z - oz);
      uv.push(0, t, 1, t);
    }
    for (let i = 0; i < N; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }, [curve, active]);

  // 实体航标：沿航道摆一排浮标，选中的那条有灯，没走的只剩杆
  const buoys = useMemo(() => {
    const n = active ? 14 : 10;
    return Array.from({ length: n }, (_, i) => {
      const p = curve.getPoint((i + 0.5) / n);
      const tan = curve.getTangent((i + 0.5) / n);
      return { x: p.x, z: p.z, rot: Math.atan2(tan.x, tan.z) };
    });
  }, [curve, active]);

  const flowGeo = useMemo(() => {
    if (!active) return null;
    const n = 20;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    return g;
  }, [active]);

  useFrame(({ clock }) => {
    if (!active || reduceMotion || !flowGeo || !motes.current) return;
    const t = clock.elapsedTime;
    const pos = flowGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const u = ((i / pos.count) + (t * 0.05)) % 1;
      const p = curve.getPoint(u);
      pos.setXYZ(i, p.x, p.y + 0.12, p.z);
    }
    pos.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={ribbon} renderOrder={2}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={active ? 0.24 : 0.07}
          depthWrite={false}
          side={THREE.DoubleSide}
          fog
        />
      </mesh>

      {buoys.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]} rotation={[0, b.rot, 0]}>
          {/* 浮体 */}
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.34, 0.42, 0.34, 8]} />
            <meshStandardMaterial
              color={active ? color : '#3a3f42'}
              emissive={active ? color : '#000000'}
              emissiveIntensity={active ? 2.2 : 0}
              roughness={0.6}
              toneMapped={!active}
            />
          </mesh>
          {/* 标杆 */}
          <mesh position={[0, 0.95, 0]}>
            <cylinderGeometry args={[0.05, 0.06, 1.5, 6]} />
            <meshStandardMaterial color={active ? color : '#4a4f52'} roughness={0.7} toneMapped={!active} />
          </mesh>
          {active && (
            <>
              {/* 顶端小灯：这是海面上最醒目的东西 */}
              <mesh position={[0, 1.78, 0]}>
                <sphereGeometry args={[0.2, 10, 10]} />
                <meshStandardMaterial color="#fff4dc" emissive={color} emissiveIntensity={3.2} toneMapped={false} />
              </mesh>
              <mesh position={[0, 1.78, 0]}>
                <sphereGeometry args={[0.42, 10, 10]} />
                <meshBasicMaterial color={color} transparent opacity={0.08} depthWrite={false} />
              </mesh>
            </>
          )}
        </group>
      ))}

      {flowGeo && (
        <points ref={motes} geometry={flowGeo}>
          <pointsMaterial color="#fff4dc" size={1.1} transparent opacity={0.95} depthWrite={false} fog />
        </points>
      )}
    </group>
  );
}


/**
 * 传送门：通往下一段的门，立在海上。
 * 两根门柱 + 一道水面上的光幕，门楣上写着下一段的名字。
 * 船开进去，这一段就结束。
 */
/**
 * 通往下一段的海门。
 *
 * 以前它只是两根柱子加一层光幕：站在船上看，分不清那是一个门，还是一段残桥；
 * 夜里锁着的时候更是两块黑石头。现在它是一座真的门——两根石柱扎在礁座上，
 * 一道门楣把两根柱子连起来，光幕从水面一直立到门楣，门里透出下一段海域的颜色；
 * 水面上有一道指向门内的光路。锁着的时候光幕是暗的，柱顶只剩一点余烬。
 */
function Portal({
  portal,
  color,
  reduceMotion,
  open,
  face,
}: {
  portal: NonNullable<WorldConfig['portal']>;
  color: string;
  reduceMotion: boolean;
  /** 锁着的门：只有石柱，没有光。落印之后才亮 */
  open: boolean;
  /** 门朝哪儿开（弧度）。门是一道开口，侧着看只是一条线 */
  face: number;
}) {
  const veil = useRef<THREE.MeshBasicMaterial>(null);
  const rim = useRef<THREE.MeshBasicMaterial>(null);
  const halo = useRef<THREE.MeshBasicMaterial>(null);
  const group = useRef<THREE.Group>(null);
  const H = 13;
  const W = 11;

  useFrame(({ clock }) => {
    if (reduceMotion) return;
    const t = clock.elapsedTime;
    // 锁着的时候也要看得见：一块很暗、但在呼吸的门，像还没点起来的灯
    if (veil.current) veil.current.opacity = open ? 0.16 + Math.sin(t * 1.3) * 0.05 : 0.07 + Math.sin(t * 0.9) * 0.02;
    if (rim.current) rim.current.opacity = open ? 0.9 : 0.16;
    if (halo.current) halo.current.opacity = open ? 0.42 + Math.sin(t * 1.1) * 0.08 : 0.1;
    if (group.current) group.current.position.y = Math.sin(t * 0.5) * 0.1;
  });

  const stone = '#3a342c';
  const stoneLit = '#4a4238';

  return (
    <group ref={group} position={[portal.x, 0, portal.z]} rotation={[0, face, 0]}>
      {/* 礁座：两根柱子不是插在水里，是长在一块礁石上 */}
      <mesh position={[0, 0.5, 0]} receiveShadow>
        <boxGeometry args={[W + 3.2, 1.0, 3.4]} />
        <meshStandardMaterial color="#2f2a24" roughness={0.98} />
      </mesh>

      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * (W / 2), 0, 0]}>
          {/* 柱身：下粗上细，有翼板，看得出一块一块垒上去 */}
          <mesh position={[0, H / 2, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.82, H, 10]} />
            <meshStandardMaterial color={stone} roughness={0.88} metalness={0.14} />
          </mesh>
          {[0.26, 0.5, 0.74].map((f) => (
            <mesh key={f} position={[0, H * f, 0]}>
              <cylinderGeometry args={[0.62, 0.7, 0.28, 10]} />
              <meshStandardMaterial color={stoneLit} roughness={0.9} />
            </mesh>
          ))}
          {/* 柱座：方石，比柱身宽出一圈 */}
          <mesh position={[0, 0.7, 0]}>
            <boxGeometry args={[2.4, 1.4, 2.4]} />
            <meshStandardMaterial color={stoneLit} roughness={0.92} />
          </mesh>
          {/* 柱顶灯：落印前是余烬，落印后是下一段的海色 */}
          <mesh position={[0, H + 0.5, 0]}>
            <sphereGeometry args={[0.42, 14, 12]} />
            <meshStandardMaterial
              color={open ? '#fff4dc' : '#3a3a38'}
              emissive={open ? color : '#5a3a1e'}
              emissiveIntensity={open ? 3.2 : 0.4}
              toneMapped={!open}
            />
          </mesh>
          <pointLight position={[0, H + 0.5, 0]} color={color} intensity={open ? 9 : 0} distance={30} decay={2} />
        </group>
      ))}

      {/* 门楣：一道横梁压在两根柱子之间，门因此有「上边」 */}
      <mesh position={[0, H + 1.6, 0]} castShadow>
        <boxGeometry args={[W + 4.2, 1.7, 2.2]} />
        <meshStandardMaterial color={stoneLit} roughness={0.86} metalness={0.18} />
      </mesh>
      <mesh position={[0, H + 0.5, 1.12]}>
        <boxGeometry args={[W + 2.4, 0.3, 0.12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={open ? 1.5 : 0.32} toneMapped={!open} />
      </mesh>

      {/* 门内的光：下一段的海色。落印前是一块暗石，落印后是一整面会呼吸的光 */}
      <mesh position={[0, H / 2 + 0.5, 0]}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial
          ref={veil}
          color={open ? color : '#2a2418'}
          transparent
          opacity={0.06}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={open ? THREE.AdditiveBlending : THREE.NormalBlending}
        />
      </mesh>
      {/* 门框内沿：一圈亮边，远看也知道这是个开口 */}
      <mesh position={[0, H / 2 + 0.5, 0.02]}>
        <ringGeometry args={[W * 0.52, W * 0.56, 4, 1, Math.PI / 4]} />
        <meshBasicMaterial ref={rim} color={color} transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* 水面上的门影与光路：从船这一侧指进门里 */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[W * 0.5, W * 0.62, 48]} />
        <meshBasicMaterial ref={halo} color={color} transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.09, 9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.2, 18]} />
        <meshBasicMaterial color={color} transparent opacity={open ? 0.16 : 0.05} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* 光柱：落印之后，这道门从任何方向都看得见。不是科幻，是灯塔的道理 */}
      {/* 锁着时也有一道很淡的光柱：从出海第一眼起，玩家就知道远处有一道门 */}
      <group>
          <mesh position={[0, 34, 0]}>
            <cylinderGeometry args={[0.9, 2.2, 68, 16, 1, true]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={open ? 0.07 : 0.03}
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              fog={false}
            />
          </mesh>
          <mesh position={[0, 34, 0]}>
            <cylinderGeometry args={[0.3, 0.62, 68, 12, 1, true]} />
            <meshBasicMaterial
              color="#fff4dc"
              transparent
              opacity={open ? 0.18 : 0.06}
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              fog={false}
            />
          </mesh>
      </group>

      {/* 夜里从远处看：门楣下方悬着一点光，是这一带的唯一航标 */}
      <mesh position={[0, H - 0.2, 0]}>
        <sphereGeometry args={[0.5, 10, 10]} />
        <meshStandardMaterial
          color={open ? '#fff8e8' : '#4a3a28'}
          emissive={color}
          emissiveIntensity={open ? 2.4 : 0.18}
          toneMapped={!open}
        />
      </mesh>
    </group>
  );
}


function SeaFurniture({ sceneId, reduceMotion }: { sceneId: string; reduceMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const dark = cssVar('--cv-ship-hull', '#2a211c');
  const stone = sceneId === 'A' ? '#4d4034' : sceneId === 'B' ? '#3a3f43' : sceneId === 'C' ? '#243a42' : '#1b2740';
  const cold = cssVar('--cv-ship-lamp-cool', '#8fb6c8');
  const warm = cssVar('--cv-ship-lamp-core', '#ffd9a0');

  useFrame(({ clock }) => {
    if (reduceMotion || !group.current) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.02) * 0.004;
  });

  const reeds = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => {
        const a = i * 2.399;
        const r = 34 + ((i * 17) % 26);
        return { x: Math.cos(a) * r, z: Math.sin(a) * r, h: 1.1 + ((i * 7) % 10) / 10 };
      }),
    [],
  );

  return (
    <group ref={group}>
      {sceneId === 'A' &&
        reeds.map((r, i) => (
          <mesh key={i} position={[r.x, r.h / 2, r.z]} rotation={[0, i * 0.7, 0.06]}>
            <cylinderGeometry args={[0.035, 0.05, r.h, 4]} />
            <meshStandardMaterial color="#6a5a3c" roughness={0.95} />
          </mesh>
        ))}

      {sceneId === 'B' &&
        [
          [-40, -112, 9],
          [-52, -100, 7],
          [-34, -124, 11],
        ].map(([x, z, h], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, h / 2, 0]}>
              <cylinderGeometry args={[0.9, 1.2, h, 8]} />
              <meshStandardMaterial color={stone} roughness={0.9} />
            </mesh>
            <mesh position={[0, h + 0.4, 0]}>
              <cylinderGeometry args={[0.7, 0.8, 3, 8]} />
              <meshStandardMaterial color={dark} roughness={0.9} />
            </mesh>
          </group>
        ))}

      {sceneId === 'C' &&
        Array.from({ length: 9 }, (_, i) => {
          const x = -44 + i * 11;
          return (
            <group key={i} position={[x, 0, -118]}>
              <mesh position={[0, 2.4, 0]}>
                <cylinderGeometry args={[0.05, 0.06, 4.8, 6]} />
                <meshStandardMaterial color={stone} roughness={0.7} metalness={0.4} />
              </mesh>
              <mesh position={[0, 4.9, 0]}>
                <sphereGeometry args={[0.11, 8, 8]} />
                <meshStandardMaterial color={warm} emissive={cold} emissiveIntensity={1.6} toneMapped={false} />
              </mesh>
            </group>
          );
        })}

      {sceneId === 'D' &&
        Array.from({ length: 7 }, (_, i) => {
          const x = -40 + i * 13;
          const z = -112 - (i % 3) * 7;
          return (
            <group key={i} position={[x, 0, z]}>
              <mesh position={[0, 0.4, 0]} rotation={[0, i * 0.4, 0]}>
                <boxGeometry args={[5.5, 0.8, 3]} />
                <meshStandardMaterial color={stone} roughness={0.8} metalness={0.3} />
              </mesh>
              <mesh position={[0, 0.95, 0]}>
                <boxGeometry args={[3.2, 0.12, 0.5]} />
                <meshStandardMaterial color={warm} emissive={cold} emissiveIntensity={1.2} toneMapped={false} />
              </mesh>
            </group>
          );
        })}
    </group>
  );
}


function SkyFollow({ material }: { material: THREE.Material }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => {
    if (ref.current) ref.current.position.set(camera.position.x, 0, camera.position.z);
  });
  return (
    <mesh ref={ref} material={material}>
      <sphereGeometry args={[170, 24, 16]} />
    </mesh>
  );
}

export function Atmosphere({
  reduceMotion,
  sceneId,
  world,
  collectedIds,
  nearFragmentId,
  laneId,
  portalOpen = false,
  fableState = {},
  crisisDone = false,
  taoyuanFound = false,
  hall = false,
  hallAt = null,
}: {
  reduceMotion: boolean;
  sceneId: string;
  world: WorldConfig;
  collectedIds: string[];
  nearFragmentId: string | null;
  laneId: string;
  portalOpen?: boolean;
  /** 这条航线上已经发生的事 */
  fableState?: FableState;
  crisisDone?: boolean;
  /** 暗线：进过桃花源的人，后来的时代才看得见它的回声 */
  taoyuanFound?: boolean;
  /** 开局的大殿：海上的人都不该在 */
  hall?: boolean;
  hallAt?: { x: number; z: number } | null;
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

  // 每个纪元自己的天体：河口低日、工业白日、电波冷月、自绘星夜无月。
  const celestial: Record<string, { color: string; pos: [number, number, number]; r: number; moon: boolean }> = {
    A: { color: cssVar('--cv-scene-light', '#ffcf94'), pos: [34, 14, -52], r: 7.4, moon: false },
    B: { color: '#e8e2d0', pos: [-26, 46, -58], r: 4.0, moon: false },
    C: { color: cssVar('--cv-ship-lamp-cool', '#bfe0ea'), pos: [-38, 30, -56], r: 4.6, moon: true },
    D: { color: '#dde4ff', pos: [10, 52, -64], r: 3.2, moon: true },
    test: { color: cssVar('--cv-ship-lamp-cool', '#8fb6c8'), pos: [-40, 38, -50], r: 4.5, moon: true },
  };
  const sky3 = celestial[sceneId] ?? celestial.test;

  return (
    <group>
      {/* 天空球跟着镜头：收帆时船会开出原来的海域，天不能有边 */}
      <SkyFollow material={sky} />
      <Suspense fallback={<WaterFallback />}>
        <HarborWater reduceMotion={reduceMotion} sceneId={sceneId} />
      </Suspense>
      <mesh position={sky3.pos}>
        <sphereGeometry args={[sky3.r, 20, 16]} />
        <meshBasicMaterial color={sky3.color} fog={false} />
      </mesh>
      {/* 天体周围一圈柔光：河口是暖晕，星夜是小冷晕 */}
      <mesh position={sky3.pos}>
        <sphereGeometry args={[sky3.r * (sky3.moon ? 1.5 : 1.9), 18, 14]} />
        <meshBasicMaterial color={sky3.color} transparent opacity={sky3.moon ? 0.07 : 0.1} depthWrite={false} fog={false} />
      </mesh>
      {/* D：自绘星点。稀疏、不闪 */}
      {sceneId === 'D' && (
        <group>
          {Array.from({ length: 70 }, (_, i) => {
            const a = i * 2.399963;
            const y = 12 + ((i * 37) % 70);
            const rad = 60 + ((i * 17) % 40);
            return (
              <mesh key={i} position={[Math.cos(a) * rad, y, Math.sin(a) * rad]}>
                <sphereGeometry args={[0.18 + (i % 4) * 0.07, 5, 5]} />
                <meshBasicMaterial color="#dde4ff" transparent opacity={0.45 + (i % 3) * 0.16} depthWrite={false} fog={false} />
              </mesh>
            );
          })}
        </group>
      )}
      <WeatherField sceneId={sceneId} reduceMotion={reduceMotion} />
      <SeaFurniture sceneId={sceneId} reduceMotion={reduceMotion} />
      {world.portal && (
        <Portal
          portal={world.portal}
          color={laneColor(true, sceneId)}
          reduceMotion={reduceMotion}
          open={portalOpen}
          face={Math.atan2((world.ports[0]?.x ?? 0) - world.portal.x, (world.ports[0]?.z ?? 0) - world.portal.z)}
        />
      )}
      {(world.lanes ?? []).map((lane: Lane) => (
        <SeaLane
          key={lane.id}
          lane={lane}
          active={lane.id === laneId}
          color={laneColor(lane.id === laneId, sceneId)}
          reduceMotion={reduceMotion}
        />
      ))}
      {world.ports.map((p) => (
        <PortSilhouette key={p.id} port={p} sceneId={sceneId} />
      ))}
      {/* 这条航线的戏：沿途岸上的景，和码头上等着你的那个人 */}
      <TaoyuanScene era={sceneId} found={taoyuanFound} reduceMotion={reduceMotion} />
      {/* 礁石、白浪、暗流：看得见的危险 */}
      <Reefs sceneId={sceneId} reduceMotion={reduceMotion} clear={hall ? hallAt : null} />
      {/* 收过东西的岛还在：岛上留着你做过的事 */}
      {!hall && world.fragments
        .filter((f) => collectedIds.includes(f.id) && f.lane === laneId && encounterFor(f.id)?.stage)
        .map((f) => (
          <group key={`isle-${f.id}`} position={[f.x + ISLAND_OFFSET.x, 0, f.z + ISLAND_OFFSET.z]}>
            <FableIsland id={f.id} enc={encounterFor(f.id)!} state={fableState} active={false} shipAt={fableLive.ship} reduceMotion={reduceMotion} />
          </group>
        ))}
      {(() => {
        const story = storyFor(sceneId, laneId);
        const port = world.ports[0];
        if (!story || !port || hall) return null;
        const fig = { x: port.x - 3.5, z: port.z + 4.5 };
        return (
          <>
            {story.crisis.stage && (
              <group position={[story.crisis.at.x + VILLAGE_OFFSET.x, 0, story.crisis.at.z + VILLAGE_OFFSET.z]}>
                {story.crisis.enc.history ? <HistoryMarker image={story.crisis.enc.history.image} completed={crisisDone} /> : story.crisis.stage === 'flood' ? (
                  <FloodVillage state={fableState} resolved={crisisDone} reduceMotion={reduceMotion} />
                ) : (
                  <CrisisScene stage={story.crisis.stage} state={fableState} resolved={crisisDone} reduceMotion={reduceMotion} />
                )}
              </group>
            )}
            <ShoreFigure
              figure={story.figure}
              at={fig}
              face={Math.atan2(story.crisis.at.x - fig.x, story.crisis.at.z - fig.z)}
              reduceMotion={reduceMotion}
            />
          </>
        );
      })()}
      {!hall && world.fragments
        .filter((f) => !collectedIds.includes(f.id) && (f.lane === 'both' || f.lane === laneId))
        .map((f) => (
          <group key={f.id} position={[f.x, 0, f.z]}>
            {/* 四段航线上只留故事：漂着的实物只在启航港这片练习海域里 */}
            {!encounterFor(f.id)?.stage && <Relic kind={relicKindOf(f.id)} active={nearFragmentId === f.id} reduceMotion={reduceMotion} />}
            {encounterFor(f.id)?.stage ? (
              // 童话小岛：一个人、一件执念，你做过的事会留在岛上
              <group position={[ISLAND_OFFSET.x, 0, ISLAND_OFFSET.z]}>
                <FableIsland
                  id={f.id}
                  enc={encounterFor(f.id)!}
                  state={fableState}
                  active={nearFragmentId === f.id}
                  shipAt={fableLive.ship}
                  reduceMotion={reduceMotion}
                />
              </group>
            ) : (
              encounterFor(f.id) && (
                <group position={[2.6, 0, 0.6]} rotation={[0, Math.atan2(-f.x, 22 - f.z) - 0.4, 0]}>
                  <LaneKeeper look={encounterFor(f.id)!.look} active={nearFragmentId === f.id} reduceMotion={reduceMotion} />
                </group>
              )
            )}
          </group>
        ))}
    </group>
  );
}
