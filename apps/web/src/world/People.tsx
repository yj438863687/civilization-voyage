import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Action, Look, Prop } from './encounters';

/**
 * 程序化的人：没有贴图，只靠体块、颜色、帽子和手里的工具认出时代。
 * 绘本比例（头大一些、有眼睛），四肢分两节，所以能做「手搭凉棚」「抡锤」这样的动作。
 * 他会转过头看着你的船。高约 1.75（世界单位 ≈ 米），脚底在 y=0。
 */
export function Person({
  look,
  reduceMotion = false,
  phase = 0,
  /** 说话时点头、两手比划 */
  talking = false,
  /** 他一直在做的事 */
  action = 'idle',
  /** 船在哪：他会转头看你 */
  lookAt = null,
}: {
  look: Look;
  reduceMotion?: boolean;
  phase?: number;
  talking?: boolean;
  action?: Action;
  lookAt?: { x: number; z: number } | null;
}) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const foreL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const foreR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  const M = useMemo(() => {
    const m = (c: string, r = 0.85, metal = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: metal });
    return {
      coat: m(look.coat),
      trim: m(look.trim, 0.6, 0.2),
      skin: m(look.skin, 0.7),
      pants: m(look.pants),
      dark: m('#1a1612', 0.9),
      eye: m('#120e0a', 0.4),
      wood: m('#6a5034', 0.9),
      iron: m('#4a4d50', 0.45, 0.7),
      straw: m('#c8a868', 0.95),
      paper: m('#e8dcc4', 0.9),
      glow: look.glow
        ? new THREE.MeshStandardMaterial({ color: look.glow, emissive: look.glow, emissiveIntensity: 2.2, toneMapped: false })
        : null,
    };
  }, [look]);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime + phase;
    const k = Math.min(1, dt * 6);
    const ease = (r: THREE.Object3D | null, x: number, y = 0, z = 0) => {
      if (!r) return;
      r.rotation.x += (x - r.rotation.x) * k;
      r.rotation.y += (y - r.rotation.y) * k;
      r.rotation.z += (z - r.rotation.z) * k;
    };
    if (reduceMotion) return;

    // 呼吸：上身一起一伏
    if (torso.current) torso.current.scale.y = 1 + Math.sin(t * 1.6) * 0.012;

    // 转头看船：先转头，说话时整个人也慢慢转过来
    let yaw = 0;
    if (lookAt && root.current) {
      root.current.getWorldPosition(tmp);
      const parentYaw = root.current.parent ? new THREE.Euler().setFromQuaternion(root.current.parent.getWorldQuaternion(new THREE.Quaternion())).y : 0;
      const want = Math.atan2(lookAt.x - tmp.x, lookAt.z - tmp.z) - parentYaw;
      let d = want - (body.current?.rotation.y ?? 0);
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      yaw = THREE.MathUtils.clamp(d, -1.1, 1.1);
      if (talking && body.current) body.current.rotation.y += d * Math.min(1, dt * 1.2);
    }

    if (talking) {
      // 说话：点头，两手轮流比划
      ease(head.current, Math.sin(t * 4.2) * 0.1, yaw * 0.6, Math.sin(t * 1.3) * 0.05);
      ease(armR.current, -0.9 + Math.sin(t * 2.6) * 0.35, 0, -0.25);
      ease(foreR.current, -0.8 + Math.sin(t * 3.1) * 0.3);
      ease(armL.current, -0.4 + Math.sin(t * 2.1 + 1) * 0.25, 0, 0.2);
      ease(foreL.current, -0.6);
      ease(torso.current, 0.04);
      ease(legL.current, 0);
      ease(legR.current, 0);
      return;
    }

    if (action === 'watch') {
      // 手搭凉棚，望着河，头慢慢左右扫
      ease(armL.current, -2.5, 0, 0.5);
      ease(foreL.current, -1.6);
      ease(armR.current, 0.08, 0, -0.1);
      ease(foreR.current, -0.15);
      ease(head.current, 0.12, Math.sin(t * 0.35) * 0.55 + yaw * 0.3, 0);
      ease(torso.current, 0.06 + Math.sin(t * 0.35) * 0.02);
      ease(legL.current, 0);
      ease(legR.current, 0);
      return;
    }

    if (action === 'hammer' || action === 'shovel') {
      // 抡锤：举起 → 落下 → 震一下。一下约一秒
      const cyc = (t * 0.95) % 1;
      const up = cyc < 0.6 ? cyc / 0.6 : 1 - (cyc - 0.6) / 0.12;
      const lift = Math.max(0, Math.min(1, up));
      ease(armR.current, -0.4 - lift * 2.4, 0, -0.15);
      ease(foreR.current, -0.3 - lift * 0.9);
      ease(armL.current, -0.4 - lift * 1.9, 0, 0.35);
      ease(foreL.current, -0.5 - lift * 0.7);
      ease(torso.current, 0.35 - lift * 0.4);
      ease(head.current, 0.3 - lift * 0.25, yaw * 0.2);
      ease(legL.current, -0.15);
      ease(legR.current, 0.2);
      return;
    }

    // 闲着：重心在两脚之间换，偶尔看一眼船
    const sway = Math.sin(t * 0.7);
    ease(armL.current, 0.05 + sway * 0.04, 0, 0.12);
    ease(foreL.current, -0.2);
    ease(armR.current, 0.05 - sway * 0.04, 0, -0.12);
    ease(foreR.current, -0.2);
    ease(head.current, 0.02, yaw * 0.7, sway * 0.03);
    ease(torso.current, 0);
    ease(legL.current, sway * 0.04);
    ease(legR.current, -sway * 0.04);
    if (root.current) root.current.rotation.z = sway * 0.015;
  });

  const prop: Prop = action === 'hammer' ? 'mallet' : look.prop;

  const arm = (
    side: 1 | -1,
    up: React.RefObject<THREE.Group>,
    fore: React.RefObject<THREE.Group>,
    withProp: boolean,
  ) => (
    <group ref={up} position={[side * 0.27, 1.38, 0]}>
      <mesh position={[0, -0.15, 0]} material={M.coat}>
        <capsuleGeometry args={[0.062, 0.2, 4, 8]} />
      </mesh>
      <group ref={fore} position={[0, -0.31, 0]}>
        <mesh position={[0, -0.13, 0]} material={M.coat}>
          <capsuleGeometry args={[0.055, 0.18, 4, 8]} />
        </mesh>
        <mesh position={[0, -0.3, 0]} material={M.skin}>
          <sphereGeometry args={[0.06, 10, 8]} />
        </mesh>
        {withProp && (
          <group position={[0, -0.3, 0.02]}>
            <PropMesh prop={prop} M={M} />
          </group>
        )}
      </group>
    </group>
  );

  const leg = (side: 1 | -1, ref: React.RefObject<THREE.Group>) => (
    <group ref={ref} position={[side * 0.11, 0.86, 0]}>
      <mesh position={[0, -0.22, 0]} material={M.pants} castShadow>
        <capsuleGeometry args={[0.078, 0.28, 4, 8]} />
      </mesh>
      <mesh position={[0, -0.6, 0]} material={M.pants}>
        <capsuleGeometry args={[0.07, 0.28, 4, 8]} />
      </mesh>
      <mesh position={[0, -0.82, 0.05]} material={M.dark}>
        <boxGeometry args={[0.15, 0.08, 0.27]} />
      </mesh>
    </group>
  );

  return (
    <group ref={root}>
      <group ref={body}>
        {leg(-1, legL)}
        {leg(1, legR)}
        <group ref={torso} position={[0, 0.86, 0]}>
          {/* 上身：外衣下摆略宽 */}
          <mesh position={[0, 0.28, 0]} material={M.coat} castShadow>
            <capsuleGeometry args={[0.2, 0.36, 6, 12]} />
          </mesh>
          <mesh position={[0, 0.02, 0]} material={M.coat}>
            <cylinderGeometry args={[0.21, 0.27, 0.22, 12]} />
          </mesh>
          <mesh position={[0, 0.1, 0]} material={M.trim}>
            <cylinderGeometry args={[0.215, 0.215, 0.05, 12]} />
          </mesh>
          <group position={[0, -0.86, 0]}>
            {arm(-1, armL, foreL, false)}
            {arm(1, armR, foreR, true)}
          </group>
          {/* 头：绘本比例，大一点 */}
          <group ref={head} position={[0, 0.72, 0]}>
            <mesh position={[0, -0.12, 0]} material={M.skin}>
              <cylinderGeometry args={[0.055, 0.065, 0.1, 8]} />
            </mesh>
            <mesh position={[0, 0.06, 0]} material={M.skin} castShadow>
              <sphereGeometry args={[0.155, 18, 14]} />
            </mesh>
            {/* 眼睛与鼻子：有了这两点，人就有了朝向 */}
            {[-0.052, 0.052].map((x) => (
              <mesh key={x} position={[x, 0.08, 0.142]} material={M.eye}>
                <sphereGeometry args={[0.018, 8, 6]} />
              </mesh>
            ))}
            <mesh position={[0, 0.03, 0.152]} material={M.skin}>
              <sphereGeometry args={[0.022, 8, 6]} />
            </mesh>
            <HatMesh hat={look.hat} M={M} />
            {M.glow && (
              <mesh position={[0, 0.1, 0.15]} material={M.glow}>
                <boxGeometry args={[0.22, 0.025, 0.02]} />
              </mesh>
            )}
          </group>
        </group>
      </group>
    </group>
  );
}

type Mats = Record<string, THREE.MeshStandardMaterial | null>;

function HatMesh({ hat, M }: { hat: Look['hat']; M: Mats }) {
  if (hat === 'straw')
    return (
      <group position={[0, 0.15, 0]}>
        <mesh material={M.straw!}>
          <coneGeometry args={[0.34, 0.2, 16, 1, true]} />
        </mesh>
        <mesh position={[0, -0.09, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.straw!}>
          <ringGeometry args={[0.12, 0.36, 16]} />
        </mesh>
      </group>
    );
  if (hat === 'wrap')
    return (
      <mesh position={[0, 0.12, 0]} material={M.trim!}>
        <sphereGeometry args={[0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      </mesh>
    );
  if (hat === 'cap')
    return (
      <group position={[0, 0.14, 0]}>
        <mesh material={M.dark!}>
          <cylinderGeometry args={[0.135, 0.14, 0.08, 14]} />
        </mesh>
        <mesh position={[0, -0.03, 0.12]} rotation={[0.25, 0, 0]} material={M.dark!}>
          <boxGeometry args={[0.2, 0.015, 0.12]} />
        </mesh>
      </group>
    );
  if (hat === 'bowler')
    return (
      <group position={[0, 0.17, 0]}>
        <mesh material={M.dark!}>
          <sphereGeometry args={[0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        </mesh>
        <mesh position={[0, 0, 0]} material={M.dark!}>
          <cylinderGeometry args={[0.2, 0.2, 0.015, 16]} />
        </mesh>
      </group>
    );
  if (hat === 'headset')
    return (
      <group position={[0, 0.06, 0]}>
        <mesh rotation={[0, 0, 0]} material={M.dark!}>
          <torusGeometry args={[0.145, 0.014, 6, 16, Math.PI]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.14, -0.01, 0]} rotation={[0, 0, Math.PI / 2]} material={M.trim!}>
            <cylinderGeometry args={[0.05, 0.05, 0.04, 10]} />
          </mesh>
        ))}
      </group>
    );
  if (hat === 'visor')
    return (
      <mesh position={[0, 0.1, 0.02]} material={M.coat!}>
        <sphereGeometry args={[0.145, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
      </mesh>
    );
  return null;
}

function PropMesh({ prop, M }: { prop: Prop; M: Mats }) {
  if (prop === 'mallet')
    return (
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh position={[0, 0.2, 0]} material={M.wood!}>
          <cylinderGeometry args={[0.022, 0.022, 0.6, 6]} />
        </mesh>
        <mesh position={[0, 0.52, 0]} rotation={[0, 0, Math.PI / 2]} material={M.wood!}>
          <cylinderGeometry args={[0.09, 0.09, 0.3, 10]} />
        </mesh>
      </group>
    );
  if (prop === 'hoe')
    return (
      <group rotation={[0.2, 0, 0]}>
        <mesh position={[0, 0.2, 0]} material={M.wood!}>
          <cylinderGeometry args={[0.02, 0.02, 1.3, 6]} />
        </mesh>
        <mesh position={[0, -0.44, 0.08]} material={M.iron!}>
          <boxGeometry args={[0.18, 0.05, 0.18]} />
        </mesh>
      </group>
    );
  if (prop === 'pole')
    return (
      <mesh position={[0, 0.3, 0]} material={M.wood!}>
        <cylinderGeometry args={[0.022, 0.026, 1.7, 6]} />
      </mesh>
    );
  if (prop === 'shovel')
    return (
      <group rotation={[0.5, 0, 0]}>
        <mesh position={[0, 0.1, 0]} material={M.wood!}>
          <cylinderGeometry args={[0.02, 0.02, 0.9, 6]} />
        </mesh>
        <mesh position={[0, -0.42, 0]} material={M.iron!}>
          <boxGeometry args={[0.2, 0.26, 0.03]} />
        </mesh>
      </group>
    );
  if (prop === 'ledger')
    return (
      <mesh position={[0, 0.04, 0.1]} rotation={[-0.9, 0, 0]} material={M.paper!}>
        <boxGeometry args={[0.24, 0.32, 0.03]} />
      </mesh>
    );
  if (prop === 'key')
    return (
      <mesh position={[0, 0.02, 0.1]} material={M.iron!}>
        <boxGeometry args={[0.16, 0.05, 0.22]} />
      </mesh>
    );
  if (prop === 'tablet')
    return (
      <group position={[0, 0.06, 0.12]} rotation={[-0.9, 0, 0]}>
        <mesh material={M.dark!}>
          <boxGeometry args={[0.26, 0.34, 0.02]} />
        </mesh>
        {M.glow && (
          <mesh position={[0, 0, 0.012]} material={M.glow}>
            <planeGeometry args={[0.22, 0.29]} />
          </mesh>
        )}
      </group>
    );
  return null;
}

/** 甲板上的一对船员。sceneId 决定他们是谁。 */
export function EraDeckCrew({
  crew,
  deckY,
  reduceMotion,
}: {
  crew: [Look, Look];
  deckY: number;
  reduceMotion?: boolean;
}) {
  return (
    <group>
      <group position={[1.58, deckY, -1.55]} rotation={[0, -0.5, 0]} scale={1.28}>
        <Person look={crew[0]} reduceMotion={reduceMotion} phase={0.3} />
      </group>
      <group position={[1.48, deckY, 1.05]} rotation={[0, -0.9, 0]} scale={1.22}>
        <Person look={crew[1]} reduceMotion={reduceMotion} phase={1.7} />
      </group>
    </group>
  );
}

/**
 * 航线上的人：站在一只小舢板上，守着漂着的那件东西。
 * 船靠近时他转过来看你。
 */
export function LaneKeeper({
  look,
  active,
  reduceMotion,
}: {
  look: Look;
  active: boolean;
  reduceMotion?: boolean;
}) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!g.current || reduceMotion) return;
    const t = clock.elapsedTime;
    g.current.position.y = Math.sin(t * 1.1) * 0.06;
    g.current.rotation.z = Math.sin(t * 0.8) * 0.02;
  });
  return (
    <group ref={g}>
      {/* 舢板 */}
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.24, 3.0]} />
        <meshStandardMaterial color="#3a2e24" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[1.62, 0.06, 3.12]} />
        <meshStandardMaterial color="#5a4630" roughness={0.9} />
      </mesh>
      {/* 船头一盏小灯：远远看见有人 */}
      <mesh position={[0, 0.75, 1.3]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#fff1d0" emissive="#ffcf8a" emissiveIntensity={active ? 3 : 1.4} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.48, 1.3]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 5]} />
        <meshStandardMaterial color="#2a2118" />
      </mesh>
      <group position={[0, 0.28, -0.2]} scale={1.3}>
        <Person look={look} reduceMotion={reduceMotion} talking={active} />
      </group>
    </group>
  );
}
