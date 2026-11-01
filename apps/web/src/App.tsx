import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api/client';
import { ApiError, type Crew, type Health, type ModelInfo, type Port, type Route, type Scene, type Stage, type Usage, type Voyage, type VoyageRecord } from './api/types';
import { Coach, Ledgers, SealButton, StageBar, Stamp, StatusBanner, contentStamp } from './components/ui';
import { kernelBeat } from './crew';
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
        ? '按 E 拾取。'
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
  /** 代价落在谁身上。必须点名，不让写「社会」 */
  const [costIdx, setCostIdx] = useState<number | null>(null);
  const [routeId, setRouteId] = useState('simple');
  /** 实际走的航道。和 routeId 是一回事，但 world 里按 near/far 存，方便渲染。 */
  const [laneId, setLaneId] = useState<string>('near');
  const [nearPort, setNearPort] = useState<string | null>(null);
  const [nearFragment, setNearFragment] = useState<string | null>(null);
  /** 已经开进传送门：值是下一段的场景 id */
  const [nearPortal, setNearPortal] = useState<string | null>(null);
  const [ship, setShip] = useState<ShipSnapshot | null>(null);
  const [input, setInput] = useState<ControlInput>({ forward: 0, turn: 0 });
  const [busy, setBusy] = useState(false);
  const [camBlend, setCamBlend] = useState(1);
  const [cine, setCine] = useState(false);
  /** 靠港戏：0..1 的时间轴，和镜头对齐；面板要等它走到 1 才出现 */
  const [landing, setLanding] = useState(0);
  const [pickupFlash, setPickupFlash] = useState<string | null>(null);
  const keys = useRef({ w: false, a: false, s: false, d: false });
  const shipRef = useRef<ShipSnapshot | null>(null);

  const connected = models.length > 0;
  const sea = useMemo(
    () => worldFor(voyage?.scene_id ?? scenePick?.id),
    [voyage?.scene_id, scenePick?.id],
  );
  const portPlace = sea.ports[0];
  const stance = useMemo(() => stanceFor(voyage?.scene_id ?? scenePick?.id), [voyage?.scene_id, scenePick?.id]);
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
      landing > 0 && landing < 1 ? 'landing' : view === 'port' ? 'port' : view === 'reflection' ? 'reflection' : '';
  }, [landing, view]);

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
  const onShip = useCallback(
    (s: ShipSnapshot, port: string | null, frag: string | null, portal: string | null) => {
      shipRef.current = s;
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
    // 靠港戏占住镜头：船还在海域，但镜头已经推上去看东西了
    if (landing > 0 && landing < 1) return 'landing';
    if (view === 'embark') return 'embark';
    if (view === 'cockpit') return 'cockpit';
    if (view === 'route') return 'route';
    if (view === 'port' || view === 'collaborate') return 'port';
    if (view === 'reflection') return 'reflection';
    return 'follow';
  }, [view, landing]);

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

  /** 开进传送门：先把画面压黑，再换到下一段。 */
  const [portalCross, setPortalCross] = useState(false);
  useEffect(() => {
    if (!nearPortal || portalCross) return;
    setPortalCross(true);
    const t = window.setTimeout(() => {
      const carried = carryForward();
      void createVoyage({ sceneId: nearPortal, carried }).finally(() => setPortalCross(false));
    }, 1100);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearPortal]);

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
    if (!voyage || !nearPort || landing > 0) return;
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
      // 先把这一程的实物看完，再让人做选择
      setLanding(0.0001);
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
  const guideTarget = useMemo(() => {
    const p = portPlace;
    if (!p) return null;
    const portal = sea.portal;
    if (!portal || !ship) return p;
    const dPort = Math.hypot(p.x - ship.x, p.z - ship.z);
    const dPortal = Math.hypot(portal.x - ship.x, portal.z - ship.z);
    return dPortal < dPort ? { x: portal.x, z: portal.z } : p;
  }, [portPlace, sea.portal, ship]);

  const relNow = ship && guideTarget ? portRelDeg(ship, guideTarget) : null;
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
          landingT={landing > 0 && landing < 1 ? landing : 0}
          landingRelic={landingRelicId}
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
              <div className={`landing-body${stage3 ? ' is-in' : ''}`}>
                {stage3 && frag ? frag.text : ''}
              </div>
              <div className={`landing-stamp${stage3 ? ' is-in' : ''}`}>
                {stage3 && frag ? contentStamp(frag.classification, frag.sources).label : ''}
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

      {/* 靠近传送门：门后是哪一段，字从画面里浮出来 */}
      {view === 'world' && sea.portal && ship && !portalCross &&
        Math.hypot(sea.portal.x - ship.x, sea.portal.z - ship.z) < 24 && (
          <div className="portal-hint" aria-live="polite">
            <span className="portal-hint-kicker">门后</span>
            <span className="portal-hint-name">{sea.portal.label}</span>
            <span className="portal-hint-sub">驶入门内，这一段就结束</span>
          </div>
        )}

      {/* 穿门：整屏压黑一瞬，换段从这里过去 */}
      {portalCross && (
        <div className="portal-cross" aria-hidden>
          <span className="portal-cross-word">过门</span>
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
        <div className="cine-embark">
          <div className="cine-embark-main">
            <h1 className="cine-embark-title">文明航程</h1>
            <p className="cine-embark-sub">
              问一件事，对照两种看法，由你落印，再靠港去做。航向由你决定。
            </p>

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
              <SealButton label="启航" disabled={busy} hint="" onSeal={() => void createVoyage()} />
              <button className="cine-link" type="button" onClick={() => setReduceMotion((v) => !v)}>
                {reduceMotion ? '已减少动态' : '减少动态效果'}
              </button>
            </div>

            {!connected && (
              <p className="cine-embark-note">
                模型服务尚未接入。船员不会假装回话，整程仍可走完。
                <button className="cine-link" type="button" onClick={() => setComms(true)}>通讯台</button>
              </p>
            )}
            {bootError && <p className="cine-embark-error">后端未接通：{bootError}。先运行 scripts/dev.sh。</p>}
            {error && <p className="cine-embark-error">{error}</p>}
            <p className="cine-embark-foot" title="概念设计，不是考古复原，不冒充任何一艘历史上的具体船只。">
              概念宝船，非考古复原。
            </p>
          </div>

          {voyages.length > 0 && (
            <div className="cine-embark-continue">
              <span className="cine-prompt">继续航程</span>
              {voyages.slice(0, 4).map((v) => (
                <button key={v.id} type="button" className="cine-continue" onClick={() => void loadVoyage(v.id)}>
                  {v.title}
                  <span className="cine-continue-sub">{voyageSceneLabel(v)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 出发：只剩一件事——看清这一程问的是什么，然后出海 */}
      {view === 'cockpit' && voyage && (
        <div className="depart">
          <div className="paper depart-card">
            <span className="label">这一程问的是</span>
            <h2 className="depart-q">{question || '未形成文化问题'}</h2>
            <p className="depart-hint">
              {sea.lanes?.length ? '两条航道都到同一个港。路上遇见的东西不一样。' : ''}
            </p>
            <div className="lanes depart-lanes">
              {(sea.lanes ?? []).map((lane) => {
                const on = laneId === lane.id;
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
                    </div>
                    <p className="lane-promise">{lane.promise}</p>
                  </button>
                );
              })}
            </div>
            <div className="seal-dock">
              <SealButton
                label="出海"
                disabled={busy}
                hint=""
                onSeal={() => void departNow()}
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

      {/* 靠港：没有卡片。文字浮在画面上，刻度直接在画面上拨 */}
      {view === 'port' && voyage && (
        <div className="cine-panel" aria-live="polite">
          <div className="cine-inner">
            <div className="cine-kicker">
              {portPlace?.name ?? ports[0]?.name}
              <span className="cine-tag">
                {portPlace?.mark === 'creative' ? '创作' : portPlace?.mark === 'test' ? '测试数据' : 'AI 推荐，待组员确认'}
              </span>
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

                <p className="cine-line cine-prompt">这一步的代价落在谁身上</p>
                <div className="cine-costs">
                  {stance.costs.map((c, i) => (
                    <button
                      key={c.label}
                      type="button"
                      className={`cine-cost${costIdx === i ? ' is-on' : ''}`}
                      aria-pressed={costIdx === i}
                      onClick={() => setCostIdx(i)}
                    >
                      <span className="cine-cost-name">{c.label}</span>
                      <span className="cine-cost-note">{c.note}</span>
                    </button>
                  ))}
                </div>

                <div className="cine-actions">
                  <SealButton
                    label="按住落印"
                    disabled={busy || stanceIdx == null || costIdx == null}
                    hint="在刻度上选一个位置，再点名谁承担。"
                    onSeal={() => {
                      if (!voyage || stanceIdx == null || costIdx == null) return;
                      const pick = stance.axis.choices[stanceIdx];
                      const own = stance.costs[costIdx];
                      const used = records.filter((r) => r.kind === 'fragment' || r.kind === 'material');
                      void api
                        .addRecord(voyage.id, {
                          kind: 'choice',
                          text: [`站位：${pick.label}`, `轴：${stance.axis.left} ↔ ${stance.axis.right}`, `代价落在：${own.label}`].join('\n'),
                          classification: 'counterfactual',
                          sources: [],
                          material_ids: used.map((r) => r.id),
                          version: 1,
                          access: 'private',
                        })
                        .then(async () => {
                          setRecords(await api.records(voyage.id));
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
              <span className="cine-tag">第 5 拍 · 省</span>
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
