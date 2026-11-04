// Original four-part score, composed here as notes rather than downloaded audio.
// Each phrase has melody, changing harmony, bass and a restrained rhythmic voice.
export const MUSIC_SCORES = {
  A: { title: '水岸初晴', tempo: 72, root: 60, melody: [0,2,4,7,9,7,4,2,0,4,7,12,9,7,4,-1,2,4,7,9,12,9,7,4,2,0,2,4,7,4,2,-1], chords: [[0,4,7],[5,9,12],[9,12,16],[7,11,14]], color: 'pluck' },
  B: { title: '炉火与远帆', tempo: 90, root: 57, melody: [0,4,7,12,11,7,4,2,0,4,9,12,14,12,9,7,5,9,12,16,14,12,9,5,7,11,14,12,11,7,4,-1], chords: [[0,4,7],[9,12,16],[5,9,12],[7,11,14]], color: 'reed' },
  C: { title: '越洋来信', tempo: 84, root: 62, melody: [0,7,12,14,12,9,7,4,2,9,14,16,14,12,9,7,4,11,16,19,16,14,11,7,2,7,14,12,9,7,4,-1], chords: [[0,4,7],[7,11,14],[9,12,16],[5,9,12]], color: 'bell' },
  D: { title: '同行的星图', tempo: 66, root: 57, melody: [0,7,11,14,16,14,11,7,4,9,12,16,19,16,12,-1,5,12,16,19,21,19,16,12,7,11,14,19,16,14,11,-1], chords: [[0,7,11],[9,12,16],[5,12,16],[7,11,14]], color: 'glass' },
} as const;
export type MusicEra = keyof typeof MUSIC_SCORES;

export class VoyageMusic {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private sources = new Set<OscillatorNode>();
  private interval: ReturnType<typeof setInterval> | undefined;
  private duckTimer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  private volume = .34;
  private story = false;
  private ducked = false;
  private running = false;
  onState: (playing: boolean) => void = () => {};

  private target() { return this.volume * .3 * (this.story ? .6 : 1) * (this.ducked ? .32 : 1); }
  setVolume(volume: number, story: boolean) { this.volume = volume; this.story = story; this.master?.gain.setTargetAtTime(this.target(), this.context!.currentTime, .1); }
  duck(duration: number) {
    if (!this.running) return;
    clearTimeout(this.duckTimer); this.ducked = true;
    this.master?.gain.setTargetAtTime(this.target(), this.context!.currentTime, .025);
    this.duckTimer = setTimeout(() => { this.ducked = false; this.master?.gain.setTargetAtTime(this.target(), this.context!.currentTime, .25); }, duration + 120);
  }
  stop() {
    this.generation++; this.running = false; clearInterval(this.interval); clearTimeout(this.duckTimer); this.ducked = false;
    if (this.context && this.master) {
      const time = this.context.currentTime;
      const bus=this.master;bus.gain.cancelScheduledValues(time);bus.gain.setTargetAtTime(0,time,.045);
      setTimeout(()=>bus.disconnect(),220);this.master=null;
      for (const source of this.sources) { try { source.stop(time + .18); } catch { /* Ended voice. */ } }
    }
    this.sources.clear(); this.onState(false);
  }
  async start(era: MusicEra) {
    this.stop(); const generation = this.generation;
    this.context ??= new AudioContext({ latencyHint: 'playback' });
    const context = this.context;
    await context.resume();
    if (generation !== this.generation) return;
    // A new bus allows the preceding phrase to fade without changing its voices.
    const master = context.createGain(); master.gain.value = 0; master.connect(context.destination); this.master = master;
    master.gain.setTargetAtTime(this.target(), context.currentTime, .6);
    const score = MUSIC_SCORES[era], beat = 60 / score.tempo;
    const voice = (midi: number, start: number, duration: number, amplitude: number, type: 'melody' | 'pad' | 'bass') => {
      const frequency = 440 * 2 ** ((midi - 69) / 12), envelope = context.createGain(), filter = context.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = type === 'pad' ? 750 : score.color === 'reed' ? 1800 : 3400;
      const attack = type === 'pad' ? .4 : .012;
      envelope.gain.setValueAtTime(.0001, start); envelope.gain.exponentialRampToValueAtTime(amplitude, start + attack);
      if (type === 'pad') envelope.gain.setValueAtTime(amplitude * .7, start + duration * .55);
      envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
      envelope.connect(filter); filter.connect(master);
      const partials = type === 'pad' ? [1, 1.004] : type === 'bass' ? [1] : score.color === 'bell' || score.color === 'glass' ? [1,2,3.002] : [1,2];
      let remaining = partials.length;
      partials.forEach((partial, index) => {
        const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = type === 'bass' || type === 'pad' ? 'sine' : score.color === 'reed' ? 'triangle' : 'sine';
        oscillator.frequency.value = frequency * partial; gain.gain.value = index ? .14 / index : 1;
        oscillator.connect(gain); gain.connect(envelope); this.sources.add(oscillator);
        oscillator.onended = () => { this.sources.delete(oscillator); oscillator.disconnect(); gain.disconnect(); if (!--remaining) { envelope.disconnect(); filter.disconnect(); } };
        oscillator.start(start); oscillator.stop(start + duration + .02);
      });
    };
    let step = 0, next = context.currentTime + .08;
    const schedule = () => {
      if (generation !== this.generation) return;
      while (next < context.currentTime + .3) {
        const note = score.melody[step % score.melody.length], chord = score.chords[Math.floor(step / 8) % 4];
        const variation = Math.floor(step / 32) % 2;
        if (note >= 0) {
          voice(score.root + note + (variation && step % 8 === 6 ? 12 : 0), next, beat * (score.color === 'glass' ? 3 : 1.8), .42, 'melody');
          if (score.color === 'bell' || score.color === 'glass') voice(score.root + note, next + beat * .75, beat * 1.6, .08, 'melody');
        }
        if (step % 8 === 0) chord.forEach(note => voice(score.root + note - 12, next, beat * 7.8, .10, 'pad'));
        if (step % 4 === 0) voice(score.root + chord[step % 8 === 0 ? 0 : 2] - 24, next, beat * 3.5, .32, 'bass');
        if (era === 'B' && step % 2 === 1) voice(score.root + chord[(step >> 1) % 3] - 12, next, beat * .8, .16, 'melody');
        next += beat; step++;
      }
    };
    this.running = true; schedule(); this.interval = setInterval(schedule, 100); this.onState(true);
  }
  close() { this.stop(); void this.context?.close(); this.context = null; this.master = null; }
}
