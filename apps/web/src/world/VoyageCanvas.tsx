import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { WORLD } from './world.config';

const UP = new THREE.Vector3(0, 1, 0);

export type CamMode = 'embark' | 'cockpit' | 'route' | 'follow' | 'port' | 'reflection';

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
}

function cssVar(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function hexColor(name: string, fallback: string) {
  return new THREE.Color(cssVar(name, fallback));
}

function ShipBody() {
  const wood = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a2a1c', roughness: 0.85, metalness: 0.05 }), []);
  const brass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ad8443', roughness: 0.45, metalness: 0.6 }), []);
  const cabin = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1a2830', roughness: 0.7, metalness: 0.1 }), []);
  return (
    <group>
      <mesh position={[0, 0.45, 0]} material={wood} castShadow>
        <boxGeometry args={[2.2, 0.7, 5.4]} />
      </mesh>
      <mesh position={[0, 0.35, 2.4]} material={wood} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[1.8, 0.5, 1.4]} />
      </mesh>
      <mesh position={[0, 1.15, 0.4]} material={cabin}>
        <boxGeometry args={[1.6, 1.0, 2.2]} />
      </mesh>
      <mesh position={[0, 2.3, 0.2]} material={brass}>
        <cylinderGeometry args={[0.08, 0.08, 2.4, 8]} />
      </mesh>
      <mesh position={[0, 0.15, -2.4]} material={brass}>
        <boxGeometry args={[0.2, 0.2, 0.6]} />
      </mesh>
    </group>
  );
}

function PortBlocks() {
  const stone = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6a6e70', roughness: 0.9 }), []);
  const mark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b3bdc1', roughness: 0.5 }), []);
  const paper = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e8dcc6', roughness: 0.8, side: THREE.DoubleSide }), []);
  return (
    <group>
      {WORLD.ports.map((p) => (
        <group key={p.id} position={[p.x, 0, p.z]}>
          <mesh position={[0, 0.4, 0]} material={stone}>
            <boxGeometry args={[8, 0.8, 6]} />
          </mesh>
          <mesh position={[0, 1.6, -1.4]} material={stone}>
            <boxGeometry args={[5, 2.2, 3]} />
          </mesh>
          <mesh position={[0, 3.1, -1.4]} material={mark}>
            <boxGeometry args={[1.2, 0.2, 1.2]} />
          </mesh>
        </group>
      ))}
      {WORLD.fragments.map((f) => (
        <group key={f.id} position={[f.x, 0, f.z]}>
          <mesh position={[0, 1.4, 0]} material={mark}>
            <boxGeometry args={[0.08, 2.8, 0.08]} />
          </mesh>
          <mesh position={[0.4, 2.2, 0]} rotation={[0, 0.4, 0]} material={paper}>
            <planeGeometry args={[1.4, 0.9]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Sea({ test }: { test: boolean }) {
  const water = hexColor('--cv-scene-water', '#123039');
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: water, roughness: 0.95, metalness: 0.05 }),
    [water],
  );
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={mat}>
        <planeGeometry args={[200, 200]} />
      </mesh>
      {test ? (
        <gridHelper args={[140, 28, '#3a4246', '#2a3033']} position={[0, 0.02, 0]} />
      ) : null}
    </group>
  );
}

function Rig({
  mode,
  reduceMotion,
  canSail,
  input,
  restored,
  onShip,
}: Omit<Props, 'sceneId'>) {
  const ship = useRef<THREE.Group>(null);
  const speed = useRef(0);
  const orbit = useRef(0);
  const restoredOnce = useRef(false);
  const { camera } = useThree();
  const tmpFwd = useMemo(() => new THREE.Vector3(), []);
  const tmpRight = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (!ship.current || restoredOnce.current) return;
    const s = restored ?? WORLD.spawn;
    ship.current.position.set(s.x, 0, s.z);
    ship.current.rotation.y = s.yaw;
    restoredOnce.current = true;
  }, [restored]);

  useFrame((_, dt) => {
    const g = ship.current;
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

    if (!reduceMotion && !canSail && mode === 'embark') {
      g.rotation.x = Math.sin(performance.now() / 1800) * 0.02;
      g.rotation.z = Math.sin(performance.now() / 1400) * 0.025;
    } else {
      g.rotation.x = 0;
      g.rotation.z = 0;
    }

    tmpFwd.set(0, 0, -1).applyQuaternion(g.quaternion);
    tmpRight.crossVectors(tmpFwd, UP).normalize();

    if (mode === 'embark') {
      orbit.current += reduceMotion ? 0 : clamped * 0.12;
      const dist = 18;
      camera.position.set(
        g.position.x + Math.sin(orbit.current) * dist,
        7,
        g.position.z + Math.cos(orbit.current) * dist,
      );
      look.copy(g.position).setY(1);
      camera.lookAt(look);
    } else if (mode === 'cockpit') {
      camera.position.copy(g.position).addScaledVector(tmpFwd, WORLD.camera.cockpitForward).addScaledVector(UP, WORLD.camera.cockpitHeight);
      look.copy(g.position).addScaledVector(tmpFwd, 8).setY(1.4);
      camera.lookAt(look);
    } else if (mode === 'route') {
      camera.position.set(g.position.x, 28, g.position.z + 0.01);
      camera.up.set(0, 0, -1);
      look.copy(g.position);
      camera.lookAt(look);
      camera.up.copy(UP);
    } else if (mode === 'port') {
      const p = WORLD.ports[0];
      camera.position.set(p.x - 10, 8, p.z + 12);
      look.set(p.x, 1, p.z);
      camera.lookAt(look);
    } else if (mode === 'reflection') {
      camera.position.copy(g.position).addScaledVector(tmpRight, 0.2).addScaledVector(UP, 1.5).addScaledVector(tmpFwd, 1.2);
      look.copy(g.position).addScaledVector(tmpFwd, 0.2).setY(1.1);
      camera.lookAt(look);
    } else {
      const dist = WORLD.camera.followDistance;
      const height = WORLD.camera.followHeight;
      const desired = g.position.clone().addScaledVector(tmpFwd, -dist).addScaledVector(UP, height);
      camera.position.lerp(desired, reduceMotion ? 1 : 1 - Math.pow(0.001, clamped));
      look.copy(g.position).setY(1.2);
      camera.lookAt(look);
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

    const fwdCheck = tmpFwd;
    onShip(
      {
        x: g.position.x,
        z: g.position.z,
        yaw: g.rotation.y,
        speed: speed.current,
        headingDeg: (Math.atan2(-fwdCheck.x, -fwdCheck.z) * 180) / Math.PI,
      },
      nearPort,
      nearFragment,
    );
  });

  return (
    <group ref={ship} position={[WORLD.spawn.x, 0, WORLD.spawn.z]}>
      <ShipBody />
    </group>
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
        camera={{ fov: 50, near: 0.1, far: 250, position: [12, 8, 18] }}
        onCreated={({ gl }) => {
          gl.setClearColor(sky, 1);
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={[sky]} />
        <fog attach="fog" args={[fog, 28, 110]} />
        <hemisphereLight args={['#8aa0aa', '#1a1410', 0.45]} />
        <directionalLight
          position={[12, 18, 8]}
          intensity={1.15}
          color={lamp}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <Sea test={props.sceneId === 'neutral-test' || props.sceneId === 'test'} />
        <PortBlocks />
        <Rig {...props} />
      </Canvas>
    </div>
  );
}

export function attachControlSelfTest(getShip: () => THREE.Object3D | null) {
  (window as unknown as { __selfTestControls?: () => string }).__selfTestControls = () => {
    const ship = getShip();
    if (!ship) return 'no-ship';
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
    const right = new THREE.Vector3().crossVectors(fwd, UP);
    return `fwd=${fwd.toArray().map((n) => n.toFixed(2)).join(',')} right=${right.toArray().map((n) => n.toFixed(2)).join(',')}`;
  };
}
