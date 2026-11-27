import { CLAUDE_VOICES, DEFAULT_VOICE, frenchVoices, type VoiceSettings } from '../audio/voice';
import { useApp } from '../app/ctx';
import { Choice } from './ui';

const SAMPLE = 'Installe-toi confortablement. Inspire lentement par le nez… et expire longuement. Tu es prêt.';

export function VoiceCard() {
  const { s, update, voice } = useApp();
  const v = s.voice || DEFAULT_VOICE;
  const set = (patch: Partial<VoiceSettings>) => update((x) => { x.voice = { ...v, ...patch }; });
  const sys = frenchVoices();
  const hasClaude = !!voice.tts;
  const engine = hasClaude ? (v.engine === 'browser' ? 'browser' : 'claude') : 'browser';
  if (!voice.available) {
    return <div className="card"><h2>Voix du guidage</h2><p className="small muted">Ce navigateur ne sait pas lire de texte à voix haute.</p></div>;
  }
  return (
    <div className="card">
      <h2>Voix du guidage</h2>
      {hasClaude && (
        <div className="field"><span>Moteur</span>
          <Choice label="Moteur de voix" value={engine} onChange={(e) => set({ engine: e as VoiceSettings['engine'] })}
            options={[{ v: 'claude', label: 'Voix Claude', hint: 'la plus naturelle' }, { v: 'browser', label: 'Voix de l’appareil', hint: 'hors ligne' }]} />
        </div>
      )}
      {engine === 'claude' ? (
        <div className="field"><span>Voix</span>
          <Choice label="Voix Claude" value={v.claudeVoice} onChange={(c) => set({ claudeVoice: c })} options={CLAUDE_VOICES.map((c) => ({ v: c.v, label: c.label }))} />
        </div>
      ) : (
        <label className="field">Voix française de l’appareil
          <select id="sysVoice" value={v.browserVoice} onChange={(e) => set({ browserVoice: e.target.value })}>
            <option value="">Automatique (la plus naturelle trouvée{sys[0] ? ` : ${sys[0].name}` : ''})</option>
            {sys.map((x) => <option key={x.voiceURI} value={x.voiceURI}>{x.name}</option>)}
          </select>
          {sys.length === 0 && <span className="muted small">Aucune voix française trouvée sur cet appareil.</span>}
        </label>
      )}
      <div className="field"><span>Vitesse</span>
        <Choice label="Vitesse" value={v.rate} onChange={(r) => set({ rate: r })} options={[{ v: 0.8, label: 'Lente' }, { v: 0.9, label: 'Calme' }, { v: 1, label: 'Normale' }]} />
      </div>
      <button className="btn soft" onClick={() => voice.speak(SAMPLE)}>Tester la voix</button>
      {engine === 'browser' && (
        <p className="small muted">
          Astuce : les voix « améliorées » ou « premium » sont bien plus naturelles. Sur iPhone : Réglages, Accessibilité, Contenu énoncé, Voix, Français, puis télécharge Audrey ou Thomas (améliorée). Sur Android : Paramètres, Synthèse vocale, moteur Google, Français.
        </p>
      )}
    </div>
  );
}
