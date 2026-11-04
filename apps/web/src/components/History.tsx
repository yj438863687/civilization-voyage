import { useModalFocus } from './useModalFocus';
import { useEffect, useRef, useState } from 'react';
import type { Encounter, Outcome } from '../world/encounters';
import type { FableState } from '../world/fable';
import { cooperationBonus, historyFor, historyOutcome, previousDecision, routeRecap, type HistoryRoute, type HistoryScene } from '../world/history';
import media from '../world/historyMedia.json';

export function HistoryImage({ name, caption }: { name: string; caption?: string }) {
  const [failed, setFailed] = useState(false);
  const item = (media as Record<string, { src: string; title: string; url: string; author: string; license: string; licenseUrl: string; caption: string }>)[name];
  return <figure className="history-image">
    {item && !failed ? <img src={item.src} alt={caption ?? item.caption} onError={() => setFailed(true)} /> : <p>图片暂时无法显示，仍可继续阅读与游玩。</p>}
    <figcaption>{caption ?? item?.caption ?? '历史背景配图；不代表互动场景的实拍。'}{item && <details><summary>图片来源与授权</summary><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a><span>{item.author} · <a href={item.licenseUrl} target="_blank" rel="noreferrer">{item.license}</a> · 已缩放与转为 JPEG</span></details>}</figcaption>
  </figure>;
}

export function RouteTimeline({ route, state = {} }: { route: HistoryRoute; state?: FableState }) {
  return <ol className="history-timeline" aria-label="沿这条航程依次发生的故事">
    {route.islands.map(scene => <li key={scene.id} className={state[`history:${scene.id}`] ? 'is-complete' : ''}><span>{scene.date}</span><strong>{scene.title}</strong></li>)}
    <li><span>{route.crisis.date}</span><strong>{route.crisis.title}</strong></li>
    <li><span>{route.ending.date}</span><strong>{route.ending.name} · 回顾</strong></li>
  </ol>;
}

export function HistoryEncounter({ enc, state = {}, supply = Infinity, cause, onDone }: { enc: Encounter; state?: FableState; supply?: number; cause?: string; onDone: (out: Outcome, summary: string) => void }) {
  const scene = enc.history!;
  const [phase, setPhase] = useState<'read' | 'play' | 'result'>('read');
  const [selected, setSelected] = useState<number[]>([]);
  const [read, setRead] = useState<number[]>([]);
  const [decision, setDecision] = useState(0);
  const done = useRef(false);
  const panel = useRef<HTMLDivElement>(null);
  useModalFocus(panel);
  useEffect(() => { panel.current?.focus(); panel.current?.scrollTo(0, 0); }, [phase]);
  const toggle = (index: number) => setSelected(previous => previous.includes(index) ? previous.filter(i => i !== index) : scene.activity === 'dispatch' && previous.length >= 2 ? previous : [...previous, index]);
  const option = scene.activity === 'review' ? decision : scene.activity === 'dispatch' ? Number(selected.some(index => index >= 2)) : Number(selected.length >= (scene.activity === 'workshop' ? 2 : 4));
  const ready = scene.activity === 'review' ? read.length === scene.items.length : scene.activity === 'dispatch' ? selected.length === 2 : true;
  const outcome = historyOutcome(scene, option, state, scene.activity === 'dispatch' ? selected : undefined);
  const affordable = supply + outcome.supply >= 0;
  const mixed = scene.activity === 'dispatch' && selected.length === 2 && selected.filter(index => index >= 2).length === 1;
  const chosenLabel = mixed ? '一封商单，一封急用消息' : scene.options[option].label;
  return <div className="history-overlay" role="dialog" aria-modal="true" aria-label={scene.title} onKeyDown={event => event.stopPropagation()}>
    <div className="history-island" ref={panel} tabIndex={-1}>
      <div className="history-visual"><HistoryImage name={scene.image} /><p>{scene.nature} · 互动人物、对话与选择为创作</p></div>
      <div className="history-reading">
        <h2>{scene.title}</h2><p className="history-date">{scene.date} · {scene.who}</p>
        {phase === 'read' && <>
          {(previousDecision(scene, state) || cause) && <div className="history-cause"><p>{previousDecision(scene, state) ?? cause}</p></div>}
          {scene.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          <p className="history-source">背景来源：<a href={scene.source.url} target="_blank" rel="noreferrer">{scene.source.title}</a></p>
          <button className="btn btn-primary" type="button" onClick={() => setPhase('play')}>进入故事 · {({ allocation: '分配物资', workshop: '安排工班', dispatch: '接发消息', review: '核对材料' })[scene.activity]}</button>
        </>}
        {phase === 'play' && <>
          <p>{scene.task}</p>
          <HistoryActivity scene={scene} selected={selected} read={read} onToggle={toggle} onRead={index => setRead(previous => previous.includes(index) ? previous : [...previous, index])} />
          {scene.activity === 'review' && <div className="history-decision" role="group" aria-label="核对之后的决定">{scene.options.map((choice, index) => <button type="button" key={choice.label} aria-pressed={decision === index} onClick={() => setDecision(index)}>{choice.label}</button>)}</div>}
          <div className="history-consequence" aria-live="polite"><strong>{chosenLabel}</strong><p>{mixed ? '保留一笔商单收入，同时让一封普通人的急用消息先发。另一封继续等待。' : scene.options[option].note}</p><p>补给 {signed(outcome.supply)} · 人心 {signed(outcome.trust)}</p>{Number.isFinite(supply) && <p>船上现有 {supply} 份补给{affordable ? `，做完后剩 ${Math.min(100, supply + outcome.supply)} 份` : '，不足以承担这个安排；可以改选节省物资的办法'}</p>}{cooperationBonus(scene, state) > 0 && <p>上一站留下的合作可省回 3 份补给，已计入。</p>}</div>
          <div className="history-actions"><button type="button" className="btn" onClick={() => setPhase('read')}>再读一遍</button><button type="button" className="btn btn-primary" disabled={!ready || !affordable} onClick={() => setPhase('result')}>{!affordable ? '补给不足，请调整安排' : ready ? '照这个安排做' : scene.activity === 'review' ? '请先查看全部材料' : '请先选好两封消息'}</button></div>
        </>}
        {phase === 'result' && <><p>{outcome.text}</p><p className="history-consequence">补给 {signed(outcome.supply)} · 人心 {signed(outcome.trust)}</p><p>决定会记在这条航程里，后面的故事与靠岸回顾都会记得。</p><button type="button" className="btn btn-primary" onClick={() => { if (!done.current) { done.current = true; onDone(outcome, chosenLabel); } }}>记下这一站，回到船上</button></>}
      </div>
    </div>
  </div>;
}
function signed(value: number) { return value > 0 ? `+${value}` : String(value); }
function HistoryActivity({ scene, selected, read, onToggle, onRead }: { scene: HistoryScene; selected: number[]; read: number[]; onToggle: (index: number) => void; onRead: (index: number) => void }) {
  if (scene.activity === 'review') return <div className="history-evidence">{scene.items.map((item, index) => <details key={item} onToggle={event => { if (event.currentTarget.open) onRead(index); }}><summary>材料 {index + 1}{read.includes(index) ? ' · 已看' : ' · 点开查看'}</summary><p>{item}</p></details>)}</div>;
  return <div className={`history-board is-${scene.activity}`}>
    <p>{scene.labels[0]} {scene.items.length - selected.length} 份 · {scene.labels[1]} {selected.length} 份{scene.activity === 'dispatch' ? ' · 先发两封' : ' · 点选可改派，再点可撤回'}</p>
    <div>{scene.items.map((item, index) => <button type="button" key={item} aria-pressed={selected.includes(index)} disabled={scene.activity === 'dispatch' && selected.length === 2 && !selected.includes(index)} onClick={() => onToggle(index)}><span>{item}</span><small>{scene.activity === 'dispatch' ? selected.includes(index) ? '先发' : '等待' : scene.labels[selected.includes(index) ? 1 : 0]}</small></button>)}</div>
  </div>;
}
export function HistoryRecap({ era, lane, state }: { era: string; lane: string; state: FableState }) {
  const route = historyFor(era, lane);
  if (!route) return null;
  return <div className="history-recap"><HistoryImage name={route.ending.image} /><RouteTimeline route={route} state={state} /><h3>技术与文明</h3><p>{route.question}</p>{routeRecap(route, state).map(line => <p key={line}>{line}</p>)}<p>{route.ending.reflection}</p></div>;
}

export function HistoryArrival({ route, state, onDone }: { route: HistoryRoute; state: FableState; onDone: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  useModalFocus(panel);
  useEffect(() => { panel.current?.focus(); }, []);
  return <div className="history-overlay" role="dialog" aria-modal="true" aria-label={`${route.ending.name}回顾这一程`} onKeyDown={event => event.stopPropagation()}><div className="history-island" tabIndex={-1} ref={panel}>
    <div className="history-visual"><HistoryImage name={route.ending.image} /><p>{route.ending.fictional ? '回顾者为虚构人物' : '历史人物；回顾台词为创作'}</p></div>
    <div className="history-reading"><h2>{route.ending.name}</h2><p className="history-date">{route.ending.date}</p><p>{route.ending.deed}</p><RouteTimeline route={route} state={state} />{routeRecap(route, state).map(line => <p key={line}>{line}</p>)}<h3>技术与文明</h3><p>{route.ending.reflection}</p><button className="btn btn-primary" type="button" onClick={onDone}>写下这一程的看法</button></div>
  </div></div>;
}
