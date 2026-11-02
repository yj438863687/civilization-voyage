import { useAnimations, useGLTF } from '@react-three/drei';
import { createPortal, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Action, Look } from './encounters';
import { HatMesh, PropMesh, makeMats } from './People';

/**
 * 带骨骼动画的人：KayKit「冒险者人物包」（CC0，Kay Lousberg）。
 * 模型只提供身体、脸和 75 段动作；时代由我们自己的帽子和手上的东西来说——
 * 它们挂在头骨和右手的骨头上，跟着动作走。
 *
 * 授权文件在 public/models/kaykit/LICENSE.txt。
 */

export type RigModel = 'barbarian' | 'knight' | 'mage' | 'rogue' | 'hooded';

const URL: Record<RigModel, string> = {
  barbarian: '/models/kaykit/Barbarian.glb',
  knight: '/models/kaykit/Knight.glb',
  mage: '/models/kaykit/Mage.glb',
  rogue: '/models/kaykit/Rogue.glb',
  hooded: '/models/kaykit/Rogue_Hooded.glb',
};

/** 包里自带的刀斧盾书：全部藏起来，我们的人不打仗 */
const GEAR = /knife|axe|shield|sword|spellbook|badge|rectangle|crossbow|wand|staff|dagger|arrow|quiver|mug|bow/i;

/** 做什么事，就放哪段动作 */
function clipFor(action: Action, talking: boolean): string {
  if (talking) return 'Spellcasting';
  switch (action) {
    case 'hammer':
      return '2H_Melee_Attack_Chop';
    case 'shovel':
      return 'PickUp';
    case 'tap':
    case 'count':
      return 'Use_Item';
    case 'watch':
      return 'Unarmed_Idle';
    default:
      return 'Idle';
  }
}

/** 模型自身约 2.2 高，缩到 1.75 */
const SCALE = 1.75 / 2.2;

export function RiggedPerson({
  look,
  reduceMotion = false,
  phase = 0,
  talking = false,
  action = 'idle',
  lookAt = null,
}: {
  look: Look;
  reduceMotion?: boolean;
  phase?: number;
  talking?: boolean;
  action?: Action;
  lookAt?: { x: number; z: number } | null;
}) {
  const model: RigModel = look.model ?? 'rogue';
  const { scene, animations } = useGLTF(URL[model]);
  const clone = useMemo(() => {
    const c = SkeletonUtils.clone(scene);
    c.traverse((o: THREE.Object3D) => {
      if (GEAR.test(o.name)) o.visible = false;
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.frustumCulled = false;
      }
    });
    return c;
  }, [scene]);
  const group = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, group);
  const [bones, setBones] = useState<{ head: THREE.Object3D; hand: THREE.Object3D } | null>(null);
  const M = useMemo(() => makeMats(look), [look]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const current = useRef<string>('');

  // 找到头和右手的骨头，帽子与工具挂上去
  useEffect(() => {
    let head: THREE.Object3D | null = null;
    let hand: THREE.Object3D | null = null;
    clone.traverse((o: THREE.Object3D) => {
      if (o.name === 'head') head = o;
      if (o.name === 'handslot.r') hand = o;
    });
    if (head && hand) setBones({ head, hand });
  }, [clone]);

  // 换动作：交叉淡入，别硬切
  useEffect(() => {
    const name = clipFor(action, talking);
    const next = actions[name] ?? actions.Idle;
    if (!next) return;
    const prev = current.current ? actions[current.current] : null;
    next.reset().setEffectiveTimeScale(reduceMotion ? 0 : 1).fadeIn(0.35).play();
    next.time = phase % Math.max(0.01, next.getClip().duration);
    if (prev && prev !== next) prev.fadeOut(0.35);
    current.current = name;
  }, [action, talking, actions, reduceMotion, phase]);

  // 转头看船：在动画之后，再把头骨往船的方向拧一点
  useFrame(() => {
    if (!bones || !lookAt || !group.current) return;
    group.current.getWorldPosition(tmp);
    const parentQ = group.current.getWorldQuaternion(new THREE.Quaternion());
    const parentYaw = new THREE.Euler().setFromQuaternion(parentQ).y;
    let d = Math.atan2(lookAt.x - tmp.x, lookAt.z - tmp.z) - parentYaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    const yaw = THREE.MathUtils.clamp(d, -0.9, 0.9);
    bones.head.rotation.y += (yaw - bones.head.rotation.y) * 0.08;
  });

  return (
    <group ref={group} scale={SCALE}>
      <primitive object={clone} />
      {bones &&
        createPortal(
          <group position={[0, 0.22, 0]} scale={1 / SCALE}>
            <HatMesh hat={look.hat} M={M} />
          </group>,
          bones.head,
        )}
      {bones &&
        createPortal(
          <group scale={1 / SCALE} rotation={[0, 0, Math.PI / 2]}>
            <PropMesh prop={look.prop} M={M} />
          </group>,
          bones.hand,
        )}
    </group>
  );
}

useGLTF.preload(URL.rogue);
useGLTF.preload(URL.mage);
