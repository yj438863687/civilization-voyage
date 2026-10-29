/** World data is configuration, not render code. Test sea only. */

import { STERN_HALL } from './hull';

export const WORLD = {
  bounds: { minX: -70, maxX: 70, minZ: -70, maxZ: 70 },
  ship: {
    maxSpeed: 11,
    reverseSpeed: 4,
    accel: 6,
    turn: 0.7,
    radius: 6,
  },
  spawn: { x: 0, z: 22, yaw: 0 },
  camera: {
    followDistance: 27,
    followHeight: 9.5,
    cockpitHeight: STERN_HALL.winY,
    cockpitForward: -(STERN_HALL.z + STERN_HALL.d * 0.22),
  },
  ports: [
    {
      id: 'test-port',
      name: '中性测试港',
      x: 26,
      z: -16,
      radius: 9,
      pierLength: 10,
      mark: 'test' as const,
    },
  ],
  fragments: [
    {
      id: 'test-grid-note',
      title: '测试海域网格说明',
      x: 30,
      z: -12,
      pickupRadius: 5,
      classification: 'test' as const,
      text: '这块碎片只用于验证发现、收入货舱和出处字段。数值和地点都是虚构测试数据。',
      sources: [
        {
          id: 'fixture',
          title: 'content/scenes/neutral-test.json',
          url: 'https://github.com/yj438863687/civilization-voyage',
          license: 'MIT',
          verification: 'unverified' as const,
        },
      ],
    },
  ],
};

export type PortPlace = (typeof WORLD.ports)[number];
export type FragmentPlace = (typeof WORLD.fragments)[number];
