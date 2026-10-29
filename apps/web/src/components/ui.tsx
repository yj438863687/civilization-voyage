import { useRef, useState, type ReactNode } from 'react';
import type { Classification, Source, Usage } from '../api/types';

export type StampKind =
  | 'test'
  | 'pending'
  | 'fact'
  | 'counter'
  | 'creative'
  | 'dissent'
  | 'unverified'
  | 'adopt'
  | 'confirmed';

const STAMP_TITLE: Record<StampKind, string> = {
  test: '测试数据，不代表任何文明或真实费用。',
  pending: 'AI 的建议，组员还没确认。',
  fact: '有可核对的材料，请连同出处读。',
  counter: '依据材料推想，结果取决于条件。',
  creative: '为这段体验创作，不作历史依据。',
  dissent: '船员意见不同，各自理由都在。',
  unverified: '这条说法还在核对，先别当定论。',
  adopt: '你采纳了这个解释，疑点仍留着。',
  confirmed: '组员已确认此候选。这是审议状态，不是史实。',
};

export function Stamp({
  kind,
  children,
  title,
}: {
  kind: StampKind;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span className={`stamp stamp-${kind}`} title={title ?? STAMP_TITLE[kind]}>
      {children}
    </span>
  );
}

/** Never default unknown or unsourced claims to 史实. */
export function contentStamp(classification: Classification | string, sources: Source[] = []) {
  if (classification === 'test') return { kind: 'test' as const, label: '测试' };
  if (classification === 'creative') return { kind: 'creative' as const, label: '创作' };
  if (classification === 'counterfactual') return { kind: 'counter' as const, label: '推演' };
  if (classification === 'historical_claim') {
    const hasSource = sources.some((s) => s.title || s.url);
    if (!hasSource) return { kind: 'unverified' as const, label: '出处待补' };
    return { kind: 'fact' as const, label: '史实' };
  }
  return { kind: 'unverified' as const, label: String(classification || '性质待补') };
}

export function SealButton({
  label,
  disabled,
  hint,
  onSeal,
}: {
  label: string;
  disabled?: boolean;
  hint?: string;
  onSeal: () => void;
}) {
  const [held, setHeld] = useState(0);
  const frame = useRef(0);
  const stop = () => {
    cancelAnimationFrame(frame.current);
    setHeld(0);
  };
  const start = () => {
    if (disabled) return;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 600);
      setHeld(p);
      if (p >= 1) {
        setHeld(0);
        onSeal();
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };
  return (
    <div>
      <button
        className={`btn btn-primary seal-btn${disabled ? ' seal-empty' : ''}`}
        type="button"
        disabled={disabled}
        aria-disabled={disabled}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerCancel={stop}
        onPointerLeave={stop}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            start();
          }
        }}
        onKeyUp={stop}
        onBlur={stop}
      >
        <span className="seal-fill" style={{ transform: `scaleX(${held})` }} aria-hidden />
        {label}
      </button>
      {disabled && hint ? <p className="faint">{hint}</p> : null}
    </div>
  );
}

export function Ledgers({
  connected,
  usage,
  balance,
  inventory,
  capacity,
}: {
  connected: boolean;
  usage: Usage[];
  balance: number | null;
  inventory: Record<string, number> | null;
  capacity: number | null;
}) {
  const tokens = usage.reduce((n, u) => {
    const raw = u.usage;
    const add = Number(raw.total_tokens ?? raw.total ?? 0);
    return n + (Number.isFinite(add) ? add : 0);
  }, 0);
  const held = inventory ? Object.values(inventory).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="ledger">
      <div className="ledger-block">
        <div className="label ledger-real">真实用量</div>
        {connected ? (
          usage.length ? (
            <div className="mono ledger-real">
              已用 token {tokens || '—'} · 金额未知 · {usage[0]?.settlement === 'not_connected' ? 'HMT 尚未接入' : ''}
            </div>
          ) : (
            <div className="mono ledger-real">已接入 · 本航程尚未产生用量</div>
          )
        ) : (
          <div className="unconnected">尚未接入</div>
        )}
      </div>
      <div className="ledger-block">
        <div className="label ledger-story">剧情资源</div>
        {balance == null ? (
          <div className="muted">无航程</div>
        ) : (
          <div className="card-test" style={{ padding: 8, borderRadius: 2 }}>
            <Stamp kind="test">测试</Stamp>
            <div className="mono ledger-story">
              补给 {balance} · 货舱 {held}/{capacity}
            </div>
            {inventory &&
              Object.entries(inventory).map(([k, v]) => (
                <div key={k} className="mono faint">
                  {k} × {v}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function StatusBanner({
  kind,
  text,
  action,
}: {
  kind: 'idle' | 'running' | 'waiting' | 'unconnected' | 'failed' | 'insufficient' | 'done';
  text: string;
  action?: ReactNode;
}) {
  const color: Record<typeof kind, string> = {
    idle: 'var(--cv-state-idle)',
    running: 'var(--cv-state-running)',
    waiting: 'var(--cv-state-waiting)',
    unconnected: 'var(--cv-state-unconnected)',
    failed: 'var(--cv-state-failed)',
    insufficient: 'var(--cv-state-insufficient)',
    done: 'var(--cv-state-done)',
  };
  return (
    <div className="status">
      <span className="status-dot" style={{ background: color[kind] }} />
      <div>
        <div>{text}</div>
        {action}
      </div>
    </div>
  );
}

export function Coach({
  step,
  title,
  body,
  next,
}: {
  step: string;
  title: string;
  body: string;
  next: string;
}) {
  return (
    <div className="coach">
      <div className="label">{step}</div>
      <div className="coach-title">{title}</div>
      <p className="coach-body">{body}</p>
      <p className="coach-next">下一步：{next}</p>
    </div>
  );
}

export function StageBar({ stage }: { stage: string }) {
  const items = [
    ['cockpit', '驾驶舱'],
    ['route', '航线'],
    ['world', '世界'],
    ['reflection', '反思'],
  ];
  const order = items.map((i) => i[0]);
  const idx = order.indexOf(stage);
  return (
    <div className="stage-bar">
      {items.map(([id, label], i) => (
        <span key={id} data-on={String(i <= idx || stage === id)}>
          {label}
          {i < items.length - 1 ? ' →' : ''}
        </span>
      ))}
    </div>
  );
}
