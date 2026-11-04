import { useEffect, useSyncExternalStore } from 'react';
import { MUSIC_SCORES, VoyageMusic, type MusicEra } from '../world/voyageMusic';
import './voyage-music.css';

function preferences() { try { return JSON.parse(localStorage.getItem('cv.music.v1') ?? '{}'); } catch { return {}; } }
const saved = preferences();
let snapshot = { enabled: saved.enabled !== false, volume: typeof saved.volume === 'number' ? Math.min(1, Math.max(0, saved.volume)) : .34, era: 'A' as MusicEra, playing: false, unlocked: false, error: '' };
const subscribers = new Set<() => void>();
const music = new VoyageMusic();
let storyMode = false;
const publish = (patch: Partial<typeof snapshot>) => { snapshot = { ...snapshot, ...patch }; subscribers.forEach(fn => fn()); };
const subscribe = (fn: () => void) => { subscribers.add(fn); return () => { subscribers.delete(fn); }; };
music.onState = playing => publish({ playing });
function save() { try { localStorage.setItem('cv.music.v1', JSON.stringify({ enabled: snapshot.enabled, volume: snapshot.volume })); } catch { /* Browser storage boundary. */ } }
async function play() {
  if (!snapshot.enabled || !snapshot.unlocked || document.hidden) return;
  music.setVolume(snapshot.volume, storyMode);
  try { await music.start(snapshot.era); publish({ error: '' }); } catch { publish({ playing: false, error: '配乐暂未播放，点开启重试' }); }
}

export function MusicDirector({ era, story }: { era: string; story: boolean }) {
  useEffect(() => {
    const activate = () => { if (!snapshot.unlocked) { publish({ unlocked: true }); void play(); } };
    const visibility = () => { if (document.hidden) music.stop(); else void play(); };
    const duck = (event: Event) => music.duck((event as CustomEvent<number>).detail);
    window.addEventListener('pointerdown', activate, true); window.addEventListener('keydown', activate, true);
    document.addEventListener('visibilitychange', visibility); window.addEventListener('cv-story-sound', duck);
    return () => { window.removeEventListener('pointerdown', activate, true); window.removeEventListener('keydown', activate, true); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('cv-story-sound', duck); music.stop(); };
  }, []);
  useEffect(() => {
    const next = era in MUSIC_SCORES ? era as MusicEra : 'A';
    if (snapshot.era !== next) { publish({ era: next }); if (snapshot.enabled && snapshot.unlocked) void play(); }
  }, [era]);
  useEffect(() => { storyMode = story; music.setVolume(snapshot.volume, story); }, [story]);
  return null;
}

export function MusicControls({ below = false }: { below?: boolean }) {
  const state = useSyncExternalStore(subscribe, () => snapshot);
  return <details className="voyage-music" data-placement={below ? 'below' : 'above'} data-playing={state.playing} data-era={state.era}>
    <summary><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 14V4l9-2v10M7 6l9-2"/><ellipse cx="4.5" cy="15" rx="2.5" ry="2"/><ellipse cx="13.5" cy="13" rx="2.5" ry="2"/></svg>配乐{state.enabled ? '开' : '关'}</summary>
    <div className="music-panel"><strong>{MUSIC_SCORES[state.era].title}</strong><p>{state.error || (state.playing ? '正在播放 · 游戏原创配乐' : state.enabled ? '开始操作后起奏' : '已暂停配乐')}</p>
      <button type="button" className="btn" onClick={() => { if (state.error) { publish({ enabled: true, unlocked: true }); void play(); } else { const enabled = !snapshot.enabled; publish({ enabled }); save(); if (enabled) void play(); else music.stop(); } }}>{state.enabled && !state.error ? '关闭背景音乐' : '开启背景音乐'}</button>
      <label>配乐音量<input type="range" aria-label="配乐音量" min="0" max="100" value={Math.round(state.volume * 100)} onChange={event => { publish({ volume: Number(event.target.value) / 100 }); save(); music.setVolume(snapshot.volume, storyMode); }}/></label><p>操作音效另设开关；切到后台自动暂停。</p>
    </div>
  </details>;
}
