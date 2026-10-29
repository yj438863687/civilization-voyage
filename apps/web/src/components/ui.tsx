import type { ReactNode } from 'react';
import type { Usage } from '../api/types';

export function Stamp({
  kind,
  children,
}: {
  kind: 'test' | 'pending' | 'fact' | 'counter' | 'creative' | 'dissent';
  children: ReactNode;
}) {
  return <span className={`stamp stamp-${kind}`}>{children}</span>;
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
        {connected && usage.length ? (
          <div className="mono ledger-real">
            已用 token {tokens || '—'} · 金额未知 · {usage[0]?.settlement === 'not_connected' ? 'HMT 尚未接入' : ''}
          </div>
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
