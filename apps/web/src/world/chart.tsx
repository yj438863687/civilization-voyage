import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * 一张海图，四段航程各添一笔。
 *
 * 这是全作唯一的贯穿物：农业段在最上面画下第一个圈，工业段添一条航线，
 * 信息段添一处断点，智能段添一颗它自己算出来的星。四段走完，同一张图上有四种笔迹。
 *
 * 笔迹不是装饰，是玩家每一次落印留下的：它画的是「你把人类的能力伸到了哪里」。
 * 概念设计，不是任何真实海图或考古材料。
 */

export type ChartStroke =
  | { epoch: 'A'; kind: 'settle'; at: [number, number] }
  | { epoch: 'B'; kind: 'route'; from: [number, number]; to: [number, number] }
  | { epoch: 'C'; kind: 'gap'; at: [number, number] }
  | { epoch: 'D'; kind: 'star'; at: [number, number] };

/** 四段默认的笔迹位置。写死在海图坐标系里（-1..1），跟世界坐标无关。 */
export const CHART_LAYOUT: ChartStroke[] = [
  { epoch: 'A', kind: 'settle', at: [-0.42, 0.16] },
  { epoch: 'B', kind: 'route', from: [-0.42, 0.16], to: [0.06, -0.1] },
  { epoch: 'C', kind: 'gap', at: [0.06, -0.1] },
  { epoch: 'D', kind: 'star', at: [0.46, 0.34] },
];

const INK: Record<string, string> = {
  A: '#8d4a2f', // 土红：第一笔是烧过的陶
  B: '#3f4750', // 铁灰
  C: '#3f6b74', // 冷青
  D: '#5a6fa8', // 星蓝
};

function strokeGeometry(st: ChartStroke, W: number, H: number) {
  const px = (v: number) => v * W;
  const pz = (v: number) => v * H;
  const pts: THREE.Vector3[] = [];
  if (st.kind === 'settle') {
    // 一个不太圆的圈：用手画的，不是印出来的
    const [cx, cz] = st.at;
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const wob = 1 + Math.sin(a * 3 + 1) * 0.06;
      pts.push(new THREE.Vector3(px(cx) + Math.cos(a) * 0.11 * W * wob, 0, pz(cz) + Math.sin(a) * 0.11 * H * wob));
    }
  } else if (st.kind === 'route') {
    const [x1, z1] = st.from;
    const [x2, z2] = st.to;
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      // 略微弯，像船真的走过
      const bow = Math.sin(t * Math.PI) * 0.05;
      pts.push(new THREE.Vector3(px(x1 + (x2 - x1) * t + bow), 0, pz(z1 + (z2 - z1) * t)));
    }
  } else if (st.kind === 'gap') {
    const [cx, cz] = st.at;
    // 一道短竖线，中间断开：图上唯一断开的地方
    for (let i = 0; i <= 6; i++) pts.push(new THREE.Vector3(px(cx), 0, pz(cz) - 0.05 + (i / 6) * 0.032));
    for (let i = 0; i <= 6; i++) pts.push(new THREE.Vector3(px(cx), 0, pz(cz) + 0.018 + (i / 6) * 0.032));
  } else {
    const [cx, cz] = st.at;
    // 一颗四角星：它算出来的，不是谁看见的
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? 0.05 : 0.018;
      pts.push(new THREE.Vector3(px(cx) + Math.cos(a) * r * W, 0, pz(cz) + Math.sin(a) * r * H));
    }
  }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  return g;
}

/** 摊在桌上的一张海图。已经走过的段落下笔迹，没走到的还是空白。 */
export function SeaChart({
  struck,
  activeEpoch,
  width = 2.4,
  height = 1.6,
}: {
  /** 已经落过印的段 */
  struck: string[];
  /** 当前这一段，用来给正在添的那一笔做呼吸 */
  activeEpoch: string;
  width?: number;
  height?: number;
}) {
  const group = useRef<THREE.Group>(null);

  const paper = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 340;
    const g = c.getContext('2d');
    if (g) {
      g.fillStyle = '#e6dcc4';
      g.fillRect(0, 0, 512, 340);
      // 经纬线：淡，只是让人看出这是一张图
      g.strokeStyle = 'rgba(90,78,58,0.18)';
      g.lineWidth = 1;
      for (let i = 1; i < 8; i++) {
        g.beginPath();
        g.moveTo((i * 512) / 8, 0);
        g.lineTo((i * 512) / 8, 340);
        g.stroke();
      }
      for (let i = 1; i < 6; i++) {
        g.beginPath();
        g.moveTo(0, (i * 340) / 6);
        g.lineTo(512, (i * 340) / 6);
        g.stroke();
      }
      // 几处随机的暗斑，像旧纸上的水渍
      for (let i = 0; i < 26; i++) {
        const x = (i * 97) % 512;
        const y = (i * 61) % 340;
        const r = 6 + ((i * 13) % 26);
        const grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, 'rgba(120,100,70,0.06)');
        grad.addColorStop(1, 'rgba(120,100,70,0)');
        g.fillStyle = grad;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      // 边缘压暗
      const edge = g.createRadialGradient(256, 170, 90, 256, 170, 300);
      edge.addColorStop(0, 'rgba(0,0,0,0)');
      edge.addColorStop(1, 'rgba(70,56,38,0.22)');
      g.fillStyle = edge;
      g.fillRect(0, 0, 512, 340);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  const strokes = useMemo(
    () =>
      CHART_LAYOUT.filter((s) => struck.includes(s.epoch)).map((s) => ({
        s,
        geo: strokeGeometry(s, width, height),
      })),
    [struck, width, height],
  );

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    // 纸很轻地起伏：它不是一块板，是一张放在桌上的纸
    g.rotation.z = Math.sin(t * 0.4) * 0.006;
    g.position.y = Math.sin(t * 0.55) * 0.01;
  });

  return (
    <group ref={group} rotation={[-Math.PI / 2.35, 0, 0]}>
      {/* 纸 */}
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={paper} roughness={0.94} side={THREE.DoubleSide} />
      </mesh>

      {/* 已经被走出来的笔迹：一千年一张图上，四种笔迹 */}
      {strokes.map(({ s, geo }, i) => (
        <primitive
          key={`${s.epoch}-${i}`}
          object={
            new THREE.Line(
              geo,
              new THREE.LineBasicMaterial({
                color: INK[s.epoch] ?? '#5a4a38',
                transparent: true,
                opacity: s.epoch === activeEpoch ? 0.95 : 0.62,
              }),
            )
          }
        />
      ))}

      {/* 还没画的段：图上留着空白，但不提示"这里将来会有东西" */}
    </group>
  );
}

/** 把这张图折算成一行字，给日志页用。 */
export function chartSummary(struck: string[]): string {
  const order = ['A', 'B', 'C', 'D'];
  const lines: Record<string, string> = {
    A: '第一个圈：你把船靠在了一个地方。',
    B: '一条航线：你用动力把两点连了起来。',
    C: '一处断点：你让图上出现了一处没有人。',
    D: '一颗星：你把目的地的方向交了出去。',
  };
  return order
    .filter((e) => struck.includes(e))
    .map((e) => lines[e])
    .join('\n');
}
