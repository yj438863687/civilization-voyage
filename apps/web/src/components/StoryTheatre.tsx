import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { ChallengeSound, type ChallengeCue } from '../world/challengeSound';
import { CHALLENGES, type ChallengeKind, type ChallengeReport } from '../world/challenges';
import type { HistoryScene } from '../world/history';
import './story-theatre.css';
import { crewArt } from '../crew';

export type StoryProgress = { value: number; total: number; label: string; secondary?: number; alert?: boolean };
export type StoryAction = { cue: ChallengeCue; text: string; sequence: number; delay: number; duration: number; progress?: StoryProgress };
type Place = { label: string; line: string };
const PLACES: Record<string, Place[]> = {
  canal: [{ label:'看河道',line:'守水人用木棍指着断口：渠口对不上，田里的等待就不会结束。' },{ label:'去田边',line:'种田的人盼着水到，也担心上游先用完。渠修通之后，还得留下大家都能遵守的分水办法。' },{ label:'问修渠人',line:'修渠人擦去手上的泥：多修一段要粮食，也要人肯接着干。谁参与决定，会影响明天还有谁来。' }],
  granary: [{label:'打开船仓',line:'仓格不会因为订单着急就变大。挪动一件货物，往往才能给另一件留出位置。'},{label:'看看种子',line:'种子箱上系了一根细绳：它不能马上填饱肚子，却关系着下一季能不能播种。'},{label:'问搬运工',line:'搬运工先看仓位图，再看手里的绳子：别只算装了多少，也要知道留下了什么。'}],
  printing: [{label:'翻译稿',line:'译员把散页推到灯下：一个步骤排错，照着做的工匠就会多走一段弯路。'},{label:'问学徒',line:'学徒想把这页带回工坊。他关心的不是谁先卖出去，而是下一次能不能自己修。'},{label:'看印台',line:'印台边已经放好了纸。先试印再校核，比让许多人照着错字做事更省工料。'}],
  route: [{label:'走一遍线路',line:'勘线人把每一格都当成要搬运的石料。近一点能省工料，但直线未必经过需要它的人家。'},{label:'到村里问问',line:'村民站在路旁：线路经过山脚，和在村里设一站，是两件不同的事。'},{label:'翻工料账',line:'工料账的余量不是凭空来的。上一章留下的技术与休息，会影响这一章还能做多少。'}],
  engine: [{label:'靠近锅炉',line:'司炉工让你看压力针：有煤不等于有稳定动力，压力太低带不动，太高就会伤机器。'},{label:'问新工人',line:'新工人已经会添煤，却还没学过停机检修。省下的物资，也能换成他学会这门手艺的时间。'},{label:'看工料账',line:'账房盯着节煤的数字。你还得决定，节余是马上接订单，还是给维护与学习留一份。'}],
  shifts: [{label:'走进车间',line:'机器不会因为班表写满就少出故障。有人接班、有人能休息，下一班才接得住。'},{label:'问织工',line:'织工把连在一起的班次圈起来：这一排都是我，谁来替我？'},{label:'听放学钟',line:'窗外的钟响了。让孩子去上课，需要有人替班，也需要真的付出那份工钱。'}],
  signal: [{label:'试发报台',line:'报务员把手放在电键旁：一字一验，先确认对面收到的确实是你要送的字。'},{label:'看等候的人',line:'求援的人盯着报房门口。线路快了以后，等待并没有自动消失；顺序仍由人决定。'},{label:'翻商单',line:'商单能带来补给。两封消息先发，就有另外两封继续等；混合安排也可以。'}],
  correction: [{label:'比对报文',line:'值班员把三个副本并排摆好：同一位看多数，别直接相信某一整份。'},{label:'查通信容量',line:'三份副本要占三份容量。更可靠的消息，需要付出能算清楚的代价。'},{label:'问接班人',line:'接班人要的是能复核的原码。他不只想听一句“已经恢复”，还想知道你怎样查的。'}],
  privacy: [{label:'看调度台',line:'调度员只需要时段、负载与潮汐。多接几根资料线，不会自动让这一次调度更好。'},{label:'问住户',line:'住户问：把班排好，为什么还要知道我的家里和通讯录？'},{label:'查看资料柜',line:'能收集的资料比实际需要的多。勾选哪项，就是决定让谁的生活进入系统。'}],
  dialogue: [{label:'观察回应',line:'屏幕接上了你的话。仔细读一遍：它提供了新事实，还是把你的句子又问了回来？'},{label:'问试验者',line:'试验者愿意继续聊天，也开始检查自己的期待：能安慰人，和能核实事实，不是同一种证据。'},{label:'翻对话记录',line:'把情绪、天气与矛盾都留在记录里，才看得见这个程序能做什么、还没做到什么。'}],
  go: [{label:'看棋盘',line:'白棋四周的空点就是气。把最后一口气围住，它才会被提走。'},{label:'问试航员',line:'试航员看过提子，仍要问海况记录：棋盘里的本领，怎样证明在海上也可靠？'},{label:'望向海面',line:'海面没有固定棋盘的边界。新的任务，需要另外设计检验，不能把胜局直接当作通行证。'}],
  audit: [{label:'拆开方案',line:'复核者把结果和前提分开：能核对的计算可以保留，过期的资料要再查。'},{label:'读小港来信',line:'求援信放在“没有需求”的旁边。两者已经矛盾，改的应当是前提。'},{label:'问船长',line:'船长仍要签自己的名字。把计算委托出去，没有把取舍和责任一并交出去。'}],
};

const CREW_QUESTIONS: Record<ChallengeKind, [string, string]> = {
  canal: ['水真的能从这里流到田里吗？我们沿渠口看一遍。', '上游先用水以后，下游的人怎么办？'],
  granary: ['种子和口粮怎样装，才能撑到下一季？', '粮装进我们的船，岸上等粮的人还剩多少？'],
  printing: ['图样和文字经过试印校核了吗？', '学徒拿到这页，能自己学会、自己修吗？'],
  route: ['这条线需要多少工料，有没有走不通的地方？', '线路经过这里，村里的人就一定用得上吗？'],
  engine: ['压力稳不稳，出了故障谁会修？', '节下来的煤，能不能给工人换来学习和休息的时间？'],
  shifts: ['这张班表真的有人接班吗？', '谁连续在干活，谁还没有机会休息和上学？'],
  signal: ['对面收到的字，和我们发出的一样吗？', '商单和求援都在等，先发哪一封？'],
  correction: ['三个副本不一样，我们怎样复核原文？', '通信容量有限，谁的消息不能一直等？'],
  privacy: ['完成这次调度，实际需要哪几项资料？', '资料里的人知道自己的信息会怎样被使用吗？'],
  dialogue: ['它核实过这些话吗，还是只换了一种问法？', '来访者会不会把流畅回应当成真正的理解？'],
  go: ['棋盘上的结果，能证明海上的可靠性吗？', '如果把这项本领用于航行，谁来承担试验的风险？'],
  audit: ['计算所用的资料，有没有过期或漏项？', '被路线略过的人，还有没有提出异议的机会？'],
};

export function StoryTheatre({ scene, action, work, phase, choice, supply, trust, onConsult }: { scene: HistoryScene; action: StoryAction | null; work: ChallengeReport | null; phase: string; choice: string; supply: number; trust: number; onConsult?: (note: string) => void }) {
  const kind=CHALLENGES[scene.id].kind, places=PLACES[kind];
  const [inspected,setInspected]=useState(-1),[visited,setVisited]=useState<number[]>([]);
  const [companion,setCompanion]=useState<0|1>(0);
  const sound=useRef<ChallengeSound>(), panel=useRef<HTMLElement>(null);
  useEffect(()=>{const engine=new ChallengeSound();sound.current=engine;return()=>engine.close();},[]);
  useLayoutEffect(()=>{panel.current?.getAnimations({subtree:true}).forEach(animation=>{animation.cancel();animation.play();});},[action]);
  const ratio=action?.progress?Math.min(1,action.progress.value/action.progress.total):work?work.quality/100:0;
  const decision=!!work&&(phase==='result'||phase==='play');
  const inspect=(index:number)=>{
    setInspected(index);setVisited(old=>old.includes(index)?old:[...old,index]);
    onConsult?.(`${companion===0?'大副':'二副'}陪同 · ${places[index].label}：${places[index].line}`);
    let volume=.45;try{const raw=localStorage.getItem('cvChallengeVolume');if(raw!==null)volume=Number(raw);}catch{/* Browser storage boundary. */}
    if(volume>0){window.dispatchEvent(new CustomEvent('cv-story-sound',{detail:220}));void sound.current?.play('message',volume);}
  };
  return <section ref={panel} className="story-theatre" aria-label="可互动的故事现场" data-kind={kind} data-cue={action?.cue} data-progress={ratio} data-phase={phase} style={action?{'--scene-delay':`${action.delay}ms`,'--scene-duration':`${action.duration}ms`} as CSSProperties:undefined}>
    <div className="story-stage-heading"><h3>到现场看看</h3><span>可查看 {visited.length}/3 处</span></div>
    <svg className="story-stage-art" viewBox="0 0 420 230" role="img" aria-label={`${scene.title}的互动场景，${action?.progress?`${action.progress.label}${action.progress.value}/${action.progress.total}`:'等待你的操作'}`}>
      <rect width="420" height="230" fill="#183b40"/><circle cx="351" cy="38" r="20" fill="#e0bf7d"/>
      <path d="M0 104 49 66 93 101 147 52 206 110 257 72 331 115 420 75V230H0Z" fill="#2c5050"/>
      <path d="M0 183Q90 170 170 185T420 178V230H0Z" fill="#102b35"/>
      <path d="M0 210q42-8 84 0t84 0t84 0t84 0t84 0" fill="none" stroke="#81a7a1" opacity=".4"/>
      {['canal','granary'].includes(kind)?<>
        <path d="M0 130Q73 111 112 135T248 145L420 137V182H0Z" fill="#72937c"/>
        <path d="M5 148H124L190 125H300M124 148l70 24h106" className="theatre-channel"/>
        {kind==='canal'&&<path d={ratio>=1?'M5 148H124L190 125H300M124 148l70 24h106':ratio>0?'M5 148H124L190 125H300':'M5 148H74'} className="theatre-water"/>}
        {[0,1].map(index=><g key={index}><path d={`M280 ${110+index*46}h98v30h-98Z`} fill={kind==='canal'&&ratio>index*.5?'#c2b96d':'#56694a'}/>{[0,1,2,3,4].map(row=><path key={row} d={`M${290+row*17} ${130+index*46}v-13m-4 5 4 3 4-6`} stroke="#dae0a4" fill="none" strokeWidth="2"/>)}</g>)}
        <g transform="translate(42 83)"><path d="M-8 18 38-8 84 18" fill="#b99b62"/><path d="M0 18h76v55H0Z" fill="#876846"/><path d="M25 73V40h26v33" fill="#293b36"/>
          {kind==='granary'&&Array.from({length:Math.round(ratio*5)},(_,index)=><rect key={index} x={5+index%3*22} y={50-Math.floor(index/3)*20} width="18" height="17" fill={index===2?'#a3bb83':'#c8aa72'} stroke="#685a37"/>)}
        </g>
      </>:['printing','route','engine','shifts'].includes(kind)?<>
        <path d="M15 171V99l48-24v24l48-24v24l48-24v96Z" fill="#785f49"/>
        {[0,1,2,3].map(index=><rect key={index} x={28+index*31} y="120" width="17" height="25" fill="#d2b775"/>)}
        <rect x="130" y="58" width="19" height="113" fill="#957958"/><path className="theatre-smoke" d="M140 50q-20-20 0-36m2 36q24-10 20-32" fill="none" stroke="#b8c5b8" strokeWidth="9" opacity=".35"/>
        {kind==='engine'?<g transform="translate(222 113)"><rect x="-11" y="-22" width="97" height="59" rx="18" fill="#b79a63"/><circle cx="37" cy="-1" r="15" fill="#e2d4b2"/><path d="M37-1v-11" stroke="#9e3a26" strokeWidth="3" style={{transform:`rotate(${-90+(action?.progress?.secondary??0)*18}deg)`,transformOrigin:'37px -1px'}}/><g className="theatre-wheel"><circle cx="103" cy="24" r="28"/><path d="M75 24h56m-28-28v56"/></g></g>:kind==='route'?<>
          <path d="M36 186H385" stroke="#d9c391" strokeWidth="5"/><g className="theatre-train" style={{transform:`translateX(${ratio*185}px)`}}><rect x="64" y="154" width="54" height="24" fill="#c2a367"/><path d="M63 177h72v-14h-17v-26h-14" fill="#334f54"/><circle cx="80" cy="181" r="8" fill="#b6c6bd"/><circle cx="119" cy="181" r="8" fill="#b6c6bd"/></g>
        </>:kind==='printing'?<g transform="translate(232 111)"><path d="M0-22h105M10-22v85m82-85v85M0 35h105" stroke="#c7aa76" strokeWidth="9"/><rect className="theatre-press" x="18" y="0" width="66" height="12" fill="#b79a63"/>{[0,1,2,3,4].map(index=><rect key={index} x={27+index*11} y={32-index} width="53" height="3" fill={ratio>=((index+1)/5)?'#f0dbaf':'#617373'}/>)}</g>:<g transform="translate(228 110)">{[0,1,2,3,4,5].map(index=><rect key={index} x={index*22} y="0" width="17" height="49" fill={ratio>index/6?'#bdb77d':'#647b72'}/>)}</g>}
      </>:['signal','correction'].includes(kind)?<>
        {[48,330].map(x=><g key={x}><path d={`M${x} 174V69m-23 28h46m-40 15h34`} stroke="#bca170" strokeWidth="6"/><rect x={x-26} y="154" width="56" height="27" fill="#af8d57"/></g>)}
        <path d="M48 97Q190 135 330 97" fill="none" stroke="#8eb8b2" strokeWidth="2"/>
        <path className="theatre-transmission" d="M49 96Q190 134 329 96" fill="none" stroke="#f0d899" strokeWidth="4" strokeDasharray="5 12"/>
        <rect x="151" y="143" width="115" height="36" fill="#d1bf98"/><text x="208" y="167" textAnchor="middle" fill="#344a44" fontSize="20" fontFamily="monospace">{kind==='signal'?`${Math.round(ratio*4)} / 4`:`${Math.round(ratio*4)} / 4`}</text>
      </>:<>
        <path d="M37 176V131h78v45m26 0V108h77v68m40 0V131h86v45" fill="#3d5f60" stroke="#8bada3"/>
        {[[75,141],[177,118],[299,141]].map(([x,y],index)=><g key={x}><path d={`M210 69  ${x} ${y}`} stroke={action?.progress?.alert&&index===2?'#d6946a':'#87aaa5'} strokeWidth="2" strokeDasharray={ratio>index/3?'0':'3 5'}/><circle cx={x} cy={y} r="12" fill={ratio>index/3?'#d6c27d':'#537974'}/></g>)}
        <g className="theatre-computer"><rect x="162" y="35" width="96" height="52" rx="4" fill="#8cac9e"/><rect x="169" y="42" width="82" height="34" fill="#143039"/><path d="M182 59h15l7-8 12 16 7-8h15" stroke="#d8ce97" fill="none" strokeWidth="3"/></g>
        {kind==='go'&&<g transform="translate(170 126)"><rect width="75" height="49" fill="#bda36c"/>{[1,2,3,4].map(index=><path key={index} d={`M${index*15} 0v49M0 ${index*10}h75`} stroke="#594b34"/>)}<circle cx="37" cy="25" r="6" fill={ratio>0?'#393a2b':'#f6e6c4'}/></g>}
      </>}
      {[171,365].map((x,index)=><g key={x} className="theatre-person" transform={`translate(${x} ${index?174:162})`}><circle cy="-24" r="7" fill={index?'#d4b483':'#d5a57a'}/><path d="M-10 2-7-15h14l5 17Z" fill={index?'#b79a63':'#98b4a1'}/><path d="M-5 2v15m11-15v15M-8-10l-10 9m27-9 10 7" stroke={index?'#b79a63':'#98b4a1'} strokeWidth="4" fill="none"/></g>)}
      {decision&&<g className="theatre-delivery"><path d={trust>0?'M80 204Q218 155 360 190':'M80 204Q132 167 80 122'} fill="none" stroke="#e0c183" strokeWidth="3" strokeDasharray="6 7"/><path d="M59 203h44l-8 12H67Z" fill="#d8b77b"/></g>}
    </svg>
    <div className="story-companions" role="group" aria-label="选择同行船员">{(['大副','二副'] as const).map((name,index)=><button key={name} type="button" aria-pressed={companion===index} onClick={()=>{setCompanion(index as 0|1);setInspected(-1);}}><img src={crewArt(name).bust} alt=""/><span>请{name}同行<small>{index===0?'一起查办法与依据':'一起问人的处境'}</small></span></button>)}</div>
    <div className="story-stage-spots" role="group" aria-label="查看现场与人物">{places.map((place,index)=><button type="button" key={place.label} aria-pressed={inspected===index} onClick={()=>inspect(index)}>{place.label}</button>)}</div>
    <div className="story-stage-voice" aria-live="polite">{inspected<0?<p>选一位船员，再点现场或人物，听他们一起把问题问清楚。</p>:<><p><strong>{companion===0?'大副':'二副'}</strong>：{CREW_QUESTIONS[kind][companion]}</p><p><strong>现场回应 · {places[inspected].label}</strong>：{places[inspected].line}</p><p><strong>你来作主</strong>：{work?`我们已经试过了。接下来选“${scene.options[0].label}”，还是“${scene.options[1].label}”？`:'带着这番话试一次，再决定怎样安排。'}</p></>}</div>
    <div className="story-stage-consequence" aria-live="polite">{decision?<><strong>{choice}</strong><p>这一安排：补给 {supply>0?'+':''}{supply} · 人心 {trust>0?'+':''}{trust}</p><p>{trust>0?'图中的航线转向需要帮助的人。真正结算要等你记下这一站。':'图中的物资先进入货仓。真正结算要等你记下这一站。'}</p></>:<><strong>{action?.progress?`${action.progress.label} ${action.progress.value}/${action.progress.total}`:'现场会随你的操作改变'}</strong><p>{action?.text??'先看清这里的难处，再亲手试一次。'}</p></>}</div>
    <small>场景与人物话语为互动创作，历史背景见配图与来源。</small>
  </section>;
}
