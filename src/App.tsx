import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ctx, type AppCtx, type PlayRequest, type Tab } from './app/ctx';
import { Icon } from './components/ui';
import { ensureWeek } from './engine/engine';
import { DEFAULT_VOICE, Voice, type ClaudeTts } from './audio/voice';
import { appStore, freshState, type SaveStatus } from './state/store';
import { cloudConfigured } from './state/cloud';
import { PasswordReset, SignInBanner } from './components/Sync';
import type { State } from './state/types';
import { Carnet } from './screens/Carnet';
import { JourJ } from './screens/JourJ';
import { Onboarding, Reassess } from './screens/Onboarding';
import { Player } from './screens/Player';
import { Programme } from './screens/Programme';
import { Progres } from './screens/Progres';
import { Today } from './screens/Today';

const TABS: [Tab, string][] = [['today', 'Aujourd’hui'], ['programme', 'Programme'], ['jourj', 'Jour J'], ['carnet', 'Carnet'], ['progres', 'Progrès']];

export default function App() {
  const store = appStore;
  const ref = useRef<State>(store.readLocal() || freshState());
  const [, setTick] = useState(0);
  const [status, setStatus] = useState<SaveStatus>('chargement');
  const [tab, setTab] = useState<Tab>('today');
  const [playing, setPlaying] = useState<(PlayRequest & { n: number }) | null>(null);
  const playN = useRef(0);
  const [reassess, setReassess] = useState(false);
  const voice = useMemo(() => new Voice(), []);
  const [, setVoiceReady] = useState(false);
  const rerender = () => setTick((n) => n + 1);

  useEffect(() => {
    store.onStatus = setStatus;
    // Version plus récente venue d'un autre appareil (connexion, retour sur l'appli, retour du réseau).
    store.onRemote = (remote) => { ref.current = remote; rerender(); };
    // connect() envoie lui-même les données locales vers le compte si elles sont plus récentes.
    store.connect().then((remote) => {
      if (remote) ref.current = remote;
      rerender();
    });
    const w = window as unknown as { claude?: { use(n: string): Promise<ClaudeTts | null> } };
    w.claude?.use('tts').then((t) => { voice.tts = t; setVoiceReady(true); }).catch(() => {});
    // Les voix du système arrivent parfois après le chargement.
    if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = () => setVoiceReady((x) => !x);
  }, [store, voice]);

  const update = useCallback((fn: (s: State) => void) => {
    fn(ref.current);
    store.save(ref.current);
    rerender();
  }, [store]);

  const replace = useCallback((s: State) => {
    ref.current = s;
    store.save(s);
    setTab('today');
    rerender();
  }, [store]);

  // Le plan de la semaine est figé dès qu'il est créé : on l'enregistre.
  const s = ref.current;
  useEffect(() => {
    if (s.profile && s.assessments.length) {
      const before = Object.keys(s.plans).length;
      ensureWeek(s);
      if (Object.keys(s.plans).length !== before) store.save(s);
    }
  });

  voice.settings = s.voice || DEFAULT_VOICE;
  const speak = voice.available ? (text: string) => voice.speak(text) : null;
  const stopSpeak = useCallback(() => voice.stop(), [voice]);

  const ctx: AppCtx = {
    s, update, replace, status, speak, stopSpeak, voice,
    play: (r) => { playN.current += 1; setPlaying({ ...r, n: playN.current }); },
    go: (t) => { setTab(t); window.scrollTo(0, 0); },
    startReassess: () => setReassess(true),
  };

  if (!s.profile || s.assessments.length === 0) {
    return <Ctx.Provider value={ctx}>{cloudConfigured && <SignInBanner />}<Onboarding /><PasswordReset /></Ctx.Provider>;
  }

  return (
    <Ctx.Provider value={ctx}>
      <PasswordReset />
      <main className="app">
        {tab === 'today' && <Today />}
        {tab === 'programme' && <Programme />}
        {tab === 'jourj' && <JourJ />}
        {tab === 'carnet' && <Carnet />}
        {tab === 'progres' && <Progres />}
      </main>
      <nav className="tabs" aria-label="Navigation">
        <div className="in">
          {TABS.map(([id, label]) => (
            <button key={id} className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => ctx.go(id)}>
              {Icon[id]}<span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
      {playing && <Player key={playing.n} req={playing} onClose={() => setPlaying(null)} />}
      {reassess && <Reassess onClose={() => setReassess(false)} />}
    </Ctx.Provider>
  );
}
