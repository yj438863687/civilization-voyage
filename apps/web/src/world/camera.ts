import * as THREE from 'three';
import { DECK_Y, SHIP_L, STERN_HALL } from './hull';
import { WORLD } from './world.config';
import { smootherstep } from './voyageConstants';

export type CamMode = 'embark' | 'cockpit' | 'route' | 'follow' | 'port' | 'reflection' | 'landing';

const UP = new THREE.Vector3(0, 1, 0);

export function easeSwell(t: number) {
  return smootherstep(t);
}

export function cameraDurationMs() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--cv-dur-camera').trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 1200;
}

export interface CamPose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
  up: THREE.Vector3;
}


/** 靠港戏时长（秒）。与 App 里的面板延迟对齐。 */
export const LANDING_SEC = 5.4;

/**
 * 靠港戏的机位。t 是 0..1 的整段时间轴：
 *   0.00–0.34  从跟船机位压向船头，东西正从水里被提上来
 *   0.34–0.72  推近到物件前，看清材质与刻痕
 *   0.72–1.00  停住，留出时间让文字浮上来
 * 三段之间用 smootherstep，避免任何一帧的硬切。
 */
export function landingPose(
  t: number,
  shipPos: THREE.Vector3,
  fwd: THREE.Vector3,
  right: THREE.Vector3,
  scale = 1,
) {
  // 距离用绝对单位，不跟着船体缩放：小木筏上缩得太近，镜头会埋进甲板。
  const L = SHIP_L * scale;

  // 主角悬在船头前方的水面上方。高度取绝对值，高于任何船型的甲板。
  const relic = new THREE.Vector3()
    .copy(shipPos)
    .addScaledVector(fwd, 0.1 * L)
    .addScaledVector(UP, 3.0);

  // 机位：始终在船的斜后上方、外舷一侧，俯看主角。
  // 绝不越过船头，否则会看进码头体块里。
  const k0 = new THREE.Vector3()
    .copy(shipPos)
    .addScaledVector(fwd, -1.15 * L)
    .addScaledVector(right, 0.85 * L)
    .addScaledVector(UP, 6.4);
  const k1 = new THREE.Vector3()
    .copy(relic)
    .addScaledVector(fwd, -0.85 * L)
    .addScaledVector(right, 0.55 * L)
    .addScaledVector(UP, 3.2);
  const k2 = new THREE.Vector3()
    .copy(relic)
    .addScaledVector(fwd, -0.62 * L)
    .addScaledVector(right, 0.4 * L)
    .addScaledVector(UP, 2.4);

  const look0 = relic.clone().addScaledVector(UP, -0.3);
  const look1 = relic.clone();
  const look2 = relic.clone();

  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  let fov = 40;

  if (t <= 0.34) {
    const u = smootherstep(t / 0.34);
    pos.lerpVectors(k0, k1, u);
    look.lerpVectors(look0, look1, u);
    fov = THREE.MathUtils.lerp(40, 34, u);
  } else if (t <= 0.72) {
    const u = smootherstep((t - 0.34) / 0.38);
    pos.lerpVectors(k1, k2, u);
    look.lerpVectors(look1, look2, u);
    fov = THREE.MathUtils.lerp(34, 28, u);
  } else {
    const u = smootherstep((t - 0.72) / 0.28);
    pos.copy(k2).addScaledVector(right, -0.1 * u);
    look.copy(look2);
    fov = THREE.MathUtils.lerp(28, 27, u);
  }
  return { pos, look, fov, up: UP.clone(), relic };
}

export function desiredPose(
  mode: CamMode,
  shipPos: THREE.Vector3,
  fwd: THREE.Vector3,
  right: THREE.Vector3,
  /** 当前船型长度 / 基准船长。镜头距离随之缩放，短船不空旷、长船不出画。 */
  scale = 1,
): CamPose {
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const up = UP.clone();
  let fov = 42;
  const L = SHIP_L * scale;

  if (mode === 'embark') {
    const dist = L * 1.82;
    const yaw = (52 * Math.PI) / 180;
    const pitch = (8 * Math.PI) / 180;
    pos
      .copy(shipPos)
      .addScaledVector(fwd, dist * Math.cos(yaw) * Math.cos(pitch))
      .addScaledVector(right, dist * Math.sin(yaw) * Math.cos(pitch))
      .addScaledVector(UP, dist * Math.sin(pitch) + 0.35);
    look.copy(shipPos).setY(2.7);
    fov = 34;
  } else if (mode === 'cockpit') {
    // 座位在舱室后部，眼位比桌面高一个头；视线穿过前窗落到船头外的海面
    pos.copy(shipPos).addScaledVector(fwd, -STERN_HALL.seatZ).addScaledVector(UP, STERN_HALL.eyeY);
    look.copy(shipPos).addScaledVector(fwd, SHIP_L * 0.6).addScaledVector(UP, STERN_HALL.eyeY - 0.5);
    fov = 55;
  } else if (mode === 'route') {
    pos.set(shipPos.x, 48, shipPos.z + 0.01);
    look.copy(shipPos);
    up.set(0, 0, -1);
    fov = 50;
  } else if (mode === 'port') {
    // 靠港：船头与码头同框。机位在船的斜后上方，看向「船头与港口的中间点」，
    // 参数取 MOTION §B approach：az 60、el 12、0.90L、lookAt 船头到港 35%。
    const p = WORLD.ports[0];
    const az = (60 * Math.PI) / 180;
    const el = (12 * Math.PI) / 180;
    const dist = L * 0.9;
    const bow = new THREE.Vector3().copy(shipPos).addScaledVector(fwd, L * 0.42);
    const aim = new THREE.Vector3(
      THREE.MathUtils.lerp(bow.x, p.x, 0.35),
      2.2,
      THREE.MathUtils.lerp(bow.z, p.z, 0.35),
    );
    pos
      .copy(aim)
      .addScaledVector(fwd, -dist * Math.cos(az) * Math.cos(el))
      .addScaledVector(right, dist * Math.sin(az) * Math.cos(el))
      .addScaledVector(UP, dist * Math.sin(el) + 3.2);
    look.copy(aim);
    fov = 42;
  } else if (mode === 'reflection') {
    pos.copy(shipPos).addScaledVector(right, 0.4).addScaledVector(UP, 5.2).addScaledVector(fwd, -2.4);
    look.copy(shipPos).addScaledVector(fwd, 2).setY(3.2);
    fov = 46;
  } else {
    // 跟船：视角目标落点也要随船长走，否则长船的船头会顶出画面。
    const dist = L * 1.35;
    const yaw = (35 * Math.PI) / 180;
    const pitch = (18 * Math.PI) / 180;
    pos
      .copy(shipPos)
      .addScaledVector(fwd, -dist * Math.cos(yaw) * Math.cos(pitch))
      .addScaledVector(right, dist * Math.sin(yaw) * Math.cos(pitch))
      .addScaledVector(UP, dist * Math.sin(pitch) + 2 + (scale - 1) * 3);
    look.copy(shipPos).addScaledVector(fwd, 0.28 * L).setY(3.4);
    fov = 50;
  }
  return { pos, look, fov, up };
}

function putLocal(
  out: THREE.Vector3,
  shipPos: THREE.Vector3,
  fwd: THREE.Vector3,
  right: THREE.Vector3,
  x: number,
  y: number,
  z: number,
) {
  out.copy(shipPos).addScaledVector(right, x).addScaledVector(UP, y).addScaledVector(fwd, -z);
}

/** MOTION.md `boot.push`: 3/4 → cabin door → seat. s in 0..1. */
export function bootPushPose(
  s: number,
  shipPos: THREE.Vector3,
  fwd: THREE.Vector3,
  right: THREE.Vector3,
): CamPose {
  const embark = desiredPose('embark', shipPos, fwd, right);
  const p1 = new THREE.Vector3();
  const l1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const l2 = new THREE.Vector3();
  const doorZ = STERN_HALL.z + STERN_HALL.d / 2 + 0.55;
  putLocal(p1, shipPos, fwd, right, 0.9, DECK_Y + 1.25, doorZ);
  putLocal(l1, shipPos, fwd, right, 0.15, STERN_HALL.winY - 0.05, STERN_HALL.z - 0.4);
  putLocal(p2, shipPos, fwd, right, 0, STERN_HALL.eyeY, STERN_HALL.seatZ);
  putLocal(l2, shipPos, fwd, right, 0, STERN_HALL.eyeY - 0.5, -SHIP_L * 0.6);

  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  let fov = 55;
  if (s <= 0.42) {
    const u = smootherstep(s / 0.42);
    pos.lerpVectors(embark.pos, p1, u);
    look.lerpVectors(embark.look, l1, u);
    fov = THREE.MathUtils.lerp(embark.fov, 48, u);
  } else if (s <= 0.72) {
    const u = smootherstep((s - 0.42) / 0.3);
    pos.lerpVectors(p1, p2, u);
    look.lerpVectors(l1, l2, u);
    fov = THREE.MathUtils.lerp(48, 52, u);
  } else {
    const u = smootherstep((s - 0.72) / 0.28);
    pos.copy(p2);
    look.copy(l2);
    fov = THREE.MathUtils.lerp(52, 55, u);
  }
  return { pos, look, fov, up: UP.clone() };
}
