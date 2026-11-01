import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, newRequestId } from './api/client';
import { ApiError, type Crew, type Health, type ModelInfo, type Port, type Route, type Scene, type Stage, type Task, type TaskEvent, type Trade, type Usage, type Voyage, type VoyageRecord } from './api/types';
import { Coach, Ledgers, SealButton, StageBar, Stamp, StatusBanner, contentStamp } from './components/ui';
import { crewArt, kernelBeat } from './crew';
import { VoyageCanvas, type CamMode, type ControlInput, type ShipSnapshot } from './world/VoyageCanvas';
import { worldFor, type WorldConfig } from './world/world.config';
import { stanceFor } from './world/stances';
import { chartSummary } from './world/chart';

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
  A: '靠岸一问',
  B: '逆风一问',
  C: '断线一问',
  D: '目的地一问',
  'neutral-test': '玄览一问',
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

function voyageSceneLabel(v: Voyage) {
  const raw = String(v.scene_snapshot.label ?? v.scene_id);
  if (raw.includes('中性测试') || raw.includes('测试海域')) return '启航港 · 玄览内海（创作）';
  return raw.replace(/^AI 推荐，待组员确认：/, '');
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

/** 当前场景给出的问题（可能不止一条）。没有就从 snapshot 里取。 */
function sceneQuestions(v: Voyage): string[] {
  const fromSnapshot = (v.scene_snapshot as { questions?: unknown })?.questions;
  if (Array.isArray(fromSnapshot)) {
    return fromSnapshot.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  }
  return v.question ? [v.question] : [];
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
    steps: ['带着已有材料出海', '靠港对照纸签', '记下发现'],
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
      step: '第 1 拍 · 问',
      title: '先选海域，再开一条航程',
      body: ctx.connected
        ? '右边每张卡片只问一件事。启航港是练习的第一程；泉州、集装箱、漂浮港仍待组员确认。起个名字，开一条。大副和二副已在席。'
        : '右边每张卡片只问一件事。启航港是练习的第一程。模型没接也能走完，船员不会假装回话。',
      next: ctx.hasVoyages ? '点「新航程」，或点右边一张旧航程卡片' : '先起个名字，开一条。',
    };
  }
  if (view === 'cockpit') {
    return {
      step: ctx.crewReplies > 0 ? '第 2 拍 · 查' : '第 1 拍 · 问',
      title: '你想弄清什么？',
      body: '左边是大副与二副。中间问一件你想理解的事。大副查依据，二副问谁还没开口。他们只对照，不替你下结论。问题和一句理由齐了，按住落印。',
      next: !ctx.hasQuestion ? '先写下你想弄清的一件事。' : !ctx.hasReason ? '写下问题和一句理由，才能落印。' : '按住落印，确认此行的问题。',
    };
  }
  if (view === 'route') {
    return {
      step: '第 4 拍 · 行',
      title: '选一条路，去港口做事',
      body: '问题已经落下。两条路线粗细颜色一样。步骤多不等于更对，费用高也不等于更文明。没接入计价时显示「尚未接入」。',
      next: '选一条，按「按此航线启航」。出海后按 E 拾取、F 靠港。',
    };
  }
  if (view === 'world') {
    const misaligned = ctx.relDeg != null && Math.abs(ctx.relDeg) > 32;
    const approaching = ctx.portDist != null && ctx.portDist < ctx.portRadius * 2.4;
    const next = ctx.nearPort
      ? '按 F 靠港'
      : ctx.nearFragment
        ? '按 E 拾取纸签。'
        : misaligned
          ? `转动船头，让铜针对准船头（偏 ${Math.round(Math.abs(ctx.relDeg ?? 0))}°）。`
          : approaching
            ? `铜针已对准 ${ctx.portName}。再靠近一些，压进港区就会提示靠港。`
            : '铜针对准目的港，按 W 前进。';
    return {
      step: '第 4 拍 · 行',
      title: ctx.nearPort ? '已经靠近港口' : '朝海图上的目的港航行',
      body: ctx.nearPort ? ctx.nearHint : ctx.seaHint,
      next,
    };
  }
  if (view === 'port') {
    return {
      step: `第 4 拍 · 行 · ${ctx.portTitle}`,
      title: '用材料做一件事',
      body: ctx.portBody,
      next: ctx.unusedFragments > 0 ? '选一份材料，用它说明你的安排。' : '打开一份材料，先看它从哪里来。',
    };
  }
  if (view === 'collaborate') {
    return {
      step: '第 2 拍 · 查',
      title: '过程要看得见，选择由你来定',
      body: ctx.connected
        ? '船员查阅时只列出可观察事件。大副问依据，二副问谁被看见。你可以都不采纳。'
        : '模型尚未接入，不会编造船员发言。你可以自己写解释，按住落印。',
      next: ctx.crewReplies >= 2 ? '先看来源，再听他们各自的理由。' : '写下理由，由你落印。',
    };
  }
  return {
    step: '第 5 拍 · 省',
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

function parseCrewVoices(out: string): { role: string; text: string }[] {
  const first = out.match(/【大副】([\s\S]*?)(?=【二副】|$)/);
  const second = out.match(/【二副】([\s\S]*?)$/);
  if (first || second) {
    return [
      first ? { role: '大副', text: first[1].trim() } : null,
      second ? { role: '二副', text: second[1].trim() } : null,
    ].filter((x): x is { role: string; text: string } => !!x && !!x.text);
  }
  return [{ role: '大副', text: out.trim() }];
}

const CREW_PROMPT = `请用两段、各自不超过三句回答，不要合并成一段。不要写「知行合一」「和而不同」「仁义」这些词。
【大副】关注依据：这句话有没有出处，能证明到哪一步。不要替玩家下结论。缺出处就明说先保留。
【二副】关注义利：这件事落在谁身上，谁还没开口。用问句，不训斥，不自称更有良心。
未查清就写还没查清。`;

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
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [view, setView] = useState<View>('embark');
  const [error, setError] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem(MOTION_KEY) === '1' || window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [comms, setComms] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [title, setTitle] = useState('玄览一问');
  const [scenePick, setScenePick] = useState<Scene | null>(null);
  const [question, setQuestion] = useState('');
  const [sharedTask, setSharedTask] = useState('');
  const [chat, setChat] = useState<{ who: 'user' | 'crew' | 'sys'; text: string; role?: string }[]>([]);
  const [draft, setDraft] = useState('');
  const [reason, setReason] = useState('');
  const [dissent, setDissent] = useState('');
  const [arrangement, setArrangement] = useState('');
  /** 站位：这一程真正要拨的那根刻度。null = 还没表态 */
  const [stanceIdx, setStanceIdx] = useState<number | null>(null);
  /** 代价落在谁身上。必须点名，不让写「社会」 */
  const [costIdx, setCostIdx] = useState<number | null>(null);
  const [routeId, setRouteId] = useState('simple');
  /** 实际走的航道。和 routeId 是一回事，但 world 里按 near/far 存，方便渲染。 */
  const [laneId, setLaneId] = useState<string>('near');
  const [nearPort, setNearPort] = useState<string | null>(null);
  const [nearFragment, setNearFragment] = useState<string | null>(null);
  const [ship, setShip] = useState<ShipSnapshot | null>(null);
  const [input, setInput] = useState<ControlInput>({ forward: 0, turn: 0 });
  const [busy, setBusy] = useState(false);
  const [camBlend, setCamBlend] = useState(1);
  const [cine, setCine] = useState(false);
  const [pickupFlash, setPickupFlash] = useState<string | null>(null);
  const keys = useRef({ w: false, a: false, s: false, d: false });
  const shipRef = useRef<ShipSnapshot | null>(null);
  const poll = useRef<number | null>(null);

  const connected = models.length > 0;
  const sea = useMemo(
    () => worldFor(voyage?.scene_id ?? scenePick?.id),
    [voyage?.scene_id, scenePick?.id],
  );
  const portPlace = sea.ports[0];
  const stance = useMemo(() => stanceFor(voyage?.scene_id ?? scenePick?.id), [voyage?.scene_id, scenePick?.id]);
  /** 第 1 拍可以选的问法：场景自带的那一句 + 这一段的几种问法，去重。 */
  const askChoices = useMemo(() => {
    const base = voyage ? sceneQuestions(voyage) : [];
    const extra = stance?.altQ ?? [];
    return [...new Set([...base, ...extra].map((q) => q.trim()).filter(Boolean))];
  }, [voyage, stance]);

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
    const [rec, p, t, tk, u] = await Promise.all([
      api.records(id),
      api.ports(id),
      api.trades(id),
      api.tasks(id),
      api.usage(id),
    ]);
    setRecords(rec);
    setPorts(p);
    setTrades(t);
    setTasks(tk);
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

  const nearRef = useRef({ t: 0, port: '', frag: '' });
  const onShip = useCallback((s: ShipSnapshot, port: string | null, frag: string | null) => {
    shipRef.current = s;
    const now = performance.now();
    const portKey = port ?? '';
    const fragKey = frag ?? '';
    if (portKey !== nearRef.current.port || fragKey !== nearRef.current.frag || now - nearRef.current.t > 120) {
      nearRef.current = { t: now, port: portKey, frag: fragKey };
      setShip(s);
      setNearPort(port);
      setNearFragment(frag);
    }
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') keys.current.w = true;
      if (k === 's' || k === 'arrowdown') keys.current.s = true;
      if (k === 'a' || k === 'arrowleft') keys.current.a = true;
      if (k === 'd' || k === 'arrowright') keys.current.d = true;
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') keys.current.w = false;
      if (k === 's' || k === 'arrowdown') keys.current.s = false;
      if (k === 'a' || k === 'arrowleft') keys.current.a = false;
      if (k === 'd' || k === 'arrowright') keys.current.d = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    const id = window.setInterval(() => {
      const forward = (keys.current.w ? 1 : 0) + (keys.current.s ? -1 : 0);
      // Three.js +yaw turns bow west; A (port) is +yaw, D (starboard) is −yaw.
      const turn = (keys.current.a ? 1 : 0) + (keys.current.d ? -1 : 0);
      setInput((prev) => (prev.forward === forward && prev.turn === turn ? prev : { forward, turn }));
    }, 48);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
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
      if (a.view !== 'world' || a.busy) return;
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
    if (view === 'embark') return 'embark';
    if (view === 'cockpit') return 'cockpit';
    if (view === 'route') return 'route';
    if (view === 'port' || view === 'collaborate') return 'port';
    if (view === 'reflection') return 'reflection';
    return 'follow';
  }, [view]);

  async function createVoyage(seed?: { sceneId: string; carried?: string[] }) {
    setError(null);
    setBusy(true);
    try {
      const scene = seed ? scenes.find((s) => s.id === seed.sceneId) : scenePick ?? scenes.find((s) => s.status === 'test');
      if (!scene) throw new Error('没有可用场景');
      const seedQuestion = scene.questions[0] ?? '';
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
    const costLine = last.text.split('\n').find((l) => l.startsWith('代价落在：'));
    if (!line || !costLine) return [] as string[];
    return [
      `上一程（${voyage.scene_id}）留下的：${line.replace('站位：', '站位「')}」，${costLine}`,
      `上一程的原话：${voyage.question}`,
    ];
  }

  /** 这一段的下一段是谁。neutral-test 不进主线。 */
  function nextEpochId(cur: string): string | null {
    const chain = ['A', 'B', 'C', 'D'];
    const i = chain.indexOf(cur);
    return i >= 0 && i < chain.length - 1 ? chain[i + 1] : null;
  }

  async function confirmCockpit() {
    if (!voyage || !question.trim() || !reason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await persist({
        stage: 'route',
        question,
        shared_task: sharedTask || `围绕「${question}」完成一次探索。`,
        world: { ...voyage.world, notes: { dissent, reason } },
      });
      setView('route');
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
    if (!voyage || !nearPort) return;
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
      setView('port');
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function collectFragment() {
    if (!voyage || !nearFragment) return;
    const frag = sea.fragments.find((f) => f.id === nearFragment);
    if (!frag) return;
    if (records.some((r) => r.material_ids.includes(frag.id))) return;
    setBusy(true);
    setError(null);
    try {
      await api.addRecord(voyage.id, {
        kind: 'fragment',
        text: `${frag.title}\n${frag.text}`,
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
    void collectFragment();
  };

  async function doTrade(side: 'buy' | 'sell') {
    if (!voyage) return;
    const port = ports[0];
    const goodId = port ? Object.keys(port.goods)[0] : null;
    if (!port || !goodId) return;
    setBusy(true);
    setError(null);
    try {
      await api.trade(voyage.id, {
        request_id: newRequestId('trade'),
        port_id: port.id,
        good_id: goodId,
        side,
        quantity: 1,
      });
      await loadVoyage(voyage.id, 'port');
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function askCrew() {
    if (!voyage || !question.trim()) return;
    // 没有独立的输入框了：问的就是这一程已经落下的那个问题。
    const text = question.trim();
    if (!connected) return;
    const modelId = models[0].id;
    setBusy(true);
    setError(null);
    try {
      const task = await api.createTask(voyage.id, {
        request_id: newRequestId('task'),
        prompt: `文化问题：${question || text}\n用户说：${text}\n${CREW_PROMPT}`,
        model_id: modelId,
      });
      setTasks((t) => [...t, task]);
      if (poll.current) window.clearInterval(poll.current);
      poll.current = window.setInterval(async () => {
        try {
          const latest = await api.getTask(voyage.id, task.id);
          const ev = await api.events(voyage.id, task.id, 0);
          setEvents(ev);
          if (latest.status === 'succeeded') {
            const out = ev.find((e) => e.kind === 'succeeded')?.data.output;
            const voices = parseCrewVoices(typeof out === 'string' ? out : '已完成，见事件记录。');
            setChat((c) => [...c, ...voices.map((v) => ({ who: 'crew' as const, role: v.role, text: v.text }))]);
            setUsage(await api.usage(voyage.id));
            setRecords(await api.records(voyage.id));
            if (poll.current) window.clearInterval(poll.current);
            setBusy(false);
          } else if (latest.status === 'failed' || latest.status === 'cancelled') {
            setChat((c) => [...c, { who: 'sys', text: `查阅失败：${ev.at(-1)?.data.message ?? latest.status}` }]);
            if (poll.current) window.clearInterval(poll.current);
            setBusy(false);
          }
        } catch (e) {
          setError(errText(e));
          if (poll.current) window.clearInterval(poll.current);
          setBusy(false);
        }
      }, 800);
    } catch (e) {
      if (e instanceof ApiError && e.status === 503) {
        setChat((c) => [...c, { who: 'sys', text: '模型服务尚未接入。没有调用付费接口。' }]);
      } else setError(errText(e));
      setBusy(false);
    }
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

  async function saveReflection() {
    if (!voyage || !draft.trim()) return;
    setBusy(true);
    try {
      await api.addRecord(voyage.id, {
        kind: 'reflection',
        text: draft.trim(),
        classification: 'creative',
        sources: [],
        material_ids: [],
        version: 1,
        access: 'private',
      });
      setDraft('');
      setRecords(await api.records(voyage.id));
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
  const relNow = ship && portPlace ? portRelDeg(ship, portPlace) : null;
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

  return (
    <>
      {webgl ? (
        <VoyageCanvas
          key={voyage?.id ?? 'dock'}
          mode={camMode}
          reduceMotion={reduceMotion}
          canSail={view === 'world'}
          sceneId={voyage?.scene_id ?? scenePick?.id ?? 'test'}
          world={sea}
          collectedIds={[...collectedIds]}
          nearFragmentId={nearFragment}
          laneId={laneId}
          struck={struck}
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

      {view !== 'embark' && (
        <>
          <div className={`hud hud-tl${view === 'world' ? ' hud-world' : ' scrim'}`}>
            {view === 'world' ? (
              <div className="hud-world-card">
                <div className="hud-quest">{voyage?.question || '未形成文化问题'}</div>
                {/* 靠近一件实物时，先告诉眼睛"那是什么"，文字后补 */}
                {nearFrag ? (
                  <div className="hud-relic" key={nearFrag.id}>
                    <span className="hud-relic-key">E</span>
                    <span className="hud-relic-name">{nearFrag.title}</span>
                  </div>
                ) : (
                  <StageBar current={beat.current} reached={beat.reached} compact />
                )}
                {status.kind !== 'idle' && <StatusBanner kind={status.kind} text={status.text} compact />}
              </div>
            ) : (
              <>
                <div className="label">{voyage?.title ?? '文明航程'}</div>
                <div>{voyage?.question || '未形成文化问题'}</div>
                <StageBar current={beat.current} reached={beat.reached} />
                <StatusBanner kind={status.kind} text={status.text} />
              </>
            )}
          </div>
          <div className={`hud hud-tr${view === 'world' ? ' hud-tr-world' : ' scrim'}`}>
            <Ledgers
              connected={connected}
              usage={usage}
              balance={voyage?.balance ?? null}
              inventory={voyage?.inventory ?? null}
              capacity={voyage?.capacity ?? null}
              materials={unusedFragments}
              compact={view === 'world'}
            />
          </div>
          <div className={`hud hud-tc${view === 'world' ? ' hud-tc-world' : ''}`}>
            <Stamp
              kind={
                voyage?.scene_id === 'neutral-test' || scenePick?.id === 'neutral-test'
                  ? 'creative'
                  : voyage?.scene_track === 'candidate' || scenePick?.status === 'pending'
                    ? 'pending'
                    : voyage?.scene_track === 'test' || scenePick?.status === 'test'
                      ? 'test'
                      : 'confirmed'
              }
            >
              {voyage?.scene_snapshot && typeof voyage.scene_snapshot.label === 'string'
                ? voyage.scene_snapshot.label
                : scenePick?.label ?? '启航港'}
            </Stamp>
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
                <div className="faint">WASD 航行 · E 拾取 · F 靠港</div>
              </div>
            )}
          </div>
          <div className="hud hud-br">
            <button className="btn btn-icon hud-action" type="button" onClick={() => setView('embark')}>启航</button>
            <button className="btn btn-icon hud-action" type="button" disabled={!voyage} onClick={() => setView('cockpit')}>驾驶舱</button>
            <button
              className="btn btn-icon hud-action"
              type="button"
              disabled={!voyage || (!voyage.question && voyage.stage === 'cockpit')}
              onClick={() => setView('route')}
            >
              航线
            </button>
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

      {view !== 'embark' && view !== 'reflection' && (
        <div className={`coach-bar ${view === 'world' || view === 'cockpit' ? 'coach-bar-top' : ''}`}>
          <div className="scrim">
            <div className="label">{tip.step}</div>
            <div>{tip.next}</div>
          </div>
        </div>
      )}

      {(view === 'embark' || cine) && <div className="letterbox" aria-hidden />}
      {pickupFlash && (
        <div className="pickup-flash" aria-live="polite">
          已收入货舱 · {pickupFlash}
        </div>
      )}
      {camBlend < 0.98 && !reduceMotion && (
        <div className="skip-hint">点击或按键跳过镜头</div>
      )}

      {view === 'embark' && (
        <>
          <div className="overlay overlay-left">
            <h1 className="display title-hero">文明航程</h1>
            <p className="muted">问一件事，对照两种看法，由你落印，再靠港去做。航向由你决定。</p>
            <Coach step={tip.step} title={tip.title} body={tip.body} next={tip.next} />
            <p className="faint" title="概念设计，不是考古复原，不冒充任何一艘历史上的具体船只。">
              概念宝船，非考古复原。
            </p>
            <div className="field">
              <span className="label">航程名</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="row">
              <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void createVoyage()}>
                新航程
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setReduceMotion((v) => !v)}>
                {reduceMotion ? '已减少动态' : '减少动态效果'}
              </button>
            </div>
            {!connected && (
              <div style={{ marginTop: 16 }}>
                <StatusBanner
                  kind="unconnected"
                  text="模型服务尚未接入，船员暂时不能回复，仍可浏览海域与材料。"
                  action={
                    <button className="btn btn-ghost" type="button" onClick={() => setComms(true)}>
                      打开通讯台
                    </button>
                  }
                />
              </div>
            )}
            {bootError && <p className="error">后端未接通：{bootError}。先运行仓库根目录 scripts/dev.sh。</p>}
            {error && <p className="error">{error}</p>}
          </div>
          <div className="overlay overlay-right">
            <div className="paper">
              <h2 className="display title-panel">场景入口</h2>
              <p className="muted">先点选一个，再点左边「新航程」。每张卡片只问一件事。</p>
              <div className="list">
                {scenes.map((s) => (
                  <button
                    key={`${s.id}-${s.version}-${s.status}`}
                    className={`card ${scenePick?.id === s.id && scenePick.status === s.status ? 'card-on' : ''}`}
                    type="button"
                    onClick={() => setScenePick(s)}
                  >
                    <div className="row">
                      {s.status === 'pending' && <Stamp kind="pending">AI 推荐，待组员确认</Stamp>}
                      {s.id === 'neutral-test' && <Stamp kind="creative">创作</Stamp>}
                      {s.status === 'confirmed' && <Stamp kind="confirmed">已确认</Stamp>}
                    </div>
                    <strong>{sceneShort(s)}</strong>
                    <div>{s.questions[0]}</div>
                  </button>
                ))}
              </div>
              <h3 className="display title-panel" style={{ marginTop: 24 }}>继续航程</h3>
              <p className="muted">点一张卡片会回到你上次停的地方（驾驶舱、航线、海域或日志）。</p>
              {voyages.length === 0 ? (
                <StatusBanner kind="idle" text="还没有航程。先起个名字，开一条。" />
              ) : (
                <div className="list">
                  {voyages.map((v) => (
                    <button key={v.id} className="card" type="button" onClick={() => void loadVoyage(v.id)}>
                      <strong>{v.title}</strong>
                      <div className="muted">{voyageSceneLabel(v)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {view === 'cockpit' && voyage && (
        <div className="cockpit">
          <div className="crew-rail">
            {voyage.crew.map((c) => {
              const art = crewArt(c.id);
              return (
                <div key={c.id} className={`crew-card ${connected ? '' : 'seat-off'}`}>
                  <img src={art.bust} alt="" width={140} height={140} />
                  <div className="crew-role">{c.role} · {art.voice}</div>
                  <span className="faint">{art.duty}</span>
                </div>
              );
            })}
          </div>
          <div className="cockpit-window">
            <div className="chat">
              {chat.length === 0 && (
                <div className="bubble bubble-sys">灯已点亮。右边选一个问题，就能出海。大副查依据，二副问谁被看见——两边的看法到下一拍再展开。</div>
              )}
              {chat.filter((m) => m.who !== 'crew').map((m, i) => (
                <div key={`m-${i}`} className={`bubble bubble-${m.who === 'user' ? 'user' : 'sys'}`}>
                  {m.text}
                </div>
              ))}
              {(['大副', '二副'] as const).some((role) => chat.some((m) => m.who === 'crew' && m.role === role)) && (
                <div className="voice-pair">
                  {(['大副', '二副'] as const).map((role) => {
                    const last = [...chat].reverse().find((m) => m.who === 'crew' && m.role === role);
                    if (!last) return null;
                    const art = crewArt(role);
                    return (
                      <div key={role} className="voice-card">
                        <img src={art.bust} alt="" width={56} height={56} />
                        <div>
                          <div className="label">{role} · {art.duty}</div>
                          <div>{last.text}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="paper">
            <h2 className="display title-panel">这一程要问的事</h2>
            <p className="muted">选一个问题。想改就改，改完落印出海。船员下面已经给了两种看法，不用等模型。</p>

            <div className="ask-picks">
              {askChoices.map((q) => (
                <button
                  key={q}
                  type="button"
                  className={`ask-pick${question === q ? ' is-on' : ''}`}
                  onClick={() => setQuestion(q)}
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="field">
              <span className="label">或者，用你自己的问法</span>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
                placeholder="这一程你想弄清什么？一句话就够。"
              />
            </div>

            <div className="field">
              <span className="label">为什么值得问这一句（一句话）</span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="我怀疑这件事还有另一面。"
              />
            </div>

            <div className="seal-dock">
              <SealButton
                label="按住落印出海"
                disabled={busy || !question.trim() || !reason.trim()}
                hint="选一个问题，补一句为什么，按住按钮不放，就能落印。"
                onSeal={() => void confirmCockpit()}
              />
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

      {view === 'world' && nearFragment && nearFrag && !nearFragCollected && (
        <button className={`interact-prompt${nearPort ? ' interact-prompt-with-port' : ''}`} type="button" disabled={busy} onClick={() => void collectFragment()}>
          <span className="interact-key">E</span>
          <span className="interact-copy">
            <strong>收入货舱 · {nearFrag.title}</strong>
            <Stamp kind={contentStamp(nearFrag.classification, nearFrag.sources).kind}>
              {contentStamp(nearFrag.classification, nearFrag.sources).label}
            </Stamp>
            <span className="faint">{nearFrag.text}</span>
          </span>
        </button>
      )}

      {view === 'world' && nearPort && (
        <button className="interact-prompt interact-prompt-port" type="button" disabled={busy} onClick={() => void dock()}>
          <span className="interact-key">F</span>
          <span className="interact-copy">
            <strong>靠港 · {sea.ports.find((p) => p.id === nearPort)?.name}</strong>
            <Stamp kind={portPlace?.mark === 'creative' ? 'creative' : portPlace?.mark === 'test' ? 'test' : 'pending'}>
              {portPlace?.mark === 'creative' ? '创作' : portPlace?.mark === 'test' ? '测试' : 'AI 推荐，待组员确认'}
            </Stamp>
            <span className="faint">{sea.coach.near}</span>
          </span>
        </button>
      )}

      {view === 'port' && voyage && (
        <div className="overlay overlay-right">
          <div className="paper">
            <h2 className="display title-panel">{sea.coach.portTitle}</h2>
            <Coach step={tip.step} title={tip.title} body={tip.body} next={tip.next} />
            <Stamp kind={portPlace?.mark === 'creative' ? 'creative' : portPlace?.mark === 'test' ? 'test' : 'pending'}>
              {portPlace?.mark === 'creative' ? '创作' : portPlace?.mark === 'test' ? '测试数据' : 'AI 推荐，待组员确认'}
            </Stamp>
            <p>{portPlace?.name ?? ports[0]?.name}。体块与剪影，不代表真实港口。</p>
            <p className="muted">{sea.coach.portBody}</p>
            {records.filter((r) => r.kind === 'fragment' || r.kind === 'material').length > 0 ? (
              <div className="list" style={{ marginTop: 12 }}>
                <p className="muted">已收入货舱，还没用上。货物到了，理解也到了吗？</p>
                {records.filter((r) => r.kind === 'fragment' || r.kind === 'material').map((r) => {
                  const stamp = contentStamp(r.classification, r.sources);
                  return (
                    <div key={r.id} className="card">
                      <Stamp kind={stamp.kind}>{stamp.label}</Stamp>
                      <div>{r.text}</div>
                      {r.sources.map((s) => (
                        <div key={s.id} className="muted">出处 {s.title} · {s.verification}</div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              <StatusBanner kind="idle" text="货舱还空。回到海域，靠近纸签，先看来源再收。" />
            )}
            {/* 站位：这一程真正要拨的那根刻度。不是写作文，是把手放上去。 */}
            {stance && (
              <div className="stance" aria-label={stance.axis.question}>
                <p className="stance-q">{stance.axis.question}</p>
                <div className="stance-ends">
                  <span>{stance.axis.left}</span>
                  <span>{stance.axis.right}</span>
                </div>
                <div className="stance-scale">
                  {stance.axis.choices.map((c, i) => (
                    <button
                      key={c.label}
                      type="button"
                      className={`stance-stop${stanceIdx === i ? ' is-on' : ''}`}
                      aria-pressed={stanceIdx === i}
                      onClick={() => setStanceIdx(i)}
                    >
                      <span className="stance-dot" aria-hidden />
                      <span className="stance-label">{c.label}</span>
                    </button>
                  ))}
                </div>
                {stanceIdx != null && (
                  <p className="stance-note">{stance.axis.choices[stanceIdx].note}</p>
                )}
                <div className="stance-cost-block">
                  <span className="label">这一步的代价落在谁身上</span>
                  <div className="stance-costs">
                    {stance.costs.map((c, i) => (
                      <button
                        key={c.label}
                        type="button"
                        className={`stance-cost${costIdx === i ? ' is-on' : ''}`}
                        aria-pressed={costIdx === i}
                        onClick={() => setCostIdx(i)}
                      >
                        <strong>{c.label}</strong>
                        <span className="faint">{c.note}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <span className="label">补一句你自己的话（可空）</span>
                  <textarea
                    value={arrangement}
                    onChange={(e) => setArrangement(e.target.value)}
                    rows={2}
                    placeholder={sea.arrangement.placeholder}
                  />
                </div>
              </div>
            )}
            <div className="seal-dock">
              <SealButton
                label="按住落印"
                disabled={busy || !stance || stanceIdx == null || costIdx == null}
                hint={
                  stance
                    ? '在刻度上选一个位置，再点名谁承担。两样都有了，按住按钮不放才能落印。'
                    : '这一段还没有站位刻度。'
                }
                onSeal={() => {
                  if (!voyage || !stance || stanceIdx == null || costIdx == null) return;
                  const pick = stance.axis.choices[stanceIdx];
                  const own = stance.costs[costIdx];
                  const used = records.filter((r) => r.kind === 'fragment' || r.kind === 'material');
                  const lines = [
                    `站位：${pick.label}`,
                    `轴：${stance.axis.left} ↔ ${stance.axis.right}`,
                    `代价落在：${own.label}`,
                  ];
                  if (arrangement.trim()) lines.push(`补充：${arrangement.trim()}`);
                  void api.addRecord(voyage.id, {
                    kind: 'choice',
                    text: lines.join('\n'),
                    classification: 'counterfactual',
                    sources: [],
                    material_ids: used.map((r) => r.id),
                    version: 1,
                    access: 'private',
                  }).then(async () => {
                    setArrangement('');
                    setRecords(await api.records(voyage.id));
                  }).catch((e) => setError(errText(e)));
                }}
              />
            </div>
            {ports[0] && (
              <details className="ledger-fold">
                <summary>测试补给（虚构数字，不是这一步的主事）</summary>
                {Object.entries(ports[0].goods).map(([id, g]) => (
                  <div key={id} className="card card-test">
                    <div className="mono">{id} 买 {g.buy} / 卖 {g.sell} · 市场库存 {g.stock}</div>
                    <div className="row">
                      <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void doTrade('buy')}>买入 1</button>
                      <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void doTrade('sell')}>卖出 1</button>
                    </div>
                  </div>
                ))}
                {trades.length > 0 && (
                  <div className="muted">最近交易 Δ补给 {trades.at(-1)?.delta_balance} · 现有 {voyage.balance}</div>
                )}
              </details>
            )}
            <div className="row" style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" type="button" onClick={() => setView('collaborate')}>请船员解释</button>
              <button className="btn btn-ghost" type="button" onClick={() => setView('world')}>回到海域</button>
              <button className="btn btn-primary" type="button" onClick={() => void goReflect()}>打开航海日志</button>
            </div>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}

      {view === 'collaborate' && voyage && (
        <div className="overlay overlay-right">
          <div className="paper">
            <h2 className="display title-panel">两种读法</h2>
            <p className="muted">
              两套读法各自成立，也各自有看不到的地方。模型接入后只是第三方意见，不是答案。
            </p>
            {stance ? (
              <div className="stacks-pair">
                {stance.crew.map((c) => (
                  <div key={c.who} className="stack-card">
                    <div className="stack-who">{c.who}</div>
                    <p>{c.reads}</p>
                    <p className="stack-blind">看不到：{c.blind}</p>
                    <p className="faint">依据：{c.from}</p>
                  </div>
                ))}
              </div>
            ) : (
              <StatusBanner kind="idle" text="这一段还没有写两种读法。" />
            )}

            <div className="stack" style={{ marginTop: 12 }}>
              {records.filter((r) => r.kind === 'fragment' || r.kind === 'artifact').map((r) => {
                const stamp = contentStamp(r.classification, r.sources);
                return (
                  <div key={r.id} className="card">
                    <Stamp kind={stamp.kind}>{stamp.label}</Stamp>
                    <div>{r.text}</div>
                    {r.sources.map((s) => (
                      <div key={s.id} className="muted">
                        出处 {s.title} · {s.license}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* 模型是第三只手，不是必经之路。没接入就如实说，不挡住往下走。 */}
            <details className="third-opinion">
              <summary>第三方意见（模型）· {connected ? '已接入' : '尚未接入'}</summary>
              {connected ? (
                <>
                  <div className="row">
                    <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void askCrew()}>
                      请船员解释
                    </button>
                  </div>
                  {tasks.map((t) => (
                    <div key={t.id} className="muted">任务 {t.status}{t.cancel_requested ? ' · 已请求停止' : ''}</div>
                  ))}
                  {events.map((e) => (
                    <div key={e.seq} className="card">
                      <span className="label">{e.kind}</span>
                      <div>{typeof e.data.output === 'string' ? e.data.output : JSON.stringify(e.data)}</div>
                    </div>
                  ))}
                </>
              ) : (
                <p className="muted">
                  没有接入模型，这里不会生成假解释。上面两套读法已经够你判断，往下走不需要它。
                </p>
              )}
            </details>

            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn btn-primary" type="button" onClick={() => setView(voyage.stage === 'world' || nearPort ? 'port' : 'route')}>
                回到海边
              </button>
            </div>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}

      {view === 'reflection' && voyage && (
        <div className="overlay" style={{ inset: 0, display: 'grid', placeItems: 'center', padding: 24 }}>
          <div className="paper" style={{ maxWidth: '68ch', width: 'min(720px, 100%)', maxHeight: '90vh', overflow: 'auto', paddingBottom: 120 }}>
            <h2 className="display title-page">{voyage.title}</h2>
            <Coach step={tip.step} title={tip.title} body={tip.body} next={tip.next} />
            <Stamp kind="creative">概念创作</Stamp>
            {/* 这一趟的海图：四段走完，同一张图上有四种笔迹 */}
            {struck.length > 0 && (
              <div className="chart-recap">
                <div className="chart-recap-head">
                  <span className="label">这一趟的海图</span>
                  <span className="faint">第 {struck.length} / 4 笔</span>
                </div>
                <ChartMap struck={struck} activeEpoch={voyage.scene_id} />
                <pre className="chart-recap-text">{chartSummary(struck)}</pre>
                {struck.length < 4 && (
                  <p className="muted">图上还空着 {4 - struck.length} 处。没走到的地方，仍然是空白。</p>
                )}
              </div>
            )}
            <p>{voyage.shared_task || '尚未形成共同任务。'}</p>
            {/* 这一程你站哪、代价落在谁身上：放在材料前面，是这一段的结论 */}
            {records.filter((r) => r.kind === 'choice').length > 0 && (
              <>
                <h3 className="display title-panel">你落下的印</h3>
                {records
                  .filter((r) => r.kind === 'choice')
                  .map((r) => (
                    <div key={r.id} className="card sealed" style={{ marginBottom: 8 }}>
                      {r.text.split('\n').map((line, i) => (
                        <div key={i} className={i === 0 ? '' : 'sealed-line'}>{line}</div>
                      ))}
                    </div>
                  ))}
              </>
            )}
            <h3 className="display title-panel">材料与出处</h3>
            {records.length === 0 && <p className="muted">还没有记录。</p>}
            {records.map((r) => {
              const stamp = contentStamp(r.classification, r.sources);
              return (
                <div key={r.id} className="card" style={{ marginBottom: 8 }}>
                  <span className="label">{r.kind}</span>
                  <Stamp kind={stamp.kind}>{stamp.label}</Stamp>
                  <div>{r.text}</div>
                  {r.sources.map((s) => (
                    <div key={s.id} className="muted">{s.title} · {s.license} · {s.verification}</div>
                  ))}
                </div>
              );
            })}
            <h3 className="display title-panel">两本账结算</h3>
            <Ledgers connected={connected} usage={usage} balance={voyage.balance} inventory={voyage.inventory} capacity={voyage.capacity} materials={unusedFragments} />
            <h3 className="display title-panel">反思</h3>
            <p className="muted">你相信了什么？又凭什么相信？</p>
            <p className="muted">这次求快时，有没有漏查什么？</p>
            <p className="muted">后来的人，还能改这份安排吗？</p>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} placeholder="回看来源，修订解释" />
            <div className="row">
              <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void saveReflection()}>写入日志</button>
              {nextScene ? (
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const carried = carryForward();
                    void createVoyage({ sceneId: nextScene.id, carried });
                  }}
                >
                  带着这张海图，进入「{sceneShort(nextScene)}」
                </button>
              ) : (
                <>
                  {/* 第四段走完：没有下一段，也没有终点港。这里不是"再来一次"，是收帆。 */}
                  {struck.length >= 4 && (
                    <div className="voyage-end">
                      <p className="voyage-end-line">
                        四笔都画完了。这张图上没有终点港。
                      </p>
                      <p className="voyage-end-body">
                        农业画下第一个圈，工业把它连成线，信息在线上留下一处断点，
                        智能把最后一颗星交给了一个不必经过人的地方。
                      </p>
                      <p className="voyage-end-body">
                        航程到这里结束。可这张图还在你手里 —— 下一次，你仍然可以决定
                        从哪一笔开始改。
                      </p>
                    </div>
                  )}
                  <button className="btn btn-ghost" type="button" onClick={() => { setView('cockpit'); void persist({ stage: 'cockpit' }); }}>
                    回到这一程的驾驶舱
                  </button>
                </>
              )}
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
