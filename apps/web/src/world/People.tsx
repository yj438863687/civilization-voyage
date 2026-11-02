import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Action, Hat, Look, Prop } from './encounters';

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

  const prop: Prop = action === 'hammer' && look.prop === 'none' ? 'mallet' : look.prop;

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
            {(look.eyes === 0 ? [] : look.eyes === 4 ? [[-0.055, 0.1], [0.055, 0.1], [-0.05, 0.045], [0.05, 0.045]] : [[-0.052, 0.08], [0.052, 0.08]]).map(([x, y]) => (
              <mesh key={`${x}${y}`} position={[x, y, 0.142]} material={M.eye}>
                <sphereGeometry args={[0.018, 8, 6]} />
              </mesh>
            ))}
            {look.eyes !== 0 && (
              <mesh position={[0, 0.03, 0.152]} material={M.skin}>
                <sphereGeometry args={[0.022, 8, 6]} />
              </mesh>
            )}
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

export type Mats = Record<string, THREE.MeshStandardMaterial | null>;

/** 一套人的材质：帽子、道具、发光件都从这里取 */
export function makeMats(look: Look): Mats {
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
    glow: look.glow ? new THREE.MeshStandardMaterial({ color: look.glow, emissive: look.glow, emissiveIntensity: 2.2, toneMapped: false }) : null,
  };
}

export function HatMesh({ hat, M }: { hat: Look['hat']; M: Mats }) {
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
  if (hat === 'guan')
    return (
      <group position={[0, 0.2, 0]}>
        <mesh material={M.dark!}>
          <cylinderGeometry args={[0.1, 0.13, 0.16, 12]} />
        </mesh>
        <mesh position={[0, 0.1, 0]} rotation={[0.15, 0, 0]} material={M.trim!}>
          <boxGeometry args={[0.34, 0.025, 0.2]} />
        </mesh>
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

export function PropMesh({ prop, M }: { prop: Prop; M: Mats }) {
  if (prop === 'urn')
    return (
      <mesh position={[0, 0.02, 0.16]} material={M.wood!}>
        <sphereGeometry args={[0.17, 12, 10]} />
      </mesh>
    );
  if (prop === 'staff')
    return (
      <group>
        <mesh position={[0, 0.35, 0]} material={M.wood!}>
          <cylinderGeometry args={[0.02, 0.022, 1.8, 6]} />
        </mesh>
        {/* 节上的旄：苏武持节十九年，旄尽落 */}
        <mesh position={[0, 1.15, 0]} material={M.trim!}>
          <coneGeometry args={[0.07, 0.3, 8]} />
        </mesh>
      </group>
    );
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

/* ================= 两个伙伴：大副与二副 ================= */

export type MascotKind = 'claude' | 'gpt';

/**
 * 陪着主角的两个卡通伙伴。致敬两家模型的气质，不照抄任何商标图形：
 *   大副「克劳德」——暖橙、圆润，胸口一枚星芒，爱看海图、爱点头
 *   二副「小吉」——深青、修长，胸口一枚圆结，爱数东西、爱东张西望
 * 戴着那个时代的帽子：草帽、鸭舌帽、耳机、护目镜。
 */
export function Mascot({
  kind,
  hat = 'none',
  reduceMotion = false,
  phase = 0,
  talking = false,
  /** 另一个伙伴在哪：会时不时转头看他 */
  buddy = null,
}: {
  kind: MascotKind;
  hat?: Hat;
  reduceMotion?: boolean;
  phase?: number;
  talking?: boolean;
  buddy?: [number, number, number] | null;
}) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const emblem = useRef<THREE.Group>(null);

  const C = kind === 'claude'
    ? { body: '#d97b4a', belly: '#f0a878', trim: '#f6e0c8', eye: '#2a1a12', glow: '#ffb070' }
    : { body: '#1e3a3e', belly: '#2f5a5e', trim: '#bfe8e0', eye: '#0a1414', glow: '#8fe0c8' };

  const M = useMemo(() => {
    const m = (c: string, r = 0.7, metal = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: metal });
    return {
      body: m(C.body, 0.6),
      belly: m(C.belly, 0.7),
      trim: m(C.trim, 0.5, 0.2),
      eyeW: m('#fff8ee', 0.3),
      eye: m(C.eye, 0.3),
      dark: m('#1a1612', 0.9),
      straw: m('#c8a868', 0.95),
      paper: m('#e8dcc4', 0.9),
      wood: m('#6a5034', 0.9),
      iron: m('#4a4d50', 0.45, 0.7),
      glow: new THREE.MeshStandardMaterial({ color: C.glow, emissive: C.glow, emissiveIntensity: 1.6, toneMapped: false }),
    };
  }, [C.body, C.belly, C.trim, C.eye, C.glow]);

  useFrame(({ clock }, dt) => {
    if (reduceMotion) return;
    const t = clock.elapsedTime + phase;
    const k = Math.min(1, dt * 6);
    // 一上一下地呼吸；说话时跳得欢一点
    if (root.current) root.current.position.y = Math.sin(t * (talking ? 4 : 1.6)) * (talking ? 0.05 : 0.025);
    if (body.current) body.current.scale.set(1 + Math.sin(t * 1.6) * 0.015, 1 - Math.sin(t * 1.6) * 0.015, 1);
    // 眨眼：每三四秒一次
    if (eyes.current) {
      const blink = ((t * 0.9) % 3.6) < 0.12 ? 0.08 : 1;
      eyes.current.scale.y += (blink - eyes.current.scale.y) * Math.min(1, dt * 30);
    }
    // 转头：时不时看看伙伴，看看海
    if (head.current) {
      const look = buddy ? Math.atan2(buddy[0], buddy[2]) : 0;
      const phaseLook = Math.sin(t * 0.35) > 0.6 ? look : Math.sin(t * 0.22) * 0.35;
      head.current.rotation.y += (phaseLook - head.current.rotation.y) * k;
      head.current.rotation.x += ((talking ? Math.sin(t * 5) * 0.08 : Math.sin(t * 0.9) * 0.03) - head.current.rotation.x) * k;
      head.current.rotation.z += (Math.sin(t * 0.7) * 0.04 - head.current.rotation.z) * k;
    }
    // 手：大副拿着海图上下看；二副掰着指头数。偶尔挥一下手
    const wave = ((t * 0.5) % 9) < 1.2 ? Math.sin(t * 14) * 0.5 : 0;
    if (armR.current) {
      const base = kind === 'claude' ? -1.1 + Math.sin(t * 1.3) * 0.12 : -0.5 + Math.abs(Math.sin(t * 2.2)) * 0.5;
      armR.current.rotation.x += (base - armR.current.rotation.x) * k;
      armR.current.rotation.z += (-0.3 - wave - armR.current.rotation.z) * k;
    }
    if (armL.current) {
      const base = kind === 'claude' ? -1.0 + Math.sin(t * 1.3) * 0.12 : -0.2;
      armL.current.rotation.x += (base - armL.current.rotation.x) * k;
      armL.current.rotation.z += (0.3 - armL.current.rotation.z) * k;
    }
    if (emblem.current) emblem.current.rotation.z = kind === 'claude' ? t * 0.4 : Math.sin(t * 0.8) * 0.2;
  });

  const tall = kind === 'gpt';
  const bodyH = tall ? 0.78 : 0.62;
  const bodyR = tall ? 0.26 : 0.32;

  return (
    <group ref={root}>
      <group ref={body}>
        {/* 脚 */}
        {[-0.13, 0.13].map((x) => (
          <mesh key={x} position={[x, 0.07, 0.04]} material={M.dark}>
            <sphereGeometry args={[0.1, 10, 8]} />
          </mesh>
        ))}
        {/* 身子：一只圆圆的胶囊 */}
        <mesh position={[0, bodyH / 2 + 0.12, 0]} material={M.body} castShadow>
          <capsuleGeometry args={[bodyR, bodyH - bodyR * 2 + 0.1, 6, 16]} />
        </mesh>
        {/* 肚皮 */}
        <mesh position={[0, bodyH / 2 + 0.06, bodyR * 0.72]} scale={[0.8, 1, 0.5]} material={M.belly}>
          <sphereGeometry args={[bodyR * 0.75, 14, 10]} />
        </mesh>
        {/* 胸口的记号 */}
        <group ref={emblem} position={[0, bodyH / 2 + 0.16, bodyR + 0.03]}>
          {kind === 'claude'
            ? Array.from({ length: 8 }, (_, i) => (
                <mesh key={i} rotation={[0, 0, (i / 8) * Math.PI]} material={M.glow}>
                  <boxGeometry args={[0.2, 0.028, 0.02]} />
                </mesh>
              ))
            : (
              <>
                <mesh material={M.glow}>
                  <torusGeometry args={[0.085, 0.022, 8, 20]} />
                </mesh>
                <mesh rotation={[0, 0, Math.PI / 3]} material={M.glow}>
                  <torusGeometry args={[0.05, 0.016, 8, 16]} />
                </mesh>
              </>
            )}
        </group>
        {/* 手臂 */}
        {([[-1, armL], [1, armR]] as const).map(([s, ref]) => (
          <group key={s} ref={ref} position={[s * (bodyR + 0.02), bodyH * 0.72, 0]}>
            <mesh position={[0, -0.16, 0]} material={M.body}>
              <capsuleGeometry args={[0.055, 0.22, 4, 8]} />
            </mesh>
            <mesh position={[0, -0.32, 0]} material={M.trim}>
              <sphereGeometry args={[0.065, 10, 8]} />
            </mesh>
            {/* 大副右手拿着一卷海图 */}
            {kind === 'claude' && s === 1 && (
              <mesh position={[0, -0.34, 0.1]} rotation={[-0.8, 0, 0]} material={M.paper}>
                <boxGeometry args={[0.22, 0.28, 0.02]} />
              </mesh>
            )}
          </group>
        ))}
        {/* 头：和身子连在一起的圆 */}
        <group ref={head} position={[0, bodyH + 0.2, 0]}>
          <mesh position={[0, 0.1, 0]} material={M.body} castShadow>
            <sphereGeometry args={[tall ? 0.24 : 0.28, 18, 14]} />
          </mesh>
          {/* 大眼睛 */}
          <group ref={eyes} position={[0, 0.12, (tall ? 0.24 : 0.28) - 0.04]}>
            {[-0.09, 0.09].map((x) => (
              <group key={x} position={[x, 0, 0]}>
                <mesh material={M.eyeW}>
                  <sphereGeometry args={[0.065, 12, 10]} />
                </mesh>
                <mesh position={[0, 0, 0.045]} material={M.eye}>
                  <sphereGeometry args={[0.035, 10, 8]} />
                </mesh>
                <mesh position={[0.012, 0.014, 0.075]} material={M.eyeW}>
                  <sphereGeometry args={[0.012, 6, 6]} />
                </mesh>
              </group>
            ))}
          </group>
          {/* 嘴：一道小弧 */}
          <mesh position={[0, 0.02, (tall ? 0.24 : 0.28) - 0.02]} rotation={[0.2, 0, 0]} material={M.dark}>
            <torusGeometry args={[0.04, 0.008, 6, 10, Math.PI]} />
          </mesh>
          <group position={[0, (tall ? 0.24 : 0.28) - 0.1, 0]} scale={tall ? 1.6 : 1.85}>
            <HatMesh hat={hat} M={M as never} />
          </group>
        </group>
      </group>
    </group>
  );
}
