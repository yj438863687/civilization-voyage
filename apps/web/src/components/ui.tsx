import { localize } from '../i18n';
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
    <span className={`stamp stamp-${kind}`} title={localize(title ?? STAMP_TITLE[kind])}>
      {localize(children)}
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
    const verified = sources.some((s) => s.verification === 'verified');
    if (!verified) return { kind: 'unverified' as const, label: '史实候选·待核实' };
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
        {localize(label)}
      </button>
      {disabled && hint ? <p className="faint">{localize(hint)}</p> : null}
    </div>
  );
}

/** 两本账：真实用量与剧情资源物理分开，未接入就写未接入。 */
export function Ledgers({
  connected,
  usage,
  balance,
  inventory,
  capacity,
  materials = 0,
  compact = false,
}: {
  connected: boolean;
  usage: Usage[];
  balance: number | null;
  inventory: Record<string, number> | null;
  capacity: number | null;
  materials?: number;
  compact?: boolean;
}) {
  const tokens = usage.reduce((n, u) => {
    const raw = u.usage;
    const add = Number(raw.total_tokens ?? raw.total ?? 0);
    return n + (Number.isFinite(add) ? add : 0);
  }, 0);
  const held = inventory ? Object.values(inventory).reduce((a, b) => a + b, 0) : 0;

  if (compact) {
    return (
      <div className="ledger-compact">
        <span className={connected ? 'ledger-real' : 'unconnected-inline'}>
          {localize(connected ? `真实 ${tokens ? `${tokens} tok` : '0'}` : '真实 未接入')}
        </span>
        <span className="ledger-sep" aria-hidden />
        <span className="ledger-story">{localize("材料 ")}{localize(materials)}</span>
        <span className="ledger-test">
          <Stamp kind="test">{localize("测试")}</Stamp>{localize("补给 ")}{localize(balance ?? '—')}
        </span>
      </div>
    );
  }

  return (
    <div className="ledger">
      <div className="ledger-block">
        <div className="label ledger-real">{localize("真实用量")}</div>
        {connected ? (
          usage.length ? (
            <div className="mono ledger-real">
              {localize(tokens || '—')}{localize(" tokens · 金额未知 · ")}{localize(usage[0]?.settlement === 'not_connected' ? 'HMT 尚未接入' : '')}
            </div>
          ) : (
            <div className="mono ledger-real">{localize("本航程尚无用量")}</div>
          )
        ) : (
          <div className="unconnected">{localize("尚未接入")}</div>
        )}
      </div>
      <div className="ledger-block">
        <div className="label ledger-story">{localize("剧情资源")}</div>
        <div className="mono ledger-story">{localize("材料 ")}{localize(materials)}</div>
        {balance == null ? (
          <div className="muted">{localize("无航程")}</div>
        ) : (
          <div className="card-test" style={{ padding: 8, borderRadius: 2 }}>
            <Stamp kind="test">{localize("测试")}</Stamp>
            <div className="mono ledger-story">{localize("补给")}{localize(balance)}{localize(" · 测试货舱 ")}{localize(held)}/{localize(capacity)}
            </div>
            {inventory &&
              Object.entries(inventory).map(([k, v]) => (
                <div key={k} className="mono faint">
                  {localize(k)} × {localize(v)}
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
  compact = false,
}: {
  kind: 'idle' | 'running' | 'waiting' | 'unconnected' | 'failed' | 'insufficient' | 'done';
  text: string;
  action?: ReactNode;
  compact?: boolean;
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
    <div className={`status${compact ? ' status-compact' : ''}`}>
      <span className="status-dot" style={{ background: color[kind] }} />
      <div>
        <div>{localize(text)}</div>
        {localize(action)}
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
      <div className="label">{localize(step)}</div>
      <div className="coach-title">{localize(title)}</div>
      <p className="coach-body">{localize(body)}</p>
      <p className="coach-next">{localize("下一步：")}{localize(next)}</p>
    </div>
  );
}

export function StageBar({
  current,
  reached,
  compact = false,
}: {
  current: string;
  reached: string[];
  compact?: boolean;
}) {
  const items = [
    ['ask', '问'],
    ['seek', '查'],
    ['seal', '印'],
    ['act', '行'],
    ['reflect', '省'],
  ] as const;
  const caption: Record<string, string> = {
    ask: '提出一件要弄清的事',
    seek: '对照依据与谁被看见',
    seal: '由你落印，船员不代判',
    act: '拾取、靠港、做一件安排',
    reflect: '回看你信了什么',
  };
  return (
    <div className={`stage-bar-wrap${compact ? ' stage-compact' : ''}`}>
      <div className="stage-bar">
        {items.map(([id, label], i) => (
          <span key={id} data-on={String(reached.includes(id))} data-now={String(current === id)}>
            {localize(label)}
            {localize(i < items.length - 1 ? ' ·' : '')}
          </span>
        ))}
      </div>
      <div className="stage-caption">{localize(caption[current])}</div>
    </div>
  );
}
