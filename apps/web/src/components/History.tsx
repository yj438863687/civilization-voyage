import { StoryTheatre, type StoryAction } from './StoryTheatre';
import { MusicControls } from './VoyageMusic';
import { VoyageChallenge } from './VoyageChallenges';
import { CHALLENGES, type ChallengeReport } from '../world/challenges';
import { arcEnding, arcForScene, STORY_ARCS, workSummary } from '../world/storyArcs';
import { challengeOutcome } from '../world/challengeOutcomes';
import { useModalFocus } from './useModalFocus';
import { useEffect, useRef, useState } from 'react';
import type { Encounter, Outcome } from '../world/encounters';
import type { FableState } from '../world/fable';
import { cooperationBonus, historyFor, previousDecision, routeRecap, type HistoryRoute, type HistoryScene } from '../world/history';
import media from '../world/historyMedia.json';
import { historyDialogue } from '../world/historyDialogue';

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

export function HistoryEncounter({ enc, state = {}, supply = Infinity, cause, onDone, replay = false, onCancel }: { enc: Encounter; state?: FableState; supply?: number; replay?: boolean; onCancel?: ()=>void; cause?: string; onDone: (out: Outcome, summary: string) => void }) {
  const scene = enc.history!;
  const dialogue=historyDialogue(scene);
  const [spoken,setSpoken]=useState(2);
  const arc = arcForScene(scene.id);
  const mechanism = CHALLENGES[scene.id];
  const [phase, setPhase] = useState<'read' | 'play' | 'result'>('read');
  const [selected, setSelected] = useState<number[]>([]);
  const [work, setWork] = useState<ChallengeReport | null>(null);
  const [decision, setDecision] = useState(0);
  const [action,setAction]=useState<StoryAction|null>(null);
  const [fieldOpen,setFieldOpen]=useState(()=>window.matchMedia('(min-width:701px)').matches);
  useEffect(()=>{const media=window.matchMedia('(min-width:701px)');const change=()=>setFieldOpen(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
  const done = useRef(false);
  const panel = useRef<HTMLDivElement>(null);
  useModalFocus(panel);
  useEffect(() => { panel.current?.focus(); panel.current?.scrollTo(0, 0); }, [phase]);
  const toggle = (index: number) => setSelected(previous => previous.includes(index) ? previous.filter(i => i !== index) : scene.activity === 'dispatch' && previous.length >= 2 ? previous : [...previous, index]);
  const option = scene.activity === 'dispatch' ? Number(selected.some(index => index >= 2)) : decision;
  const ready = !!work && (scene.activity !== 'dispatch' || selected.length === 2);
  const outcome = work ? challengeOutcome(scene, option, state, work, scene.activity === 'dispatch' ? selected : undefined) : { text:'', supply:0, trust:0 };
  const affordable = replay || supply + outcome.supply >= 0;
  const mixed = scene.activity === 'dispatch' && selected.length === 2 && selected.filter(index => index >= 2).length === 1;
  const chosenLabel = mixed ? '一封商单，一封急用消息' : scene.options[option].label;
  return <div className="history-overlay" role="dialog" aria-modal="true" aria-label={scene.title} onKeyDown={event => {event.stopPropagation();if(event.key==='Escape'&&onCancel){event.preventDefault();onCancel();}}}>
    <div className="history-island" ref={panel} tabIndex={-1}>
      <div className="history-session-bar"><span>{phase==='read'?'读故事 → 动手试验 → 作出安排 → 记入航程':phase==='play'?work?'试验已完成 · 现在决定怎样使用技术':'正在试验 · 先操作，再记录结果':'确认这一站 · 点下方按钮后才结算'}</span><MusicControls below/>{onCancel&&<button className="btn" type="button" onClick={onCancel}>{replay?'结束重读，回到船上':'暂时返回船上'}</button>}</div>
      <div className={`history-visual${phase!=='read'?' is-live':''}`}><details className="history-photo" open={phase==='read'}><summary>历史配图与来源</summary><HistoryImage name={scene.image} /></details><details className="story-field-wrap" open={fieldOpen} onToggle={event=>setFieldOpen(event.currentTarget.open)}><summary>故事现场 · 三处可查看{action?.progress?` · ${action.progress.label} ${action.progress.value}/${action.progress.total}`:''}</summary><StoryTheatre scene={scene} action={action} work={work} phase={phase} choice={chosenLabel} supply={outcome.supply} trust={outcome.trust}/></details><p>{scene.nature} · 互动人物、对话与选择为创作</p></div>
      <div className="history-reading">
        <h2>{scene.title}</h2>{replay&&<p className="replay-note" role="status">重读与练习：不改变补给、人心、升级或本次航程的原记录。</p>}<p className="history-date">{scene.date} · {scene.who}</p>
        {phase === 'read' && <>
          {(previousDecision(scene, state) || cause) && <div className="history-cause"><p>{previousDecision(scene, state) ?? cause}</p></div>}
          {arc && <div className="story-thread"><h3>{arc.arc.artifact} · 第{arc.index+1}/3章</h3><p>{arc.index===0?arc.arc.promise:arc.chapter.continuation}</p><strong>这一章要完成：{arc.chapter.objective}</strong>{arc.index===0&&<p className="history-source">连接各年代的物件、人物与情节为创作。</p>}</div>}
          <section className="history-conversation" aria-label={`你与${scene.who}的交谈`}>
            <h3>{scene.who}向你走来</h3>
            <p>{scene.paragraphs[1]}</p>
            <div aria-live="polite" aria-relevant="additions">{dialogue.slice(0,spoken).map((line,index)=><p key={index} className={line.you?'is-you':'is-them'}><strong>{line.you?'你':scene.who}</strong><span>{line.you??line.them}</span></p>)}</div>
            {spoken<dialogue.length&&<button className="btn" type="button" onClick={()=>setSpoken(count=>Math.min(dialogue.length,count+2))}>接着问</button>}
            <small>人物对话为剧情创作，并非历史原话。</small>
          </section>
          <details className="history-background"><summary>读历史背景与出处</summary><p>{scene.paragraphs[0]}</p><p>背景来源：<a href={scene.source.url} target="_blank" rel="noreferrer">{scene.source.title}</a></p></details>
          <div className="technology-civilization"><p><strong>技术带来的能力</strong>{mechanism.technology}</p><p><strong>共同生活的问题</strong>{mechanism.society}</p></div>
          <button className="btn btn-primary" type="button" onClick={() => setPhase('play')}>进入故事 · {mechanism.title}</button>
        </>}
        {phase === 'play' && !work && <VoyageChallenge sceneId={scene.id} state={state} onComplete={setWork} onAction={next=>setAction(previous=>({...next,progress:next.progress?{...previous?.progress,...next.progress}:previous?.progress}))} />}
        {phase === 'play' && work && <>
          <div className="technical-result"><h3>你做出的技术成果</h3><p>{work.summary}</p><button className="cine-link" type="button" onClick={()=>{setWork(null);setAction(null);}}>重做这一章的操作</button></div>
          <h3>这个本领，怎样用下去？</h3><p>{mechanism.society}</p>
          {scene.activity === 'dispatch' ? <HistoryActivity scene={scene} selected={selected} onToggle={toggle} /> : <div className="history-decision" role="group" aria-label="对共同生活的安排">{scene.options.map((choice,index)=><button type="button" key={choice.label} aria-pressed={decision===index} onClick={()=>setDecision(index)}><strong>{choice.label}</strong><small>{choice.note}</small></button>)}</div>}
          <div className="history-consequence" aria-live="polite"><strong>{chosenLabel}</strong><p>{mixed ? '保留一笔商单收入，同时让一封普通人的急用消息先发。另一封继续等待。' : scene.options[option].note}</p><p>{replay?'练习的理论变化（不结算）':'操作与安排合计'}：补给 {signed(outcome.supply)} · 人心 {signed(outcome.trust)}</p>{!replay&&Number.isFinite(supply)&&<p>船上现有 {supply} 份补给{affordable?`，做完后剩 ${Math.min(100,supply+outcome.supply)} 份`:'，不足以承担这个安排，可以改选节省物资的办法'}</p>}{cooperationBonus(scene,state)>0&&<p>上一章留下的合作省回 3 份补给，已计入。</p>}</div>
          <div className="history-actions"><button className="btn" type="button" onClick={()=>setPhase('read')}>再读一遍</button><button className="btn btn-primary" type="button" disabled={!ready||!affordable} onClick={()=>setPhase('result')}>{!affordable?'补给不足，请调整安排':ready?'照这个安排做':'请先选好两封消息'}</button></div>
        </>}
        {phase === 'result' && <><p>{outcome.text}</p><p className="history-consequence">{replay?'练习结果（不结算）：':''}补给 {signed(outcome.supply)} · 人心 {signed(outcome.trust)}</p><p>{replay?'这次练习不会覆盖原来的选择或操作记录。':'操作记录和你的安排将一起带到下一章。后来的工料、布局或交班会用到它们。'}</p><button type="button" className="btn btn-primary" onClick={() => { if (!done.current) { done.current = true; onDone(outcome, chosenLabel); } }}>{replay?'结束练习，回到船上':'记下这一站，回到船上'}</button></>}
      </div>
    </div>
  </div>;
}
function signed(value: number) { return value > 0 ? `+${value}` : String(value); }
function HistoryActivity({ scene, selected, onToggle }: { scene: HistoryScene; selected: number[]; onToggle: (index: number) => void }) {
  return <div className={`history-board is-${scene.activity}`}>
    <p>{scene.labels[0]} {scene.items.length - selected.length} 份 · {scene.labels[1]} {selected.length} 份{scene.activity === 'dispatch' ? ' · 先发两封' : ' · 点选可改派，再点可撤回'}</p>
    <div>{scene.items.map((item, index) => <button type="button" key={item} aria-pressed={selected.includes(index)} disabled={scene.activity === 'dispatch' && selected.length === 2 && !selected.includes(index)} onClick={() => onToggle(index)}><span>{item}</span><small>{scene.activity === 'dispatch' ? selected.includes(index) ? '先发' : '等待' : scene.labels[selected.includes(index) ? 1 : 0]}</small></button>)}</div>
  </div>;
}
export function HistoryRecap({ era, lane, state }: { era: string; lane: string; state: FableState }) {
  const route = historyFor(era, lane);
  if (!route) return null;
  const arc=STORY_ARCS[`${era}-${lane}`];
  return <div className="history-recap">{arc&&<><h3>{arc.artifact}</h3><p>{arc.promise}</p></>}<HistoryImage name={route.ending.image} caption={route.ending.fictional?'航程背景配图，不代表虚构回顾者的肖像。':undefined} /><RouteTimeline route={route} state={state} /><h3>技术与文明</h3><p>{route.question}</p>{routeRecap(route, state).map(line => <p key={line}>{line}</p>)}<p>{route.ending.reflection}</p></div>;
}

export function HistoryArrival({ route, state, onDone }: { route: HistoryRoute; state: FableState; onDone: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  useModalFocus(panel);
  useEffect(() => { panel.current?.focus(); }, []);
  const arc=Object.values(STORY_ARCS).find(arc=>arc.chapters[0].scene===route.islands[0].id);
  return <div className="history-overlay" role="dialog" aria-modal="true" aria-label={`${route.ending.name}回顾这一程`} onKeyDown={event => {event.stopPropagation();if(event.key==='Escape'){event.preventDefault();onDone();}}}><div className="history-island" tabIndex={-1} ref={panel}>
    <div className="history-session-bar"><span>三章回顾 · 技术成果与共同生活</span><MusicControls below/><button className="btn" type="button" onClick={onDone}>继续，到港口写下看法</button></div><div className="history-visual"><HistoryImage name={route.ending.image} caption={route.ending.fictional?'航程背景配图，不代表虚构回顾者的肖像。':undefined} /><p>{route.ending.fictional ? '回顾者为虚构人物' : '历史人物；回顾台词为创作'}</p></div>
    <div className="history-reading"><h2>{route.ending.name}</h2><p className="history-date">{route.ending.date}</p><p>{route.ending.deed}</p>{arc&&<div className="story-thread"><h3>{arc.artifact}的最后一页</h3><p>{arcEnding(arc,state)}</p>{arc.chapters.map(chapter=><p key={chapter.scene}><strong>{CHALLENGES[chapter.scene].title}：</strong>{workSummary(chapter.scene,state)||'旧记录未保留操作过程'}</p>)}</div>}<RouteTimeline route={route} state={state} />{routeRecap(route, state).map(line => <p key={line}>{line}</p>)}<h3>技术与文明</h3><p>{route.ending.reflection}</p><button className="btn btn-primary" type="button" onClick={onDone}>写下这一程的看法</button></div>
  </div></div>;
}
