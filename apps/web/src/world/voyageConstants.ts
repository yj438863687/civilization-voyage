import { SHIP_L } from './hull';

/** Matches docs/design/MOTION.md + claude-to-grok.md §2.3. */

export const BLEND_SEC: Record<string, number> = {
  embark: 1.2,
  cockpit: 1.2,
  route: 1.0,
  follow: 1.8,
  port: 1.2,
  reflection: 0.48,
};

export const FOLLOW_TAU = {
  lateral: 0.18,
  dist: 0.3,
  height: 0.45,
  yaw: 0.35,
  pitch: 0.5,
};

export const SHIP_MOTION = {
  pitch: { a: 1.4, t: 5.0, p: 0 },
  roll: { a: 2.2, t: 6.5, p: Math.PI / 3 },
  yaw: { a: 0.7, t: 8.0, p: Math.PI },
  heave: { a: 0.02 * SHIP_L, t: 4.5, p: Math.PI / 2 },
};

export const HEEL_MAX = (4 * Math.PI) / 180;
export const HEEL_TAU = 0.9;
export const HEEL_RETURN_TAU = 1.6;

export const WATER = {
  fresnel: 3.0,
  reflectMix: 0.55,
  swellUv: 0.03,
};

export const MIST = {
  height: 0.05 * SHIP_L,
  opacity: 0.35,
};

export function smootherstep(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/** Warm dots behind a port, 4–7 ship-lengths out. Emissive only, no light, no flash. */
export const FAR_LAMPS = {
  count: 4,
  distMin: 4.2 * SHIP_L,
  distMax: 6.4 * SHIP_L,
  radius: 0.006 * SHIP_L,
  emissive: 0.5,
};

export const PORT_LAMP_SHAPES: Array<'sphere' | 'box' | 'tube'> = ['sphere', 'box', 'tube', 'sphere'];
