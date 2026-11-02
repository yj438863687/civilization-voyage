import { useEffect, useRef, useState } from 'react';
import type { Encounter, Outcome } from '../world/encounters';

/**
 * 一场遭遇：人先开口 → 你做一件小事 → 结果浮上来 → 东西收进货舱。
 * 不用卡片：字浮在画面下三分之一，游戏的刻度也画在画面上。
 */
type Phase = 'intro' | 'play' | 'result';

export function EncounterOverlay({
  enc,
  title,
  reduceMotion,
  onDone,
}: {
  enc: Encounter;
  /** 这件东西叫什么 */
  title: string;
  reduceMotion: boolean;
  onDone: (o: Outcome, summary: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [out, setOut] = useState<{ o: Outcome; summary: string } | null>(null);

  // 开场：人说完一句话，再开始
  useEffect(() => {
    if (phase !== 'intro') return;
    const go = () => setPhase('play');
    const t = window.setTimeout(go, reduceMotion ? 900 : 2200);
    const key = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        go();
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', key);
    };
  }, [phase, reduceMotion]);

  const finish = (o: Outcome, summary: string) => {
    setOut({ o, summary });
    setPhase('result');
  };

  // 结果停一会儿，或按空格跳过
  useEffect(() => {
    if (phase !== 'result' || !out) return;
    const done = () => onDone(out.o, out.summary);
    const t = window.setTimeout(done, reduceMotion ? 1600 : 3400);
    const key = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        done();
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, out]);

  const g = enc.game;
  return (
    <div className="enc" role="dialog" aria-label={`${enc.who}：${title}`}>
      <div className="enc-scrim" aria-hidden />
      <div className="enc-who">
        <span className="enc-name">{enc.who}</span>
        <span className="enc-role">{enc.role}</span>
      </div>
      <p className={`enc-line${phase === 'intro' ? ' is-in' : ' is-up'}`}>「{enc.line}」</p>

      {phase === 'play' && g.kind === 'hold' && (
        <HoldGame
          g={g}
          onEnd={(ok) => finish(ok ? enc.win! : enc.lose!, ok ? '成' : '未成')}
        />
      )}
      {phase === 'play' && g.kind === 'rhythm' && (
        <RhythmGame g={g} onEnd={(hits) => finish(hits >= Math.ceil(g.beats * 0.6) ? enc.win! : enc.lose!, `${hits}/${g.beats}`)} />
      )}
      {phase === 'play' && g.kind === 'catch' && (
        <CatchGame g={g} onEnd={(n) => finish(n >= g.need ? enc.win! : enc.lose!, `接住 ${n}`)} />
      )}
      {phase === 'play' && g.kind === 'choice' && (
        <ChoiceGame g={g} onPick={(i) => finish(g.options[i].out, g.options[i].label)} />
      )}

      {phase === 'result' && out && (
        <div className="enc-result">
          <p className="enc-result-text">{out.o.text}</p>
          <p className="enc-result-delta">
            <Delta label="补给" v={out.o.supply} />
            <Delta label="人心" v={out.o.trust} />
            <span className="enc-got">收入货舱 · {title}</span>
          </p>
        </div>
      )}
      {phase === 'intro' && <p className="enc-hint">空格继续</p>}
    </div>
  );
}

function Delta({ label, v }: { label: string; v: number }) {
  if (!v) return <span className="enc-delta is-zero">{label} ±0</span>;
  return (
    <span className={`enc-delta ${v > 0 ? 'is-up' : 'is-down'}`}>
      {label} {v > 0 ? `+${v}` : v}
    </span>
  );
}

/* ---------- 压针：按住往上，松开往下掉，停在区间里累计够秒数 ---------- */
function HoldGame({
  g,
  onEnd,
}: {
  g: Extract<Encounter['game'], { kind: 'hold' }>;
  onEnd: (ok: boolean) => void;
}) {
  const [v, setV] = useState(0.15);
  const [inside, setInside] = useState(0);
  const [left, setLeft] = useState(9);
  const down = useRef(false);
  const st = useRef({ v: 0.15, vel: 0, inside: 0, t: 0, done: false });

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        down.current = true;
      }
    };
    const ku = (e: KeyboardEvent) => {
      if (e.key === ' ') down.current = false;
    };
    const pd = () => (down.current = true);
    const pu = () => (down.current = false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('pointerdown', pd);
    window.addEventListener('pointerup', pu);
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = st.current;
      if (s.done) return;
      s.t += dt;
      // 有惯性：按住是加速度，不是速度。还带一点不规则的浪
      const push = down.current ? 1.25 : -g.drift;
      const wave = Math.sin(s.t * 2.3) * 0.22 + Math.sin(s.t * 5.1) * 0.12;
      s.vel += (push + wave * g.drift) * dt;
      s.vel *= 1 - Math.min(1, 2.4 * dt);
      s.v = Math.max(0, Math.min(1, s.v + s.vel * dt));
      if (s.v <= 0 || s.v >= 1) s.vel *= -0.3;
      if (s.v >= g.band[0] && s.v <= g.band[1]) s.inside += dt;
      setV(s.v);
      setInside(s.inside);
      setLeft(Math.max(0, 9 - s.t));
      if (s.inside >= g.secs) {
        s.done = true;
        window.setTimeout(() => onEnd(true), 350);
        return;
      }
      if (s.t >= 9) {
        s.done = true;
        window.setTimeout(() => onEnd(false), 350);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('pointerdown', pd);
      window.removeEventListener('pointerup', pu);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inBand = v >= g.band[0] && v <= g.band[1];
  return (
    <div className="enc-game enc-hold">
      <div className="hold-track">
        <div className="hold-band" style={{ left: `${g.band[0] * 100}%`, width: `${(g.band[1] - g.band[0]) * 100}%` }}>
          <span>{g.label}</span>
        </div>
        <div className={`hold-needle${inBand ? ' is-in' : ''}`} style={{ left: `${v * 100}%` }} />
      </div>
      <div className="hold-meter">
        <div className="hold-fill" style={{ width: `${Math.min(1, inside / g.secs) * 100}%` }} />
      </div>
      <p className="enc-how">
        {g.verb} · <kbd>空格</kbd> 或按住鼠标 · 还剩 {left.toFixed(0)} 秒
      </p>
    </div>
  );
}

/* ---------- 节拍：亮点从左往右走，进圈时按空格 ---------- */
function RhythmGame({
  g,
  onEnd,
}: {
  g: Extract<Encounter['game'], { kind: 'rhythm' }>;
  onEnd: (hits: number) => void;
}) {
  const [x, setX] = useState(0);
  const [beat, setBeat] = useState(0);
  const [marks, setMarks] = useState<('hit' | 'miss')[]>([]);
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null);
  const st = useRef({ x: 0, beat: 0, pressed: false, hits: 0, done: false, marks: [] as ('hit' | 'miss')[] });

  useEffect(() => {
    const target = 0.78;
    const win = 0.075;
    const settle = (kind: 'hit' | 'miss') => {
      const s = st.current;
      s.marks = [...s.marks, kind];
      if (kind === 'hit') s.hits += 1;
      setMarks(s.marks);
      setFlash(kind);
      window.setTimeout(() => setFlash(null), 220);
      s.beat += 1;
      setBeat(s.beat);
      s.x = 0;
      s.pressed = false;
      if (s.beat >= g.beats) {
        s.done = true;
        window.setTimeout(() => onEnd(s.hits), 500);
      }
    };
    const press = () => {
      const s = st.current;
      if (s.done || s.pressed) return;
      s.pressed = true;
      settle(Math.abs(s.x - target) <= win ? 'hit' : 'miss');
    };
    const kd = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        press();
      }
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('pointerdown', press);
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = st.current;
      if (s.done) return;
      // 每一拍略快一点
      s.x += dt * g.speed * (0.55 + s.beat * 0.05);
      if (s.x > 1) settle('miss');
      setX(s.x);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('pointerdown', press);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`enc-game enc-rhythm${flash ? ` is-${flash}` : ''}`}>
      <div className="rhythm-track">
        <div className="rhythm-target" style={{ left: '78%' }} />
        <div className="rhythm-dot" style={{ left: `${Math.min(1, x) * 100}%` }} />
      </div>
      <div className="rhythm-marks">
        {Array.from({ length: g.beats }, (_, i) => (
          <span key={i} className={`rhythm-mark${marks[i] ? ` is-${marks[i]}` : i === beat ? ' is-now' : ''}`} />
        ))}
      </div>
      <p className="enc-how">
        {g.verb} · {g.label} · <kbd>空格</kbd> 或点击
      </p>
    </div>
  );
}

/* ---------- 接住：A/D 左右移，接好的、躲坏的 ---------- */
interface Drop {
  id: number;
  x: number;
  y: number;
  good: boolean;
  v: number;
}
function CatchGame({
  g,
  onEnd,
}: {
  g: Extract<Encounter['game'], { kind: 'catch' }>;
  onEnd: (n: number) => void;
}) {
  const [, force] = useState(0);
  const st = useRef({ px: 0.5, drops: [] as Drop[], t: 0, next: 0, id: 0, got: 0, bad: 0, done: false, l: false, r: false, pop: [] as { x: number; good: boolean; t: number }[] });
  const area = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'a' || k === 'arrowleft') st.current.l = true;
      if (k === 'd' || k === 'arrowright') st.current.r = true;
    };
    const ku = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'a' || k === 'arrowleft') st.current.l = false;
      if (k === 'd' || k === 'arrowright') st.current.r = false;
    };
    const pm = (e: PointerEvent) => {
      const r = area.current?.getBoundingClientRect();
      if (!r || e.buttons === 0) return;
      st.current.px = Math.max(0.06, Math.min(0.94, (e.clientX - r.left) / r.width));
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('pointermove', pm);
    window.addEventListener('pointerdown', pm);
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = st.current;
      if (s.done) return;
      s.t += dt;
      s.px = Math.max(0.06, Math.min(0.94, s.px + ((s.r ? 1 : 0) - (s.l ? 1 : 0)) * dt * 1.15));
      s.next -= dt;
      if (s.next <= 0) {
        s.next = 0.42 + Math.random() * 0.32;
        s.drops.push({ id: s.id++, x: 0.08 + Math.random() * 0.84, y: -0.05, good: Math.random() > 0.3, v: 0.34 + Math.random() * 0.22 + s.t * 0.018 });
      }
      const keep: Drop[] = [];
      for (const d of s.drops) {
        d.y += d.v * dt;
        if (d.y >= 0.86 && d.y <= 0.96 && Math.abs(d.x - s.px) < 0.09) {
          if (d.good) {
            s.got += 1;
          } else {
            s.got = Math.max(0, s.got - 1);
            s.bad += 1;
          }
          s.pop.push({ x: d.x, good: d.good, t: s.t });
          continue;
        }
        if (d.y < 1.05) keep.push(d);
      }
      s.drops = keep;
      s.pop = s.pop.filter((p) => s.t - p.t < 0.5);
      force((n) => n + 1);
      if (s.t >= g.secs) {
        s.done = true;
        window.setTimeout(() => onEnd(s.got), 300);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('pointermove', pm);
      window.removeEventListener('pointerdown', pm);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = st.current;
  return (
    <div className="enc-game enc-catch">
      <div className="catch-area" ref={area}>
        {s.drops.map((d) => (
          <span key={d.id} className={`catch-drop ${d.good ? 'is-good' : 'is-bad'}`} style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%` }}>
            {d.good ? g.good : g.bad}
          </span>
        ))}
        {s.pop.map((p, i) => (
          <span key={`p${i}`} className={`catch-pop ${p.good ? 'is-good' : 'is-bad'}`} style={{ left: `${p.x * 100}%` }}>
            {p.good ? '+1' : '−1'}
          </span>
        ))}
        <div className="catch-basket" style={{ left: `${s.px * 100}%` }} />
      </div>
      <p className="enc-how">
        {g.verb} · 接住「{g.good}」，躲开「{g.bad}」 · <kbd>A</kbd>/<kbd>D</kbd> 或拖动 · {s.got}/{g.need} · 还剩 {Math.max(0, g.secs - s.t).toFixed(0)} 秒
      </p>
    </div>
  );
}

/* ---------- 抉择：两种做法，各有代价 ---------- */
function ChoiceGame({
  g,
  onPick,
}: {
  g: Extract<Encounter['game'], { kind: 'choice' }>;
  onPick: (i: number) => void;
}) {
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= g.options.length) onPick(n - 1);
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="enc-game enc-choice">
      <p className="choice-ask">{g.ask}</p>
      <div className="choice-row">
        {g.options.map((o, i) => (
          <button key={o.label} type="button" className="choice-opt" onClick={() => onPick(i)}>
            <span className="choice-key">{i + 1}</span>
            <span className="choice-label">{o.label}</span>
            <span className="choice-note">{o.note}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
