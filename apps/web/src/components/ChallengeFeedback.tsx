import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { ChallengeSound, CUE_DURATION, type ChallengeCue } from '../world/challengeSound';
import './challenge-feedback.css';

type Feedback = { cue: ChallengeCue; text: string; sequence: number; delay: number; audible: boolean };
const FeedbackContext = createContext({ emit: (_cue: ChallengeCue, _text: string) => {}, signalBusy: false });
export const useChallengeFeedback = () => useContext(FeedbackContext);
const storedVolume = () => { try { const value = localStorage.getItem('cvChallengeVolume'); return value === null ? .45 : Math.max(0, Math.min(1, Number(value) || 0)); } catch { return .45; } };

export function ChallengeFeedback({ children, kind }: { children: ReactNode; kind: string }) {
  const [volume, setVolume] = useState(storedVolume);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [signalBusy, setSignalBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<ChallengeSound | null>(null), sequence = useRef(0), timer = useRef<ReturnType<typeof setTimeout>>();
  const surface = useRef<HTMLDivElement>(null), active = useRef(true);
  const lastVolume = useRef(volume || .45);
  useLayoutEffect(() => {
    surface.current?.querySelector('.challenge-performance')?.getAnimations({ subtree: true }).forEach(animation => { animation.cancel(); animation.play(); });
  }, [feedback]);
  useEffect(() => {
    active.current = true;
    const sound = new ChallengeSound(); audio.current = sound;
    const hide = () => { if (document.hidden) { sound.silence(); sequence.current++; clearTimeout(timer.current); setSignalBusy(false); setFeedback(null); setPlaying(false); } };
    document.addEventListener('visibilitychange', hide);
    return () => { active.current = false; sequence.current++; clearTimeout(timer.current); sound.close(); document.removeEventListener('visibilitychange', hide); };
  }, []);
  const emit = (cue: ChallengeCue, text: string) => {
    const id = ++sequence.current;
    clearTimeout(timer.current);
    const signal = cue === 'dot' || cue === 'dash';
    setSignalBusy(signal);
    const target = surface.current?.contains(document.activeElement) ? document.activeElement as HTMLElement : null;
    const begin = ({ delay, audible }: { delay: number; audible: boolean }) => {
      if (!active.current || id !== sequence.current) return;
      setPlaying(true); setFeedback({ cue, text, sequence: id, delay, audible });
      if (target && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        target.getAnimations().forEach(animation => animation.cancel());
        target.animate(cue === 'error' ? [{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }] : [{ filter: 'brightness(1)' }, { filter: 'brightness(1.3)', offset: .2 }, { filter: 'brightness(1)' }], { duration: CUE_DURATION[cue], delay });
      }
      timer.current = setTimeout(() => { if (id === sequence.current) {setSignalBusy(false);setPlaying(false);} }, delay + CUE_DURATION[cue]);
    };
    if (volume > 0 && audio.current) void audio.current.play(cue, volume).then(begin);
    else begin({ delay: 0, audible: false });
  };
  const changeVolume = (value: number) => {
    sequence.current++; clearTimeout(timer.current); audio.current?.silence(); setSignalBusy(false); setFeedback(null); setPlaying(false);
    setVolume(value); if (value > 0) lastVolume.current = value;
    try { localStorage.setItem('cvChallengeVolume', String(value)); } catch { /* Private browsing can disallow storage. */ }
  };
  const style = feedback ? { '--cue-duration': `${CUE_DURATION[feedback.cue]}ms`, '--cue-delay': `${feedback.delay}ms` } as CSSProperties : undefined;
  return <FeedbackContext.Provider value={{ emit, signalBusy }}><div className="challenge-feedback" ref={surface} data-kind={kind} data-active={playing} data-cue={feedback?.cue} data-feedback-sequence={feedback?.sequence ?? 0} data-audio={feedback?.audible && playing ? 'playing' : volume ? 'ready' : 'muted'} style={style}>
    <div className="challenge-sound"><button type="button" aria-pressed={volume > 0} onClick={() => changeVolume(volume ? 0 : lastVolume.current)}>{volume ? '声音已开' : '声音已关'}</button><label>音量<input aria-label="小游戏音量" type="range" min="0" max="100" value={Math.round(volume * 100)} onChange={event => changeVolume(Number(event.target.value) / 100)} /></label></div>
    <div className="challenge-feedback-line" aria-live="polite"><span className="feedback-lamp" key={feedback?.sequence} aria-hidden="true" />{feedback?.text ?? '操作时，声音和画面会一起回应。'}</div>
    <div className="challenge-performance">
      {children}
    </div>
  </div></FeedbackContext.Provider>;
}

export function useTrialFocus(trial: unknown): RefObject<HTMLDivElement> {
  const result = useRef<HTMLDivElement>(null);
  useEffect(() => { if (trial) { result.current?.focus({ preventScroll: true }); result.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' }); } }, [trial]);
  return result;
}

export function EngineMachine({ pressure, work }: { pressure: number; work: number }) {
  return <svg className="engine-machine" viewBox="0 0 360 150" role="img" aria-label={`蒸汽机，压力${pressure}，完成${work}份功`}>
    <path className="machine-pipe" d="M100 60V25H260V78" /><path className="steam-plume" d="M162 25q-18-22 0-24m14 24q18-22 0-24m14 24q-18-22 0-24" />
    <rect className="boiler-body" x="30" y="50" width="138" height="76" rx="22" />
    <rect className="fire-box" x="70" y="94" width="54" height="32" rx="3" /><path className="machine-flame" opacity={pressure > 0 ? 1 : .2} d="M84 121q-9-14 4-22l4 10 8-17 6 15 7-5q6 13-5 19Z" />
    <circle className="gauge-face" cx="103" cy="71" r="21" /><path d="M87 71a16 16 0 0 1 32 0" fill="none" stroke="#ab9a78" strokeWidth="4" /><path d="M93 57A17 17 0 0 1 108 55" fill="none" stroke="#527868" strokeWidth="4" />
    <path className="pressure-needle" d="M103 71V56" style={{ transform: `rotate(${-90 + Math.min(10, pressure) * 18}deg)`, transformOrigin: '103px 71px' }} /><circle cx="103" cy="71" r="3" fill="#9e3a26" />
    <rect className="piston-body" x="226" y="67" width="57" height="28" rx="4" /><path className="piston-arm" d="M260 81h55v29" />
    <g className="flywheel" style={{ transformOrigin: '292px 112px' }}><circle cx="292" cy="112" r="27" /><path d="M265 112h54m-27-27v54m-19-46 38 38m-38 0 38-38" /></g>
    <path className="machine-floor" d="M18 141H340M50 126v15m96-15v15m108-9v9" />
  </svg>;
}

export function Telegraph() {
  return <div className="telegraph-instrument" aria-hidden="true"><svg viewBox="0 0 280 85"><path className="telegraph-wire" d="M10 50h62m125 0h73" /><rect x="65" y="65" width="140" height="12" rx="4" /><path d="M92 65V46h14v19m64 0V46h14v19" /><path className="telegraph-key" d="M80 39l112-8" /><circle cx="191" cy="30" r="11" /><circle className="telegraph-light" cx="38" cy="50" r="13" /><path className="telegraph-pulse" d="M5 50h15l5-12 8 24 9-24 7 12h22" /></svg><span>拍发器 · 短点与长划按亮灯时长发声</span></div>;
}
