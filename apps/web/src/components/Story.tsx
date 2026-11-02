import { useEffect, useState } from 'react';
import type { FableState } from '../world/fable';
import { STORIES, type Beat, type Story } from '../world/stories';

/** 承：船过时浮出来的一段旁白。左上是这一幕叫什么，下面是一句话 */
export function StoryCaption({ beat, title }: { beat: Beat; title: string }) {
  return (
    <div className="story-cap" key={beat.id} aria-live="polite">
      <span className="story-cap-title">「{title}」</span>
      <span className="story-cap-kicker">{beat.kicker}</span>
      <p className="story-cap-text">{beat.text}</p>
    </div>
  );
}

/**
 * 合：岸上的人。
 * 名字、年代、做过什么 → 三句独白依次浮出 → 一句原文与出处 → 这件事在人类精神里留下了什么。
 */
export function ShoreOverlay({
  story,
  state = {},
  reduceMotion,
  onDone,
}: {
  story: Story;
  state?: FableState;
  reduceMotion: boolean;
  onDone: () => void;
}) {
  const f = { ...story.figure, monologue: story.figure.speak?.(state) ?? story.figure.monologue };
  // 0 名字 · 1..n 独白 · n+1 原文 · n+2 意义
  const last = f.monologue.length + 2;
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= last) return;
    const t = window.setTimeout(() => setStep((s) => s + 1), reduceMotion ? 900 : step === 0 ? 2600 : 3600);
    return () => window.clearTimeout(t);
  }, [step, last, reduceMotion]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      e.preventDefault();
      if (step < last) setStep(last);
      else onDone();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [step, last, onDone]);

  return (
    <div className="shore" role="dialog" aria-label={`岸上的人：${f.name}`}>
      <div className="shore-scrim" aria-hidden />
      <p className="shore-arrival">{story.arrival}</p>
      <div className="shore-who">
        <span className="shore-name">{f.name}</span>
        <span className="shore-years">{f.years}</span>
        <span className="shore-deed">{f.deed}</span>
      </div>
      <div className="shore-mono">
        {f.monologue.map((line, i) => (
          <p key={i} className={`shore-line${step > i ? ' is-in' : ''}`}>
            {line}
          </p>
        ))}
        <span className={`shore-tag${step > 0 ? ' is-in' : ''}`}>独白为创作</span>
      </div>
      {f.quote && (
        <blockquote className={`shore-quote${step > f.monologue.length ? ' is-in' : ''}`}>
          <p>{f.quote.text}</p>
          <cite>{f.quote.source}</cite>
        </blockquote>
      )}
      <div className={`shore-meaning${step >= last ? ' is-in' : ''}`}>
        <span className="shore-spirit">{story.spirit.word}</span>
        <p>{f.meaning}</p>
      </div>
      <button className="cine-link shore-go" type="button" onClick={() => (step < last ? setStep(last) : onDone())}>
        {step < last ? '听完' : '去落印'}
      </button>
    </div>
  );
}

const ERA_ORDER = ['A', 'B', 'C', 'D'] as const;
const ERA_NAME: Record<string, string> = { A: '农业', B: '工业', C: '信息', D: '智能' };

/**
 * 人类精神图谱：四个时代、八颗星。你走过的那条线亮着，并且连在一起；
 * 没走的那条也在图上，暗着——它是另一种可能，不是错。
 */
export function SpiritMap({
  path,
  taoyuan,
}: {
  path: { era: string; lane: string; word: string; figure: string }[];
  /** 暗线：去过桃花源，图的角落里多一颗找不到的星 */
  taoyuan?: string;
}) {
  const W = 440;
  const H = 230;
  const col = (i: number) => 60 + i * 107;
  const row = (lane: string) => (lane === 'far' ? 160 : 72);
  const taken = (era: string, lane: string) => path.some((p) => p.era === era && p.lane === lane);
  const lit = ERA_ORDER.map((e, i) => {
    const p = path.find((x) => x.era === e);
    return p ? { x: col(i), y: row(p.lane) } : null;
  }).filter(Boolean) as { x: number; y: number }[];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="spirit-map" role="img" aria-label="人类精神图谱">
      <text x={W / 2} y={20} textAnchor="middle" className="spirit-title">
        人类精神图谱
      </text>
      {/* 时代的列 */}
      {ERA_ORDER.map((e, i) => (
        <g key={e}>
          <line x1={col(i)} y1={40} x2={col(i)} y2={200} stroke="rgba(232,226,210,0.08)" />
          <text x={col(i)} y={218} textAnchor="middle" className="spirit-era">
            {ERA_NAME[e]}
          </text>
        </g>
      ))}
      {/* 你走过的线 */}
      {lit.length > 1 && (
        <polyline
          points={lit.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#f0d59a"
          strokeWidth="1.2"
          strokeDasharray="3 3"
          opacity="0.75"
        />
      )}
      {/* 八颗星 */}
      {ERA_ORDER.map((e, i) =>
        (['near', 'far'] as const).map((lane) => {
          const st = STORIES[e][lane];
          const on = taken(e, lane);
          const x = col(i);
          const y = row(lane);
          return (
            <g key={`${e}-${lane}`} opacity={on ? 1 : 0.34}>
              {on && <circle cx={x} cy={y} r={13} fill="rgba(240,213,154,0.14)" />}
              <path
                d={`M${x} ${y - 7} L${x + 2} ${y - 2} L${x + 7} ${y} L${x + 2} ${y + 2} L${x} ${y + 7} L${x - 2} ${y + 2} L${x - 7} ${y} L${x - 2} ${y - 2} Z`}
                fill={on ? '#fff1d0' : '#8a8478'}
              />
              <text x={x} y={y - 15} textAnchor="middle" className={`spirit-word${on ? ' is-on' : ''}`}>
                {st.spirit.word}
              </text>
              <text x={x} y={y + 22} textAnchor="middle" className="spirit-fig">
                {st.figure.name}
              </text>
            </g>
          );
        }),
      )}
      {taoyuan && (
        <g className="spirit-tao">
          <circle cx={W - 26} cy={34} r={9} fill="rgba(244,184,196,0.12)" />
          <circle cx={W - 26} cy={34} r={2.6} fill="#f4b8c4" />
          <text x={W - 26} y={56} textAnchor="middle" className="spirit-fig">
            桃花源
          </text>
        </g>
      )}
    </svg>
  );
}

/**
 * 尾页：像绘本的最后一页。
 * 一张按你这一程画出来的插图，几句话把来龙去脉讲一遍，最后点出这一程留下的那个概念。
 */
export function StoryPage({
  story,
  state,
  storyId,
  onDone,
}: {
  story: Story;
  state: FableState;
  storyId: string;
  onDone: () => void;
}) {
  const lines = story.page?.(state) ?? [];
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onDone();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onDone]);
  return (
    <div className="page" role="dialog" aria-label={`这一程的故事：${story.title}`}>
      <div className="page-paper">
        <span className="page-kicker">这一程的故事</span>
        <h2 className="page-title">{story.title}</h2>
        {storyId === 'A-near' ? <GateTale state={state} /> : story.art && story.artNames && <TaleArt story={story} state={state} />}
        <div className="page-lines">
          {lines.map((l, i) => (
            <p key={i} style={{ animationDelay: `${0.8 + i * 1.1}s` }}>
              {l}
            </p>
          ))}
        </div>
        {story.concept && (
          <div className="page-concept" style={{ animationDelay: `${1.2 + lines.length * 1.1}s` }}>
            <span className="page-concept-name">{story.concept.name}</span>
            <p>{story.concept.explain}</p>
          </div>
        )}
        <button className="cine-link page-go" type="button" onClick={onDone}>
          合上这一页
        </button>
      </div>
    </div>
  );
}

/** 「一道闸」的插图：河、闸、两块田、一圈桩、下游的村子。每一笔都按你做过的事来画 */
function GateTale({ state }: { state: FableState }) {
  const even = state.gate === 'even';
  const gap = state.stakes === 'gap';
  const held = state.flood === 'held';
  const flooded = !gap && held;
  const fieldL = even ? '#7a9a52' : '#5a8aa0';
  const fieldR = even ? '#7a9a52' : '#b08a58';
  return (
    <svg viewBox="0 0 520 220" className="page-art" aria-hidden>
      <defs>
        <pattern id="pg-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(60,44,28,0.25)" strokeWidth="1" />
        </pattern>
      </defs>
      {/* 河：从左上流来 */}
      <path className="pg-draw" d="M10 40 C 90 60, 120 90, 170 110 S 300 150, 510 170" fill="none" stroke="#5a8aa0" strokeWidth="10" strokeLinecap="round" opacity="0.75" />
      {/* 第一座岛：闸与两块田 */}
      <g className="pg-fade" style={{ animationDelay: '0.4s' }}>
        <ellipse cx="120" cy="120" rx="62" ry="30" fill="#c8b48a" stroke="#6a5034" strokeWidth="1.5" />
        <rect x="80" y="108" width="30" height="22" fill={fieldL} stroke="#5a4428" />
        <rect x="130" y="108" width="30" height="22" fill={fieldR} stroke="#5a4428" />
        {!even && <path d="M136 112 l6 8 l-4 6 M150 110 l-3 10" stroke="#5a4428" fill="none" />}
        <rect x="116" y="100" width="8" height="34" fill="#6a5034" />
        <text x="120" y="160" textAnchor="middle" className="pg-label">看水的人</text>
      </g>
      {/* 第二座岛：一圈桩 */}
      <g className="pg-fade" style={{ animationDelay: '1.2s' }}>
        <ellipse cx="290" cy="128" rx="58" ry="28" fill="#c8b48a" stroke="#6a5034" strokeWidth="1.5" />
        <rect x="262" y="116" width="56" height="24" fill="url(#pg-hatch)" stroke="#5a4428" />
        {Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2;
          const hide = gap && (i === 0 || i === 13);
          return hide ? null : <line key={i} x1={290 + Math.cos(a) * 40} y1={128 + Math.sin(a) * 18} x2={290 + Math.cos(a) * 40} y2={120 + Math.sin(a) * 18} stroke="#5a4028" strokeWidth="2.4" />;
        })}
        {gap ? (
          <path className="pg-draw" d="M232 128 L 352 128" stroke="#5a8aa0" strokeWidth="3" strokeDasharray="4 4" fill="none" style={{ animationDelay: '1.8s' }} />
        ) : (
          <circle cx="238" cy="128" r="9" fill="none" stroke="#5a8aa0" strokeWidth="3" />
        )}
        <text x="290" y="168" textAnchor="middle" className="pg-label">立桩的人</text>
      </g>
      {/* 下游的村子：淹没淹 */}
      <g className="pg-fade" style={{ animationDelay: '2s' }}>
        <ellipse cx="440" cy="150" rx="58" ry="26" fill="#c8b48a" stroke="#6a5034" strokeWidth="1.5" />
        {[420, 445, 468].map((x, i) => (
          <g key={x} transform={`translate(${x} ${140 + (i % 2) * 6}) rotate(${flooded ? 8 : 0})`}>
            <rect x="-7" y="-4" width="14" height="12" fill="#8a6a44" />
            <path d="M-10 -4 L0 -14 L10 -4 Z" fill="#a08a58" />
          </g>
        ))}
        {(flooded || state.flood === 'open') && (
          <path className="pg-draw" d={flooded ? 'M386 150 Q 440 132 494 150' : 'M392 166 Q 440 178 488 166'} stroke="#5a8aa0" strokeWidth="6" fill="none" opacity="0.7" style={{ animationDelay: '2.6s' }} />
        )}
        <text x="440" y="190" textAnchor="middle" className="pg-label">
          {flooded ? '屋子淹了，人都在' : state.flood === 'open' ? '下游的苗没了' : '两岸都在'}
        </text>
      </g>
      {/* 小船 */}
      <g className="pg-fade" style={{ animationDelay: '0.2s' }}>
        <path d="M30 80 L60 80 L54 88 L36 88 Z" fill="#3a2a1e" />
        <path d="M44 80 L44 62 L56 78 Z" fill="#e8dcc4" stroke="#6a5034" strokeWidth="0.8" />
      </g>
    </svg>
  );
}

/** 通用的绘本插图：一条航线，三座岛，每座岛上写着那里发生了什么；终点是岸上的人 */
function TaleArt({ story, state }: { story: Story; state: FableState }) {
  const tags = story.art!(state);
  const names = story.artNames!;
  const stops = [
    { x: 110, y: 118 },
    { x: 250, y: 92 },
    { x: 390, y: 126 },
  ];
  return (
    <svg viewBox="0 0 520 200" className="page-art" aria-hidden>
      <path className="pg-draw" d="M20 70 C 80 80, 90 120, 110 118 S 200 80, 250 92 S 340 140, 390 126 S 470 100, 500 96" fill="none" stroke="#8a6a42" strokeWidth="2" strokeDasharray="5 5" />
      {stops.map((p, i) => (
        <g key={i} className="pg-fade" style={{ animationDelay: `${0.4 + i * 0.7}s` }}>
          <ellipse cx={p.x} cy={p.y} rx="46" ry="20" fill={i === 2 ? '#d8c09a' : '#c8b48a'} stroke="#6a5034" strokeWidth="1.5" />
          <text x={p.x} y={p.y + 5} textAnchor="middle" className="pg-name">
            {names[i]}
          </text>
          <text x={p.x} y={p.y + 40} textAnchor="middle" className="pg-label">
            {tags[i]}
          </text>
        </g>
      ))}
      <g className="pg-fade" style={{ animationDelay: '2.6s' }}>
        <circle cx="500" cy="96" r="6" fill="#8a3a22" />
        <text x="500" y="122" textAnchor="end" className="pg-label">
          {story.figure.name}
        </text>
      </g>
      <g className="pg-fade" style={{ animationDelay: '0.2s' }}>
        <path d="M14 62 L40 62 L35 69 L19 69 Z" fill="#3a2a1e" />
        <path d="M27 62 L27 46 L37 60 Z" fill="#e8dcc4" stroke="#6a5034" strokeWidth="0.8" />
      </g>
    </svg>
  );
}
