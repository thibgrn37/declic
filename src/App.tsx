import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ctx, type AppCtx, type PlayRequest, type Tab } from './app/ctx';
import { Icon } from './components/ui';
import { ensureWeek } from './engine/engine';
import { Store, freshState, type SaveStatus } from './state/store';
import type { State } from './state/types';
import { Carnet } from './screens/Carnet';
import { JourJ } from './screens/JourJ';
import { Onboarding, Reassess } from './screens/Onboarding';
import { Player } from './screens/Player';
import { Programme } from './screens/Programme';
import { Progres } from './screens/Progres';
import { Today } from './screens/Today';

const TABS: [Tab, string][] = [['today', 'Aujourd’hui'], ['programme', 'Programme'], ['jourj', 'Jour J'], ['carnet', 'Carnet'], ['progres', 'Progrès']];

type Speaker = { speak(t: string, o?: object): Promise<void>; stop(): void };

export default function App() {
  const store = useMemo(() => new Store(), []);
  const ref = useRef<State>(store.readLocal() || freshState());
  const [, setTick] = useState(0);
  const [status, setStatus] = useState<SaveStatus>('chargement');
  const [tab, setTab] = useState<Tab>('today');
  const [playing, setPlaying] = useState<(PlayRequest & { n: number }) | null>(null);
  const playN = useRef(0);
  const [reassess, setReassess] = useState(false);
  const [tts, setTts] = useState<Speaker | null>(null);
  const rerender = () => setTick((n) => n + 1);

  useEffect(() => {
    store.onStatus = setStatus;
    store.connect().then((remote) => {
      if (remote) ref.current = remote;
      else if (ref.current.profile) store.save(ref.current); // premier envoi des données locales vers le compte
      rerender();
    });
    const w = window as unknown as { claude?: { use(n: string): Promise<Speaker | null> } };
    w.claude?.use('tts').then((t) => setTts(t)).catch(() => {});
  }, [store]);

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

  const speak = useMemo(() => {
    if (tts) return (text: string) => { tts.speak(text, { language: 'fr' }).catch(() => {}); };
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return (text: string) => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'fr-FR';
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      };
    }
    return null;
  }, [tts]);
  const stopSpeak = useCallback(() => {
    try { tts?.stop(); } catch { /* rien */ }
    try { window.speechSynthesis?.cancel(); } catch { /* rien */ }
  }, [tts]);

  const ctx: AppCtx = {
    s, update, replace, status, speak, stopSpeak,
    play: (r) => { playN.current += 1; setPlaying({ ...r, n: playN.current }); },
    go: (t) => { setTab(t); window.scrollTo(0, 0); },
    startReassess: () => setReassess(true),
  };

  if (!s.profile || s.assessments.length === 0) {
    return <Ctx.Provider value={ctx}><Onboarding /></Ctx.Provider>;
  }

  return (
    <Ctx.Provider value={ctx}>
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
