import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { bootPushPose, desiredPose, easeSwell, type CamMode } from './camera';
import { Cabin } from './Cabin';
import { Atmosphere } from './Sea';
import { SHIP_L, TreasureShip } from './TreasureShip';
import { WORLD } from './world.config';
import { BLEND_SEC, FOLLOW_TAU, HEEL_MAX, HEEL_RETURN_TAU, HEEL_TAU, SHIP_MOTION } from './voyageConstants';

export type { CamMode };

const UP = new THREE.Vector3(0, 1, 0);

export interface ShipSnapshot {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  headingDeg: number;
}

export interface ControlInput {
  forward: number;
  turn: number;
}

interface Props {
  mode: CamMode;
  reduceMotion: boolean;
  canSail: boolean;
  sceneId: string;
  input: ControlInput;
  restored?: { x: number; z: number; yaw: number } | null;
  onShip: (s: ShipSnapshot, nearPort: string | null, nearFragment: string | null) => void;
  onBlend?: (t: number) => void;
}

function cssVar(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function hexColor(name: string, fallback: string) {
  return new THREE.Color(cssVar(name, fallback));
}

function Wake({ speedRef, reduceMotion }: { speedRef: React.MutableRefObject<number>; reduceMotion: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#d7e4e8',
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  useFrame(() => {
    const s = Math.min(1, Math.abs(speedRef.current) / WORLD.ship.maxSpeed);
    const m = mesh.current;
    if (!m) return;
    m.scale.set(0.7 + s * 0.9, 1, 0.45 + s * 1.35);
    mat.opacity = reduceMotion ? 0.1 : 0.08 + s * 0.32;
  });
  return (
    <mesh ref={mesh} position={[0, 0.05, SHIP_L / 2 + 8.5]} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
      <planeGeometry args={[2.2, 17]} />
    </mesh>
  );
}

function DestLine({
  ship,
  visible,
}: {
  ship: React.RefObject<THREE.Group | null>;
  visible: boolean;
}) {
  const obj = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const mat = new THREE.LineBasicMaterial({
      color: '#c9a15a',
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    return line;
  }, []);
  useFrame(() => {
    obj.visible = visible;
    const g = ship.current;
    if (!g || !visible) return;
    const p = WORLD.ports[0];
    const arr = obj.geometry.getAttribute('position') as THREE.BufferAttribute;
    arr.setXYZ(0, g.position.x, 0.25, g.position.z);
    arr.setXYZ(1, p.x, 1.2, p.z);
    arr.needsUpdate = true;
  });
  return <primitive object={obj} />;
}

function Rig({
  mode,
  reduceMotion,
  canSail,
  input,
  restored,
  onShip,
  onBlend,
}: Omit<Props, 'sceneId'>) {
  const ship = useRef<THREE.Group>(null);
  const rock = useRef<THREE.Group>(null);
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
  const { camera, gl } = useThree();
  const tmpFwd = useMemo(() => new THREE.Vector3(), []);
  const tmpRight = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const laggedFwd = useMemo(() => new THREE.Vector3(), []);
  const laggedRight = useMemo(() => new THREE.Vector3(), []);
  const persp = camera as THREE.PerspectiveCamera;

  useEffect(() => {
    if (!ship.current || restoredOnce.current) return;
    const s = restored ?? WORLD.spawn;
    ship.current.position.set(s.x, 0, s.z);
    ship.current.rotation.y = s.yaw;
    followYaw.current = s.yaw;
    restoredOnce.current = true;
  }, [restored]);

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

    if (canSail) {
      const target = input.forward >= 0 ? input.forward * WORLD.ship.maxSpeed : input.forward * WORLD.ship.reverseSpeed;
      speed.current += (target - speed.current) * Math.min(1, WORLD.ship.accel * clamped);
      g.rotation.y += input.turn * WORLD.ship.turn * clamped;
      tmpFwd.set(0, 0, -1).applyQuaternion(g.quaternion);
      g.position.addScaledVector(tmpFwd, speed.current * clamped);
      g.position.x = THREE.MathUtils.clamp(g.position.x, WORLD.bounds.minX, WORLD.bounds.maxX);
      g.position.z = THREE.MathUtils.clamp(g.position.z, WORLD.bounds.minZ, WORLD.bounds.maxZ);
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
    const pose = desiredPose(mode, g.position, headingFwd, headingRight);

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

    const useBoot =
      mode === 'cockpit' && fromMode.current === 'embark' && blend.current < 1 && !reduceMotion && !skip.current;

    if (useBoot) {
      const boot = bootPushPose(blend.current, g.position, tmpFwd, tmpRight);
      camera.position.copy(boot.pos);
      look.copy(boot.look);
      camera.up.copy(UP);
      camera.lookAt(look);
      persp.fov = boot.fov;
      persp.updateProjectionMatrix();
    } else if (mode === 'follow' && blend.current >= 1) {
      const dist = SHIP_L * 1.35;
      const az = (35 * Math.PI) / 180;
      const el = (18 * Math.PI) / 180;
      const dBack = dist * Math.cos(az) * Math.cos(el);
      const dRight = dist * Math.sin(az) * Math.cos(el);
      const dHeight = dist * Math.sin(el) + 2;
      const turnRate = input.turn * WORLD.ship.turn;
      const extra = Math.min(Math.abs(turnRate) / ((60 * Math.PI) / 180), 1) * 0.12 * SHIP_L * Math.sign(turnRate || 1);
      const damp = (cur: number, target: number, t: number) =>
        reduceMotion ? target : target + (cur - target) * Math.exp(-clamped / t);
      followOff.current.back = damp(followOff.current.back, dBack, FOLLOW_TAU.dist);
      followOff.current.right = damp(followOff.current.right, dRight + extra, FOLLOW_TAU.lateral);
      followOff.current.height = damp(followOff.current.height, dHeight, FOLLOW_TAU.height);
      followOff.current.lookY = damp(followOff.current.lookY, 3.4, FOLLOW_TAU.pitch);
      camera.position
        .copy(g.position)
        .addScaledVector(laggedFwd, -followOff.current.back)
        .addScaledVector(laggedRight, followOff.current.right)
        .addScaledVector(UP, followOff.current.height);
      look.copy(g.position).addScaledVector(laggedFwd, 0.6 * SHIP_L).setY(followOff.current.lookY);
      camera.up.copy(UP);
      camera.lookAt(look);
      persp.fov = pose.fov;
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

    let nearPort: string | null = null;
    for (const p of WORLD.ports) {
      const dx = g.position.x - p.x;
      const dz = g.position.z - p.z;
      if (dx * dx + dz * dz < p.radius * p.radius) nearPort = p.id;
    }
    let nearFragment: string | null = null;
    for (const f of WORLD.fragments) {
      const dx = g.position.x - f.x;
      const dz = g.position.z - f.z;
      if (dx * dx + dz * dz < f.pickupRadius * f.pickupRadius) nearFragment = f.id;
    }

    onShip(
      {
        x: g.position.x,
        z: g.position.z,
        yaw: g.rotation.y,
        speed: speed.current,
        headingDeg: (Math.atan2(-tmpFwd.x, -tmpFwd.z) * 180) / Math.PI,
      },
      nearPort,
      nearFragment,
    );
  });

  return (
    <>
      <group ref={ship} position={[WORLD.spawn.x, 0, WORLD.spawn.z]}>
        <group ref={rock}>
          <TreasureShip />
          <Cabin />
          <Wake speedRef={speed} reduceMotion={reduceMotion} />
        </group>
      </group>
      <DestLine ship={ship} visible={mode === 'follow' || mode === 'route'} />
    </>
  );
}

export function VoyageCanvas(props: Props) {
  const fog = hexColor('--cv-scene-fog', '#1c3139');
  const sky = cssVar('--cv-scene-sky-top', '#0d1a20');
  const lamp = hexColor('--cv-scene-light', '#f1d9a8');

  return (
    <div className="world-canvas">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ fov: 34, near: 0.1, far: 360, position: [28, 5.2, 8] }}
        onCreated={({ gl }) => {
          gl.setClearColor(sky, 1);
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.22;
        }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={[sky]} />
        <fog attach="fog" args={[fog, 70, 190]} />
        <ambientLight intensity={0.42} color={'#9aa8b0'} />
        <hemisphereLight args={['#8aa0aa', '#1a1410', 0.62]} />
        <directionalLight
          position={[-22, 26, 18]}
          intensity={0.85}
          color={'#c5d3de'}
        />
        <directionalLight
          position={[18, 24, 10]}
          intensity={1.35}
          color={lamp}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={2}
          shadow-camera-far={90}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
        />
        <Atmosphere test={props.sceneId === 'neutral-test' || props.sceneId === 'test'} reduceMotion={props.reduceMotion} />
        <Rig {...props} />
      </Canvas>
    </div>
  );
}


