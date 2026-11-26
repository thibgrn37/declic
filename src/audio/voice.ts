// Guidage vocal : voix Claude quand l'appli tourne comme artifact dans un navigateur qui la propose,
// sinon la meilleure voix française du système, plus lente et avec des pauses entre les phrases.

export type ClaudeVoice = 'buttery' | 'airy' | 'glassy' | 'rounded';

export interface VoiceSettings {
  engine: 'auto' | 'claude' | 'browser';
  claudeVoice: ClaudeVoice;
  browserVoice: string; // voiceURI, vide = choix automatique
  rate: number; // 0.8 à 1.1
}

export const DEFAULT_VOICE: VoiceSettings = { engine: 'auto', claudeVoice: 'airy', browserVoice: '', rate: 0.9 };

export const CLAUDE_VOICES: { v: ClaudeVoice; label: string }[] = [
  { v: 'airy', label: 'Douce' },
  { v: 'buttery', label: 'Chaleureuse' },
  { v: 'rounded', label: 'Posée' },
  { v: 'glassy', label: 'Claire' },
];

export interface ClaudeTts {
  speak(what: string | { text: string; voice?: string; rate?: number; language?: string }[], o?: { voice?: string; rate?: number; language?: string }): Promise<unknown>;
  stop(): Promise<void> | void;
}

/** Découpe un texte en phrases pour marquer des pauses naturelles. */
export function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?…:;])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Note une voix du système : les voix « naturelles », « améliorées » ou neuronales passent devant. */
export function scoreVoice(v: { name: string; lang: string; localService?: boolean }): number {
  const lang = v.lang.replace('_', '-').toLowerCase();
  if (!lang.startsWith('fr')) return -1;
  let s = 0;
  if (lang === 'fr-fr') s += 3;
  const n = v.name.toLowerCase();
  if (/natural|naturel|neural|premium|enhanced|amélioré|ameliore|online|wavenet|studio/.test(n)) s += 6;
  if (/google/.test(n)) s += 3;
  if (/(amélie|amelie|audrey|thomas|aurélie|aurelie|marie|denise|henri|vivienne|remy|rémy|eloise|éloise|charline|daniel)/.test(n)) s += 2;
  if (/compact|espeak|robot|novelty|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley/.test(n)) s -= 5;
  return s;
}

export function frenchVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => scoreVoice(v) >= 0)
    .sort((a, b) => scoreVoice(b) - scoreVoice(a));
}

export class Voice {
  tts: ClaudeTts | null = null;
  settings: VoiceSettings = DEFAULT_VOICE;
  private token = 0;

  get usesClaude() {
    return !!this.tts && this.settings.engine !== 'browser';
  }

  get available() {
    return !!this.tts || (typeof window !== 'undefined' && 'speechSynthesis' in window);
  }

  speak(text: string) {
    this.stop();
    const parts = sentences(text);
    if (!parts.length) return;
    if (this.usesClaude) {
      const lines = parts.map((t) => ({ text: t }));
      this.tts!.speak(lines, { voice: this.settings.claudeVoice, rate: this.settings.rate, language: 'fr' }).catch(() => {
        // Voix Claude refusée (limite, réglage du lecteur…) : on bascule sur la voix du système.
        if (this.settings.engine === 'auto') this.speakBrowser(parts);
      });
      return;
    }
    this.speakBrowser(parts);
  }

  private speakBrowser(parts: string[]) {
    if (!('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    const all = frenchVoices();
    const voice = all.find((v) => v.voiceURI === this.settings.browserVoice) || all[0] || null;
    const my = ++this.token;
    const next = (i: number) => {
      if (my !== this.token || i >= parts.length) return;
      const u = new SpeechSynthesisUtterance(parts[i]);
      u.lang = voice?.lang || 'fr-FR';
      if (voice) u.voice = voice;
      u.rate = this.settings.rate;
      u.pitch = 0.95;
      u.onend = () => setTimeout(() => next(i + 1), 450); // une respiration entre deux phrases
      synth.speak(u);
    };
    synth.cancel();
    next(0);
  }

  stop() {
    this.token++;
    try { void this.tts?.stop(); } catch { /* rien */ }
    try { window.speechSynthesis?.cancel(); } catch { /* rien */ }
  }
}
