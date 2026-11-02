import { useEffect, useState } from 'react';
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
  reduceMotion,
  onDone,
}: {
  story: Story;
  reduceMotion: boolean;
  onDone: () => void;
}) {
  const f = story.figure;
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
export function SpiritMap({ path }: { path: { era: string; lane: string; word: string; figure: string }[] }) {
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
    </svg>
  );
}
