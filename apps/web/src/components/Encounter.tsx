import { localize } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import type { Encounter, Outcome } from '../world/encounters';
import { voyageCue } from './VoyageMusic';
import { waterLive, type WaterResult } from '../world/waterGame';

/**
 * 一场遭遇：人先开口 → 你做一件小事 → 结果浮上来 → 东西收进货舱。
 * 不用卡片：字浮在画面下三分之一，游戏的刻度也画在画面上。
 */
type Phase = 'intro' | 'talk' | 'play' | 'decision' | 'result';

export function EncounterOverlay({
  enc,
  title,
  reduceMotion,
  onDone,
  onCancel,
  crisis = false,
  cause,
  secret = false,
  timeLimit,
  onPhase,
  waterResult = null,
}: {
  enc: Encounter;
  /** 这件东西叫什么；危机时是那一幕的名字 */
  title: string;
  reduceMotion: boolean;
  onDone: (o: Outcome, summary: string) => void;
  onCancel?:()=>void;
  /** 危机：不是捡东西，是一件躲不开的事 */
  crisis?: boolean;
  /** 危机的来由：前面那几件事让它变成了什么样子 */
  cause?: string;
  /** 暗线：桃花源。字是暖的，像从山口透出来的光 */
  secret?: boolean;
  /** 限时（秒）：到点没选，就按 fallback 那一项算 */
  timeLimit?: number;
  /** 玩法在水上：进入 play 阶段时告诉外面，船来做；结果从 waterResult 回来 */
  onPhase?: (phase: 'intro' | 'talk' | 'play' | 'result') => void;
  waterResult?: WaterResult | null;
}) {
  const [phase, setPhase] = useState<Phase>('intro');
  /** 对话进行到第几句 */
  const [said, setSaid] = useState(0);
  const dialog = enc.dialog ?? [];
  const [out, setOut] = useState<{ o: Outcome; summary: string } | null>(null);
  const [work,setWork]=useState<{o:Outcome;summary:string}|null>(null);
  const taskFinished=useRef(false);
  useEffect(()=>{const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&onCancel){event.preventDefault();event.stopImmediatePropagation();onCancel();}};window.addEventListener('keydown',escape,true);return()=>window.removeEventListener('keydown',escape,true);},[onCancel]);

  // 开场：人说完一句话，再开始
  useEffect(() => {
    if (phase !== 'intro') return;
    const go = () => setPhase(dialog.length ? 'talk' : 'play');
    const t = window.setTimeout(go, reduceMotion ? 900 : cause ? 4200 : 2400);
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

  const advanceDialogue=()=>{if(said+1>=dialog.length){setSaid(dialog.length);setPhase('play');}else setSaid(n=>Math.min(dialog.length,n+1));};

  // 每句由玩家推进，英文长句和减少动态模式都有足够阅读时间。
  useEffect(() => {
    if (phase !== 'talk') return;
    const next=advanceDialogue;
    const key = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, said]);

  /** 这一场什么时候开始做事：比它早的结果都是上一场的 */
  const playAt = useRef(0);
  useEffect(() => {
    if (phase === 'play') playAt.current = performance.now();
    onPhase?.(phase==='decision'?'talk':phase);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // 船做完了：把水上的结果换成这一场的结局
  useEffect(() => {
    if (phase !== 'play' || !waterResult || waterResult.at <= playAt.current) return;
    const g = enc.game;
    if (waterResult.kind === 'gates' && g.kind === 'choice') {
      const o = g.options[waterResult.idx] ?? g.options[g.options.length - 1];
      finish(waterResult.timedOut ? { ...o.out, text: `没来得及决定。${o.out.text}` } : o.out, waterResult.timedOut ? `没来得及 · ${o.label}` : o.label);
    } else if (waterResult.kind === 'ring') {
      finish(waterResult.won ? enc.win! : enc.lose!, waterResult.won ? '做成了' : '没做成');
    } else if (waterResult.kind === 'catch') {
      finish(waterResult.won ? enc.win! : enc.lose!, `接住 ${waterResult.got}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waterResult, phase]);

  /** 只结算一次：结果被重复读到、组件重挂，都不能重复加连击分 */
  const settled = useRef(false);
  const finish = (o: Outcome, summary: string) => {
    if(taskFinished.current)return;
    taskFinished.current=true;
    if(enc.social&&enc.game.kind!=='choice'){setWork({o,summary});setPhase('decision');return;}
    settle(o,summary);
  };
  const settle=(o:Outcome,summary:string)=>{
    if (settled.current) return;
    settled.current = true;
    setOut({ o, summary });
    setPhase('result');
  };

  const delivered=useRef(false);
  // 结果停一会儿，或按空格跳过
  useEffect(() => {
    if (phase !== 'result' || !out) return;
    const done = () => {if(!delivered.current){delivered.current=true;onDone(out.o,out.summary);}};
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
    <div className={`enc${crisis ? ' is-crisis' : ''}${secret ? ' is-secret' : ''}`} role="dialog" aria-label={localize(`${enc.who}：${title}`)}>
      <div className="enc-scrim" aria-hidden />
      {onCancel&&<button className="btn encounter-return" type="button" onClick={onCancel}>{localize("暂时回到船上")}</button>}
      {crisis && <span className="enc-crisis">{localize(title.startsWith('转') ? `${title} · 出事了` : title)}</span>}
      {secret && <span className="enc-secret">{localize("暗线 · ")}{localize(title)}{localize(" · 引文出自陶渊明《桃花源记》")}</span>}
      <div className="enc-who">
        <span className="enc-name">{localize(enc.who)}</span>
        <span className="enc-role">{localize(enc.role)}</span>
      </div>
      {cause && <p className={`enc-cause${phase === 'intro' ? ' is-in' : ' is-up'}`}>{localize(cause)}</p>}
      <p className={`enc-line${phase === 'intro' ? ' is-in' : ' is-up'}`}>{localize(dialog.length ? enc.line : `「${enc.line}」`)}</p>

      {(phase === 'talk' || (phase === 'play' && dialog.length > 0)) && (
        <div className={`enc-talk${phase === 'play' ? ' is-done' : ''}`}>
          {dialog.slice(0, Math.max(1, said + 1)).map((d, i) => (
            <p key={i} className={`talk-line ${d.you ? 'is-you' : 'is-them'}${i === said ? ' is-new' : ''}`}>
              {d.you ? <span className="talk-who">{localize("你")}</span> : <span className="talk-who">{localize(enc.who)}</span>}
              {localize(d.you ?? d.them)}
            </p>
          ))}
        </div>
      )}

      {phase === 'play' && <WaterPlay g={g} timed={!!timeLimit} />}

      {phase==='decision'&&enc.social&&work&&<div className="enc-decision" aria-label={localize("决定怎样使用成果")}><h3>{localize(enc.social.ask)}</h3><p>{localize(work.o.text)}</p><div>{enc.social.options.map(option=><button className="btn" type="button" key={option.label} onClick={()=>{voyageCue('confirm');settle({skillSucceeded:work.o.skillSucceeded,text:work.o.text+' '+option.out.text,supply:work.o.supply+option.out.supply,trust:work.o.trust+option.out.trust,set:{...work.o.set,...option.out.set}},option.label);}}><strong>{localize(option.label)}</strong><span>{localize(option.note)}</span><small>{localize("补给 ")}{localize(work.o.supply+option.out.supply>0?'+':'')}{localize(work.o.supply+option.out.supply)}{localize(" · 人心 ")}{localize(work.o.trust+option.out.trust>0?'+':'')}{localize(work.o.trust+option.out.trust)}</small></button>)}</div><p>{localize("想好再选，没有倒计时。补给要留给航行，人心来自沿途的信任。")}</p></div>}

      {phase === 'result' && out && (
        <div className="enc-result">
          <p className="enc-result-text">{localize(out.o.text)}</p>
          <p className="enc-result-delta">
            <Delta label={localize("补给")} v={out.o.supply} />
            <Delta label={localize("人心")} v={out.o.trust} />
            {!crisis && !secret && <span className="enc-got">{localize("记进航海日志 · ")}{localize(title)}</span>}
          </p>
        </div>
      )}
      {(phase==='intro'||phase==='talk')&&<button className="cine-link enc-hint" type="button" onClick={()=>phase==='intro'?setPhase(dialog.length?'talk':'play'):advanceDialogue()}>{localize(phase==='intro'?'开始对话 · 空格':'下一句 · 空格')}</button>}
    </div>
  );
}

function Delta({ label, v }: { label: string; v: number }) {
  if (!v) return <span className="enc-delta is-zero">{localize(label)} ±0</span>;
  return (
    <span className={`enc-delta ${v > 0 ? 'is-up' : 'is-down'}`}>
      {localize(label)} {localize(v > 0 ? `+${v}` : v)}
    </span>
  );
}

/* ---------- 水上：这一行字告诉你现在该开去哪；进度每 100ms 读一次 ---------- */
function WaterPlay({ g, timed }: { g: Encounter['game']; timed: boolean }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 100);
    return () => window.clearInterval(id);
  }, []);
  const w = waterLive;
  let line = '';
  let prog: string | null = null;
  if (g.kind === 'choice') line = '开进你选的那道门';
  else if (g.kind === 'hold') {
    line = w.inside ? '顶住！别让风浪把你推出去' : '把船开进光环里，停住';
    prog = `${Math.min(g.secs, w.insideSec).toFixed(1)} / ${g.secs.toFixed(1)} 秒`;
  } else {
    const need = g.kind === 'rhythm' ? g.beats : g.need;
    line = g.kind === 'rhythm' ? '按顺序开过去，一样一样接' : `接住「${g.good}」，绕开「${g.bad}」`;
    prog = `${w.got} / ${need}`;
  }
  return (
    <div className={`enc-water${w.inside ? ' is-inside' : ''}`}>
      <p className="enc-water-line">{localize(line)}</p>
      {g.kind==='choice'&&<div className="enc-gate-legend">{g.options.map(option=><div key={option.label}><strong>{localize(option.label)}</strong><span>{localize(option.note)}</span></div>)}</div>}
      <p className="enc-how">
        {prog && <span className="enc-water-prog">{localize(prog)}</span>}
        {timed || g.kind !== 'choice' ? <span className={`enc-water-left${w.left < 5 ? ' is-late' : ''}`}>{localize("还剩 ")}{localize(w.left.toFixed(0))}{localize(" 秒")}</span> : null}
        <span>{localize("WASD 开船 · 铜针指着它")}</span>
      </p>
    </div>
  );
}
