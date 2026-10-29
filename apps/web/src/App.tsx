import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, newRequestId } from './api/client';
import { ApiError, type Crew, type Health, type ModelInfo, type Port, type Route, type Scene, type Stage, type Task, type TaskEvent, type Trade, type Usage, type Voyage, type VoyageRecord } from './api/types';
import { Coach, Ledgers, SealButton, StageBar, Stamp, StatusBanner, contentStamp } from './components/ui';
import { VoyageCanvas, type CamMode, type ControlInput, type ShipSnapshot } from './world/VoyageCanvas';
import { WORLD } from './world/world.config';

const LAST_KEY = 'cv.lastVoyageId';
const MOTION_KEY = 'cv.reduceMotion';
const DEFAULT_HULL = 'bao-chuan-01';

function worldState(
  voyage: Voyage,
  snap: ShipSnapshot | null,
  portId: string,
): Record<string, unknown> {
  return {
    hull_id: typeof voyage.world.hull_id === 'string' ? voyage.world.hull_id : DEFAULT_HULL,
    port_id: portId,
    ship: snap ? { x: snap.x, z: snap.z, yaw: snap.yaw } : voyage.world.ship ?? WORLD.spawn,
  };
}

const ROUTES: Route[] = [
  {
    id: 'simple',
    steps: ['查阅已有材料', '靠港观察测试标记', '记录发现'],
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
  hasVoyages: boolean;
  unusedFragments: number;
  crewReplies: number;
};

function guide(view: View, ctx: GuideCtx) {
  if (view === 'embark') {
    return {
      step: '第 1 步 · 启航港',
      title: '先选海域，再开一条航程',
      body: ctx.connected
        ? '右边先点一个场景。测试海域用来练手；A/B/C 仍是 AI 推荐，组员还没确认。起个名字，开一条航程。船员席已接入，进驾驶舱可以真的问话。'
        : '右边先点一个场景。测试海域用来练手；A/B/C 仍是 AI 推荐，组员还没确认。起个名字，开一条航程。模型没接也能走完，船员不会假装回话。',
      next: ctx.hasVoyages ? '点「新航程」，或点右边一张旧航程卡片' : '先起个名字，开一条。',
    };
  }
  if (view === 'cockpit') {
    return {
      step: '第 2 步 · 驾驶舱',
      title: '灯已点亮。你想弄清什么？',
      body: '左边是船员席。中间问一件你想理解的事。右边记下问题和共同任务，分歧可以留着。没接模型时不会出现假回复。问题和一句理由都有了，按住落印。',
      next: !ctx.hasQuestion ? '先写下你想弄清的一件事。' : ctx.hasReason ? '写下理由，由你落印。' : '写下问题和一句理由，才能落印。',
    };
  }
  if (view === 'route') {
    return {
      step: '第 3 步 · 海图',
      title: '查得多一些，或先查关键处',
      body: '两条路线粗细颜色一样。步骤多不等于更对，费用高也不等于更文明。没接入计价时显示「尚未接入」。',
      next: '看清两条路线各查什么，再选。',
    };
  }
  if (view === 'world') {
    return {
      step: '第 4 步 · 海域',
      title: ctx.nearPort ? '已经靠近港口' : '朝海图上的目的港航行',
      body: ctx.nearPort
        ? '靠港后，用你带的材料做一件事。买卖不是这一步的主事。'
        : 'W 前进、S 后退、A/D 转向，或用左下摇杆。东南方体块是中性测试港。看见纸签可以靠近，收入货舱。',
      next: ctx.nearPort ? '点「靠港」' : '朝海图上的目的港航行。',
    };
  }
  if (view === 'port') {
    return {
      step: '靠港 · 测试港',
      title: '用材料做一件事',
      body: '货物带「测试」印章，数字是虚构补给。先打开材料看它从哪里来；收入货舱还不算完成。',
      next: ctx.unusedFragments > 0 ? '选一份材料，用它说明你的安排。' : '打开这份材料，先看它从哪里来。',
    };
  }
  if (view === 'collaborate') {
    return {
      step: '协作 · 解释与选择',
      title: '过程要看得见，选择由你来定',
      body: ctx.connected
        ? '船员查阅时只列出可观察事件。大副问依据，二副问谁被看见。你可以都不采纳。'
        : '模型尚未接入，不会编造船员发言。你可以自己写解释，按住落印。',
      next: ctx.crewReplies >= 2 ? '先看来源，再听他们各自的理由。' : '写下理由，由你落印。',
    };
  }
  return {
    step: '反思 · 航海日志',
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
  if (id === 'A' || id === 'B' || id === 'C') return id;
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
  const [title, setTitle] = useState('测试航程');
  const [scenePick, setScenePick] = useState<Scene | null>(null);
  const [question, setQuestion] = useState('');
  const [sharedTask, setSharedTask] = useState('');
  const [chat, setChat] = useState<{ who: 'user' | 'crew' | 'sys'; text: string; role?: string }[]>([]);
  const [draft, setDraft] = useState('');
  const [reason, setReason] = useState('');
  const [dissent, setDissent] = useState('');
  const [arrangement, setArrangement] = useState('');
  const [routeId, setRouteId] = useState('simple');
  const [nearPort, setNearPort] = useState<string | null>(null);
  const [nearFragment, setNearFragment] = useState<string | null>(null);
  const [ship, setShip] = useState<ShipSnapshot | null>(null);
  const [input, setInput] = useState<ControlInput>({ forward: 0, turn: 0 });
  const [busy, setBusy] = useState(false);
  const [camBlend, setCamBlend] = useState(1);
  const keys = useRef({ w: false, a: false, s: false, d: false });
  const shipRef = useRef<ShipSnapshot | null>(null);
  const poll = useRef<number | null>(null);

  const connected = models.length > 0;

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

  const refreshLists = useCallback(async () => {
    const [h, m, s, v] = await Promise.all([api.health(), api.models(), api.scenes(), api.listVoyages()]);
    setHealth(h);
    setModels(m);
    setScenes(s);
    setVoyages(v);
    return { h, m, s, v };
  }, []);

  const loadVoyage = useCallback(async (id: string, nextView?: View) => {
    const v = await api.getVoyage(id);
    setVoyage(v);
    setQuestion(v.question);
    setSharedTask(v.shared_task);
    const notes = notesOf(v.world);
    setReason(notes.reason);
    setDissent(notes.dissent);
    if (v.route) setRouteId(v.route.id);
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
        const { s } = await refreshLists();
        const test = s.find((x) => x.status === 'test') ?? s[0] ?? null;
        setScenePick(test);
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
      const turn = (keys.current.a ? 1 : 0) + (keys.current.d ? -1 : 0);
      setInput((prev) => (prev.forward === forward && prev.turn === turn ? prev : { forward, turn }));
    }, 50);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.clearInterval(id);
    };
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
          world: worldState(v, snap, nearPort ?? 'at-sea'),
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

  async function createVoyage() {
    setError(null);
    setBusy(true);
    try {
      const scene = scenePick ?? scenes.find((s) => s.status === 'test');
      if (!scene) throw new Error('没有可用场景');
      const created = await api.createVoyage({
        title: title.trim() || '未命名航程',
        scene_id: scene.id,
        scene_version: scene.version,
        scene_track: scene.status === 'pending' ? 'candidate' : scene.status === 'confirmed' ? 'confirmed' : 'test',
        crew: DEFAULT_CREW.map((c) => ({ ...c, model_id: models[0]?.id ?? null })),
      });
      setChat([{ who: 'sys', text: connected ? '船员席位已就绪。' : '模型服务尚未接入。船员暂时不能回复，仍可浏览海域与材料。' }]);
      await loadVoyage(created.id, 'cockpit');
      await refreshLists();
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
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
        world: worldState(voyage, snap, 'at-sea'),
      });
      setView('world');
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
        world: worldState(voyage, snap, nearPort),
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
    const frag = WORLD.fragments.find((f) => f.id === nearFragment);
    if (!frag) return;
    setBusy(true);
    setError(null);
    try {
      await api.addRecord(voyage.id, {
        kind: 'fragment',
        text: `${frag.title}\n${frag.text}`,
        classification: 'test',
        sources: frag.sources,
        material_ids: [frag.id],
        version: 1,
        access: 'private',
      });
      setRecords(await api.records(voyage.id));
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

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
    if (!voyage) return;
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setChat((c) => [...c, { who: 'user', text }]);
    if (!question) setQuestion(text);
    if (!connected) {
      setChat((c) => [...c, { who: 'sys', text: '模型服务尚未接入。到通讯台填写你自己的服务配置。不会出现假回复。' }]);
      return;
    }
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
    return WORLD.spawn;
  }, [voyage?.id]);

  const status = !voyage
    ? { kind: 'idle' as const, text: '还没有航程。和船员聊聊你想了解的文化问题。' }
    : error
      ? { kind: 'failed' as const, text: error }
      : !connected
        ? { kind: 'unconnected' as const, text: '模型服务尚未接入。船员暂时不能回复，仍可浏览海域与材料。' }
        : busy
          ? { kind: 'running' as const, text: '正在执行…' }
          : view === 'world' && nearPort
            ? { kind: 'waiting' as const, text: `接近 ${WORLD.ports.find((p) => p.id === nearPort)?.name ?? nearPort}。点「靠港」。` }
            : { kind: 'idle' as const, text: voyage.question || '航程进行中' };

  const unusedFragments = records.filter((r) => r.kind === 'fragment' || r.kind === 'material').length;
  const crewReplies = chat.filter((m) => m.who === 'crew').length;
  const tip = guide(view, {
    connected,
    hasQuestion: Boolean(question.trim()),
    hasReason: Boolean(reason.trim()),
    nearPort: Boolean(nearPort),
    hasVoyages: voyages.length > 0,
    unusedFragments,
    crewReplies,
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
          <div className="hud hud-tl scrim">
            <div className="label">{voyage?.title ?? '文明航程'}</div>
            <div>{voyage?.question || '未形成文化问题'}</div>
            <StageBar stage={voyage?.stage ?? 'cockpit'} />
            <StatusBanner kind={status.kind} text={status.text} />
          </div>
          <div className="hud hud-tr scrim">
            <Ledgers
              connected={connected}
              usage={usage}
              balance={voyage?.balance ?? null}
              inventory={voyage?.inventory ?? null}
              capacity={voyage?.capacity ?? null}
            />
          </div>
          <div className="hud hud-tc">
            <Stamp kind={voyage?.scene_track === 'candidate' || scenePick?.status === 'pending' ? 'pending' : voyage?.scene_track === 'test' || scenePick?.status === 'test' ? 'test' : 'confirmed'}>
              {voyage?.scene_snapshot && typeof voyage.scene_snapshot.label === 'string'
                ? voyage.scene_snapshot.label
                : scenePick?.label ?? '测试海域'}
            </Stamp>
          </div>
          <div className="hud hud-bl">
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
                  <div
                    className="compass-port"
                    style={{
                      transform: `rotate(${(() => {
                        if (!ship) return 0;
                        const p = WORLD.ports[0];
                        const bearing = (Math.atan2(p.x - ship.x, -(p.z - ship.z)) * 180) / Math.PI;
                        return bearing - ship.headingDeg;
                      })()}deg)`,
                    }}
                  />
                  <div className="compass-needle" />
                </div>
                <div className="faint">
                  {nearPort
                    ? '已进入港口范围'
                    : ship
                      ? `测试港 ${Math.hypot(WORLD.ports[0].x - ship.x, WORLD.ports[0].z - ship.z).toFixed(0)} 丈 · 铜针指向港口`
                      : '驶向中性测试港（东南方灯杆）'}
                </div>
                <div className="joystick" ref={joystick} aria-label="航行摇杆">
                  <div
                    className="joystick-knob"
                    style={{
                      transform: `translate(calc(-50% + ${-input.turn * 36}px), calc(-50% + ${-input.forward * 36}px))`,
                    }}
                  />
                </div>
                <div className="faint">WASD / 方向键 / 摇杆</div>
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

      {view !== 'embark' && (
        <div className={`coach-bar ${view === 'world' ? 'coach-bar-top' : ''}`}>
          <div className="scrim">
            <div className="label">{tip.step}</div>
            <div>{tip.next}</div>
          </div>
        </div>
      )}

      {view === 'embark' && <div className="letterbox" aria-hidden />}
      {camBlend < 0.98 && !reduceMotion && (
        <div className="skip-hint">点击或按键跳过镜头</div>
      )}

      {view === 'embark' && (
        <>
          <div className="overlay overlay-left">
            <h1 className="display title-hero">文明航程</h1>
            <p className="muted">带一个问题出海。船员查证，你定航向。</p>
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
              <p className="muted">先点选一个，再点左边「新航程」。选中的卡片会作为这次出海的海域。</p>
              <div className="list">
                {scenes.map((s) => (
                  <button
                    key={`${s.id}-${s.version}-${s.status}`}
                    className={`card ${s.status === 'test' ? 'card-test' : ''} ${scenePick?.id === s.id && scenePick.status === s.status ? 'card-on' : ''}`}
                    type="button"
                    onClick={() => setScenePick(s)}
                  >
                    <div className="row">
                      {s.status === 'pending' && <Stamp kind="pending">AI 推荐，待组员确认</Stamp>}
                      {s.status === 'test' && <Stamp kind="test">测试</Stamp>}
                      {s.status === 'confirmed' && <Stamp kind="confirmed">已确认</Stamp>}
                    </div>
                    <strong>{s.label}</strong>
                    <div className="muted">{s.background}</div>
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
                      <div className="muted">{v.stage} · {String(v.scene_snapshot.label ?? v.scene_id)}</div>
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
          <div className="panel stack">
            {voyage.crew.map((c) => (
              <div key={c.id} className={`seat ${connected ? '' : 'seat-off'}`}>
                {c.role}
                <span className="faint">{c.role === '二副' ? '问谁被看见' : '问有没有依据'}</span>
                <span className="faint">{connected ? (c.model_id || models[0]?.id) : '尚未接入'}</span>
              </div>
            ))}
          </div>
          <div className="cockpit-window">
            <div className="chat">
              {chat.length === 0 && (
                <div className="bubble bubble-sys">灯已点亮。你想弄清什么？</div>
              )}
              {chat.map((m, i) => (
                <div key={i} className={`bubble bubble-${m.who === 'user' ? 'user' : m.who === 'crew' ? 'crew' : 'sys'}`}>
                  {m.role && <div className="label">{m.role}</div>}
                  {m.text}
                </div>
              ))}
              {events.map((e) => (
                <div key={e.seq} className="bubble bubble-sys faint">
                  事件 {e.kind}
                  {typeof e.data.input === 'string' ? ` · 输入已记录` : ''}
                  {typeof e.data.output === 'string' ? ` · 产出已记录` : ''}
                  {typeof e.data.message === 'string' ? ` · ${e.data.message}` : ''}
                </div>
              ))}
            </div>
            <div className="row">
              <input style={{ flex: 1 }} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="写一件你想理解的事" />
              <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void askCrew()}>
                发送
              </button>
            </div>
          </div>
          <div className="paper">
            <h2 className="display title-panel">航程任务</h2>
            <p className="muted">问题是这次要弄清的事；分歧留在下面，不必先吵出结果。</p>
            <div className="field">
              <span className="label">文化问题</span>
              <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} />
            </div>
            <div className="field">
              <span className="label">共同任务</span>
              <textarea value={sharedTask} onChange={(e) => setSharedTask(e.target.value)} rows={3} />
            </div>
            <div className="field">
              <span className="label">保留的分歧</span>
              <textarea value={dissent} onChange={(e) => setDissent(e.target.value)} rows={2} placeholder="可以先不统一。写下一处还没谈拢的地方。" />
            </div>
            <div className="field">
              <span className="label">落印理由</span>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="你为什么确认这个问题值得出海。" />
            </div>
            <Stamp kind="pending">草稿</Stamp>
            {dissent.trim() ? <Stamp kind="dissent">分歧</Stamp> : null}
            <div style={{ marginTop: 16 }}>
              <SealButton
                label="确认此行的问题"
                disabled={busy || !question.trim() || !reason.trim()}
                hint="写下问题和一句理由，才能落印。"
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
            <h2 className="display title-panel">航线与资源</h2>
            <Coach step={tip.step} title={tip.title} body={tip.body} next={tip.next} />
            <p className="muted">查得多一些，或先查关键处。</p>
            <div className="list">
              {ROUTES.map((r) => (
                <button key={r.id} className="card" type="button" onClick={() => setRouteId(r.id)} style={{ boxShadow: routeId === r.id ? 'var(--cv-shadow-lamp)' : undefined }}>
                  <strong>{r.id === 'simple' ? '较简单航线' : '步骤较多航线'}</strong>
                  <div>{r.steps.join(' → ')}</div>
                  <div className="muted">{r.rationale}</div>
                  <div className="unconnected">预计真实用量：—（尚未接入计价）</div>
                </button>
              ))}
            </div>
            <p className="faint">路线不同，留下的问题也不同。查得多，不等于更对。没走的这条，也记在海图上。</p>
            <Ledgers connected={connected} usage={usage} balance={voyage.balance} inventory={voyage.inventory} capacity={voyage.capacity} />
            <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void launchRoute()}>
              按此航线启航
            </button>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}

      {view === 'world' && nearPort && (
        <div className="prompt-center scrim">
          <div>
            接近 {WORLD.ports.find((p) => p.id === nearPort)?.name}
            <Stamp kind="test">测试</Stamp>
          </div>
          <p className="muted">接近 {WORLD.ports.find((p) => p.id === nearPort)?.name}。靠港后，用你带的材料做一件事。不点可以继续开。</p>
          <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void dock()}>
            靠港
          </button>
        </div>
      )}

      {view === 'world' && nearFragment && (
        <div className="prompt-center scrim" style={{ bottom: '28%' }}>
          <div>{WORLD.fragments.find((f) => f.id === nearFragment)?.title}</div>
          <p className="muted">打开这份材料，先看它从哪里来。收入货舱以后还没用上。</p>
          <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void collectFragment()}>
            收入货舱
          </button>
        </div>
      )}

      {view === 'port' && voyage && (
        <div className="overlay overlay-right">
          <div className="paper">
            <h2 className="display title-panel">测试港</h2>
            <Coach step={tip.step} title={tip.title} body={tip.body} next={tip.next} />
            <Stamp kind="test">测试数据 · 素材待补</Stamp>
            <p>{ports[0]?.name ?? '中性测试港'}。体块与剪影，不代表真实港口。</p>
            {records.filter((r) => r.kind === 'fragment' || r.kind === 'material').length > 0 && (
              <p className="muted">已收入货舱，还没用上。货物到了，理解也到了吗？</p>
            )}
            {ports[0] &&
              Object.entries(ports[0].goods).map(([id, g]) => (
                <div key={id} className="card card-test">
                  <div className="mono">{id} 买 {g.buy} / 卖 {g.sell} · 市场库存 {g.stock}</div>
                  <div className="row">
                    <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void doTrade('buy')}>买入 1</button>
                    <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void doTrade('sell')}>卖出 1</button>
                  </div>
                </div>
              ))}
            {nearFragment && (
              <button className="btn btn-secondary" type="button" onClick={() => void collectFragment()}>
                发现测试碎片
              </button>
            )}
            <div className="field" style={{ marginTop: 16 }}>
              <span className="label">港口安排（推演）</span>
              <textarea
                value={arrangement}
                onChange={(e) => setArrangement(e.target.value)}
                rows={3}
                placeholder="选一份材料，用它说明你的安排。这是推演，不是史实。"
              />
              <SealButton
                label="用材料说明安排"
                disabled={busy || !arrangement.trim()}
                hint="选一份材料，用它说明你的安排。"
                onSeal={() => {
                  if (!voyage || !arrangement.trim()) return;
                  void api.addRecord(voyage.id, {
                    kind: 'choice',
                    text: arrangement.trim(),
                    classification: 'counterfactual',
                    sources: [],
                    material_ids: records.filter((r) => r.kind === 'fragment' || r.kind === 'material').map((r) => r.id),
                    version: 1,
                    access: 'private',
                  }).then(async () => {
                    setArrangement('');
                    setRecords(await api.records(voyage.id));
                  }).catch((e) => setError(errText(e)));
                }}
              />
            </div>
            <div className="row" style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" type="button" onClick={() => setView('collaborate')}>请船员解释</button>
              <button className="btn btn-ghost" type="button" onClick={() => setView('world')}>回到海域</button>
              <button className="btn btn-primary" type="button" onClick={() => void goReflect()}>打开航海日志</button>
            </div>
            {error && <p className="error">{error}</p>}
            {trades.length > 0 && (
              <div className="muted">
                最近交易 Δ补给 {trades.at(-1)?.delta_balance} · 现有 {voyage.balance}
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'collaborate' && voyage && (
        <div className="overlay overlay-right">
          <div className="paper">
            <h2 className="display title-panel">与 Agents 协作</h2>
            <Coach step={tip.step} title={tip.title} body={tip.body} next={tip.next} />
            <StatusBanner
              kind={connected ? (busy ? 'running' : 'waiting') : 'unconnected'}
              text={connected ? '可观察事件见下方。选择或补充解释。' : '模型服务尚未接入，不能生成假解释。'}
            />
            <div className="stack">
              {tasks.map((t) => (
                <div key={t.id} className="muted">任务 {t.status}{t.cancel_requested ? ' · 已请求停止' : ''}</div>
              ))}
              {events.map((e) => (
                <div key={e.seq} className="card">
                  <span className="label">{e.kind}</span>
                  <div>{typeof e.data.output === 'string' ? e.data.output : JSON.stringify(e.data)}</div>
                </div>
              ))}
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
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} placeholder="你的解释和理由" />
            <div className="row">
              <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void askCrew()}>请船员解释</button>
              <SealButton
                label="采纳"
                disabled={busy || !draft.trim()}
                hint="写下理由，由你落印。"
                onSeal={() => {
                  void api.addRecord(voyage.id, {
                    kind: 'choice',
                    text: draft.trim(),
                    classification: 'counterfactual',
                    sources: [],
                    material_ids: [],
                    version: 1,
                    access: 'private',
                  }).then(async () => {
                    setDraft('');
                    setRecords(await api.records(voyage.id));
                  }).catch((e) => setError(errText(e)));
                }}
              />
            </div>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}

      {view === 'reflection' && voyage && (
        <div className="overlay" style={{ inset: 0, display: 'grid', placeItems: 'center', padding: 24 }}>
          <div className="paper" style={{ maxWidth: '68ch', width: 'min(720px, 100%)', maxHeight: '90vh', overflow: 'auto' }}>
            <h2 className="display title-page">{voyage.title}</h2>
            <Coach step={tip.step} title={tip.title} body={tip.body} next={tip.next} />
            <Stamp kind="creative">概念创作</Stamp>
            <p>{voyage.shared_task || '尚未形成共同任务。'}</p>
            <h3 className="display title-panel">材料与出处</h3>
            {records.length === 0 && <p className="muted">还没有记录。</p>}
            {records.map((r) => (
              <div key={r.id} className="card" style={{ marginBottom: 8 }}>
                <span className="label">{r.kind}</span>
                <div>{r.text}</div>
                {r.sources.map((s) => (
                  <div key={s.id} className="muted">{s.title} · {s.license} · {s.verification}</div>
                ))}
              </div>
            ))}
            <h3 className="display title-panel">两本账结算</h3>
            <Ledgers connected={connected} usage={usage} balance={voyage.balance} inventory={voyage.inventory} capacity={voyage.capacity} />
            <h3 className="display title-panel">反思</h3>
            <p className="muted">你相信了什么？又凭什么相信？</p>
            <p className="muted">这次求快时，有没有漏查什么？</p>
            <p className="muted">后来的人，还能改这份安排吗？</p>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} placeholder="回看来源，修订解释" />
            <div className="row">
              <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void saveReflection()}>写入日志</button>
              <button className="btn btn-primary" type="button" onClick={() => { setView('cockpit'); void persist({ stage: 'cockpit' }); }}>
                带上没解决的问题，再走一程
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
