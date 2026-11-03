import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { bootPushPose, desiredPose, easeSwell, landingPose, type CamMode } from './camera';
import { Cabin } from './Cabin';
import { Relic, relicKindOf } from './relics';
import { Atmosphere } from './Sea';
import { SHIP_L, TreasureShip } from './TreasureShip';
import { HULL_STYLES, STYLE_BY_SCENE } from './hull';
import { DECK_CREW, PLAYER_LOOK } from './encounters';
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { Hall, type EraKey } from './Hall';
import { ToneMappingMode } from 'postprocessing';
import { fableLive, type FableState } from './fable';
import { REEF_DAMAGE, seaStateFor } from './seaState';
import type { WorldConfig } from './world.config';
import { BLEND_SEC, DEST_TRAIL, FOLLOW_TAU, HARBOR_APPROACH, HEEL_MAX, HEEL_RETURN_TAU, HEEL_TAU, PORT_BEACON, PORT_BERTH, SHIP_MOTION } from './voyageConstants';

export type { CamMode };

const UP = new THREE.Vector3(0, 1, 0);

export interface ShipSnapshot {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  headingDeg: number;
  /** 顺风 1 · 逆风 -1 */
  windAlong: number;
  /** 刚撞上礁石：这一帧扣了多少 */
  reefHit: number;
  /** 离最近的礁石还有多远（用来预警） */
  reefNear: number;
}

export interface ControlInput {
  forward: number;
  turn: number;
  /** Shift 全速：0 或 1。烧补给 */
  boost?: number;
  /** 补给见底：船速打七折 */
  ration?: boolean;
}

interface Props {
  mode: CamMode;
  reduceMotion: boolean;
  canSail: boolean;
  sceneId: string;
  world: WorldConfig;
  collectedIds: string[];
  nearFragmentId: string | null;
  /** 这一程走的是哪条航道：'near' 沿岸 / 'far' 外海 */
  laneId: string;
  /** 门开没开：这一段落过印才开 */
  portalOpen?: boolean;
  /** 已经走完的段，用来在海图上留下笔迹 */
  struck: string[];
  /** 靠港戏的时间轴 0..1 */
  landingT?: number;
  /** 收帆：控制权交出去，船自己往前开 */
  autopilot?: boolean;
  /** 童话里这条航线已经发生的事 */
  fableState?: FableState;
  crisisDone?: boolean;
  /** 镜头推到这座岛上：遭遇或危机进行中 */
  stageAt?: { x: number; z: number; dist?: number; h?: number } | null;
  taoyuanFound?: boolean;
  /** 玩家名字：浮在甲板上他头顶 */
  player?: string | null;
  /** 开局大殿里亮着的那扇窗 */
  highlightEra?: EraKey | null;
  /** 显卡上下文丢失/恢复：由界面明确提示，不静默 */
  onGl?: (state: 'lost' | 'restored') => void;
  /** 这场戏的主角：从水里提上来的那件东西 */
  landingRelic?: string | null;
  input: ControlInput;
  restored?: { x: number; z: number; yaw: number } | null;
  onShip: (s: ShipSnapshot, nearPort: string | null, nearFragment: string | null, nearPortal: string | null) => void;
  onBlend?: (t: number) => void;
}

function cssVar(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function hexColor(name: string, fallback: string) {
  return new THREE.Color(cssVar(name, fallback));
}

const WAKE_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const WAKE_FRAG = /* glsl */ `
uniform float uSpeed;
uniform float uTime;
uniform float uReduce;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  float along = 1.0 - vUv.y;
  float center = 1.0 - abs(vUv.x - 0.5) * 2.0;
  float ribbon = pow(max(center, 0.0), 1.35) * pow(along, 0.45);
  float flow = sin(vUv.y * 22.0 - uTime * (2.2 + 5.0 * uSpeed)) * 0.07 * uSpeed * (1.0 - uReduce);
  float foam = step(0.72, fract(sin(dot(vUv, vec2(17.1, 9.4))) * 431.0)) * along * uSpeed;
  float alpha = clamp(ribbon * 0.42 * uSpeed + flow + foam * 0.18, 0.0, 0.55) * (1.0 - uReduce * 0.5);
  if (uSpeed < 0.04) alpha = 0.0;
  gl_FragColor = vec4(uColor, alpha);
}
`;

function Wake({
  speedRef,
  reduceMotion,
  maxSpeed,
}: {
  speedRef: React.MutableRefObject<number>;
  reduceMotion: boolean;
  maxSpeed: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const color = useMemo(() => hexColor('--cv-scene-water', '#123039').multiplyScalar(1.35), []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uSpeed: { value: 0 },
          uTime: { value: 0 },
          uReduce: { value: reduceMotion ? 1 : 0 },
          uColor: { value: color },
        },
        vertexShader: WAKE_VERT,
        fragmentShader: WAKE_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [reduceMotion, color],
  );
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    const s = Math.min(1, Math.abs(speedRef.current) / maxSpeed);
    mat.uniforms.uSpeed.value = s;
    mat.uniforms.uTime.value += dt;
    mat.uniforms.uReduce.value = reduceMotion ? 1 : 0;
    const len = 0.55 + s * 1.7;
    const wid = 0.7 + s * 0.9;
    for (const m of [mesh.current, left.current, right.current]) {
      if (!m) continue;
      m.scale.set(wid, 1, len);
      m.visible = s > 0.04;
    }
  });
  const len = SHIP_L * 3.2;
  const y = 0.05;
  const z = SHIP_L / 2 + len / 2 - 1.2;
  return (
    <group>
      <mesh ref={mesh} position={[0, y, z]} rotation={[-Math.PI / 2, 0, 0]} material={mat} renderOrder={2}>
        <planeGeometry args={[1.6, len]} />
      </mesh>
      <mesh ref={left} position={[-0.9, y, z]} rotation={[-Math.PI / 2, 0, 0.22]} material={mat} renderOrder={2}>
        <planeGeometry args={[1.1, len]} />
      </mesh>
      <mesh ref={right} position={[0.9, y, z]} rotation={[-Math.PI / 2, 0, -0.22]} material={mat} renderOrder={2}>
        <planeGeometry args={[1.1, len]} />
      </mesh>
    </group>
  );
}

function BowSpray({
  speedRef,
  maxSpeed,
  reduceMotion,
}: {
  speedRef: React.MutableRefObject<number>;
  maxSpeed: number;
  reduceMotion: boolean;
}) {
  const mats = useRef<THREE.MeshBasicMaterial[]>([]);
  useFrame(({ clock }) => {
    const s = Math.min(1, Math.abs(speedRef.current) / maxSpeed);
    const pulse = reduceMotion ? 1 : 0.75 + Math.sin(clock.elapsedTime * 11) * 0.25;
    for (const m of mats.current) {
      if (!m) continue;
      m.opacity = s > 0.12 ? 0.08 + s * 0.28 * pulse : 0;
    }
  });
  return (
    <group position={[0, 0.25, -SHIP_L / 2 - 0.2]}>
      {[-0.55, 0, 0.55].map((x, i) => (
        <mesh key={x} position={[x, 0.1, -0.3 - i * 0.08]} rotation={[-0.55, x * 0.4, 0]} renderOrder={3}>
          <planeGeometry args={[0.55, 1.15]} />
          <meshBasicMaterial
            ref={(m) => {
              if (m) mats.current[i] = m;
            }}
            color="#d7e6e9"
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function DestTrail({
  ship,
  visible,
  world,
  reduceMotion,
}: {
  ship: React.RefObject<THREE.Group | null>;
  visible: boolean;
  world: WorldConfig;
  reduceMotion: boolean;
}) {
  const n = DEST_TRAIL.count;
  const root = useRef<THREE.Group>(null);
  const mats = useRef<THREE.MeshBasicMaterial[]>([]);
  const brass = useMemo(() => hexColor('--cv-brass-300', '#dcbd84'), []);
  useFrame(({ clock }) => {
    const g = ship.current;
    const p = world.ports[0];
    const grp = root.current;
    if (!g || !p || !grp) return;
    const d = Math.hypot(g.position.x - p.x, g.position.z - p.z);
    const inside = d <= p.radius + 0.6;
    grp.visible = visible && !inside;
    if (!visible || inside) return;
    const start = p.radius;
    const gap = Math.min(DEST_TRAIL.bowGap, Math.max(1.2, (d - p.radius) * 0.25));
    const end = Math.max(start + 1.2, d - gap);
    const span = end - start;
    const waveT = (clock.elapsedTime % DEST_TRAIL.periodSec) / DEST_TRAIL.pulseSec;
    const pulseOn = !reduceMotion && d < p.radius * HARBOR_APPROACH.mid && waveT <= 1;
    for (let i = 0; i < n; i++) {
      const child = grp.children[i];
      if (!child) continue;
      const fromPort = start + (span * i) / (n - 1);
      const t = Math.min(0.999, fromPort / d);
      child.position.set(
        THREE.MathUtils.lerp(p.x, g.position.x, t),
        DEST_TRAIL.y,
        THREE.MathUtils.lerp(p.z, g.position.z, t),
      );
      const near = 1 - i / (n - 1);
      let emit = DEST_TRAIL.emitFar + (DEST_TRAIL.emitNear - DEST_TRAIL.emitFar) * near;
      if (pulseOn) {
        const u = i / (n - 1);
        const w = Math.max(0, 1 - Math.abs(u - waveT) * 4);
        emit += w * (1 - DEST_TRAIL.emitFar);
      } else if (reduceMotion) {
        emit = 0.85;
      }
      const m = mats.current[i];
      if (m) m.opacity = Math.min(1, emit);
    }
  });
  return (
    <group ref={root}>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false}>
          <circleGeometry args={[DEST_TRAIL.radius, 12]} />
          <meshBasicMaterial
            ref={(m) => {
              if (m) mats.current[i] = m;
            }}
            color={brass}
            transparent
            opacity={0.6}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

const BEACON_VERT = /* glsl */ `
varying float vH;
varying vec2 vUv;
void main() {
  vH = uv.y;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
// 灯柱：底部亮、向上淡出，两侧软边。不做激光线，不做扫描。
const BEACON_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uFade;
uniform float uTime;
uniform float uReduce;
varying float vH;
varying vec2 vUv;
void main() {
  float edge = sin(vUv.x * 3.14159);
  edge = pow(max(edge, 0.0), 2.2);
  float up = pow(1.0 - vH, 1.7);
  float ripple = uReduce > 0.5 ? 1.0 : 0.86 + 0.14 * sin(vH * 9.0 - uTime * 1.1);
  float a = up * edge * uFade * 0.30 * ripple;
  gl_FragColor = vec4(uColor, a);
}
`;

function PortBeacon({
  ship,
  world,
  reduceMotion,
}: {
  ship: React.RefObject<THREE.Group | null>;
  world: WorldConfig;
  reduceMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const fade = useRef(1);
  const core = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: hexColor('--cv-ship-lamp-core', '#ffd9a0') },
          uFade: { value: 1 },
          uTime: { value: 0 },
          uReduce: { value: reduceMotion ? 1 : 0 },
        },
        vertexShader: BEACON_VERT,
        fragmentShader: BEACON_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const halo = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: hexColor('--cv-ship-lamp-warm', '#f0b46a') },
          uFade: { value: 1 },
          uTime: { value: 0 },
          uReduce: { value: 1 },
        },
        vertexShader: BEACON_VERT,
        fragmentShader: BEACON_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useFrame((_, dt) => {
    const g = ship.current;
    const p = world.ports[0];
    if (!g || !p || !group.current) return;
    const d = Math.hypot(g.position.x - p.x, g.position.z - p.z);
    let target = 1;
    if (d < p.radius) target = 0;
    else if (d < p.radius * HARBOR_APPROACH.inner) target = PORT_BEACON.innerFade;
    const tau = reduceMotion ? 0.001 : 0.5;
    fade.current += (target - fade.current) * (1 - Math.exp(-Math.min(dt, 0.05) / tau));
    const t = performance.now() / 1000;
    for (const m of [core, halo]) {
      m.uniforms.uFade.value = fade.current;
      m.uniforms.uTime.value = t;
    }
    group.current.visible = fade.current > 0.02;
  });

  const p = world.ports[0];
  if (!p) return null;
  const h = PORT_BEACON.height * 0.62;

  return (
    <group ref={group} position={[p.x, 0, p.z]}>
      {/* 细柱：从码头灯高度起，向上淡出 */}
      <mesh position={[0, PORT_BEACON.baseY + h / 2, 0]} material={core} frustumCulled={false}>
        <cylinderGeometry args={[PORT_BEACON.radius * 0.6, PORT_BEACON.radius * 1.5, h, 12, 1, true]} />
      </mesh>
      {/* 外晕：更宽更淡，让它像雾里的光而不像激光 */}
      <mesh position={[0, PORT_BEACON.baseY + h / 2, 0]} material={halo} frustumCulled={false}>
        <cylinderGeometry args={[PORT_BEACON.radius * 3.2, PORT_BEACON.radius * 5.5, h * 0.9, 16, 1, true]} />
      </mesh>
    </group>
  );
}

function Rig({
  sceneId: sceneIdForStyle,
  mode,
  reduceMotion,
  canSail,
  input,
  restored,
  onShip,
  onBlend,
  world,
  collectedIds,
  laneId,
  struck,
  landingT = 0,
  landingRelic = null,
  autopilot = false,
  stageAt = null,
  player: playerName = null,
}: Props) {
  const ship = useRef<THREE.Group>(null);
  const rock = useRef<THREE.Group>(null);
  const exterior = useRef<THREE.Group>(null);
  // 场景 → 船型。props 里没有 sceneId（Rig 只收部分），从 world 的港口剪影推不合适，
  // 因此由下面 Rig 的调用处传入。
  const propsScene = sceneIdForStyle;
  // 镜头距离按当前船型长度缩放：木筏 14 与蒸汽船 26 用同一组常数会让船头出画。
  const shipL = HULL_STYLES[STYLE_BY_SCENE[propsScene] ?? 'junk']?.length ?? SHIP_L;
  const camScale = shipL / SHIP_L;
  const speed = useRef(0);
  const followYaw = useRef(0);
  const heel = useRef(0);
  const followOff = useRef({ back: SHIP_L * 1.1, right: SHIP_L * 0.55, height: 8.2, lookY: 3.4 });
  const restoredOnce = useRef(false);
  const blend = useRef(1);
  const blendFrom = useRef<THREE.Vector3>(new THREE.Vector3());
  const lookFrom = useRef<THREE.Vector3>(new THREE.Vector3());
  const fovFrom = useRef(42);
  const prevMode = useRef(mode);
  const fromMode = useRef(mode);
  const skip = useRef(false);
  const booted = useRef(false);
  const lastBlendNote = useRef(1);
  const approachHold = useRef(false);
  /** 靠港戏起步时的镜头位置，保证第一帧不跳 */
  const landFrom = useRef<{ pos: THREE.Vector3; look: THREE.Vector3; fov: number } | null>(null);
  /** 靠港戏的舞台：被提上来的那件东西，挂在世界坐标里，跟镜头走 */
  const relicStage = useRef<THREE.Group>(null);
  /**
   * 玩家自己的视角：滚轮/双指缩放，拖动环视，双击复位。
   * target 是输入直接改的值，cur 是镜头真正用的值（做阻尼，避免一顿一顿）。
   */
  const view = useRef({ zoom: 1, yaw: 0, pitch: 0, tZoom: 1, tYaw: 0, tPitch: 0, dragging: false });
  const glForInput = useThree((st) => st.gl);
  useEffect(() => {
    const el = glForInput.domElement;
    let drag: { x: number; y: number; id: number; moved: boolean } | null = null;
    const pinch = new Map<number, { x: number; y: number }>();
    let pinchD = 0;
    const clampAll = () => {
      const v = view.current;
      v.tZoom = THREE.MathUtils.clamp(v.tZoom, 0.38, 3.2);
      v.tPitch = THREE.MathUtils.clamp(v.tPitch, -0.22, 0.95);
      // 环视只在船尾半圈里转：镜头一旦绕到船头前面，按「前进」看起来就像在倒车
      v.tYaw = THREE.MathUtils.clamp(v.tYaw, -1.0, 1.0);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      view.current.tZoom *= Math.exp(e.deltaY * 0.0012);
      clampAll();
    };
    const onDown = (e: PointerEvent) => {
      pinch.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.size === 2) {
        const [a, b] = [...pinch.values()];
        pinchD = Math.hypot(a.x - b.x, a.y - b.y);
        drag = null;
        return;
      }
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
    };
    const onMove = (e: PointerEvent) => {
      if (pinch.has(e.pointerId)) pinch.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.size === 2) {
        const [a, b] = [...pinch.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchD > 0) view.current.tZoom *= pinchD / d;
        pinchD = d;
        clampAll();
        return;
      }
      if (!drag || drag.id !== e.pointerId) return;
      // 松手发生在窗口外时收不到 pointerup：按键已松开就当拖动结束，免得镜头粘在鼠标上
      if (e.buttons === 0) {
        drag = null;
        view.current.dragging = false;
        return;
      }
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      // 点一下不算拖：超过几个像素才开始环视
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      drag.moved = true;
      view.current.dragging = true;
      drag.x = e.clientX;
      drag.y = e.clientY;
      view.current.tYaw -= dx * 0.006;
      view.current.tPitch += dy * 0.004;
      clampAll();
    };
    const onUp = (e: PointerEvent) => {
      pinch.delete(e.pointerId);
      if (pinch.size < 2) pinchD = 0;
      if (drag?.id === e.pointerId) {
        drag = null;
        view.current.dragging = false;
      }
    };
    const onDbl = () => {
      const v = view.current;
      v.tZoom = 1;
      v.tYaw = 0;
      v.tPitch = 0;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    el.addEventListener('dblclick', onDbl);
    el.style.touchAction = 'none';
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      el.removeEventListener('dblclick', onDbl);
    };
  }, [glForInput]);

  /** 收帆开始后经过的秒数：先掉头离港，再匀速往外海去 */
  const autoT = useRef(0);
  const windAlong = useRef(0);
  const reefHit = useRef(0);
  const reefNear = useRef(Infinity);
  const lastReef = useRef(0);
  const { camera, gl } = useThree();
  const tmpFwd = useMemo(() => new THREE.Vector3(), []);
  const tmpRight = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const laggedFwd = useMemo(() => new THREE.Vector3(), []);
  const laggedRight = useMemo(() => new THREE.Vector3(), []);
  const persp = camera as THREE.PerspectiveCamera;

  useEffect(() => {
    if (!ship.current || restoredOnce.current) return;
    const s = restored ?? world.spawn;
    ship.current.position.set(s.x, 0, s.z);
    ship.current.rotation.y = s.yaw;
    followYaw.current = s.yaw;
    restoredOnce.current = true;
  }, [restored, world.spawn]);

  useEffect(() => {
    const el = gl.domElement;
    const go = () => {
      skip.current = true;
    };
    el.addEventListener('pointerdown', go);
    window.addEventListener('keydown', go);
    return () => {
      el.removeEventListener('pointerdown', go);
      window.removeEventListener('keydown', go);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const g = ship.current;
    const r = rock.current;
    if (!g) return;
    const clamped = Math.min(dt, 0.05);

    let nearPort: string | null = null;
    let approach = false;
    let harborDist = Infinity;
    let harbor: (typeof world.ports)[number] | null = null;
    for (const p of world.ports) {
      const dx = g.position.x - p.x;
      const dz = g.position.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < harborDist) {
        harborDist = d;
        harbor = p;
      }
      if (d < p.radius) nearPort = p.id;
      // 靠港判定必须算上码头进深与船体半径：码头平台厚 15、伸向玩家半个身位，
      // 只按 radius 判定会出现「船头已顶住码头、提示仍不出现」。
      if (d < p.radius + PORT_BERTH.slack) nearPort = p.id;
    }
    if (harbor) {
      const r = harbor.radius;
      if (harborDist < r * HARBOR_APPROACH.mid) approachHold.current = true;
      else if (harborDist > r * HARBOR_APPROACH.exit) approachHold.current = false;
    }
    approach = approachHold.current;
    let nearFragment: string | null = null;
    for (const f of world.fragments) {
      if (collectedIds.includes(f.id)) continue;
      // 不在这一条航道上的东西，既看不见也拾不到
      if (f.lane !== 'both' && f.lane !== laneId) continue;
      const dx = g.position.x - f.x;
      const dz = g.position.z - f.z;
      if (dx * dx + dz * dz < f.pickupRadius * f.pickupRadius) nearFragment = f.id;
    }

    let nearPortal: string | null = null;
    if (world.portal) {
      const dx = g.position.x - world.portal.x;
      const dz = g.position.z - world.portal.z;
      if (dx * dx + dz * dz < world.portal.radius * world.portal.radius) nearPortal = world.portal.to;
    }

    if (canSail) {
      let capMul = 1;
      if (harbor) {
        const r = harbor.radius;
        if (harborDist < r * HARBOR_APPROACH.inner) capMul = HARBOR_APPROACH.innerCap;
        else if (harborDist < r * HARBOR_APPROACH.mid) capMul = HARBOR_APPROACH.midCap;
        else if (harborDist < r * HARBOR_APPROACH.outer) capMul = HARBOR_APPROACH.outerCap;
        tmpFwd.set(0, 0, -1).applyQuaternion(g.quaternion);
        const bearing = Math.atan2(harbor.x - g.position.x, -(harbor.z - g.position.z));
        const heading = Math.atan2(tmpFwd.x, -tmpFwd.z);
        let err = bearing - heading;
        while (err > Math.PI) err -= Math.PI * 2;
        while (err < -Math.PI) err += Math.PI * 2;
        const absErr = Math.abs(err);
        const align = (HARBOR_APPROACH.alignDeg * Math.PI) / 180;
        const hard = (HARBOR_APPROACH.alignHardDeg * Math.PI) / 180;
        if (absErr > align) {
          const t = Math.min(1, (absErr - align) / (hard - align));
          capMul *= 1 - (1 - HARBOR_APPROACH.misalignCap) * t;
        }
      }
      // 风：顺风最多快三成，逆风最多慢四成。智能段几乎无风，蒸汽船吃风也少
      tmpFwd.set(0, 0, -1).applyQuaternion(g.quaternion);
      const seaNow = seaStateFor(sceneIdForStyle);
      const along = tmpFwd.x * seaNow.wind.dx + tmpFwd.z * seaNow.wind.dz;
      const sailFactor = STYLE_BY_SCENE[sceneIdForStyle] === 'junk' || STYLE_BY_SCENE[sceneIdForStyle] === 'raft' ? 1 : 0.4;
      const windMul = 1 + seaNow.wind.k * sailFactor * (along > 0 ? 0.3 * along : 0.4 * along);
      windAlong.current = along;
      const cap = world.ship.maxSpeed * (autopilot ? 1 : capMul) * windMul * (1 + 0.65 * (autopilot ? 0 : input.boost ?? 0)) * (input.ration && !autopilot ? 0.7 : 1);
      // 收帆：不再听玩家的，匀速往前，一点点偏向外海
      if (autopilot) autoT.current += clamped;
      else autoT.current = 0;
      const fwdIn = autopilot ? Math.min(0.5, 0.12 + autoT.current * 0.06) : input.forward;
      const target = fwdIn >= 0 ? fwdIn * cap : fwdIn * world.ship.reverseSpeed;
      speed.current += (target - speed.current) * Math.min(1, world.ship.accel * clamped);
      // 掉头约 150°：从码头调转船头朝外海，然后几乎不再转
      const autoTurn = autoT.current < 6 ? 0.62 : 0.03;
      g.rotation.y += (autopilot ? autoTurn : input.turn) * world.ship.turn * clamped;
      tmpFwd.set(0, 0, -1).applyQuaternion(g.quaternion);
      g.position.addScaledVector(tmpFwd, speed.current * clamped);
      // 暗流：在它范围里，被往一边推
      if (!autopilot) {
        for (const c of seaNow.currents) {
          const d = Math.hypot(g.position.x - c.x, g.position.z - c.z);
          if (d < c.r) {
            const f = (1 - d / c.r) * c.k * clamped;
            g.position.x += c.dx * f;
            g.position.z += c.dz * f;
          }
        }
      }
      // 礁石：撞上就弹开、掉速、扣耐久
      reefHit.current = 0;
      reefNear.current = Infinity;
      if (!autopilot) {
        for (const rf of seaNow.reefs) {
          const dx = g.position.x - rf.x;
          const dz = g.position.z - rf.z;
          const d = Math.hypot(dx, dz);
          const hitR = rf.r + world.ship.radius * 0.45;
          reefNear.current = Math.min(reefNear.current, d - hitR);
          if (d < hitR) {
            const push = (hitR - d) + 0.3;
            g.position.x += (dx / (d || 1)) * push;
            g.position.z += (dz / (d || 1)) * push;
            if (performance.now() - lastReef.current > 700) {
              lastReef.current = performance.now();
              reefHit.current = REEF_DAMAGE * (0.6 + Math.min(1, Math.abs(speed.current) / world.ship.maxSpeed) * 0.8);
            }
            speed.current *= 0.35;
          }
        }
      }
      if (!autopilot) {
        g.position.x = THREE.MathUtils.clamp(g.position.x, world.bounds.minX, world.bounds.maxX);
        g.position.z = THREE.MathUtils.clamp(g.position.z, world.bounds.minZ, world.bounds.maxZ);
      }
    } else {
      speed.current *= 1 - Math.min(1, 4 * clamped);
    }

    if (r) {
      if (!reduceMotion) {
        const t = performance.now() / 1000;
        const deg = Math.PI / 180;
        const pitch = Math.sin((t * Math.PI * 2) / SHIP_MOTION.pitch.t + SHIP_MOTION.pitch.p) * SHIP_MOTION.pitch.a * deg;
        const roll = Math.sin((t * Math.PI * 2) / SHIP_MOTION.roll.t + SHIP_MOTION.roll.p) * SHIP_MOTION.roll.a * deg;
        const yawSway = Math.sin((t * Math.PI * 2) / SHIP_MOTION.yaw.t + SHIP_MOTION.yaw.p) * SHIP_MOTION.yaw.a * deg;
        const heave = Math.sin((t * Math.PI * 2) / SHIP_MOTION.heave.t + SHIP_MOTION.heave.p) * SHIP_MOTION.heave.a;
        const heelTarget = -Math.max(-1, Math.min(1, input.turn)) * HEEL_MAX;
        const tau = Math.abs(heelTarget) > Math.abs(heel.current) ? HEEL_TAU : HEEL_RETURN_TAU;
        heel.current += (heelTarget - heel.current) * (1 - Math.exp(-clamped / tau));
        r.rotation.x = pitch;
        r.rotation.z = roll + heel.current;
        r.rotation.y = yawSway;
        r.position.y = heave;
      } else {
        r.rotation.x = 0;
        r.rotation.z = 0;
        r.rotation.y = 0;
        r.position.y = 0;
      }
    }

    tmpFwd.set(0, 0, -1).applyQuaternion(g.quaternion);
    tmpRight.crossVectors(tmpFwd, UP).normalize();

    const tau = reduceMotion ? 0.001 : FOLLOW_TAU.yaw;
    const yawK = 1 - Math.exp(-clamped / tau);
    followYaw.current += (g.rotation.y - followYaw.current) * yawK;
    laggedFwd.set(0, 0, -1).applyAxisAngle(UP, followYaw.current);
    laggedRight.crossVectors(laggedFwd, UP).normalize();

    const headingFwd = mode === 'follow' ? laggedFwd : tmpFwd;
    const headingRight = mode === 'follow' ? laggedRight : tmpRight;
    const pose = desiredPose(mode, g.position, headingFwd, headingRight, camScale);

    if (!booted.current) {
      blendFrom.current.copy(camera.position);
      lookFrom.current.copy(pose.look);
      fovFrom.current = persp.fov;
      blend.current = reduceMotion ? 1 : 0;
      booted.current = true;
    }

    if (prevMode.current !== mode) {
      fromMode.current = prevMode.current;
      blendFrom.current.copy(camera.position);
      lookFrom.current.copy(look);
      fovFrom.current = persp.fov;
      blend.current = reduceMotion ? 1 : 0;
      skip.current = false;
      prevMode.current = mode;
    }

    const dur = Math.max(0.001, reduceMotion ? 0.001 : BLEND_SEC[mode] ?? 1.2);
    if (skip.current || reduceMotion) blend.current = 1;
    else blend.current = Math.min(1, blend.current + clamped / dur);
    const k = easeSwell(blend.current);

    if (mode !== 'landing') {
      landFrom.current = null;
      if (relicStage.current) relicStage.current.visible = false;
    }

    {
      const v = view.current;
      const kk = reduceMotion ? 1 : 1 - Math.exp(-clamped / 0.16);
      // 一开船，环视角就慢慢回到船尾：前进永远是「离开镜头」的方向
      if (!v.dragging && (input.forward !== 0 || input.turn !== 0 || autopilot)) {
        v.tYaw *= Math.exp(-clamped / 0.9);
      }
      v.zoom += (v.tZoom - v.zoom) * kk;
      v.yaw += (v.tYaw - v.yaw) * kk;
      v.pitch += (v.tPitch - v.pitch) * kk;
    }

    const useBoot =
      mode === 'cockpit' && fromMode.current === 'embark' && blend.current < 1 && !reduceMotion && !skip.current;

    if (mode === 'landing') {
      const lp = landingPose(landingT, g.position, tmpFwd, tmpRight, camScale);
      if (!landFrom.current) {
        landFrom.current = { pos: camera.position.clone(), look: look.clone(), fov: persp.fov };
      }
      // 前 18% 从当前机位接过去，再完全交给这场戏的轨道
      const handoff = Math.min(1, landingT / 0.18);
      const h = easeSwell(handoff);
      camera.position.lerpVectors(landFrom.current.pos, lp.pos, h);
      look.lerpVectors(landFrom.current.look, lp.look, h);
      camera.up.copy(UP);
      camera.lookAt(look);
      persp.fov = THREE.MathUtils.lerp(landFrom.current.fov, lp.fov, h);
      persp.updateProjectionMatrix();
      relicStage.current?.position.copy(lp.relic);
      if (relicStage.current) {
        // 东西从船头下方的水里升上来，停在镜头前
        const rise = THREE.MathUtils.clamp((landingT - 0.04) / 0.36, 0, 1);
        const e = easeSwell(rise);
        const sc0 = (0.9 + e * 0.9) * Math.max(1, camScale);
        // 镜头瞄的是物件中心，不是它的底座：底座往下压半个身高
        relicStage.current.position.y = lp.relic.y - (1 - e) * 2.6 * camScale - 0.85 * sc0;
        relicStage.current.rotation.order = 'YXZ';
        relicStage.current.rotation.y = g.rotation.y + Math.PI * 0.18 + (1 - e) * 0.9 + landingT * 0.35;
        // 表盘、星图这类平放的东西，要把正面朝向镜头，否则从侧面只看到一条边
        relicStage.current.rotation.x = 0.5 * e;
        relicStage.current.visible = true;
        // 主角要压得住画面：比海上那件大一倍多
        relicStage.current.scale.setScalar(sc0);
      }
    } else if (useBoot) {
      const boot = bootPushPose(blend.current, g.position, tmpFwd, tmpRight);
      camera.position.copy(boot.pos);
      look.copy(boot.look);
      camera.up.copy(UP);
      camera.lookAt(look);
      persp.fov = boot.fov;
      persp.updateProjectionMatrix();
    } else if (mode === 'follow' && blend.current >= 1 && stageAt) {
      // 遭遇：镜头离开船，推到那座小岛上。人在画面中间，船在画面一角
      const toShip = new THREE.Vector3(g.position.x - stageAt.x, 0, g.position.z - stageAt.z);
      const dist = toShip.length() || 1;
      toShip.divideScalar(dist);
      const side = new THREE.Vector3(-toShip.z, 0, toShip.x);
      const want = new THREE.Vector3(stageAt.x, 0, stageAt.z)
        .addScaledVector(toShip, stageAt.dist ?? 12.5)
        .addScaledVector(side, (stageAt.dist ?? 12.5) * 0.32)
        .setY(stageAt.h ?? 6.0);
      const k = 1 - Math.exp(-clamped / (reduceMotion ? 0.01 : 0.55));
      camera.position.lerp(want, k);
      look.lerp(new THREE.Vector3(stageAt.x, 2.4, stageAt.z), k);
      camera.up.copy(UP);
      camera.lookAt(look);
      persp.fov = THREE.MathUtils.lerp(persp.fov, 38, k);
      persp.updateProjectionMatrix();
    } else if (mode === 'follow' && blend.current >= 1) {
      // 跟船弹簧：距离、横移、高度、注视点都按当前船型长度缩放，
      // 否则蒸汽船（L=26）船头出画、木筏（L=14）又空得只剩海。
      const L = SHIP_L * camScale;
      const vw = view.current;
      const dist = (approach ? L * 0.95 : L * 1.45) * vw.zoom;
      const az = THREE.MathUtils.clamp(((approach ? 60 : 35) * Math.PI) / 180 + vw.yaw, -1.4, 1.4);
      const el = ((approach ? 12 : 18) * Math.PI) / 180 + vw.pitch;
      const dBack = dist * Math.cos(az) * Math.cos(el);
      const dRight = dist * Math.sin(az) * Math.cos(el);
      const dHeight = dist * Math.sin(el) + 2 + (camScale - 1) * 3;
      const turnRate = input.turn * world.ship.turn;
      const extra = Math.min(Math.abs(turnRate) / ((60 * Math.PI) / 180), 1) * 0.12 * L * Math.sign(turnRate || 1);
      const damp = (cur: number, target: number, t: number) =>
        reduceMotion ? target : target + (cur - target) * Math.exp(-clamped / t);
      followOff.current.back = damp(followOff.current.back, dBack, FOLLOW_TAU.dist);
      followOff.current.right = damp(followOff.current.right, dRight + extra, FOLLOW_TAU.lateral);
      followOff.current.height = damp(followOff.current.height, dHeight, FOLLOW_TAU.height);
      followOff.current.lookY = damp(followOff.current.lookY, approach ? 2.6 : 3.4, FOLLOW_TAU.pitch);
      camera.position
        .copy(g.position)
        .addScaledVector(laggedFwd, -followOff.current.back)
        .addScaledVector(laggedRight, followOff.current.right)
        .addScaledVector(UP, followOff.current.height);
      if (approach && harbor) {
        look.set(
          THREE.MathUtils.lerp(g.position.x + laggedFwd.x * 0.6 * L, harbor.x, 0.35),
          followOff.current.lookY,
          THREE.MathUtils.lerp(g.position.z + laggedFwd.z * 0.6 * L, harbor.z, 0.35),
        );
      } else {
        look.copy(g.position).addScaledVector(laggedFwd, 0.3 * L * Math.min(vw.zoom, 1.6)).setY(followOff.current.lookY);
      }
      camera.up.copy(UP);
      camera.lookAt(look);
      persp.fov = THREE.MathUtils.lerp(persp.fov, approach ? 46 : 54, 1 - Math.exp(-clamped / 0.35));
      persp.updateProjectionMatrix();
    } else {
      camera.position.lerpVectors(blendFrom.current, pose.pos, k);
      look.lerpVectors(lookFrom.current, pose.look, k);
      camera.up.copy(pose.up);
      camera.lookAt(look);
      persp.fov = THREE.MathUtils.lerp(fovFrom.current, pose.fov, k);
      persp.updateProjectionMatrix();
    }
    const note = blend.current < 0.98 ? 0 : 1;
    if (note !== lastBlendNote.current) {
      lastBlendNote.current = note;
      onBlend?.(blend.current);
    }

    fableLive.ship.x = g.position.x;
    fableLive.ship.z = g.position.z;
    onShip(
      {
        x: g.position.x,
        z: g.position.z,
        yaw: g.rotation.y,
        speed: speed.current,
        windAlong: windAlong.current,
        reefHit: reefHit.current,
        reefNear: reefNear.current,
        // 0° = local −z (N). +90° = +x (E). yaw 0 → fwd (0,0,−1) → 0.
        headingDeg: (Math.atan2(tmpFwd.x, -tmpFwd.z) * 180) / Math.PI,
      },
      nearPort,
      nearFragment,
      nearPortal,
    );
  });

  return (
    <>
      {/* 靠港戏的主角：从水里提上来，停在镜头前。只在戏里可见 */}
      <group ref={relicStage} visible={false}>
        {landingRelic && (
          <>
            <Relic kind={relicKindOf(landingRelic)} active hero reduceMotion={reduceMotion} />
            {/* 一束从上方落下的光，只照这件东西 */}
            <spotLight position={[0.6, 4.2, 1.4]} angle={0.5} penumbra={0.8} intensity={26} distance={12} color="#ffe3b8" />
            <pointLight position={[-1.6, 1.2, 1.6]} intensity={3.2} distance={7} color="#8fb6c8" />
            <pointLight position={[1.4, 1.6, -1.2]} intensity={2.4} distance={6} color="#ffd9a0" />
          </>
        )}
      </group>
      <group ref={ship} position={[world.spawn.x, 0, world.spawn.z]}>
        <group ref={rock}>
          {/* 驾驶舱是独立舱室：此时隐藏船体外壳，否则桅杆与桅座会穿进镜头 */}
          {/* 靠港戏与驾驶舱都不需要船体外壳：一个会挡住主角，一个会穿进镜头 */}
          <group ref={exterior} visible={mode !== 'cockpit' && mode !== 'landing'}>
            <Suspense fallback={null}>
              <TreasureShip
                reduceMotion={reduceMotion}
                style={HULL_STYLES[STYLE_BY_SCENE[propsScene] ?? 'junk']}
                crew={DECK_CREW[propsScene] ?? DECK_CREW.test}
                player={playerName ? { name: playerName, look: PLAYER_LOOK[propsScene] ?? PLAYER_LOOK.test } : null}
              />
            </Suspense>
            <Wake speedRef={speed} reduceMotion={reduceMotion} maxSpeed={world.ship.maxSpeed} />
            <BowSpray speedRef={speed} reduceMotion={reduceMotion} maxSpeed={world.ship.maxSpeed} />
          </group>
          {mode === 'cockpit' && (
            <Suspense fallback={null}>
              <Cabin struck={struck} sceneId={propsScene} />
            </Suspense>
          )}
        </group>
      </group>
      <DestTrail ship={ship} visible={mode === 'follow' || mode === 'route'} world={world} reduceMotion={reduceMotion} />
      <PortBeacon ship={ship} world={world} reduceMotion={reduceMotion} />
    </>
  );
}

function SceneTint({ sceneId }: { sceneId: string }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const sky = cssVar('--cv-scene-sky-top', '#0d1a20');
    const fogCol = hexColor('--cv-scene-fog', '#1c3139');
    gl.setClearColor(sky, 1);
    scene.background = new THREE.Color(sky);
    if (scene.fog instanceof THREE.Fog) scene.fog.color.copy(fogCol);
  }, [sceneId, gl, scene]);
  return null;
}

export function VoyageCanvas(props: Props) {
  const fog = hexColor('--cv-scene-fog', '#1c3139');
  const sky = cssVar('--cv-scene-sky-top', '#0d1a20');
  const lamp = hexColor('--cv-scene-light', '#f1d9a8');

  return (
    <div className="world-canvas">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ fov: 34, near: 0.3, far: 420, position: [28, 5.2, 8] }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            if (gl.domElement.isConnected) props.onGl?.('lost');
          });
          gl.domElement.addEventListener('webglcontextrestored', () => props.onGl?.('restored'));
          gl.setClearColor(sky, 1);
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.22;
        }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={[sky]} />
        <fog attach="fog" args={[fog, 55, 210]} />
        <SceneTint sceneId={props.sceneId} />
        <ambientLight intensity={0.24} color={'#8a9298'} />
        <hemisphereLight args={['#7d8c96', '#1a1410', 0.38]} />
        <directionalLight position={[-22, 26, 18]} intensity={0.42} color={'#b7c4ce'} />
        <directionalLight position={[6, 9, -26]} intensity={0.55} color={'#c9a15a'} />
        <directionalLight
          position={[18, 24, 10]}
          intensity={1.55}
          color={lamp}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={2}
          shadow-camera-far={90}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
        />
        <Atmosphere
          reduceMotion={props.reduceMotion}
          sceneId={props.sceneId}
          world={props.world}
          collectedIds={props.collectedIds}
          nearFragmentId={props.nearFragmentId}
          laneId={props.laneId}
          portalOpen={props.portalOpen ?? false}
          fableState={props.fableState}
          crisisDone={props.crisisDone}
          taoyuanFound={props.taoyuanFound}
        />
        {props.mode === 'embark' && (
          <Hall
            center={{ x: props.restored?.x ?? props.world.spawn.x, z: props.restored?.z ?? props.world.spawn.z }}
            yaw={props.restored?.yaw ?? props.world.spawn.yaw}
            highlight={props.highlightEra ?? null}
            reduceMotion={props.reduceMotion}
          />
        )}
        <Rig {...props} />
        {/* 后期：灯火与光柱真正发光，暗角把视线收向画面中心。参考 pmndrs/react-postprocessing */}
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom mipmapBlur luminanceThreshold={0.82} luminanceSmoothing={0.25} intensity={props.reduceMotion ? 0.5 : 0.85} radius={0.7} />
          <Vignette eskil={false} offset={0.28} darkness={0.62} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}


