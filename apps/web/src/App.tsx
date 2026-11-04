import { MusicDirector, MusicControls, voyageCue } from './components/VoyageMusic';
import { ShipyardDialog } from './components/Shipyard';
import { historyFor, historyScene, supportedEncounter } from './world/voyageHistory';
import { IslandBackground } from './components/IslandBackground';
import { ISLAND_BACKGROUNDS } from './world/islandBackgrounds';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api/client';
import { ApiError, type Crew, type Health, type ModelInfo, type Port, type Route, type Scene, type Stage, type Usage, type Voyage, type VoyageRecord } from './api/types';
import { Coach, Ledgers, SealButton, StageBar, StatusBanner } from './components/ui';
import { kernelBeat } from './crew';
import { VoyageCanvas, type CamMode, type ControlInput, type ShipSnapshot } from './world/VoyageCanvas';
import { laneStops, worldFor, type WorldConfig } from './world/world.config';
import { stanceFor } from './world/stances';
import { laneSealFor } from './world/laneSeals';
import { chartSummary } from './world/chart';
import { BOOST_NAME, addPath, addSupply, hullHit, loadBoard, pushBoard, repairHull, scoreOutcome, applyOutcome, encounterFor, freshStats, loadStats, metLine, saveStats, trustLine, type Outcome, type VoyageStats } from './world/encounters';
import { EncounterOverlay } from './components/Encounter';
import { PlayerGate } from './components/PlayerGate';
import { sessionPlayer, signOut, type Player } from './player';
import { ShoreOverlay, SpiritMap, StoryCaption, StoryPage } from './components/Story';
import { ISLAND_OFFSET, VILLAGE_OFFSET, fableLive } from './world/fable';
import { buildWaterSpec, resetWaterLive, waterLive, type WaterResult, type WaterSpec } from './world/waterGame';
import { seaStateFor } from './world/seaState';
import type { Game } from './world/encounters';
import { TAOYUAN, TAOYUAN_ECHO, TAOYUAN_ENC, TAOYUAN_FINALE, TAOYUAN_HINT } from './world/taoyuan';
import { loadProgress, saveProgress, storyFor, type Beat, type StoryProgress } from './world/stories';


/** 每段入海的开场：时代、一句立意、这一程的问题。字随时间一层层浮出来。 */
const EPOCH_INTRO: Record<string, { era: string; title: string; line: string }> = {
  'neutral-test': { era: '启航港', title: '同一条航程', line: '先学会看，再学会选。' },
  A: { era: '第一段 · 农业', title: '从漂流到靠岸', line: '人第一次不再随水漂。种子埋进土里，就要等一季。' },
  B: { era: '第二段 · 工业', title: '从风帆到蒸汽', line: '不必再看风了。动力从炉膛里来，账也从炉膛里算。' },
  C: { era: '第三段 · 信息', title: '从海上到电波', line: '航图变成实时的网。被连上的，和只剩一个断点的。' },
  D: { era: '第四段 · 智能', title: '从驾驶到设定目的地', line: '船能自己画航线了。你只需要说，要去哪里。' },
};

const LAST_KEY = 'cv.lastVoyageId';
const MOTION_KEY = 'cv.reduceMotion';
const DEFAULT_HULL = 'bao-chuan-01';

function worldState(
  voyage: Voyage,
  snap: ShipSnapshot | null,
  portId: string,
  sea: WorldConfig,
): Record<string, unknown> {
  return {
    hull_id: typeof voyage.world.hull_id === 'string' ? voyage.world.hull_id : DEFAULT_HULL,
    port_id: portId,
    // 航道单独存：不写进这里就会被下一次 worldState 覆盖掉，刷新后路会变
    lane: typeof voyage.world.lane === 'string' ? voyage.world.lane : 'near',
    ship: snap ? { x: snap.x, z: snap.z, yaw: snap.yaw } : voyage.world.ship ?? sea.spawn,
  };
}

const TITLE_PRESETS: Record<string, string> = {
  A: '从漂流到靠岸',
  B: '从风帆到蒸汽',
  C: '从海上到电波',
  D: '从驾驶到设定目的地',
  'neutral-test': '启航港',
};

function latestScenes(list: Scene[]): Scene[] {
  const map = new Map<string, Scene>();
  for (const s of list) {
    const prev = map.get(s.id);
    if (!prev || s.version > prev.version) map.set(s.id, s);
  }
  const order = ['neutral-test', 'A', 'B', 'C', 'D'];
  return [...map.values()].sort((a, b) => {
    const ia = order.indexOf(a.id);
    const ib = order.indexOf(b.id);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

function sceneShort(s: Scene) {
  if (s.id === 'A') return '农业 · 从漂流到靠岸';
  if (s.id === 'B') return '工业 · 从风帆到蒸汽';
  if (s.id === 'C') return '信息 · 从海上到电波';
  if (s.id === 'D') return '智能 · 从驾驶到设定目的地';
  if (s.id === 'neutral-test') return '启航港 · 玄览内海';
  return s.label.replace(/^AI 推荐，待组员确认：/, '');
}


/** HUD 里的海图小图：SVG，不用第二个 WebGL 上下文。 */
function ChartMap({ struck, activeEpoch }: { struck: string[]; activeEpoch: string }) {
  const order = ['A', 'B', 'C', 'D'];
  const ink: Record<string, string> = { A: '#c8794f', B: '#9aa3ad', C: '#6fb3bd', D: '#8fa0dc' };
  return (
    <svg viewBox="0 0 120 76" className="chart-map" role="img" aria-label="这一趟的海图">
      <rect x="0" y="0" width="120" height="76" fill="rgba(20,28,30,0.55)" />
      {[15, 30, 45, 60].map((y) => (
        <line key={y} x1="0" y1={y} x2="120" y2={y} stroke="rgba(220,200,160,0.12)" strokeWidth="0.5" />
      ))}
      {[24, 48, 72, 96].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2="76" stroke="rgba(220,200,160,0.12)" strokeWidth="0.5" />
      ))}
      {order.map((e, i) => {
        const on = struck.includes(e);
        const cx = 24 + i * 24;
        const cy = 30 + (i % 2) * 16;
        const c = ink[e] ?? '#c9a15a';
        return (
          <g key={e} opacity={on ? 1 : 0.22}>
            {i > 0 && (
              <line
                x1={24 + (i - 1) * 24}
                y1={30 + ((i - 1) % 2) * 16}
                x2={cx}
                y2={cy}
                stroke={c}
                strokeWidth="0.9"
                strokeDasharray={on ? '0' : '2 2'}
              />
            )}
            {e === 'A' && on && <circle cx={cx} cy={cy} r="6" fill="none" stroke={c} strokeWidth="1.1" />}
            {e === 'C' && on && <line x1={cx} y1={cy - 5} x2={cx} y2={cy + 5} stroke={c} strokeWidth="1.1" strokeDasharray="2 2" />}
            {e === 'D' && on && (
              <path d={`M${cx} ${cy - 5} L${cx + 1.6} ${cy - 1.6} L${cx + 5} ${cy} L${cx + 1.6} ${cy + 1.6} L${cx} ${cy + 5} L${cx - 1.6} ${cy + 1.6} L${cx - 5} ${cy} L${cx - 1.6} ${cy - 1.6} Z`} fill={c} />
            )}
            {e === 'B' && on && <circle cx={cx} cy={cy} r="2" fill={c} />}
            <circle cx={cx} cy={cy} r="1.4" fill={c} opacity={e === 'A' || e === 'C' || e === 'D' ? 0 : 1} />
            <text x={cx} y={cy + 14} textAnchor="middle" fontSize="6" fill={on ? '#e8dcc6' : '#7d7568'}>
              {e}
            </text>
          </g>
        );
      })}
      {activeEpoch && (
        <circle
          cx={24 + order.indexOf(activeEpoch) * 24}
          cy={30 + (order.indexOf(activeEpoch) % 2) * 16}
          r="9"
          fill="none"
          stroke="#f0b46a"
          strokeWidth="0.8"
          opacity="0.6"
        />
      )}
    </svg>
  );
}


/** 场景 id → 短名。HUD 里只放得下这一行。 */
function sceneShortFromId(id: string | undefined) {
  const map: Record<string, string> = {
    A: '农业 · 从漂流到靠岸',
    B: '工业 · 从风帆到蒸汽',
    C: '信息 · 从海上到电波',
    D: '智能 · 从驾驶到设定目的地',
    'neutral-test': '启航港 · 玄览内海',
  };
  return (id && map[id]) || '启航港';
}

function wrapDeg(deg: number) {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

function portRelDeg(ship: { x: number; z: number; headingDeg: number }, port: { x: number; z: number }) {
  const bearing = (Math.atan2(port.x - ship.x, -(port.z - ship.z)) * 180) / Math.PI;
  return wrapDeg(bearing - ship.headingDeg);
}

const ROUTES: Route[] = [
  {
    id: 'simple',
    steps: ['带着已有材料出海', '靠港对照实物', '记下发现'],
    rationale: '步骤少、不调用模型也能走完。步骤多、成本高不代表结论更正确。',
    budget: 0,
    currency: 'unknown',
  },
  {
    id: 'deep',
    steps: ['提出文化问题', '请船员检索材料', '对照不同解释', '靠港收集碎片', '写入反思'],
    rationale: '步骤较多，需要已接入的模型服务。费用未知时显示尚未接入，不把价格当正确性。',
    budget: 0,
    currency: 'unknown',
  },
];

const DEFAULT_REASON = '我想先看清两头，再决定站哪边。';

const DEFAULT_CREW: Crew[] = [
  { id: 'first-mate', role: '大副', model_id: null, confirmation: 'pending' },
  { id: 'second-mate', role: '二副', model_id: null, confirmation: 'pending' },
];

type View = 'embark' | Stage | 'port' | 'collaborate';

type GuideCtx = {
  connected: boolean;
  hasQuestion: boolean;
  hasReason: boolean;
  nearPort: boolean;
  nearFragment: boolean;
  hasVoyages: boolean;
  unusedFragments: number;
  crewReplies: number;
  portName: string;
  seaHint: string;
  nearHint: string;
  portTitle: string;
  portBody: string;
  relDeg: number | null;
  portDist: number | null;
  portRadius: number;
};

function guide(view: View, ctx: GuideCtx) {
  if (view === 'embark') {
    return {
      step: '问 · 想弄清什么',
      title: '先选海域，再开一条航程',
      body: ctx.connected
        ? '右边每张卡片只问一件事。启航港是练习的第一程；泉州、集装箱、漂浮港仍待组员确认。起个名字，开一条。大副和二副已在席。'
        : '右边每张卡片只问一件事。启航港是练习的第一程。模型没接也能走完，船员不会假装回话。',
      next: ctx.hasVoyages ? '点「新航程」，或点右边一张旧航程卡片' : '先起个名字，开一条。',
    };
  }
  if (view === 'cockpit') {
    return {
      step: ctx.crewReplies > 0 ? '查 · 先看依据' : '问 · 想弄清什么',
      title: '你想弄清什么？',
      body: '左边是大副与二副。中间问一件你想理解的事。大副查依据，二副问谁还没开口。他们只对照，不替你下结论。问题和一句理由齐了，按住落印。',
      next: !ctx.hasQuestion ? '先写下你想弄清的一件事。' : !ctx.hasReason ? '写下问题和一句理由，才能落印。' : '按住落印，确认此行的问题。',
    };
  }
  if (view === 'route') {
    return {
      step: '行 · 出海',
      title: '选一条路，去港口做事',
      body: '两条航线各有一座岛、一次危机、一位岸上的人。粗细颜色一样：没有哪条更对。',
      next: '选一条，按「按此航线启航」。出海后按 E 靠过去、F 靠港。',
    };
  }
  if (view === 'world') {
    const misaligned = ctx.relDeg != null && Math.abs(ctx.relDeg) > 32;
    const approaching = ctx.portDist != null && ctx.portDist < ctx.portRadius * 2.4;
    const next = ctx.nearPort
      ? '按 F 靠港'
      : ctx.nearFragment
        ? '按 E 靠过去，和守着它的人打个照面。'
        : misaligned
          ? `转动船头，让铜针对准船头（偏 ${Math.round(Math.abs(ctx.relDeg ?? 0))}°）。`
          : approaching
            ? `铜针已对准 ${ctx.portName}。再靠近一些，压进港区就会提示靠港。`
            : '铜针对准目的港，按 W 前进。';
    return {
      step: '行 · 出海',
      title: ctx.nearPort ? '已经靠近港口' : '朝海图上的目的港航行',
      body: ctx.nearPort ? ctx.nearHint : ctx.seaHint,
      next,
    };
  }
  if (view === 'port') {
    return {
      step: `行 · 靠岸 · ${ctx.portTitle}`,
      title: '用材料做一件事',
      body: ctx.portBody,
      next: ctx.unusedFragments > 0 ? '选一份材料，用它说明你的安排。' : '打开一份材料，先看它从哪里来。',
    };
  }
  if (view === 'collaborate') {
    return {
      step: '查 · 先看依据',
      title: '过程要看得见，选择由你来定',
      body: ctx.connected
        ? '船员查阅时只列出可观察事件。大副问依据，二副问谁被看见。你可以都不采纳。'
        : '模型尚未接入，不会编造船员发言。你可以自己写解释，按住落印。',
      next: ctx.crewReplies >= 2 ? '先看来源，再听他们各自的理由。' : '写下理由，由你落印。',
    };
  }
  return {
    step: '省 · 回头看这一程',
    title: '你相信了什么？又凭什么相信？',
    body: '材料与出处在上面。两本账分开。下面三问帮你回看：信了什么、求快时漏了什么、后来的人还能不能改。',
    next: '带上没解决的问题，再走一程。',
  };
}

function notesOf(world: Record<string, unknown> | undefined) {
  const raw = world && typeof world.notes === 'object' && world.notes ? (world.notes as Record<string, unknown>) : {};
  return {
    dissent: typeof raw.dissent === 'string' ? raw.dissent : '',
    reason: typeof raw.reason === 'string' ? raw.reason : '',
  };
}

function sceneAttr(voyage: Voyage | null, pick?: Scene | null) {
  const id = voyage?.scene_id ?? pick?.id ?? 'test';
  if (id === 'A' || id === 'B' || id === 'C' || id === 'D') return id;
  return 'test';
}

function errText(e: unknown) {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return '请求失败';
}

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const [records, setRecords] = useState<VoyageRecord[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [view, setView] = useState<View>('embark');
  const [error, setError] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem(MOTION_KEY) === '1' || window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [comms, setComms] = useState(false);
  const [backgroundId,setBackgroundId]=useState<string|null>(null);
  const [yardOpen,setYardOpen]=useState(false);
  const [webgl, setWebgl] = useState(true);
  const [title, setTitle] = useState('玄览一问');
  const [scenePick, setScenePick] = useState<Scene | null>(null);
  const [question, setQuestion] = useState('');
  const [sharedTask, setSharedTask] = useState('');
  const [chat, setChat] = useState<{ who: 'user' | 'crew' | 'sys'; text: string; role?: string }[]>([]);
  const [reason, setReason] = useState('');
  const [dissent, setDissent] = useState('');
  /** 站位：这一程真正要拨的那根刻度。null = 还没表态 */
  const [stanceIdx, setStanceIdx] = useState<number | null>(null);
  const [routeId, setRouteId] = useState('simple');
  /** 实际走的航道。和 routeId 是一回事，但 world 里按 near/far 存，方便渲染。 */
  const [laneId, setLaneId] = useState<string>('near');
  const [nearPort, setNearPort] = useState<string | null>(null);
  const [nearFragment, setNearFragment] = useState<string | null>(null);
  /** 已经开进传送门：值是下一段的场景 id */
  const [nearPortal, setNearPortal] = useState<string | null>(null);
  /** 落印后的回响：几秒钟的字，然后回到海上 */
  const [sealBeat, setSealBeat] = useState<{ pick: string; epilogue: string; met?: string | null } | null>(null);
  /** 每段入海的开场字幕 */
  const [intro, setIntro] = useState<string | null>(null);
  /** 开局的风：片头一过，船被推向礁石，三秒内打舵 */
  const [squall, setSquall] = useState<{ until: number; dir: 1 | -1 } | null>(null);
  const squallDone = useRef<string>('');
  /** 第四段落印后：收帆 */
  const [finale, setFinale] = useState(false);
  /** 这一程已经落过印：门才会开 */
  const sealedHere = records.some((r) => r.kind === 'choice');
  const [ship, setShip] = useState<ShipSnapshot | null>(null);
  const [input, setInput] = useState<ControlInput>({ forward: 0, turn: 0 });
  const [busy, setBusy] = useState(false);
  /** 显卡上下文丢了：画面会黑，等浏览器把它还回来 */
  const [glLost, setGlLost] = useState(false);
  /** 玩家：名字与口令只在本机。没登录过就先登船 */
  const [player, setPlayer] = useState<Player | null>(() => sessionPlayer());
  const [camBlend, setCamBlend] = useState(1);
  const [cine, setCine] = useState(false);
  /** 靠港戏：0..1 的时间轴，和镜头对齐；面板要等它走到 1 才出现 */
  const [landing, setLanding] = useState(0);
  const [pickupFlash, setPickupFlash] = useState<string | null>(null);
  const keys = useRef({ w: false, a: false, s: false, d: false, shift: false });
  /** 补给与人心：遭遇改变它们，全速会烧补给。一程一程带下去 */
  const [stats, setStats] = useState<VoyageStats>(loadStats);
  const statsRef = useRef(stats);
  statsRef.current = stats;
  const updateStats = useCallback((fn: (s: VoyageStats) => VoyageStats) => {
    setStats((prev) => {
      const next = fn(prev);
      saveStats(next);
      return next;
    });
  }, []);
  /** 正在进行的遭遇：材料 id */
  const [enc, setEnc] = useState<string | null>(null);
  /** 转：危机。开到那里就发生 */
  const [crisis, setCrisis] = useState<string | null>(null);
  /** 承：沿途旁白，浮一会儿就散 */
  const [caption, setCaption] = useState<Beat | null>(null);
  /** 合：岸上的人 */
  const [shoreOpen, setShoreOpen] = useState(false);
  const [progress, setProgress] = useState<StoryProgress>({ beats: [], crisis: [], shore: [], state: {} });
  /** 最后那一页绘本 */
  const [storyPage, setStoryPage] = useState(false);
  /** 暗线进行中：桃花源 */
  const [secret, setSecret] = useState<string | null>(null);
  /** 水上的玩法：对话说完，东西就摆到船头前面；船开到哪，答案就是哪 */
  const [water, setWater] = useState<WaterSpec | null>(null);
  const [waterFeedback,setWaterFeedback]=useState<{cue:'dot'|'error'|'water';at:number}|null>(null);
  const dismissedCrisis=useRef('');
  const [waterResult, setWaterResult] = useState<WaterResult | null>(null);
  const [encPhase, setEncPhase] = useState<'intro' | 'talk' | 'play' | 'result'>('intro');
  const phaseHandler = (game: Game, timeLimit?: number) => (phase: 'intro' | 'talk' | 'play' | 'result') => {
    setEncPhase(phase);
    if (phase === 'play') {
      const s = shipRef.current;
      if (!s) return;
      resetWaterLive();
      setWaterFeedback(null);
      setWaterResult(null);
      // 空水面：避开岛、礁石、码头、村子，东西才不会摆到岸上去
      const obstacles = [
        ...sea.fragments.map((f) => ({ x: f.x + ISLAND_OFFSET.x, z: f.z + ISLAND_OFFSET.z, r: 7 })),
        ...seaStateFor(voyage?.scene_id).reefs.map((r) => ({ x: r.x, z: r.z, r: r.r + 1 })),
        ...sea.ports.map((p) => ({ x: p.x, z: p.z, r: p.radius + 6 })),
        ...(story ? [{ x: story.crisis.at.x + VILLAGE_OFFSET.x, z: story.crisis.at.z + VILLAGE_OFFSET.z, r: 13 }] : []),
      ];
      setWater(buildWaterSpec(game, s, { timeLimit, obstacles }));
    } else {
      setWater(null);
    }
  };
  const encRef = useRef<string | null>(null);
  // 听人说话、看结果时船停下；轮到你做事时，键盘归船
  encRef.current = yardOpen ? 'shipyard' : backgroundId ? 'background-reading' : encPhase === 'play' ? null : (enc ?? crisis ?? secret);
  const shipRef = useRef<ShipSnapshot | null>(null);

  useEffect(()=>{const openYard=(event:KeyboardEvent)=>{if(event.key.toLowerCase()!=='b'||event.repeat||(event.target instanceof HTMLElement&&event.target.closest('input,textarea,select,[contenteditable]')))return;if(enc||crisis||secret||backgroundId||shoreOpen||intro||sealBeat||storyPage||landing>0)return;event.preventDefault();setYardOpen(value=>!value);};window.addEventListener('keydown',openYard);return()=>window.removeEventListener('keydown',openYard);},[enc,crisis,secret,backgroundId,shoreOpen,intro,sealBeat,storyPage,landing]);

  const connected = models.length > 0;
  const sea = useMemo(
    () => worldFor(voyage?.scene_id ?? scenePick?.id),
    [voyage?.scene_id, scenePick?.id],
  );
  const portPlace = sea.ports[0];
  const stance = useMemo(() => {
    const base = stanceFor(voyage?.scene_id ?? scenePick?.id);
    const seal = laneSealFor(voyage?.scene_id, laneId);
    if (!base) return null;
    if (!seal) return base;
    // 这条线自己的刻度：港口那一下要收束的是两座岛和危机里做过的事
    return { ...base, axis: { question: seal.question, left: seal.left, right: seal.right, choices: seal.choices } };
  }, [voyage?.scene_id, scenePick?.id, laneId]);
  /**
   * 靠港戏的主角：这一程最后拾到的那件东西。
   * 什么都没拾就靠港，就用这条航道上的标志物 —— 戏不能没有主角。
   */
  const landingRelicId = useMemo(() => {
    const picked = records.filter((r) => r.kind === 'fragment').flatMap((r) => r.material_ids);
    const last = picked[picked.length - 1];
    if (last) return last;
    const onLane = sea.fragments.find((f) => f.lane === laneId) ?? sea.fragments[0];
    return onLane?.id ?? null;
  }, [records, sea, laneId]);

  /** 已经走过的段（含当前这段）：海图上留下笔迹的那几笔。 */
  const struck = useMemo(() => {
    const chain = ['A', 'B', 'C', 'D'];
    const id = voyage?.scene_id ?? '';
    const i = chain.indexOf(id);
    if (i < 0) return [] as string[];
    return chain.slice(0, i + 1);
  }, [voyage?.scene_id]);

  /** 主线上的下一段场景。走到 D 就没有下一段了 —— 这趟航程没有终点港。 */
  const nextScene = useMemo(() => {
    const id = voyage?.scene_id;
    if (!id) return null;
    const next = nextEpochId(id);
    return next ? scenes.find((s) => s.id === next) ?? null : null;
  }, [voyage?.scene_id, scenes]);

  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      const ok = !!(c.getContext('webgl2') || c.getContext('webgl'));
      setWebgl(ok);
    } catch {
      setWebgl(false);
    }
  }, []);

  useEffect(() => {
    // 靠港戏期间把所有 HUD 收起来：这几秒只看那件东西
    document.documentElement.dataset.cine =
      landing > 0 && landing < 1
        ? 'landing'
        : finale || intro || sealBeat || storyPage
          ? 'finale'
          : view === 'port'
            ? 'port'
            : view === 'reflection'
              ? 'reflection'
              : '';
  }, [landing, view, finale, intro, sealBeat, storyPage]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduceMotion ? 'true' : 'false';
    localStorage.setItem(MOTION_KEY, reduceMotion ? '1' : '0');
  }, [reduceMotion]);

  useEffect(() => {
    document.documentElement.dataset.scene = sceneAttr(voyage, scenePick);
  }, [voyage, scenePick]);

  useEffect(() => {
    if (scenePick || scenes.length === 0) return;
    setScenePick(scenes.find((s) => s.id === 'neutral-test') ?? scenes[0]);
  }, [scenes, scenePick]);

  useEffect(() => {
    if (!scenePick) return;
    const preset = TITLE_PRESETS[scenePick.id] ?? '未命名航程';
    const stock = new Set([...Object.values(TITLE_PRESETS), '测试航程', '未命名航程']);
    setTitle((cur) => (stock.has(cur) ? preset : cur));
  }, [scenePick]);

  const refreshLists = useCallback(async () => {
    const [h, m, s, v] = await Promise.all([api.health(), api.models(), api.scenes(), api.listVoyages()]);
    setHealth(h);
    setModels(m);
    setScenes(latestScenes(s));
    setVoyages(v);
    return { h, m, s: latestScenes(s), v };
  }, []);

  const loadVoyage = useCallback(async (id: string, nextView?: View) => {
    const v = await api.getVoyage(id);
    setVoyage(v);
    setQuestion(v.question);
    setSharedTask(v.shared_task);
    const notes = notesOf(v.world);
    // 理由给一句默认：让人改，而不是逼人从空白开始。空白卡住的是第一步。
    setReason(notes.reason || DEFAULT_REASON);
    setDissent(notes.dissent);
    if (v.route) setRouteId(v.route.id);
    const savedLane = (v.world as { lane?: unknown })?.lane;
    setLaneId(typeof savedLane === 'string' ? savedLane : 'near');
    localStorage.setItem(LAST_KEY, id);
    const [rec, p, u] = await Promise.all([
      api.records(id),
      api.ports(id),
      api.usage(id),
    ]);
    setRecords(rec);
    setPorts(p);
    setUsage(u);
    setView(nextView ?? (v.stage === 'world' ? 'world' : v.stage));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { s, v } = await refreshLists();
        setScenePick(s.find((x) => x.id === 'neutral-test') ?? s.find((x) => x.status === 'test') ?? s[0] ?? null);
        const last = localStorage.getItem(LAST_KEY);
        if (last && v.some((item) => item.id === last)) await loadVoyage(last);
      } catch (e) {
        setBootError(errText(e));
      }
    })();
  }, [loadVoyage, refreshLists]);

  const persist = useCallback(
    async (patch: Partial<Voyage> & { stage?: Stage; world?: Record<string, unknown> }) => {
      if (!voyage) return voyage;
      const body = {
        stage: patch.stage ?? voyage.stage,
        question: patch.question ?? question,
        shared_task: patch.shared_task ?? sharedTask,
        crew: patch.crew ?? voyage.crew,
        route: patch.route === undefined ? voyage.route : patch.route,
        world: patch.world ?? {
          ...voyage.world,
          notes: { dissent, reason },
        },
      };
      const next = await api.putVoyage(voyage.id, body);
      setVoyage(next);
      return next;
    },
    [voyage, question, sharedTask, dissent, reason],
  );

  const nearRef = useRef({ t: 0, port: '', frag: '', portal: '' });
  const [hitFlash, setHitFlash] = useState(0);
  const onShip = useCallback(
    (s: ShipSnapshot, port: string | null, frag: string | null, portal: string | null) => {
      shipRef.current = s;
      // 调试用：无头测试读船的位置。只写一个对象，不参与游戏逻辑
      (window as unknown as { __cv?: unknown }).__cv = { ...s, port, frag, portal };
      if (s.reefHit > 0) {
        setStats((prev) => {
          const next = hullHit(prev, s.reefHit);
          saveStats(next);
          return next;
        });
        setHitFlash(performance.now());
      }
      const now = performance.now();
      const portKey = port ?? '';
      const fragKey = frag ?? '';
      const portalKey = portal ?? '';
      if (
        portKey !== nearRef.current.port ||
        fragKey !== nearRef.current.frag ||
        portalKey !== nearRef.current.portal ||
        now - nearRef.current.t > 120
      ) {
        nearRef.current = { t: now, port: portKey, frag: fragKey, portal: portalKey };
        setShip(s);
        setNearPort(port);
        setNearFragment(frag);
        setNearPortal(portal);
      }
    },
    [],
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') keys.current.w = true;
      if (k === 's' || k === 'arrowdown') keys.current.s = true;
      if (k === 'a' || k === 'arrowleft') keys.current.a = true;
      if (k === 'd' || k === 'arrowright') keys.current.d = true;
      if (e.key === 'Shift') keys.current.shift = true;
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') keys.current.w = false;
      if (k === 's' || k === 'arrowdown') keys.current.s = false;
      if (k === 'a' || k === 'arrowleft') keys.current.a = false;
      if (k === 'd' || k === 'arrowright') keys.current.d = false;
      if (e.key === 'Shift') keys.current.shift = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    let burn = 0;
    const blur = () => {
      keys.current = { w: false, a: false, s: false, d: false, shift: false };
    };
    window.addEventListener('blur', blur);
    const id = window.setInterval(() => {
      // 遭遇进行中：键盘交给小游戏，船停着
      const busyHands = encRef.current != null;
      const forward = busyHands ? 0 : (keys.current.w ? 1 : 0) + (keys.current.s ? -1 : 0);
      // Three.js +yaw turns bow west; A (port) is +yaw, D (starboard) is −yaw.
      const turn = busyHands ? 0 : (keys.current.a ? 1 : 0) + (keys.current.d ? -1 : 0);
      // 全速：要往前开、还有补给才行。每秒烧约 1 点
      const boost = !busyHands && keys.current.shift && forward > 0 && statsRef.current.supply > 0 ? 1 : 0;
      if (boost) {
        burn += 0.048;
        if (burn >= 1) {
          burn -= 1;
          setStats((prev) => {
            const next = { ...prev, supply: Math.max(0, prev.supply - 1) };
            saveStats(next);
            return next;
          });
        }
      }
      // 补给见底：定量配给，船慢下来
      const ration = statsRef.current.supply <= 0;
      const crippled = statsRef.current.hull <= 0;
      setInput((prev) =>
        prev.forward === forward && prev.turn === turn && (prev.boost ?? 0) === boost && !!prev.ration === ration && !!prev.crippled === crippled
          ? prev
          : { forward, turn, boost, ration, crippled },
      );
    }, 48);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      window.clearInterval(id);
    };
  }, []);

  const actRef = useRef({
    view: 'embark' as View,
    busy: false,
    nearPort: null as string | null,
    nearFragment: null as string | null,
    collected: new Set<string>(),
    dock: () => {},
    collect: () => {},
  });
  actRef.current.view = view;
  actRef.current.busy = busy;
  actRef.current.nearPort = nearPort;
  actRef.current.nearFragment = nearFragment;
  actRef.current.collected = new Set(records.flatMap((r) => r.material_ids));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return;
      const a = actRef.current;
      if (a.view !== 'world' || a.busy || encRef.current) return;
      const k = e.key.toLowerCase();
      if (k === 'e' && a.nearFragment && !a.collected.has(a.nearFragment)) {
        e.preventDefault();
        a.collect();
      }
      if (k === 'f' && a.nearPort) {
        e.preventDefault();
        a.dock();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const voyageHold = useRef(voyage);
  voyageHold.current = voyage;
  useEffect(() => {
    if (view !== 'world') return;
    const handle = window.setInterval(() => {
      const v = voyageHold.current;
      const snap = shipRef.current;
      if (!v || !snap) return;
      void api
        .putVoyage(v.id, {
          stage: 'world',
          question,
          shared_task: sharedTask,
          crew: v.crew,
          route: v.route,
          world: worldState(v, snap, nearPort ?? 'at-sea', worldFor(v.scene_id)),
        })
        .then(setVoyage)
        .catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(handle);
  }, [view, question, sharedTask, nearPort]);

  const camMode: CamMode = useMemo(() => {
    // 靠港戏占住镜头：船还在海域，但镜头已经推上去看东西了
    if (landing > 0 && landing < 1) return 'landing';
    if (finale) return 'finale';
    if (view === 'embark') return 'embark';
    if (view === 'cockpit') return 'cockpit';
    if (view === 'route') return 'route';
    if (view === 'port' || view === 'collaborate') return 'port';
    if (view === 'reflection') return 'reflection';
    return 'follow';
  }, [view, landing, finale]);

  async function createVoyage(seed?: { sceneId: string; carried?: string[] }) {
    setError(null);
    setBusy(true);
    try {
      const scene = seed ? scenes.find((s) => s.id === seed.sceneId) : scenePick ?? scenes.find((s) => s.status === 'test');
      if (!scene) throw new Error('没有可用场景');
      // 从标题页重新开一局：补给与人心回到起点；过门换段则一路带下去
      if (!seed) updateStats(() => freshStats());
      const seedQuestion = historyFor(scene.id,laneId)?.question ?? scene.questions[0] ?? '';
      const created = await api.createVoyage({
        title: title.trim() || TITLE_PRESETS[scene.id] || '未命名航程',
        scene_id: scene.id,
        scene_version: scene.version,
        scene_track: scene.status === 'pending' ? 'candidate' : scene.status === 'confirmed' ? 'confirmed' : 'test',
        // 场景问题先落进草稿：陌生人不必先编一句才有东西可改
        question: seedQuestion,
        shared_task: scene.interactions[0] ?? '',
        crew: DEFAULT_CREW.map((c) => ({ ...c, model_id: models[0]?.id ?? null })),
      });
      // 上一程留下的东西：同一张海图交到下一个驾驶舱，而不是每段从零开始
      if (seed?.carried?.length) {
        for (const text of seed.carried) {
          await api.addRecord(created.id, {
            kind: 'log',
            text,
            classification: 'counterfactual',
            sources: [],
            material_ids: [],
            version: 1,
            access: 'private',
          });
        }
      }
      setChat([]);
      await loadVoyage(created.id, 'cockpit');
      await refreshLists();
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  /**
   * 把这一程的站位与代价打成一张纸，交给下一段。
   * 从 records 里读，不读界面状态：玩家可能是在刷新后才来日志页的。
   */
  function carryForward() {
    if (!voyage) return [] as string[];
    const sealed = records.filter((r) => r.kind === 'choice');
    const last = sealed[sealed.length - 1];
    if (!last) return [] as string[];
    const line = last.text.split('\n').find((l) => l.startsWith('站位：'));
    if (!line) return [] as string[];
    return [
      `上一程（${voyage.scene_id}）留下的：${line.replace('站位：', '站位「')}」`,
      `上一程的原话：${voyage.question}`,
    ];
  }

  useEffect(() => {
    if (!sealBeat) return;
    const t = window.setTimeout(() => {
      setSealBeat(null);
      // 这一程讲完了：先翻到那一页绘本，再回到海上
      if (story?.page) {
        setStoryPage(true);
        return;
      }
      if (voyage?.scene_id === 'D') setFinale(true);
      setView('world');
    }, reduceMotion ? 1200 : 4200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sealBeat, voyage?.scene_id, reduceMotion]);

  function closeStoryPage() {
    setStoryPage(false);
    if (voyage?.scene_id === 'D') setFinale(true);
    setView('world');
  }

  // 每段第一次入海：开场字幕。按任意键可跳过
  const introShown = useRef<string>('');
  useEffect(() => {
    if (view !== 'world' || !voyage) return;
    if (introShown.current === voyage.id) return;
    if (records.some((r) => r.kind === 'choice')) return;
    introShown.current = voyage.id;
    setIntro(voyage.scene_id);
  }, [view, voyage, records]);

  // 片头的计时只认片头本身：拾取、存档这些变化不能把它重置成"永远不消失"
  useEffect(() => {
    if (!intro) return;
    // 片头一散（到时或按键跳过），先让手忙起来：一阵横风把船往礁石上推，三秒内打舵，才谈故事
    const dismiss = () => {
      setIntro(null);
      if (voyage && squallDone.current !== voyage.id && !records.some((r) => r.kind === 'choice')) {
        squallDone.current = voyage.id;
        const dir: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
        window.setTimeout(() => setSquall({ until: performance.now() + 3200, dir }), 900);
        window.setTimeout(() => setSquall(null), 4300);
      }
    };
    const t = window.setTimeout(dismiss, reduceMotion ? 1600 : 6200);
    const skip = dismiss;
    window.addEventListener('keydown', skip, { once: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', skip);
    };
  }, [intro, reduceMotion]);

  // 离开海域就收起片头：否则它是一层看不见的遮罩，会挡住下一屏的按钮
  useEffect(() => {
    if (view !== 'world') setIntro(null);
  }, [view]);

  /** 开进传送门：先把画面压黑，再换到下一段。 */
  const [portalCross, setPortalCross] = useState(false);
  // 不在海上时，过门的黑幕不能留着
  useEffect(() => {
    if (view !== 'world' && portalCross) setPortalCross(false);
  }, [view, portalCross]);

  useEffect(() => {
    // 只有在海上开着船才算过门：在港口、在演戏、在岸上，船停在门边也不算
    if (view !== 'world' || !sealedHere || sealBeat || enc || crisis || secret || yardOpen || backgroundId || landing > 0) return;
    if (!nearPortal || portalCross) return;
    // 开进门就换段。没落印也放行：海图上这一段留白，过门时说清楚
    setPortalCross(true);
    const t = window.setTimeout(() => {
      const carried = carryForward();
      void createVoyage({ sceneId: nearPortal, carried }).finally(() => setPortalCross(false));
    }, 1100);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearPortal, view, sealedHere, sealBeat, enc, crisis, secret, yardOpen, backgroundId, landing]);

  /** 这一段的下一段是谁。neutral-test 不进主线。 */
  function nextEpochId(cur: string): string | null {
    // 启航港是练习：走完接进第一段
    if (cur === 'neutral-test') return 'A';
    const chain = ['A', 'B', 'C', 'D'];
    const i = chain.indexOf(cur);
    return i >= 0 && i < chain.length - 1 ? chain[i + 1] : null;
  }

  /** 出海：不再分「确认问题」和「选航线」两步，一次落印直接进海域。 */
  async function departNow() {
    if (!voyage) return;
    setBusy(true);
    setError(null);
    try {
      const route = ROUTES.find((r) => r.id === routeId) ?? ROUTES[0];
      const snap = shipRef.current;
      await persist({
        stage: 'world',
        question:historyFor(voyage.scene_id,laneId)?.question??question,
        route,
        world: { ...worldState(voyage, snap, 'at-sea', sea), lane: laneId },
      });
      setView('world');
      setCine(true);
      window.setTimeout(() => setCine(false), 1400);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function launchRoute() {
    if (!voyage) return;
    setBusy(true);
    setError(null);
    try {
      const route = ROUTES.find((r) => r.id === routeId) ?? ROUTES[0];
      const snap = shipRef.current;
      await persist({
        stage: 'world',
        question:historyFor(voyage.scene_id,laneId)?.question??question,
        route,
        // 航道同时写进 world：刷新后仍然走同一条，不会悄悄换路
        world: { ...worldState(voyage, snap, 'at-sea', sea), lane: laneId },
      });
      setView('world');
      setCine(true);
      window.setTimeout(() => setCine(false), 1400);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function dock() {
    if (!voyage || !nearPort || landing > 0 || enc || crisis || secret || yardOpen || backgroundId) return;
    const missing=historyFor(voyage.scene_id,laneId)?.islands.find(scene=>!collectedIds.has(scene.id)&&!progress.state[`history:${scene.id}`]);
    if(missing){setError(`先完成「${missing.title}」，再回港回顾。`);return;}
    // 「转」不能跳过：那件事还没发生，就先让它发生
    if(story&&!progress.crisis.includes(story.crisis.id)){setError('还有最后一站没有完成。沿罗盘回到现场，再来港口回顾。');return;}
    setBusy(true);
    setError(null);
    try {
      const snap = shipRef.current;
      await persist({
        stage: 'world',
        world: worldState(voyage, snap, nearPort, sea),
      });
      const p = await api.ports(voyage.id);
      setPorts(p);
      // 先把这一程的实物看完，再让人做选择。时间轴先归零再起，上一次没走完的不会把这一次卡住
      setLanding(0);
      requestAnimationFrame(() => setLanding(0.0001));
    } catch (e) {
      setError(errText(e));
      setBusy(false);
    }
  }

  // 靠港戏的时间轴：镜头推近、物件出水，走完才开面板
  useEffect(() => {
    if (landing <= 0) return;
    let raf = 0;
    const t0 = performance.now();
    const dur = reduceMotion ? 900 : 5400;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      setLanding(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        setView('port');
        setBusy(false);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landing > 0, reduceMotion]);

  async function collectFragment(fragId: string | null = nearFragment, note?: string) {
    if (!voyage || !fragId) return;
    const frag = sea.fragments.find((f) => f.id === fragId);
    if (!frag) return;
    if (records.some((r) => r.material_ids.includes(frag.id))) return;
    setBusy(true);
    setError(null);
    try {
      await api.addRecord(voyage.id, {
        kind: 'fragment',
        text: note ? `${frag.title}\n${frag.text}\n${note}` : `${frag.title}\n${frag.text}`,
        classification: frag.classification,
        sources: frag.sources,
        material_ids: [frag.id],
        version: 1,
        access: 'private',
      });
      setRecords(await api.records(voyage.id));
      setPickupFlash(frag.title);
      window.setTimeout(() => setPickupFlash(null), 1600);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  actRef.current.dock = () => {
    void dock();
  };
  actRef.current.collect = () => {
    startEncounter();
  };

  /** 靠近一件东西：有人守着就先打照面、做一件事；没人守着就直接收 */
  function startEncounter() {
    if (!nearFragment || enc || crisis || yardOpen || backgroundId) return;
    const route=historyFor(voyage?.scene_id,laneId),index=route?.islands.findIndex(scene=>scene.id===nearFragment)??-1;
    if(route&&index>0&&!collectedIds.has(route.islands[index-1].id)&&!progress.state[`history:${route.islands[index-1].id}`]){setError(`先完成「${route.islands[index-1].title}」，再来见这里的人。`);return;}
    setError(null);
    if (encounterFor(nearFragment)) {
      fableLive.island = nearFragment;
      setEnc(nearFragment);
    } else void collectFragment();
  }

  const settledIds = useRef<Set<string>>(new Set());
  useEffect(()=>{settledIds.current.clear();dismissedCrisis.current='';},[voyage?.id]);
  function finishEncounter(id: string, o: Outcome, summary: string) {
    if (settledIds.current.has(id)) return;
    settledIds.current.add(id);
    const e = encounterFor(id);
    const tag = `${e?.who ?? '海上'}（${summary}）`;
    updateStats((s) => scoreOutcome(applyOutcome(s, o, tag, voyage?.scene_id ?? 'test', e?.who ?? '海上的人'), o.skillSucceeded ?? o.trust >= 0, 120));
    // 你做过的事留在岛上：后面的危机、岸上的人、最后一页都会读它
    if (o.set) markProgress((p) => ({ ...p, state: { ...p.state, ...o.set } }));
    fableLive.island = '';
    setEnc(null);
    void collectFragment(id, `遭遇 · ${tag}：${o.text}`);
  }

  async function goReflect() {
    if (!voyage) return;
    setBusy(true);
    try {
      await persist({ stage: 'reflection' });
      setRecords(await api.records(voyage.id));
      setUsage(await api.usage(voyage.id));
      setView('reflection');
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  function joystick(el: HTMLDivElement | null) {
    if (!el) return;
    const handle = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width * 2 - 1;
      const y = (ev.clientY - r.top) / r.height * 2 - 1;
      setInput({ forward: Math.max(-1, Math.min(1, -y)), turn: Math.max(-1, Math.min(1, -x)) });
    };
    const up = () => setInput({ forward: 0, turn: 0 });
    el.onpointerdown = (ev) => {
      el.setPointerCapture(ev.pointerId);
      handle(ev);
    };
    el.onpointermove = (ev) => {
      if (ev.buttons) handle(ev);
    };
    el.onpointerup = up;
    el.onpointercancel = up;
  }

  const restored = useMemo(() => {
    const w = voyage?.world?.ship as { x?: number; z?: number; yaw?: number } | undefined;
    if (w && typeof w.x === 'number') return { x: w.x, z: w.z ?? 0, yaw: w.yaw ?? 0 };
    return sea.spawn;
  }, [voyage?.id, sea.spawn]);

  const status = !voyage
    ? { kind: 'idle' as const, text: '还没有航程。和船员聊聊你想了解的文化问题。' }
    : error
      ? { kind: 'failed' as const, text: error }
      : !connected
        ? { kind: 'unconnected' as const, text: '模型服务尚未接入。船员暂时不能回复，仍可浏览海域与材料。' }
        : busy
          ? { kind: 'running' as const, text: '正在执行…' }
          : view === 'world' && nearPort
            ? { kind: 'waiting' as const, text: `接近 ${sea.ports.find((p) => p.id === nearPort)?.name ?? nearPort}。按 F 靠港。` }
            : { kind: 'idle' as const, text: voyage.question || '航程进行中' };

  const unusedFragments = records.filter((r) => r.kind === 'fragment' || r.kind === 'material').length;
  const crewReplies = chat.filter((m) => m.who === 'crew').length;
  const collectedIds = new Set(records.flatMap((r) => r.material_ids));
  const nearFrag = sea.fragments.find((f) => f.id === nearFragment);
  const nearFragCollected = nearFrag ? collectedIds.has(nearFrag.id) : false;
  const beat = kernelBeat(view, {
    hasQuestion: Boolean(question.trim()),
    crewReplies,
    sealed: Boolean(voyage?.question),
  });
  /**
   * 铜针指向哪里：默认指向港口，但船靠近传送门时改指门。
   * 门是这一程真正的出口，指针不指它，玩家找不到。
   */
  /**
   * 铜针指向哪里，就是这一程下一步该去哪里：
   * 航道上还没收的东西 → 港口 → 落印后指向门。
   */
  const story = storyFor(voyage?.scene_id, laneId);
  const currentHistory=historyFor(voyage?.scene_id,laneId);
  const pendingHistory=currentHistory?[...currentHistory.islands,currentHistory.crisis].findIndex(scene=>!progress.state[`history:${scene.id}`]&&!collectedIds.has(scene.id)&&!progress.crisis.includes(scene.id)):-1;
  const nearbyBackground=nearFrag?.id??(story&&ship&&Math.hypot(ship.x-story.crisis.at.x-VILLAGE_OFFSET.x,ship.z-story.crisis.at.z-VILLAGE_OFFSET.z)<22?story.crisis.id:null);

  // 换了航程：读回这一程已经看过的戏
  useEffect(() => {
    // 换航程会重建画布：上一块画布的「上下文丢失」不算数
    setGlLost(false);
    setProgress(loadProgress(voyage?.id));
    setCaption(null);
    setCrisis(null);
    setShoreOpen(false);
    // 靠港戏的时间轴属于上一程：不归零，下一程就再也靠不了港
    setLanding(0);
  }, [voyage?.id]);

  // 从港口回到海上：靠港戏已经演完，时间轴归零，下次靠港还能再演
  useEffect(() => {
    if (view === 'world' && landing >= 1) setLanding(0);
  }, [view, landing]);

  const markProgress = useCallback(
    (fn: (p: StoryProgress) => StoryProgress) => {
      setProgress((prev) => {
        const next = fn(prev);
        saveProgress(voyage?.id, next);
        return next;
      });
    },
    [voyage?.id],
  );

  // 船经过旁白点、危机点：戏自己发生
  useEffect(() => {
    if (view !== 'world' || !ship || yardOpen || backgroundId || enc || crisis || secret || landing > 0 || intro) return;
    // 暗线 · 桃花源：铜针不指它，只有顺着桃花瓣才找得到
    const era = voyage?.scene_id ?? '';
    const tao = stats.secrets.taoyuan;
    if (era === 'A' && !tao) {
      const [p0] = TAOYUAN.trail;
      if (!progress.beats.includes('tao-hint') && Math.hypot(ship.x - p0.x, ship.z - p0.z) < 6) {
        setCaption({ id: 'tao-hint', at: p0, prop: 'reeds', propAt: p0, kicker: TAOYUAN_HINT.kicker, text: TAOYUAN_HINT.text });
        markProgress((p) => ({ ...p, beats: [...p.beats, 'tao-hint'] }));
        return;
      }
      if (Math.hypot(ship.x - TAOYUAN.at.x, ship.z - TAOYUAN.at.z) < 10) {
        setCaption(null);
        setSecret('taoyuan');
        return;
      }
    }
    const echo = TAOYUAN_ECHO[era];
    if (tao && echo && !progress.beats.includes(`tao-${era}`) && Math.hypot(ship.x - TAOYUAN.at.x, ship.z - TAOYUAN.at.z) < 16) {
      setCaption({ id: `tao-${era}`, at: TAOYUAN.at, prop: 'reeds', propAt: TAOYUAN.at, kicker: echo.kicker, text: tao === 'marked' ? echo.marked : echo.kept });
      markProgress((p) => ({ ...p, beats: [...p.beats, `tao-${era}`] }));
      return;
    }
    if (!story) return;
    // 旁白按「沿航线走了多远」触发，不只看离得多近：抄近路、被遭遇打断都不会漏
    const lane = (sea.lanes ?? []).find((l) => l.id === laneId);
    const path: { x: number; z: number }[] = lane ? [sea.spawn, ...lane.waypoints] : [];
    /** 这个点投影到航线上，沿航线走了多远 */
    const along = (pt: { x: number; z: number }) => {
      if (path.length < 2) return Infinity;
      let best = Infinity;
      let bestAlong = 0;
      let acc = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
        const t = Math.max(0, Math.min(1, ((pt.x - a.x) * (b.x - a.x) + (pt.z - a.z) * (b.z - a.z)) / (len * len)));
        const d = Math.hypot(pt.x - (a.x + (b.x - a.x) * t), pt.z - (a.z + (b.z - a.z) * t));
        if (d < best) {
          best = d;
          bestAlong = acc + t * len;
        }
        acc += len;
      }
      return bestAlong;
    };
    const c = story.crisis;
    if(Math.hypot(ship.x-c.at.x-VILLAGE_OFFSET.x,ship.z-c.at.z-VILLAGE_OFFSET.z)>24)dismissedCrisis.current='';
    if (dismissedCrisis.current!==c.id && (historyFor(era,laneId)?.islands.every(scene=>collectedIds.has(scene.id)||!!progress.state[`history:${scene.id}`])??true) && !progress.crisis.includes(c.id) && Math.hypot(ship.x - (c.at.x+VILLAGE_OFFSET.x), ship.z - (c.at.z+VILLAGE_OFFSET.z)) < 15) {
      setCaption(null);
      setCrisis(c.id);
      return;
    }
    // 上一段旁白还在屏幕上：下一段等它读完再出。船快了，两段挨得近，不然前一段两秒就被盖掉
    if (caption) return;
    const shipAt = along({ x: ship.x, z: ship.z });
    for (const b of story.beats) {
      if (progress.beats.includes(b.id)) continue;
      if (shipAt >= along(b.at) - 1.5 || Math.hypot(ship.x - b.at.x, ship.z - b.at.z) < 9.5) {
        setCaption(b);
        markProgress((p) => ({ ...p, beats: [...p.beats, b.id] }));
        return;
      }
    }
  }, [view, story, ship, enc, crisis, secret, landing, intro, caption, progress, markProgress, stats.secrets.taoyuan, voyage?.scene_id, backgroundId, yardOpen]);

  function finishSecret(o: Outcome, summary: string) {
    if (!voyage) return;
    const tag = `暗线 · 桃花源（${summary}）`;
    updateStats((st) => ({ ...applyOutcome(st, o, tag, voyage.scene_id, '桃花源中人'), secrets: { ...st.secrets, ...(o.set ?? {}) } }));
    setSecret(null);
    void api
      .addRecord(voyage.id, {
        kind: 'log',
        text: `暗线 · 桃花源\n${o.text}`,
        classification: 'creative',
        sources: [],
        material_ids: [],
        version: 1,
        access: 'private',
      })
      .then(async () => setRecords(await api.records(voyage.id)))
      .catch((e) => setError(errText(e)));
  }

  // 危机进行中：水一点点涨上来
  useEffect(() => {
    if (!crisis) {
      fableLive.flood = 0;
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      fableLive.flood = Math.min(0.85, (now - t0) / 9000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [crisis]);

  // 旁白只在真的露出来的时候计时：遭遇、危机把它遮住的那几秒不算，结束后接着读
  // 桃花那一句是暗示，短一些，别把这一程的开场「起」顶到岛后面去
  useEffect(() => {
    if (!caption || enc || crisis || yardOpen || backgroundId) return;
    const secs = caption.id === 'tao-hint' ? 3500 : reduceMotion ? 4000 : 7000;
    const t = window.setTimeout(() => setCaption(null), secs);
    return () => window.clearTimeout(t);
  }, [caption, reduceMotion, enc, crisis, backgroundId, yardOpen]);

  // 靠岸后，先见岸上的人，再落印
  useEffect(() => {
    if (view === 'port' && story && voyage && !progress.shore.includes(voyage.id)) setShoreOpen(true);
  }, [view, story, voyage, progress]);

  function finishCrisis(o: Outcome, summary: string) {
    if (!story || !voyage) return;
    const c = story.crisis;
    if (settledIds.current.has(c.id)) return;
    settledIds.current.add(c.id);
    const tag = `${c.kicker} · ${c.enc.who}（${summary}）`;
    updateStats((st) => scoreOutcome(applyOutcome(st, o, tag, voyage.scene_id, c.enc.who), o.skillSucceeded ?? o.trust >= 0, 200));
    markProgress((p) => ({ ...p, crisis: [...p.crisis, c.id], state: { ...p.state, ...(o.set ?? {}) } }));
    setCrisis(null);
    void api
      .addRecord(voyage.id, {
        kind: 'log',
        text: `${story.title} · ${c.kicker}\n${tag}：${o.text}`,
        classification: 'creative',
        sources: [],
        material_ids: [],
        version: 1,
        access: 'private',
      })
      .then(async () => setRecords(await api.records(voyage.id)))
      .catch((e) => setError(errText(e)));
  }

  /** 镜头推到哪：正在打照面的那座岛，或者正在涨水的那个村子 */
  const stageAt = useMemo(() => {
    if (encPhase === 'play') return null;
    if (enc && encounterFor(enc)?.stage) {
      const f = sea.fragments.find((x) => x.id === enc);
      if (f) return { x: f.x + ISLAND_OFFSET.x, z: f.z + ISLAND_OFFSET.z };
    }
    // 村子比岛大：镜头退远、抬高，才看得见水从哪里涨上来
    if (crisis && story?.crisis.cause) return { x: story.crisis.at.x + VILLAGE_OFFSET.x, z: story.crisis.at.z + VILLAGE_OFFSET.z, dist: 21, h: 11 };
    if (secret === 'taoyuan') return { x: TAOYUAN.at.x - 4, z: TAOYUAN.at.z, dist: 24, h: 8.5 };
    return null;
  }, [enc, crisis, secret, story, sea, encPhase]);

  const guideTarget = useMemo(() => {
    if (sealedHere && sea.portal) return { x: sea.portal.x, z: sea.portal.z };
    const next = laneStops(sea, laneId).find((f) => !collectedIds.has(f.id));
    // 铜针指岛，不指岛背后那个看不见的点
    if (next) return encounterFor(next.id)?.stage ? { x: next.x + ISLAND_OFFSET.x, z: next.z + ISLAND_OFFSET.z } : { x: next.x, z: next.z };
    // 东西收齐了，还有一场躲不开的事在前面
    if (story && !progress.crisis.includes(story.crisis.id)) return {x:story.crisis.at.x+VILLAGE_OFFSET.x,z:story.crisis.at.z+VILLAGE_OFFSET.z};
    return portPlace ?? null;
  }, [sealedHere, sea, laneId, collectedIds, portPlace, story, progress]);

  const aimAt = water && waterLive.target ? waterLive.target : guideTarget;
  const relNow = ship && aimAt ? portRelDeg(ship, aimAt) : null;
  const gateRel = ship && sea.portal ? portRelDeg(ship, sea.portal) : null;
  const portDistNow = ship && portPlace ? Math.hypot(portPlace.x - ship.x, portPlace.z - ship.z) : null;
  const tip = guide(view, {
    connected,
    hasQuestion: Boolean(question.trim()),
    hasReason: Boolean(reason.trim()),
    nearPort: Boolean(nearPort),
    nearFragment: Boolean(nearFragment && nearFrag && !nearFragCollected),
    hasVoyages: voyages.length > 0,
    unusedFragments,
    crewReplies,
    portName: portPlace?.name ?? '港口',
    seaHint: sea.coach.sea,
    nearHint: sea.coach.near,
    portTitle: sea.coach.portTitle,
    portBody: sea.coach.portBody,
    relDeg: relNow,
    portDist: portDistNow,
    portRadius: portPlace?.radius ?? 12,
  });
  // 落印之后，这一段剩下的事只有一件：去门那里
  if (view === 'world' && sealedHere && sea.portal) {
    tip.next = `门开了。跟着光柱和罗盘上的「门」，驶进去就是下一段。`;
  } else if (view === 'world' && sealedHere && !sea.portal) {
    tip.next = '这一段没有门。';
  }

  return (
    <>
      <MusicDirector era={view==='embark'?scenePick?.id??'A':voyage?.scene_id??'A'} story={!!enc||!!crisis||!!secret||!!backgroundId||yardOpen||shoreOpen}/>
      {water&&waterFeedback&&<div key={waterFeedback.at} className={`water-feedback is-${waterFeedback.cue}`} role="status">{waterFeedback.cue==='dot'?'接住了':waterFeedback.cue==='error'?'碰到杂物，重新稳住':'进圈了，稳住船'}</div>}
      {yardOpen&&<ShipyardDialog stats={stats} sceneId={view==='embark'?scenePick?.id??'A':voyage?.scene_id??'A'} allowPurchase={view!=='embark'} onUpdate={updateStats} onClose={()=>setYardOpen(false)}/>}
      {webgl ? (
        <VoyageCanvas
          key={voyage?.id ?? 'dock'}
          mode={camMode}
          reduceMotion={reduceMotion}
          shipLevel={stats.shipLevel} crewLevel={stats.crewLevel}
          canSail={view === 'world' && !yardOpen && !backgroundId && !sealBeat && (encPhase === 'play' || (!enc && !crisis && !secret))}
          water={water}
          onWaterCue={cue=>{voyageCue(cue);setWaterFeedback({cue,at:performance.now()});}}
          onWaterDone={(r) => {
            voyageCue(r.kind==='gates'?'confirm':r.won?'success':'error');
            setWaterResult(r);
            setWater(null);
          }}
          taoyuanFound={!!stats.secrets.taoyuan}
          player={player?.name ?? null}
          onGl={(st) => setGlLost(st === 'lost')}
          squall={squall}
          highlightEra={view === 'embark' ? (scenePick?.id === 'neutral-test' ? 'test' : ((scenePick?.id as 'A' | 'B' | 'C' | 'D' | undefined) ?? null)) : null}
          fableState={progress.state}
          crisisDone={!!story && progress.crisis.includes(story.crisis.id)}
          stageAt={stageAt}
          sceneId={voyage?.scene_id ?? scenePick?.id ?? 'test'}
          world={sea}
          collectedIds={[...collectedIds]}
          nearFragmentId={nearFragment}
          laneId={laneId}
          portalOpen={sealedHere}
          struck={struck}
          landingT={landing > 0 && landing < 1 ? landing : 0}
          landingRelic={landingRelicId}
          autopilot={finale}
          input={input}
          restored={restored}
          onShip={onShip}
          onBlend={setCamBlend}
        />
      ) : (
        <div className="webgl-fallback">
          <div>
            <h1 className="display title-page">无法使用 WebGL</h1>
            <p>3D 海域需要 WebGL。核心操作仍可通过下方面板完成。</p>
          </div>
        </div>
      )}

      {/* 靠港戏：文字分层浮现，不一次全给 */}
      {landing > 0 && landing < 1 && (() => {
        const frag = sea.fragments.find((f) => f.id === landingRelicId);
        const stage1 = landing > 0.3;
        const stage2 = landing > 0.55;
        const stage3 = landing > 0.78;
        return (
          <div className="landing-cine" aria-live="polite">
            <div className="landing-cine-inner">
              <div className={`landing-kicker${stage1 ? ' is-in' : ''}`}>
                {stage1 ? `靠港 · ${portPlace?.name ?? '港口'}` : ''}
              </div>
              <div className={`landing-name${stage2 ? ' is-in' : ''}`}>
                {stage2 && frag ? frag.title : ''}
              </div>
              <div className={`landing-what${stage2 ? ' is-in' : ''}`}>
                {stage2 && frag?.what ? frag.what : ''}
              </div>
              <div className={`landing-body${stage3 ? ' is-in' : ''}`}>
                {stage3 && frag ? frag.why ?? frag.text : ''}
              </div>
            </div>
          </div>
        );
      })()}

      {view !== 'embark' && view !== 'cockpit' && (
        <>
          <div className={`hud hud-tl${view === 'world' ? ' hud-world' : ' scrim'}`}>
            {view === 'world' ? (
              <div className="hud-world-card">
                <div className="hud-quest">{story?.logline ?? voyage?.question ?? ''}</div>
                {currentHistory&&<div className="hud-history-step">{currentHistory.region} · {pendingHistory<0?'三站已完成，回港回顾':`第 ${pendingHistory+1}/3 站 · ${[...currentHistory.islands,currentHistory.crisis][pendingHistory].date}`}</div>}
                {/* 靠近一件实物时，先告诉眼睛"那是什么"，文字后补 */}
                {nearFrag ? (
                  <div className="hud-relic" key={nearFrag.id}>
                    <span className="hud-relic-key">E</span>
                    <span className="hud-relic-name">{nearFrag.title}</span>
                  </div>
                ) : null}
                {/* 「模型未接入」右上角已标出，海上只在真的出错或在执行时提示 */}
                {(status.kind === 'failed' || status.kind === 'running') && <StatusBanner kind={status.kind} text={status.text} compact />}
              </div>
            ) : (
              <>
                <div className="label">{voyage?.title ?? '文明航程'}</div>
                <div>{voyage?.question || ''}</div>
                <StageBar current={beat.current} reached={beat.reached} />
                <StatusBanner kind={status.kind} text={status.text} />
              </>
            )}
          </div>
          <div className={`hud hud-tr${view === 'world' ? ' hud-tr-world' : ' scrim'}`}>
            {/* 用量、余额、测试货舱这些账目对玩家没有意义，不再显示 */}
            {false && (
            <Ledgers
              connected={connected}
              usage={usage}
              balance={voyage?.balance ?? null}
              inventory={voyage?.inventory ?? null}
              capacity={voyage?.capacity ?? null}
              materials={unusedFragments}
              compact={false}
            />
            )}
          </div>
          <div className="hud hud-bl">
            {view === 'world' && (
              <div className="scrim chart-hud" aria-label="这一趟的海图">
                <ChartMap struck={struck} activeEpoch={voyage?.scene_id ?? ''} />
                <div className="chart-hud-note">
                  {sceneShortFromId(voyage?.scene_id)} · 第 {struck.length} / 4 笔
                </div>
              </div>
            )}
            {view === 'world' && (
              <div className="scrim">
                <div className="mono">
                  航向 {ship ? Math.round((ship.headingDeg + 360) % 360) : '—'}° · 速度 {ship ? ship.speed.toFixed(1) : '0'}
                </div>
                <div className="compass" aria-label="罗盘">
                  <div
                    className="compass-disk"
                    style={{ transform: `rotate(${-((ship?.headingDeg ?? 0) + 360) % 360}deg)` }}
                  >
                    <span className="compass-n">N</span>
                  </div>
                  <div className={`compass-bow${relNow != null && Math.abs(relNow) <= 12 ? ' is-aligned' : ''}`} />
                  <div
                    className={`compass-port${relNow != null && Math.abs(relNow) <= 12 ? ' is-aligned' : ''}`}
                    style={{
                      transform: `rotate(${relNow ?? 0}deg)`,
                    }}
                  >
                    <span className="compass-port-tip" />
                  </div>
                  {/* 门的方位：一直在罗盘边上，锁着是暗点，开了是亮点 */}
                  {gateRel != null && (
                    <div className={`compass-gate${sealedHere ? ' is-open' : ''}`} style={{ transform: `rotate(${gateRel}deg)` }}>
                      <span>门</span>
                    </div>
                  )}
                  <div className="compass-needle" />
                  <span className={`compass-key compass-key-a${relNow != null && relNow < -32 ? ' is-on' : ''}`}>A</span>
                  <span className={`compass-key compass-key-d${relNow != null && relNow > 32 ? ' is-on' : ''}`}>D</span>
                </div>
                <div className="joystick" ref={joystick} aria-label="航行摇杆">
                  <div
                    className="joystick-knob"
                    style={{
                      transform: `translate(calc(-50% + ${-input.turn * 36}px), calc(-50% + ${-input.forward * 36}px))`,
                    }}
                  />
                </div>
                <div className="hud-player" title={player ? `编号 ${player.id}` : ''}>
                  <span>船长</span>
                  <b>{player?.name ?? '—'}</b>
                </div>
                <div className="hud-sail" aria-label="船况">
                  <span className={`hud-wind${(ship?.windAlong ?? 0) > 0.3 ? ' is-fair' : (ship?.windAlong ?? 0) < -0.3 ? ' is-foul' : ''}`}>
                    {(ship?.windAlong ?? 0) > 0.3 ? '顺风' : (ship?.windAlong ?? 0) < -0.3 ? '逆风' : '侧风'}
                  </span>
                  {ship && ship.reefNear < 6 && <span className="hud-reef">礁石</span>}
                  <span className="hud-score">
                    {stats.combo > 1 && <b>×{stats.combo}</b>}
                    {stats.score}
                  </span>
                </div>
                <div className="hud-stats" aria-label="船身、补给与人心">
                  <span className={`hud-stat is-hull${stats.hull < 30 ? ' is-low' : ''}`} title="船身：船体还剩多少。撞礁会掉，掉到 0 船只剩一半速度。">
                    船身 <b>{stats.hull}</b>
                    <i style={{ width: `${stats.hull}%` }} />
                  </span>
                  <span className={`hud-stat${stats.supply < 15 ? ' is-low' : ''}`} title="补给：船上的粮和水。按 Shift 全速会烧补给，烧光了船走不快。">
                    补给 <b>{stats.supply}</b>
                    <i style={{ width: `${stats.supply}%` }} />
                  </span>
                  <span className="hud-stat is-trust" title="人心：船员信你几分。岸上和海上的每一次选择都会改变它。">
                    人心 <b>{stats.trust}</b>
                    <i style={{ width: `${stats.trust}%` }} />
                  </span>
                </div>
                <div className={`faint${input.boost ? ' is-boost' : ''}`}>
                  {input.boost
                    ? `${BOOST_NAME[voyage?.scene_id ?? 'test'] ?? '全速'} · 正在烧补给`
                    : stats.hull <= 0
                      ? '船身破了 · 速度减半，回港才能修'
                      : stats.supply <= 0
                        ? '补给已空 · 船在减速'
                      : `WASD 航行 · Shift ${BOOST_NAME[voyage?.scene_id ?? 'test'] ?? '全速'}`}
                </div>
              </div>
            )}
          </div>
          <div className="hud hud-br">
            <MusicControls/>
            <button className="btn btn-icon hud-action" type="button" disabled={!!enc||!!crisis||!!secret||!!backgroundId||landing>0} onClick={()=>{setInput({forward:0,turn:0});setYardOpen(true);}}>船坞与换装 · B</button>
            <button className="btn btn-icon hud-action" type="button" onClick={() => setView('embark')}>启航</button>
            <button
              className="btn btn-icon hud-action"
              type="button"
              disabled={!voyage || voyage.stage === 'cockpit'}
              title={voyage?.stage === 'cockpit' ? '先确认航程并选择航线' : undefined}
              onClick={() => setView('world')}
            >
              出海
            </button>
            <button className="btn btn-icon hud-action" type="button" disabled={!voyage} onClick={() => void goReflect()}>日志</button>
            <button className="btn btn-icon hud-action" type="button" onClick={() => setComms(true)}>通讯台</button>
            <button className="btn btn-icon hud-action" type="button" onClick={() => setReduceMotion((v) => !v)}>
              {reduceMotion ? '减少动态开' : '减少动态'}
            </button>
          </div>
        </>
      )}

      {/* 出发页只剩画面字，不挂提示条 */}
      {/* 海上不再挂教练条：铜针、旁白和门的光柱已经在指路 */}
      {glLost && (
        <div className="gl-lost" role="alert">
          显卡上下文丢失，画面暂时变黑。正在等浏览器恢复；若十秒内没有恢复，请刷新页面。
        </div>
      )}
      {!player && <PlayerGate onDone={setPlayer} />}
      <div className={player ? '' : 'is-gated'} aria-hidden={player ? undefined : true}>
      {!['embark', 'reflection', 'cockpit', 'world'].includes(view) && (
        <div className={`coach-bar ${view === 'world' || view === 'cockpit' ? 'coach-bar-top' : ''}`}>
          <div className="scrim">
            <div className="label">{tip.step}</div>
            <div>{tip.next}</div>
          </div>
        </div>
      )}

      {/* 入海开场：时代 → 名字 → 一句话 → 这一程的问题 */}
      {intro && view === 'world' && EPOCH_INTRO[intro] && (
        <div className="epoch-intro" aria-live="polite" onClick={() => setIntro(null)}>
          <span className="epoch-intro-era">{EPOCH_INTRO[intro].era}</span>
          <span className="epoch-intro-title">{EPOCH_INTRO[intro].title}</span>
          <span className="epoch-intro-line">{EPOCH_INTRO[intro].line}</span>
          <span className="epoch-intro-q">{voyage?.question}</span>
          {story && <span className="epoch-intro-story">这一程 · 「{story.title}」</span>}
        </div>
      )}

      {/* 落印的回响：你站在哪、谁承担，然后门开了 */}
      {sealBeat && (
        <div className="seal-beat" aria-live="polite">
          <span className="seal-beat-mark">印</span>
          <span className="seal-beat-pick">{sealBeat.pick}</span>
          <span className="seal-beat-epi">{sealBeat.epilogue}</span>
          {sealBeat.met && <span className="seal-beat-met">{sealBeat.met}</span>}
          {voyage?.scene_id !== 'D' && sea.portal && <span className="seal-beat-next">门开了 · {sea.portal.label}</span>}
        </div>
      )}

      {/* 收帆：第四段落印之后，船自己往前开，字一行行浮出来，没有终点港 */}
      {finale && (
        <div className="finale" aria-live="polite">
          <div className="finale-lines">
            <p style={{ animationDelay: '1.2s' }}>你把目的地交了出去。</p>
            {stats.path.length > 0 ? (
              <p style={{ animationDelay: '4.2s' }} className="finale-path">
                {stats.path.map((p) => (
                  <span key={p.era}>
                    <b>{p.word}</b>
                    <i>{p.figure}</i>
                  </span>
                ))}
              </p>
            ) : (
              <>
                <p style={{ animationDelay: '4.2s' }}>农业画下第一个圈。工业把它连成线。</p>
                <p style={{ animationDelay: '7.2s' }}>信息在线上留下一处断点。智能点上了一颗它自己算出来的星。</p>
              </>
            )}
            {stats.met.length > 0 && (
              <p style={{ animationDelay: '9.6s' }} className="finale-met">
                你在海上遇见过：{[...new Set(stats.met.map((m) => m.who))].join('、')}。
              </p>
            )}
            <p style={{ animationDelay: '12.4s' }} className="finale-big">这张图上没有终点港。</p>
            {stats.secrets.taoyuan && (
              <p style={{ animationDelay: '13.8s' }} className="finale-tao">
                图的角落里，还有一个你去过、却再也找不到的地方。
                <span>「{TAOYUAN_FINALE.quote}」—— {TAOYUAN_FINALE.source}</span>
              </p>
            )}
            <p style={{ animationDelay: '15.2s' }}>终点，是人能把自己的能力伸到多远 —— 以及伸出去的时候，还记不记得问一句：这是谁的地方。</p>
            <p style={{ animationDelay: '18.4s' }} className="finale-trust">
              {trustLine(stats.trust)}
              <span>人心 {stats.trust} · 补给 {stats.supply}</span>
            </p>
          </div>
          <div className="finale-chart" style={{ animationDelay: '21.5s' }}>
            <SpiritMap path={stats.path} taoyuan={stats.secrets.taoyuan} />
            <button className="cine-link" type="button" onClick={() => { setFinale(false); void goReflect(); }}>
              看这张图
            </button>
          </div>
        </div>
      )}

      {/* 靠近传送门：门后是哪一段，字从画面里浮出来 */}
      {view === 'world' && sea.portal && ship && !portalCross && !enc &&
        Math.hypot(sea.portal.x - ship.x, sea.portal.z - ship.z) < 26 && (
          <div className="portal-hint" aria-live="polite">
            <span className="portal-hint-kicker">{sealedHere ? '门已开' : '还没落印'}</span>
            <span className="portal-hint-name">{sea.portal.label}</span>
            <span className="portal-hint-sub">
              {sealedHere ? '驶入门内，这一段就结束' : '完成三站故事、回港回顾并落印后，才能前往下一段'}
            </span>
          </div>
        )}

      {/* 承：沿途的旁白，从画面里浮出来 */}
      {view === 'world' && caption && !enc && !crisis && <StoryCaption beat={caption} title={story?.title ?? ''} />}

      {view==='world'&&story&&nearbyBackground===story.crisis.id&&!crisis&&!enc&&!secret&&!backgroundId&&!yardOpen&&!progress.crisis.includes(story.crisis.id)&&historyFor(voyage?.scene_id,laneId)?.islands.every(scene=>collectedIds.has(scene.id)||!!progress.state[`history:${scene.id}`])&&<button className="interact-prompt" type="button" onClick={()=>{dismissedCrisis.current='';setCrisis(story.crisis.id);}}>继续故事 · {story.crisis.enc.who}</button>}

      {/* 转：躲不开的那件事 */}
      {view === 'world' && crisis && story && (
        <EncounterOverlay
          key={crisis}
          enc={supportedEncounter(story.crisis.enc,progress.state)}
          onCancel={()=>{dismissedCrisis.current=crisis;setCrisis(null);setWater(null);setWaterResult(null);}}
          title={story.crisis.kicker}
          reduceMotion={reduceMotion}
          onDone={(o, summary) => finishCrisis(o, summary)}
          crisis
          cause={story.crisis.cause?.(progress.state)}
          timeLimit={reduceMotion ? undefined : 18}
          onPhase={phaseHandler(story.crisis.enc.game, reduceMotion ? undefined : 18)}
          waterResult={waterResult}
        />
      )}

      {/* 暗线：桃花源 */}
      {view === 'world' && secret === 'taoyuan' && (
        <EncounterOverlay
          key="taoyuan"
          enc={TAOYUAN_ENC}
          title="桃花源"
          reduceMotion={reduceMotion}
          onDone={(o, summary) => finishSecret(o, summary)}
          secret
          onPhase={phaseHandler(TAOYUAN_ENC.game)}
          waterResult={waterResult}
        />
      )}

      {/* 合：岸上的人 */}
      {view === 'port' && shoreOpen && story && (
        <ShoreOverlay
          story={story}
          state={progress.state}
          reduceMotion={reduceMotion}
          onDone={() => {
            setShoreOpen(false);
            if (voyage) markProgress((p) => ({ ...p, shore: [...p.shore, voyage.id] }));
          }}
        />
      )}

      {/* 尾页：这一程的故事，像绘本的最后一页 */}
      {storyPage && story?.page && (
        <StoryPage story={story} state={progress.state} storyId={`${voyage?.scene_id}-${laneId}`} onDone={closeStoryPage} />
      )}

      {/* 开局的风：打舵！ */}
      {view === 'world' && squall && (
        <div className="squall" aria-live="assertive">
          <span className="squall-kicker">横风</span>
          <span className="squall-text">船在往{squall.dir > 0 ? '右' : '左'}漂——打{squall.dir > 0 ? '左' : '右'}舵！</span>
          <kbd>{squall.dir > 0 ? 'A' : 'D'}</kbd>
        </div>
      )}

      {/* 撞礁：屏幕红一下 */}
      {hitFlash > 0 && performance.now() - hitFlash < 600 && <div className="hit-flash" key={hitFlash} aria-hidden />}

      {/* 遭遇：海上的人和他手上的事 */}
      {view === 'world' && enc && encounterFor(enc) && (
        <EncounterOverlay
          key={enc}
          enc={supportedEncounter(encounterFor(enc)!,progress.state)}
          onCancel={()=>{setEnc(null);fableLive.island='';setWater(null);setWaterResult(null);}}
          title={sea.fragments.find((f) => f.id === enc)?.title ?? ''}
          reduceMotion={reduceMotion}
          onDone={(o, summary) => finishEncounter(enc, o, summary)}
          onPhase={phaseHandler(encounterFor(enc)!.game)}
          waterResult={waterResult}
        />
      )}

      {/* 穿门：整屏压黑一瞬，换段从这里过去 */}
      {portalCross && (
        <div className="portal-cross" aria-hidden>
          <span className="portal-cross-word">{sealedHere ? '过门' : '过门 · 这一段留白'}</span>
        </div>
      )}
      {(view === 'embark' || cine) && <div className="letterbox" aria-hidden />}
      </div>
      {pickupFlash && (
        <div className="pickup-flash" aria-live="polite">
          已收入货舱 · {pickupFlash}
        </div>
      )}
      {camBlend < 0.98 && !reduceMotion && (
        <div className="skip-hint">点击或按键跳过镜头</div>
      )}

      {view === 'embark' && (
        <div className="cine-embark">
          <div className="cine-embark-main">
            <h1 className="cine-embark-title">文明航程</h1>
            <p className="cine-embark-sub">
              四扇窗，四个时代。船停在它们中间，等你选一扇走进去。
            </p>
            {scenePick && EPOCH_INTRO[scenePick.id] && (
              <p className="cine-embark-era" key={scenePick.id}>
                <span>{EPOCH_INTRO[scenePick.id].era} · {EPOCH_INTRO[scenePick.id].title}</span>
                {EPOCH_INTRO[scenePick.id].line}
              </p>
            )}

            <div className="cine-embark-scenes">
              {scenes.map((sc) => {
                const on = scenePick?.id === sc.id && scenePick.status === sc.status;
                return (
                  <button
                    key={`${sc.id}-${sc.version}-${sc.status}`}
                    type="button"
                    className={`cine-scene${on ? ' is-on' : ''}`}
                    onClick={() => setScenePick(sc)}
                    aria-pressed={on}
                  >
                    <span className="cine-scene-name">{sceneShort(sc)}</span>
                    <span className="cine-scene-q">{sc.questions[0]}</span>
                  </button>
                );
              })}
            </div>

            <div className="cine-embark-actions">
              <SealButton label="启航" disabled={busy} hint="" onSeal={() => void createVoyage()} /><MusicControls/><button className="btn" type="button" onClick={()=>setYardOpen(true)}>船坞与换装 · 先看看外形</button>
              <button className="cine-link" type="button" onClick={() => setReduceMotion((v) => !v)}>
                {reduceMotion ? '已减少动态' : '减少动态效果'}
              </button>
            </div>
            {loadBoard().length > 0 && (
              <ol className="cine-board" aria-label="本机排行">
                <li className="cine-board-head">本机排行</li>
                {loadBoard().slice(0, 5).map((e, i) => (
                  <li key={e.at}>
                    <span className="cine-board-rank">{i + 1}</span>
                    <span className="cine-board-name">{e.name}</span>
                    <span className="cine-board-lane">{e.lane}</span>
                    <b className="cine-board-score">{e.score}</b>
                  </li>
                ))}
              </ol>
            )}
            <div className="cine-player">
              <span>船长 · {player?.name ?? '—'}</span>
              <button
                className="cine-link"
                type="button"
                onClick={() => {
                  signOut();
                  setPlayer(null);
                }}
              >
                换一位船长
              </button>
            </div>

            {bootError && <p className="cine-embark-error">后端未接通：{bootError}。先运行 scripts/dev.sh。</p>}
            {error && <p className="cine-embark-error">{error}</p>}
          </div>

          {(() => {
            // 只认最近一程没走完的：名字就是「哪一段 · 哪条线」
            const last = voyages.find((v) => v.stage !== 'reflection');
            if (!last) return null;
            const lane = (last.world as { lane?: string } | undefined)?.lane ?? 'near';
            const st = storyFor(last.scene_id, lane);
            return (
              <div className="cine-embark-continue">
                <span className="cine-prompt">上一程还没走完</span>
                <button type="button" className="cine-continue" onClick={() => void loadVoyage(last.id)}>
                  {EPOCH_INTRO[last.scene_id]?.era ?? '启航港'}
                  <span className="cine-continue-sub">{st ? `「${st.title}」· 接着走` : '接着走'}</span>
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* 出发：只剩一件事——看清这一程问的是什么，然后出海 */}
      {view === 'cockpit' && voyage && (
        <div className="cine-depart">
          <div className="cine-inner cine-depart-inner">
            <div className="cine-kicker">
              {EPOCH_INTRO[voyage.scene_id]?.era ?? '启航港'}
              <span className="cine-tag">这一程问的是</span>
            </div>
            <p className="cine-line cine-q cine-depart-q">{question || voyage.question || ''}</p>
            <p className="cine-line cine-prompt">两条航道都到同一个港，路上遇见的东西不一样</p>
            <div className="cine-costs">
              {(sea.lanes ?? []).map((lane) => {
                const on = laneId === lane.id;
                return (
                  <button
                    key={lane.id}
                    type="button"
                    className={`cine-cost${on ? ' is-on' : ''}`}
                    onClick={() => setLaneId(lane.id)}
                    aria-pressed={on}
                  >
                    <span className="cine-cost-name">
                      {lane.name}
                      {storyFor(voyage.scene_id, lane.id) && <em className="cine-cost-story"> · {storyFor(voyage.scene_id, lane.id)!.title}</em>}
                    </span>
                    <span className="cine-cost-note">{storyFor(voyage.scene_id, lane.id)?.logline ?? lane.promise}</span>
                  </button>
                );
              })}
            </div>
            <div className="cine-actions">
              <SealButton label="出海" disabled={busy} hint="" onSeal={() => void departNow()} />
              <button className="cine-link" type="button" onClick={() => setView('embark')}>换一段</button>
            </div>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}

      {view === 'route' && voyage && (
        <div className="overlay overlay-right">
          <div className="paper">
            <h2 className="display title-panel">选一条航道</h2>
            <Coach step={tip.step} title={tip.title} body={tip.body} next={tip.next} />
            <p className="muted">两条都到同一个港。路上遇见的东西不一样 —— 没走的这条，不算白走。</p>
            <div className="lanes">
              {(sea.lanes ?? []).map((lane) => {
                const on = laneId === lane.id;
                const seen = sea.fragments.filter(
                  (f) => (f.lane === lane.id || f.lane === 'both') && collectedIds.has(f.id),
                ).length;
                const total = sea.fragments.filter((f) => f.lane === lane.id || f.lane === 'both').length;
                return (
                  <button
                    key={lane.id}
                    type="button"
                    className={`lane${on ? ' is-on' : ''}`}
                    onClick={() => setLaneId(lane.id)}
                    aria-pressed={on}
                  >
                    <div className="lane-head">
                      <strong className="lane-name">{lane.name}</strong>
                      <span className="lane-count">{total} 处可看{seen ? ` · 已看 ${seen}` : ''}</span>
                    </div>
                    <p className="lane-promise">{lane.promise}</p>
                    <ol className="lane-stops">
                      {lane.waypoints.map((w) => (
                        <li key={w.label}>{w.label}</li>
                      ))}
                    </ol>
                  </button>
                );
              })}
            </div>
            <p className="faint">航道画在水面上：亮的那条是你选的，暗的那条还在，只是不去了。</p>
            <Ledgers connected={connected} usage={usage} balance={voyage.balance} inventory={voyage.inventory} capacity={voyage.capacity} materials={unusedFragments} />
            <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void launchRoute()}>
              按此航线启航
            </button>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}

      {backgroundId&&<IslandBackground id={backgroundId} onClose={()=>setBackgroundId(null)}/>}
      {view==='world'&&nearbyBackground&&ISLAND_BACKGROUNDS[nearbyBackground]&&!enc&&!crisis&&!secret&&<button className="island-background-entry" type="button" onClick={()=>{setInput({forward:0,turn:0});setBackgroundId(nearbyBackground);}}>图片背景 · {historyScene(nearbyBackground)?.who}</button>}

      {view === 'world' && nearFragment && nearFrag && !nearFragCollected && !enc && (
        <button className={`interact-prompt${nearPort ? ' interact-prompt-with-port' : ''}`} type="button" disabled={busy} onClick={() => startEncounter()}>
          <span className="interact-key">E</span>
          <span className="interact-copy">
            <strong>
              {encounterFor(nearFrag.id)
                ? `靠过去 · ${encounterFor(nearFrag.id)!.who}守着「${nearFrag.title}」`
                : `收入货舱 · ${nearFrag.title}`}
            </strong>
            <span className="faint">{nearFrag.text}</span>
          </span>
        </button>
      )}

      {view === 'world' && nearPort && (
        <button className="interact-prompt interact-prompt-port" type="button" disabled={busy} onClick={() => void dock()}>
          <span className="interact-key">F</span>
          <span className="interact-copy">
            <strong>靠岸 · {sea.ports.find((p) => p.id === nearPort)?.name}</strong>
            <span className="faint">{story?.arrival ?? '岸上有人在等你。'}</span>
          </span>
        </button>
      )}

      {/* 靠港：没有卡片。文字浮在画面上，刻度直接在画面上拨 */}
      {view === 'port' && voyage && !sealBeat && !shoreOpen && !storyPage && (
        <div className="cine-panel" aria-live="polite">
          <div className="cine-inner">
            <div className="cine-kicker">
              {portPlace?.name ?? ports[0]?.name}
              <span className="cine-tag">落印 · 把你这一程的站位盖在海图上</span>
            </div>

            {stance ? (
              <>
                <p className="cine-line cine-q">{stance.axis.question}</p>

                <div className="cine-axis">
                  {/* 端点名只在和首尾刻度不同名时才显示，否则屏幕上会出现两遍同样的字 */}
                  <span>{stance.axis.left !== stance.axis.choices[0]?.label ? stance.axis.left : ''}</span>
                  <div className="cine-stops">
                    {stance.axis.choices.map((c, i) => (
                      <button
                        key={c.label}
                        type="button"
                        className={`cine-stop${stanceIdx === i ? ' is-on' : ''}`}
                        aria-pressed={stanceIdx === i}
                        onClick={() => setStanceIdx(i)}
                      >
                        <span className="cine-dot" aria-hidden />
                        <span className="cine-stop-label">{c.label}</span>
                      </button>
                    ))}
                  </div>
                  <span>
                    {stance.axis.right !== stance.axis.choices[stance.axis.choices.length - 1]?.label
                      ? stance.axis.right
                      : ''}
                  </span>
                </div>
                {stanceIdx != null && <p className="cine-line cine-note">{stance.axis.choices[stanceIdx].note}</p>}

                <div className="cine-actions">
                  <SealButton
                    label="按住落印"
                    disabled={busy || stanceIdx == null}
                    hint="先在上面三个位置里选一个，再按住。"
                    onSeal={() => {
                      if (!voyage || stanceIdx == null) return;
                      const pick = stance.axis.choices[stanceIdx];
                      const used = records.filter((r) => r.kind === 'fragment' || r.kind === 'material');
                      void api
                        .addRecord(voyage.id, {
                          kind: 'choice',
                          text: [`站位：${pick.label}`, `轴：${stance.axis.left} ↔ ${stance.axis.right}`].join('\n'),
                          classification: 'counterfactual',
                          sources: [],
                          material_ids: used.map((r) => r.id),
                          version: 1,
                          access: 'private',
                        })
                        .then(async () => {
                          setRecords(await api.records(voyage.id));
                          // 印落下：先让这一下被看见，再把人送回海上去找门
                          setSealBeat({
                            pick: pick.label,
                            epilogue: laneSealFor(voyage?.scene_id, laneId)?.epilogue(progress.state, pick.label) ?? stance.epilogue,
                            met: metLine(statsRef.current, voyage?.scene_id ?? 'test'),
                          });
                          // 港口给这一程补一次给养、修一次船；这条航线在精神图谱上亮起；这一程的分上榜
                          if (player && story) {
                            pushBoard({ name: player.name, lane: `${sceneShortFromId(voyage?.scene_id)} · ${story.title}`, score: statsRef.current.score, combo: statsRef.current.combo, hull: statsRef.current.hull, at: Date.now() });
                          }
                          updateStats((st) => {
                            const withSupply = repairHull(addSupply(st, 15), 40);
                            return story
                              ? addPath(withSupply, { era: voyage?.scene_id ?? '', lane: laneId, word: story.spirit.word, figure: story.figure.name })
                              : withSupply;
                          });
                        })
                        .catch((e) => setError(errText(e)));
                    }}
                  />
                  <button className="cine-link" type="button" onClick={() => void goReflect()}>
                    看这一程的图
                  </button>
                </div>
              </>
            ) : (
              <p className="cine-line">这一段还没有站位刻度。</p>
            )}
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}

      {/* 航海日志：同样没有卡片。图、印、材料都浮在画面上 */}
      {view === 'reflection' && voyage && (
        <div className="cine-scroll">
          <div className="cine-inner cine-journal">
            <div className="cine-kicker">
              {voyage.title}
              <span className="cine-tag">省 · 回头看这一程</span>
            </div>

            {struck.length > 0 && (
              <div className="cine-chart">
                <div className="cine-chart-head">
                  <span className="cine-prompt">这一趟的海图</span>
                  <span className="cine-chart-count">第 {struck.length} / 4 笔</span>
                </div>
                <ChartMap struck={struck} activeEpoch={voyage.scene_id} />
                <pre className="cine-chart-text">{chartSummary(struck)}</pre>
                {struck.length < 4 && (
                  <p className="cine-chart-foot">图上还空着 {4 - struck.length} 处。没走到的地方，仍然是空白。</p>
                )}
              </div>
            )}

            {records.filter((r) => r.kind === 'choice').length > 0 && (
              <div className="cine-sealed-list">
                {records
                  .filter((r) => r.kind === 'choice')
                  .map((r) => (
                    <div key={r.id} className="cine-sealed">
                      {r.text.split('\n').map((line, i) => (
                        <div key={i} className={i === 0 ? 'cine-sealed-main' : 'cine-sealed-line'}>{line}</div>
                      ))}
                    </div>
                  ))}
              </div>
            )}

            {records.filter((r) => r.kind === 'fragment').length > 0 && (
              <details className="cine-fold">
                <summary>材料与出处 · {records.filter((r) => r.kind === 'fragment').length} 件</summary>
                {records
                  .filter((r) => r.kind === 'fragment')
                  .map((r) => (
                    <div key={r.id} className="cine-material">
                      <div className="cine-material-name">{r.text.split('\n')[0]}</div>
                      {r.sources.map((src) => (
                        <div key={src.id} className="cine-material-src">
                          {src.title} · {src.verification}
                        </div>
                      ))}
                    </div>
                  ))}
              </details>
            )}

            {struck.length >= 4 && (
              <div className="cine-end">
                <p className="cine-end-line">四笔都画完了。这张图上没有终点港。</p>
                <p className="cine-end-body">
                  农业画下第一个圈，工业把它连成线，信息在线上留下一处断点，智能把最后一颗星交给了一个不必经过人的地方。
                </p>
                <p className="cine-end-body">航程到这里结束。可这张图还在你手里 —— 下一次，你仍然可以决定从哪一笔开始改。</p>
              </div>
            )}

            <div className="cine-actions">
              {nextScene ? (
                <SealButton
                  label={`进入${sceneShort(nextScene)}`}
                  disabled={busy}
                  hint=""
                  onSeal={() => {
                    const carried = carryForward();
                    void createVoyage({ sceneId: nextScene.id, carried });
                  }}
                />
              ) : null}
              <button className="cine-link" type="button" onClick={() => setView('world')}>
                回到海上
              </button>
            </div>
          </div>
        </div>
      )}

      {comms && (
        <div className="drawer">
          <h2 className="display title-panel">通讯台</h2>
          <p className="muted">这里只查看模型是否已接入。本基础版不在网页里填密钥，避免写进浏览器。要接模型，请到 apps/api 按 .env.example 配置后重启后端。没接也能把测试航程走完。</p>
          <div className={connected ? '' : 'unconnected'}>
            {connected
              ? models.map((m) => (
                  <div key={m.id} className="mono">
                    {m.id} · {m.model} · {m.credential_source}
                  </div>
                ))
              : '模型服务尚未接入'}
          </div>
          <p className="muted">
            HMT：{health?.hmt ?? 'unknown'}。真实费用与剧情资源分账。
          </p>
          <p className="faint">在 apps/api 导出 VOYAGE_MODEL_URL / NAME / KEY 后重启后端。</p>
          <button className="btn btn-ghost" type="button" onClick={() => setComms(false)}>关闭</button>
        </div>
      )}
    </>
  );
}
