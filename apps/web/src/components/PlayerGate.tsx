import { localize } from '../i18n';
import { useState } from 'react';
import { exportCode, importCode, register, signIn, validName, validPasscode, type Player } from '../player';

/**
 * 登船：名字与口令都在本机，不上传。
 * 老船长可以贴回身份码，把名字与一路的记忆接回来。
 */
export function PlayerGate({ onDone }: { onDone: (p: Player) => void }) {
  const [mode, setMode] = useState<'new' | 'back' | 'code'>('new');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<{ player: Player; code: string } | null>(null);

  async function go() {
    setErr(null);
    const e1 = mode === 'new' ? validName(name) : null;
    const e2 = validPasscode(pass);
    if (e1 || e2) return setErr(e1 ?? e2);
    setBusy(true);
    try {
      const p =
        mode === 'new'
          ? await register(name, pass)
          : mode === 'back'
            ? await signIn(pass)
            : await importCode(code, pass);
      if (mode === 'new') setIssued({ player: p, code: exportCode(p) });
      else onDone(p);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (issued)
    return (
      <div className="gate">
        <div className="gate-plate">
          <span className="gate-kicker">{localize("船长")}</span>
          <h2 className="gate-name">{localize(issued.player.name)}</h2>
          <span className="gate-id">{localize("编号 ")}{localize(issued.player.id)}</span>
          <p className="gate-note">{localize("你走完的航线、遇见的人、留在岛上的选择，都记在这个名字下。换了设备或清了缓存，凭下面这段身份码，加上你的口令，就能接回来。")}</p>
          <code className="gate-code">{issued.code}</code>
          <div className="gate-actions">
            <button
              className="gate-btn is-primary"
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(issued.code).catch(() => {});
              }}
            >{localize("复制身份码")}</button>
            <button className="gate-btn" type="button" onClick={() => onDone(issued.player)}>{localize("启航")}</button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="gate">
      <div className="gate-plate">
        <span className="gate-kicker">{localize(mode === 'code' ? '接回身份' : mode === 'back' ? '老船长' : '登船')}</span>
        <h1 className="gate-title">{localize(mode === 'code' ? '贴回身份码' : '先留下你的名字')}</h1>
        <p className="gate-sub">
          {localize(mode === 'code'
            ? '把之前复制的身份码整段贴进来，再输一次口令。'
            : mode === 'back'
              ? '这台设备上还留着你的身份，输入口令即可。'
              : '名字会写在这一程的日志、海图和结局上。只存在本机，不上传。')}
        </p>

        {mode === 'new' && (
          <label className="gate-field">
            <span>{localize("名字")}</span>
            <input value={name} maxLength={16} placeholder={localize("比如：阿遥")} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
        )}
        {mode === 'code' && (
          <label className="gate-field">
            <span>{localize("身份码")}</span>
            <textarea value={code} rows={3} placeholder="CV1.…" onChange={(e) => setCode(e.target.value)} />
          </label>
        )}
        <label className="gate-field">
          <span>{localize("口令（4–8 位数字）")}</span>
          <input
            value={pass}
            inputMode="numeric"
            maxLength={8}
            type="password"
            placeholder="••••"
            onChange={(e) => setPass(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && void go()}
          />
        </label>

        {err && <p className="gate-err">{localize(err)}</p>}

        <div className="gate-actions">
          <button className="gate-btn is-primary" type="button" disabled={busy} onClick={() => void go()}>
            {localize(mode === 'code' ? '接回' : mode === 'back' ? '开始这一程' : '登记')}
          </button>
          <button className="gate-link" type="button" onClick={() => { setErr(null); setMode(mode === 'new' ? 'back' : 'new'); }}>
            {localize(mode === 'new' ? '我是老船长' : mode === 'back' ? '第一次来' : '返回')}
          </button>
          <button className="gate-link" type="button" onClick={() => { setErr(null); setMode(mode === 'code' ? 'new' : 'code'); }}>
            {localize(mode === 'code' ? '返回' : '用身份码接回')}
          </button>
        </div>
      </div>
    </div>
  );
}
