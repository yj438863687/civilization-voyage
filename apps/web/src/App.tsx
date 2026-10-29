import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, newRequestId } from './api/client';
import { ApiError, type Crew, type Health, type ModelInfo, type Port, type Route, type Scene, type Stage, type Task, type TaskEvent, type Trade, type Usage, type Voyage, type VoyageRecord } from './api/types';
import { Ledgers, StageBar, Stamp, StatusBanner } from './components/ui';
import { VoyageCanvas, type CamMode, type ControlInput, type ShipSnapshot } from './world/VoyageCanvas';
import { WORLD } from './world/world.config';

const LAST_KEY = 'cv.lastVoyageId';
const MOTION_KEY = 'cv.reduceMotion';

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
  const [routeId, setRouteId] = useState('simple');
  const [nearPort, setNearPort] = useState<string | null>(null);
  const [nearFragment, setNearFragment] = useState<string | null>(null);
  const [ship, setShip] = useState<ShipSnapshot | null>(null);
  const [input, setInput] = useState<ControlInput>({ forward: 0, turn: 0 });
  const [busy, setBusy] = useState(false);
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
        const { s, v } = await refreshLists();
        const test = s.find((x) => x.status === 'test') ?? s[0] ?? null;
        setScenePick(test);
        const last = localStorage.getItem(LAST_KEY);
        if (last && v.some((x) => x.id === last)) await loadVoyage(last);
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
        world: patch.world ?? voyage.world,
      };
      const next = await api.putVoyage(voyage.id, body);
      setVoyage(next);
      return next;
    },
    [voyage, question, sharedTask],
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
    if (!voyage || !question.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await persist({ stage: 'route', question, shared_task: sharedTask || `围绕「${question}」完成一次探索。` });
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
        world: { port_id: 'at-sea', ship: snap ? { x: snap.x, z: snap.z, yaw: snap.yaw } : WORLD.spawn },
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
        world: { port_id: nearPort, ship: snap ? { x: snap.x, z: snap.z, yaw: snap.yaw } : voyage.world.ship },
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
        prompt: `文化问题：${question || text}\n船员职务：大副\n用户说：${text}\n请给出简短建议，并保留不确定处。`,
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
            setChat((c) => [...c, { who: 'crew', role: '大副', text: typeof out === 'string' ? out : '已完成，见事件记录。' }]);
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
            ? { kind: 'waiting' as const, text: `接近 ${WORLD.ports.find((p) => p.id === nearPort)?.name ?? nearPort}` }
            : { kind: 'idle' as const, text: voyage.question || '航程进行中' };

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
              connected={usage.length > 0}
              usage={usage}
              balance={voyage?.balance ?? null}
              inventory={voyage?.inventory ?? null}
              capacity={voyage?.capacity ?? null}
            />
          </div>
          <div className="hud hud-tc">
            <Stamp kind={voyage?.scene_track === 'candidate' || scenePick?.status === 'pending' ? 'pending' : voyage?.scene_track === 'test' ? 'test' : 'fact'}>
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
                <div className="joystick" ref={joystick} aria-label="航行摇杆" />
                <div className="faint">WASD / 方向键 / 摇杆</div>
              </div>
            )}
          </div>
          <div className="hud hud-br">
            <button className="btn btn-icon" type="button" onClick={() => setView('cockpit')} title="驾驶舱">舱</button>
            <button className="btn btn-icon" type="button" onClick={() => setView('route')} title="海图">图</button>
            <button className="btn btn-icon" type="button" onClick={() => setView('world')} title="海域">航</button>
            <button className="btn btn-icon" type="button" onClick={() => void goReflect()} title="日志">志</button>
            <button className="btn btn-icon" type="button" onClick={() => setComms(true)} title="通讯台">讯</button>
            <button className="btn btn-icon" type="button" onClick={() => setReduceMotion((v) => !v)} title="减少动态">
              {reduceMotion ? '静' : '动'}
            </button>
          </div>
        </>
      )}

      {view === 'embark' && (
        <>
          <div className="overlay overlay-left">
            <h1 className="display title-hero">文明航程</h1>
            <p className="muted">一艘可以穿行不同文明时空的船。先形成问题，再出海。</p>
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
            {bootError && <p className="error">后端未接通：{bootError}。先在 apps/api 启动 Uvicorn :8000。</p>}
            {error && <p className="error">{error}</p>}
          </div>
          <div className="overlay overlay-right">
            <div className="paper">
              <h2 className="display title-panel">继续航程</h2>
              {voyages.length === 0 ? (
                <StatusBanner kind="idle" text="还没有航程。" />
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
              <h3 className="display title-panel" style={{ marginTop: 24 }}>场景入口</h3>
              <div className="list">
                {scenes.map((s) => (
                  <button
                    key={`${s.id}-${s.version}-${s.status}`}
                    className={`card ${s.status === 'test' ? 'card-test' : ''}`}
                    type="button"
                    onClick={() => setScenePick(s)}
                  >
                    <div className="row">
                      {s.status === 'pending' && <Stamp kind="pending">AI 推荐，待组员确认</Stamp>}
                      {s.status === 'test' && <Stamp kind="test">测试</Stamp>}
                      {s.status === 'confirmed' && <Stamp kind="fact">已确认</Stamp>}
                    </div>
                    <strong>{s.label}</strong>
                    <div className="muted">{s.background}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {view === 'cockpit' && voyage && (
        <div className="cockpit">
          <div className="panel stack">
            {voyage.crew.map((c) => (
              <div key={c.id} className={`seat ${c.model_id && connected ? '' : 'seat-off'}`}>
                {c.role}
                <span className="faint">{c.model_id && connected ? c.model_id : '尚未接入'}</span>
              </div>
            ))}
          </div>
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="chat">
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
              <input style={{ flex: 1 }} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="向船员提出文化问题" />
              <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void askCrew()}>
                发送
              </button>
            </div>
          </div>
          <div className="paper">
            <h2 className="display title-panel">航程任务</h2>
            <div className="field">
              <span className="label">文化问题</span>
              <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} />
            </div>
            <div className="field">
              <span className="label">共同任务</span>
              <textarea value={sharedTask} onChange={(e) => setSharedTask(e.target.value)} rows={3} />
            </div>
            <Stamp kind="pending">草稿</Stamp>
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary" type="button" disabled={busy || !question.trim()} onClick={() => void confirmCockpit()}>
                确认航程
              </button>
              {!question.trim() && <p className="faint">未形成文化问题时不能落印。</p>}
            </div>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}

      {view === 'route' && voyage && (
        <div className="overlay overlay-right">
          <div className="paper">
            <h2 className="display title-panel">航线与资源</h2>
            <p className="muted">步骤多、成本高不代表结论更正确。</p>
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
            <Ledgers connected={usage.length > 0} usage={usage} balance={voyage.balance} inventory={voyage.inventory} capacity={voyage.capacity} />
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
          <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void dock()}>
            靠港
          </button>
        </div>
      )}

      {view === 'world' && nearFragment && (
        <div className="prompt-center scrim" style={{ bottom: '28%' }}>
          <div>{WORLD.fragments.find((f) => f.id === nearFragment)?.title}</div>
          <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void collectFragment()}>
            收入货舱
          </button>
        </div>
      )}

      {view === 'port' && voyage && (
        <div className="overlay overlay-right">
          <div className="paper">
            <h2 className="display title-panel">测试港</h2>
            <Stamp kind="test">测试数据 · 素材待补</Stamp>
            <p>{ports[0]?.name ?? '中性测试港'}。体块与剪影，不代表真实港口。</p>
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
              {records.filter((r) => r.kind === 'fragment' || r.kind === 'artifact').map((r) => (
                <div key={r.id} className="card">
                  <Stamp kind={r.classification === 'test' ? 'test' : r.classification === 'creative' ? 'creative' : 'fact'}>
                    {r.classification}
                  </Stamp>
                  <div>{r.text}</div>
                  {r.sources.map((s) => (
                    <div key={s.id} className="muted">
                      出处 {s.title} · {s.license}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} placeholder="补充你的解释" />
            <div className="row">
              <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void askCrew()}>请船员解释</button>
              <button
                className="btn btn-primary"
                type="button"
                disabled={busy || !draft.trim()}
                onClick={() => {
                  void api.addRecord(voyage.id, {
                    kind: 'choice',
                    text: draft.trim(),
                    classification: 'creative',
                    sources: [],
                    material_ids: [],
                    version: 1,
                    access: 'private',
                  }).then(async () => {
                    setDraft('');
                    setRecords(await api.records(voyage.id));
                  }).catch((e) => setError(errText(e)));
                }}
              >
                采纳此解释
              </button>
            </div>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}

      {view === 'reflection' && voyage && (
        <div className="overlay" style={{ inset: 0, display: 'grid', placeItems: 'center', padding: 24 }}>
          <div className="paper" style={{ maxWidth: '68ch', width: 'min(720px, 100%)', maxHeight: '90vh', overflow: 'auto' }}>
            <h2 className="display title-page">{voyage.title}</h2>
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
            <Ledgers connected={usage.length > 0} usage={usage} balance={voyage.balance} inventory={voyage.inventory} capacity={voyage.capacity} />
            <h3 className="display title-panel">反思</h3>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} placeholder="这次选择改变了什么？" />
            <div className="row">
              <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void saveReflection()}>写入日志</button>
              <button className="btn btn-primary" type="button" onClick={() => { setView('cockpit'); void persist({ stage: 'cockpit' }); }}>
                带着这次航程再次出发
              </button>
            </div>
          </div>
        </div>
      )}

      {comms && (
        <div className="drawer">
          <h2 className="display title-panel">通讯台</h2>
          <p className="muted">凭据只通过服务端环境变量提供，前端不收集密钥。</p>
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
