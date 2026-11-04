export type ChallengeCue = 'rotate' | 'water' | 'place' | 'remove' | 'stamp' | 'rail' | 'coal' | 'work' | 'steam' | 'switch' | 'dot' | 'dash' | 'error' | 'success' | 'message' | 'stone' | 'confirm';

export const CUE_DURATION: Record<ChallengeCue, number> = {
  rotate: 160, water: 900, place: 180, remove: 140, stamp: 280, rail: 240,
  coal: 320, work: 650, steam: 700, switch: 120, dot: 90, dash: 270,
  error: 240, success: 600, message: 220, stone: 160, confirm: 320,
};

// Each gesture uses one audio-clock start for its sound and accompanying animation.
// No downloaded sound, autoplay, microphone, or external service is involved.
export class ChallengeSound {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private sources = new Set<AudioScheduledSourceNode>();
  private generation = 0;
  private closed = false;

  silence() {
    this.generation++;
    for (const source of this.sources) { try { source.stop(); } catch { /* Already ended. */ } }
    this.sources.clear();
  }

  async play(cue: ChallengeCue, volume: number): Promise<{ delay: number; audible: boolean }> {
    const generation = ++this.generation;
    try {
      if (this.closed) return { delay: 0, audible: false };
      if (!this.context) {
        this.context = new AudioContext({ latencyHint: 'interactive' });
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
      }
      const context = this.context;
      await context.resume();
      if (this.closed || generation !== this.generation || context.state !== 'running') return { delay: 0, audible: false };
      for (const source of this.sources) { try { source.stop(); } catch { /* Already ended. */ } }
      this.sources.clear();
      this.master!.gain.setValueAtTime(Math.max(0, Math.min(1, volume)) * .36, context.currentTime);
      const start = context.currentTime + .025;
      const track = (source: AudioScheduledSourceNode, nodes: AudioNode[]) => {
        this.sources.add(source);
        source.onended = () => { this.sources.delete(source); source.disconnect(); nodes.forEach(node => node.disconnect()); };
      };
      const tone = (frequency: number, duration: number, offset = 0, gain = .4, type: OscillatorType = 'sine', endFrequency = frequency, sustain = false) => {
        const oscillator = context.createOscillator(), envelope = context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start + offset);
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + offset + duration);
        envelope.gain.setValueAtTime(0, start + offset);
        envelope.gain.linearRampToValueAtTime(gain, start + offset + .006);
        if (sustain) {
          envelope.gain.setValueAtTime(gain, start + offset + duration - .008);
          envelope.gain.linearRampToValueAtTime(.001, start + offset + duration);
        } else envelope.gain.exponentialRampToValueAtTime(.001, start + offset + duration);
        oscillator.connect(envelope); envelope.connect(this.master!);
        track(oscillator, [envelope]); oscillator.start(start + offset); oscillator.stop(start + offset + duration + .015);
      };
      const noise = (duration: number, frequency: number, offset = 0, gain = .3, swell = false) => {
        const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
        const source = context.createBufferSource(), filter = context.createBiquadFilter(), envelope = context.createGain();
        source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = frequency;
        envelope.gain.setValueAtTime(swell ? .001 : gain, start + offset);
        if (swell) envelope.gain.linearRampToValueAtTime(gain, start + offset + duration * .2);
        envelope.gain.exponentialRampToValueAtTime(.001, start + offset + duration);
        source.connect(filter); filter.connect(envelope); envelope.connect(this.master!);
        track(source, [filter, envelope]); source.start(start + offset); source.stop(start + offset + duration);
      };
      switch (cue) {
        case 'dot': case 'dash': tone(620, CUE_DURATION[cue] / 1000, 0, .38, 'sine', 620, true); break;
        case 'rotate': noise(.09, 1600); tone(210, .12, .04, .35, 'triangle', 130); break;
        case 'water': noise(.88, 950, 0, .45, true); tone(260, .45, .05, .08, 'sine', 390); break;
        case 'place': tone(160, .14, 0, .7, 'triangle', 85); noise(.05, 700); break;
        case 'remove': tone(180, .11, 0, .3, 'triangle', 260); break;
        case 'stamp': noise(.12, 800, 0, .7); tone(115, .18, .03, .65, 'triangle', 65); break;
        case 'rail': tone(980, .18, 0, .32, 'triangle', 600); tone(1460, .15, .035, .12); noise(.04, 2400); break;
        case 'coal': noise(.3, 900, 0, .55); tone(110, .15, .02, .45, 'triangle', 65); break;
        case 'work': [0, .17, .34, .51].forEach(offset => { tone(85, .1, offset, .55, 'triangle', 55); noise(.09, 650, offset, .2); }); break;
        case 'steam': noise(.68, 3600, 0, .38, true); break;
        case 'switch': tone(520, .075, 0, .24, 'triangle', 780); break;
        case 'error': tone(170, .21, 0, .28, 'triangle', 110); break;
        case 'success': [392, 494, 587].forEach((frequency, i) => tone(frequency, .28, i * .12, .27)); break;
        case 'message': tone(520, .12, 0, .23); tone(680, .14, .08, .2); break;
        case 'stone': noise(.025, 2400, 0, .35); tone(750, .13, 0, .4, 'triangle', 360); break;
        case 'confirm': noise(.07, 900, 0, .35); tone(330, .25, .04, .24, 'triangle', 440); break;
      }
      return { delay: Math.max(0, (start - context.currentTime + context.baseLatency) * 1000), audible: volume > 0 };
    } catch { return { delay: 0, audible: false }; }
  }

  close() { this.closed = true; this.silence(); void this.context?.close().catch(() => {}); }
}
