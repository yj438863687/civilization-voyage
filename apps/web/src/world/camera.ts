import * as THREE from 'three';
import { SHIP_L } from './hull';
import { WORLD } from './world.config';
import { smootherstep } from './voyageConstants';

export type CamMode = 'embark' | 'cockpit' | 'route' | 'follow' | 'port' | 'reflection';

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

export function desiredPose(
  mode: CamMode,
  shipPos: THREE.Vector3,
  fwd: THREE.Vector3,
  right: THREE.Vector3,
): CamPose {
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const up = UP.clone();
  let fov = 42;

  if (mode === 'embark') {
    const dist = SHIP_L * 2.25;
    const yaw = (58 * Math.PI) / 180;
    const pitch = (5 * Math.PI) / 180;
    pos
      .copy(shipPos)
      .addScaledVector(fwd, dist * Math.cos(yaw) * Math.cos(pitch))
      .addScaledVector(right, dist * Math.sin(yaw) * Math.cos(pitch))
      .addScaledVector(UP, dist * Math.sin(pitch) + 0.35);
    look.copy(shipPos).setY(2.7);
    fov = 34;
  } else if (mode === 'cockpit') {
    pos.copy(shipPos).addScaledVector(fwd, WORLD.camera.cockpitForward).addScaledVector(UP, WORLD.camera.cockpitHeight);
    look.copy(shipPos).addScaledVector(fwd, 14).setY(3.2);
    fov = 55;
  } else if (mode === 'route') {
    pos.set(shipPos.x, 48, shipPos.z + 0.01);
    look.copy(shipPos);
    up.set(0, 0, -1);
    fov = 50;
  } else if (mode === 'port') {
    const p = WORLD.ports[0];
    pos.set(p.x - 18, 14, p.z + 20);
    look.set(p.x, 2.5, p.z);
    fov = 40;
  } else if (mode === 'reflection') {
    pos.copy(shipPos).addScaledVector(right, 0.4).addScaledVector(UP, 5.2).addScaledVector(fwd, -2.4);
    look.copy(shipPos).addScaledVector(fwd, 2).setY(3.2);
    fov = 46;
  } else {
    const dist = SHIP_L * 1.35;
    const yaw = (35 * Math.PI) / 180;
    const pitch = (18 * Math.PI) / 180;
    pos
      .copy(shipPos)
      .addScaledVector(fwd, -dist * Math.cos(yaw) * Math.cos(pitch))
      .addScaledVector(right, dist * Math.sin(yaw) * Math.cos(pitch))
      .addScaledVector(UP, dist * Math.sin(pitch) + 2);
    look.copy(shipPos).setY(3.4);
    fov = 42;
  }
  return { pos, look, fov, up };
}
