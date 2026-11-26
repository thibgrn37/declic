// Fonds sonores générés en direct (Web Audio) : aucun fichier à télécharger.

export type AmbientKind = 'none' | 'ocean' | 'pluie' | 'nappe';

export const AMBIENTS: { v: AmbientKind; label: string }[] = [
  { v: 'none', label: 'Aucun' },
  { v: 'ocean', label: 'Vagues' },
  { v: 'pluie', label: 'Pluie' },
  { v: 'nappe', label: 'Nappe douce' },
];

function noiseBuffer(ctx: AudioContext, kind: 'pink' | 'brown'): AudioBuffer {
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11; }
    }
  }
  return buf;
}

export class Ambient {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: AudioScheduledSourceNode[] = [];

  /** À appeler depuis un clic : les navigateurs bloquent le son sans geste de l'utilisateur. */
  start(kind: AmbientKind, volume = 0.5) {
    this.stop();
    if (kind === 'none') return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx ||= new AC());
    void ctx.resume();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.25 * volume, ctx.currentTime + 3); // fondu d'entrée
    master.connect(ctx.destination);
    this.master = master;

    if (kind === 'ocean' || kind === 'pluie') {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx, kind === 'ocean' ? 'brown' : 'pink');
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = kind === 'ocean' ? 700 : 3500;
      const swell = ctx.createGain();
      swell.gain.value = kind === 'ocean' ? 0.6 : 0.9;
      src.connect(filter).connect(swell).connect(master);
      if (kind === 'ocean') {
        // Une vague toutes les ~10 secondes, au rythme d'une respiration lente.
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.1;
        const depth = ctx.createGain();
        depth.gain.value = 0.4;
        lfo.connect(depth).connect(swell.gain);
        lfo.start();
        this.nodes.push(lfo);
      }
      src.start();
      this.nodes.push(src);
    } else {
      // Accord tenu (la, mi, la, do#) avec un léger battement.
      [110, 164.81, 220, 277.18].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        o.detune.value = i % 2 ? 4 : -4;
        const g = ctx.createGain();
        g.gain.value = 0.18 / (i + 1);
        o.connect(g).connect(master);
        o.start();
        this.nodes.push(o);
      });
    }
  }

  stop() {
    const ctx = this.ctx;
    const master = this.master;
    const nodes = this.nodes;
    this.nodes = [];
    this.master = null;
    if (!ctx || !master) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2); // fondu de sortie
    setTimeout(() => { nodes.forEach((n) => { try { n.stop(); } catch { /* déjà arrêté */ } }); master.disconnect(); }, 1300);
  }
}

export const ambient = new Ambient();
