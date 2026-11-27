import { useEffect, useMemo, useRef, useState } from 'react';
import { TECH_BY_ID, URGENCE_STEPS, type Step } from '../content/techniques';
import { adapt, checkBadges, ensureWeek, levelOf } from '../engine/engine';
import { todayKey } from '../state/dates';
import { useApp, type PlayRequest } from '../app/ctx';
import { Choice, Dots, EvidenceTag, fill } from '../components/ui';
import { AMBIENTS, ambient } from '../audio/ambient';

const ROUTINE_IDEAS = ['Expiration longue', 'Dire mon mot-clé', 'Voir le geste réussi', 'Regard sur un point précis', 'Geste déclencheur (taper la raquette, ajuster le gant…)'];

interface Outcome { message: string; levelUp: boolean; badges: string[] }

export function Player({ req, onClose }: { req: PlayRequest; onClose: () => void }) {
  const app = useApp();
  const { s, update } = app;
  const isUrgence = req.techId === 'urgence';
  const tech = isUrgence ? null : TECH_BY_ID[req.techId];
  const level = tech ? tech.levels[Math.min(req.level, tech.levels.length) - 1] : null;
  const steps: Step[] = useMemo(
    () => (isUrgence ? URGENCE_STEPS : level!.steps({ sportType: s.profile?.sportType || 'collectif' })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [req.techId, req.level],
  );
  const [phase, setPhase] = useState<'intro' | 'run' | 'rate' | 'done'>(isUrgence ? 'run' : 'intro');
  const [i, setI] = useState(0);
  const [voice, setVoice] = useState(false);
  const [rating, setRating] = useState(0);
  const [useful, setUseful] = useState(0);
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const next = () => {
    if (i < steps.length - 1) setI(i + 1);
    else if (isUrgence) finishUrgence();
    else { ambient.stop(); setPhase('rate'); }
  };

  useEffect(() => () => { app.stopSpeak(); ambient.stop(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const spokeFirst = useRef(false);
  useEffect(() => {
    if (phase !== 'run' || !voice || !app.speak) return;
    if (i === 0 && spokeFirst.current) return; // déjà lu au clic sur « Démarrer »
    app.speak(fill(steps[i].text, s));
  }, [i, phase, voice]); // eslint-disable-line react-hooks/exhaustive-deps
  const start = () => {
    ambient.start(s.ambient || 'none'); // dans le clic, sinon le navigateur bloque le son
    // Lire la première consigne directement dans le clic : certains lecteurs n'autorisent la voix qu'après un geste.
    if (voice && app.speak) { app.speak(fill(steps[0].text, s)); spokeFirst.current = true; }
    setPhase('run');
  };

  function finishUrgence() {
    update((st) => { const t = todayKey(); st.days[t] = (st.days[t] || 0) + 1; });
    setOutcome({ message: 'Une minute de respiration lente : ton activation redescend. Garde ce rythme en retournant dans l’action.', levelUp: false, badges: [] });
    setPhase('done');
  }

  function finish() {
    let out: Outcome = { message: '', levelUp: false, badges: [] };
    update((st) => {
      const t = todayKey();
      st.sessions.push({ date: t, techId: tech!.id, level: req.level, rating, useful, note: note.trim().slice(0, 500), source: req.source });
      st.days[t] = (st.days[t] || 0) + 1;
      const plan = ensureWeek(st, t);
      // Une séance coche le prochain créneau de la semaine qui porte la même technique.
      const idx = req.slotIndex !== undefined && !plan.slots[req.slotIndex]?.doneDate && plan.slots[req.slotIndex].techId === tech!.id
        ? req.slotIndex
        : plan.slots.findIndex((x) => !x.doneDate && x.techId === tech!.id);
      if (idx >= 0 && req.source !== 'allegee') plan.slots[idx].doneDate = t;
      const r = adapt(st, tech!.id, req.level, rating);
      out = { message: r.message, levelUp: r.newLevel > r.oldLevel, badges: checkBadges(st) };
    });
    setOutcome(out);
    setPhase('done');
  }

  const close = () => { app.stopSpeak(); ambient.stop(); onClose(); };

  if (phase === 'intro' && tech && level) {
    return (
      <div className="player"><div className="in">
        <div className="row between"><span className="eyebrow">{tech.name} · niveau {level.n}/{tech.levels.length}</span><button className="btn ghost small" onClick={close}>Fermer</button></div>
        <div className="stage">
          <h1>{level.name}</h1>
          <p className="muted" style={{ maxWidth: '36ch' }}>{level.goal}</p>
          <div className="row" style={{ justifyContent: 'center' }}><EvidenceTag level={tech.evidence} /><span className="tag plain">{level.min} min</span></div>
          <p className="small" style={{ maxWidth: '40ch' }}>{tech.why}</p>
          {app.speak && (
            <label className="row small" style={{ justifyContent: 'center' }}>
              <input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} /> Guidage vocal (pour garder les yeux fermés)
            </label>
          )}
          {app.speak && voice && (
            <p className="small muted">Voix et vitesse se règlent dans l’onglet Progrès.</p>
          )}
          <div className="field" style={{ maxWidth: 360 }}><span className="small">Fond sonore</span>
            <Choice label="Fond sonore" value={s.ambient || 'none'} onChange={(k) => update((x) => { x.ambient = k; })} options={AMBIENTS.map((a) => ({ v: a.v, label: a.label }))} />
          </div>
          <button className="btn" style={{ padding: '14px 28px' }} onClick={start}>Démarrer</button>
        </div>
      </div></div>
    );
  }

  if (phase === 'rate' && tech) {
    return (
      <div className="player"><div className="in">
        <div className="row between"><span className="eyebrow">{tech.name}</span></div>
        <div className="stage" style={{ alignItems: 'stretch', textAlign: 'left' }}>
          <h1>Comment c’était ?</h1>
          <p className="muted">Tes réponses ajustent le niveau de tes prochaines séances.</p>
          <div className="field"><span>{tech.rating}</span><span className="muted small">1 = très difficile, 5 = très facile</span><Dots value={rating} onChange={setRating} label={tech.rating} /></div>
          <div className="field"><span>Utilité pour ton sport</span><Dots value={useful} onChange={setUseful} label="Utilité" /></div>
          <label className="field">Une remarque (facultatif)<textarea id="sessNote" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ce qui t’a aidé, ce qui bloquait…" /></label>
          <button className="btn wide" disabled={!rating || !useful} onClick={finish}>Enregistrer la séance</button>
        </div>
      </div></div>
    );
  }

  if (phase === 'done' && outcome) {
    const newLevel = tech ? levelOf(s, tech.id) : 0;
    return (
      <div className="player"><div className="in">
        <div className="stage" style={{ alignItems: 'stretch', textAlign: 'left' }}>
          <div className="result card">
            <span className="eyebrow">{isUrgence ? 'Respiration d’urgence' : 'Séance terminée'}</span>
            {outcome.levelUp && tech ? <div className="levelup">Niveau {newLevel} débloqué</div> : <h2>{tech ? tech.name : 'C’est fait'}</h2>}
            <p>{outcome.message}</p>
            {outcome.badges.map((b) => <p key={b}><span className="tag prometteur">Badge</span> {b}</p>)}
            <button className="btn wide" onClick={close}>Continuer</button>
          </div>
        </div>
      </div></div>
    );
  }

  return (
    <div className="player"><div className="in">
      <div className="row between"><span className="eyebrow">{tech ? tech.name : 'Respiration d’urgence'}</span><button className="btn ghost small" onClick={close}>Arrêter</button></div>
      <div className="progress">{steps.map((_, k) => <span key={k} className={k <= i ? 'd' : ''} />)}</div>
      <div className="stage">
        <StepView key={i} step={steps[i]} onNext={next} />
      </div>
    </div></div>
  );
}

function StepView({ step, onNext }: { step: Step; onNext: () => void }) {
  const { s, update } = useApp();
  const text = fill(step.text, s);
  switch (step.kind) {
    case 'timed': return <Timed sec={step.sec} text={text} onNext={onNext} />;
    case 'breath': return <Breath pattern={step.pattern} cycles={step.cycles} text={text} onNext={onNext} />;
    case 'input': return <InputStep text={text} field={step.field} placeholder={step.placeholder} onNext={onNext} />;
    case 'routineEdit': return (
      <div className="stack">
        <p className="steptext">{text}</p>
        <RoutineEditor />
        <button className="btn wide" disabled={s.personal.routine.length === 0} onClick={onNext}>Valider ma routine</button>
      </div>
    );
    case 'routineRun': return <RoutineRun reps={step.reps} pressure={!!step.pressure} text={text} onNext={onNext} />;
    case 'goalsEdit': return (
      <div className="stack">
        <p className="steptext">{text}</p>
        <GoalsForm />
        <button className="btn wide" disabled={!s.personal.goals.process.some((x) => x.trim())} onClick={onNext}>Enregistrer mes objectifs</button>
      </div>
    );
    case 'goalsReview': return <GoalsReview text={text} onDone={(values) => { update((st) => { st.personal.goalReviews.push({ date: todayKey(), values }); }); onNext(); }} />;
  }
}

function Timed({ sec, text, onNext }: { sec: number; text: string; onNext: () => void }) {
  const [left, setLeft] = useState(sec);
  const [paused, setPaused] = useState(false);
  const done = useRef(false);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setLeft((l) => Math.max(0, l - 0.1)), 100);
    return () => clearInterval(id);
  }, [paused]);
  useEffect(() => { if (left <= 0 && !done.current) { done.current = true; onNext(); } }, [left, onNext]);
  const C = 276.5;
  return (
    <>
      <svg className="ring" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="44" stroke="var(--line)" />
        <circle cx="50" cy="50" r="44" stroke="var(--accent)" strokeLinecap="round" transform="rotate(-90 50 50)" strokeDasharray={C} strokeDashoffset={C * (1 - left / sec)} />
        <text x="50" y="57" textAnchor="middle" fontFamily="Barlow Condensed, sans-serif" fontWeight="700" fontSize="22" fill="var(--ink)">{Math.ceil(left)}</text>
      </svg>
      <p className="steptext">{text}</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn ghost" onClick={() => setPaused(!paused)}>{paused ? 'Reprendre' : 'Pause'}</button>
        <button className="btn" onClick={() => { done.current = true; onNext(); }}>Suivant</button>
      </div>
    </>
  );
}

function Breath({ pattern, cycles, text, onNext }: { pattern: [string, number][]; cycles: number; text: string; onNext: () => void }) {
  const seq = useMemo(() => Array.from({ length: cycles }).flatMap((_, c) => pattern.map(([label, sec]) => ({ label, sec, c }))), [pattern, cycles]);
  const [k, setK] = useState(0);
  const [left, setLeft] = useState(seq[0].sec);
  const [paused, setPaused] = useState(false);
  const orb = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setLeft((l) => l - 0.1), 100);
    return () => clearInterval(id);
  }, [paused]);
  useEffect(() => {
    if (left > 0) return;
    if (k >= seq.length - 1) { onNext(); return; }
    setK(k + 1);
    setLeft(seq[k + 1].sec);
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = orb.current;
    if (!el) return;
    const cur = seq[k];
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.style.transitionDuration = reduce ? '0s' : `${cur.sec}s`;
    if (cur.label === 'Inspire') el.style.transform = 'scale(1)';
    else if (cur.label === 'Expire') el.style.transform = 'scale(.55)';
  }, [k, seq]);
  const cur = seq[k];
  return (
    <>
      <p className="small muted" style={{ maxWidth: '36ch' }}>{text}</p>
      <div className="orb" ref={orb}><span>{cur.label}</span></div>
      <p className="num" style={{ fontWeight: 700 }}>{Math.max(1, Math.ceil(left))}</p>
      <p className="small muted">Cycle {cur.c + 1} sur {cycles}</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn ghost" onClick={() => setPaused(!paused)}>{paused ? 'Reprendre' : 'Pause'}</button>
        <button className="btn ghost" onClick={onNext}>Passer</button>
      </div>
    </>
  );
}

function InputStep({ text, field, placeholder, onNext }: { text: string; field: keyof typeof FIELD_LABELS; placeholder: string; onNext: () => void }) {
  const { s, update } = useApp();
  const [v, setV] = useState(s.personal[field] || '');
  return (
    <div className="stack">
      <p className="steptext">{text}</p>
      <label className="field"><span className="muted small">{FIELD_LABELS[field]}</span>
        <input type="text" id={`in-${field}`} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} maxLength={120} />
      </label>
      <button className="btn wide" disabled={!v.trim()} onClick={() => { update((st) => { st.personal[field] = v.trim(); }); onNext(); }}>Continuer</button>
    </div>
  );
}

const FIELD_LABELS = {
  gesture: 'Ton geste clé', place: 'Ton lieu', cueInstr: 'Mot technique', cueMotiv: 'Mot de motivation',
  negative: 'Phrase négative', reframe: 'Phrase utile', strength: 'Ta force', trigger: 'Moment de la routine',
} as const;

export function RoutineEditor() {
  const { s, update } = useApp();
  const [v, setV] = useState('');
  const r = s.personal.routine;
  const add = (x: string) => { const t = x.trim(); if (t && r.length < 6) update((st) => { st.personal.routine.push(t.slice(0, 80)); }); };
  return (
    <div className="stack">
      {r.length > 0 && (
        <ol style={{ margin: 0, paddingLeft: 20 }} className="stack">
          {r.map((x, k) => (
            <li key={k}><div className="row between" style={{ flexWrap: 'nowrap' }}><span style={{ minWidth: 0 }}>{x}</span>
              <button className="x" aria-label={`Retirer ${x}`} onClick={() => update((st) => { st.personal.routine.splice(k, 1); })}>×</button></div></li>
          ))}
        </ol>
      )}
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <input type="text" id="routineNew" value={v} onChange={(e) => setV(e.target.value)} placeholder="Ajouter une étape" style={{ minWidth: 0 }}
          onKeyDown={(e) => { if (e.key === 'Enter') { add(v); setV(''); } }} />
        <button className="btn ghost small" onClick={() => { add(v); setV(''); }}>Ajouter</button>
      </div>
      <div className="row">{ROUTINE_IDEAS.filter((x) => !r.includes(x)).map((x) => <button key={x} className="tag plain" style={{ border: 0, cursor: 'pointer', whiteSpace: 'normal' }} onClick={() => add(x)}>+ {x}</button>)}</div>
    </div>
  );
}

function RoutineRun({ reps, pressure, text, onNext }: { reps: number; pressure: boolean; text: string; onNext: () => void }) {
  const { s } = useApp();
  const r = s.personal.routine;
  const [rep, setRep] = useState(0);
  const [k, setK] = useState(0);
  if (r.length === 0) {
    return (
      <div className="stack">
        <p className="steptext">Tu n’as pas encore de routine. Compose-la d’abord :</p>
        <RoutineEditor />
      </div>
    );
  }
  const last = k === r.length; // étape finale : le geste
  const advance = () => {
    if (!last) { setK(k + 1); return; }
    if (rep < reps - 1) { setRep(rep + 1); setK(0); } else onNext();
  };
  return (
    <>
      <p className="small muted" style={{ maxWidth: '36ch' }}>{text}</p>
      {pressure && <span className="tag prometteur">Pression : moment décisif</span>}
      <p className="eyebrow">Répétition {rep + 1} sur {reps}</p>
      <h1 style={{ maxWidth: '18ch' }}>{last ? 'Et maintenant : le geste' : r[k]}</h1>
      <p className="muted small">{last ? 'Exécute-le en mouvement réel ou en imagerie.' : `Étape ${k + 1} sur ${r.length}`}</p>
      <button className="btn" style={{ padding: '14px 28px' }} onClick={advance}>{last ? (rep < reps - 1 ? 'Répétition suivante' : 'Terminer') : 'Fait'}</button>
    </>
  );
}

export function GoalsForm() {
  const { s, update } = useApp();
  const g = s.personal.goals;
  const set = (fn: (st: typeof g) => void) => update((st) => fn(st.personal.goals));
  return (
    <div className="stack">
      <label className="field">Objectif de résultat<span className="muted small">Ce que tu vises en compétition</span>
        <input type="text" id="gResult" value={g.result} maxLength={120} onChange={(e) => set((x) => { x.result = e.target.value; })} placeholder="Ex. top 10 aux régionaux" /></label>
      <label className="field">Objectif de performance<span className="muted small">Un chiffre que tu peux mesurer</span>
        <input type="text" id="gPerf" value={g.perf} maxLength={120} onChange={(e) => set((x) => { x.perf = e.target.value; })} placeholder="Ex. 70 % de premières balles" /></label>
      {g.process.map((p, k) => (
        <label className="field" key={k}>Objectif de processus {k + 1}<span className="muted small">Une action que tu contrôles à chaque séance</span>
          <input type="text" id={`gProc${k}`} value={p} maxLength={120} onChange={(e) => set((x) => { x.process[k] = e.target.value; })} placeholder={k === 0 ? 'Ex. routine complète avant chaque service' : 'Ex. regard loin sur chaque relance'} /></label>
      ))}
    </div>
  );
}

function GoalsReview({ text, onDone }: { text: string; onDone: (v: number[]) => void }) {
  const { s } = useApp();
  const goals = s.personal.goals.process.filter((x) => x.trim());
  const [vals, setVals] = useState<number[]>(goals.map(() => -1));
  if (goals.length === 0) {
    return (
      <div className="stack">
        <p className="steptext">Tu n’as pas encore d’objectifs de processus. Écris-les d’abord :</p>
        <GoalsForm />
        <button className="btn wide" onClick={() => onDone([])}>Continuer</button>
      </div>
    );
  }
  return (
    <div className="stack">
      <p className="steptext">{text}</p>
      {goals.map((g, k) => (
        <div className="field" key={k}><span>{g}</span>
          <div className="seg">{[0, 25, 50, 75, 100].map((v) => (
            <button key={v} className={vals[k] === v ? 'on' : ''} onClick={() => setVals(vals.map((x, j) => (j === k ? v : x)))}>{v} %</button>
          ))}</div>
        </div>
      ))}
      <button className="btn wide" disabled={vals.some((v) => v < 0)} onClick={() => onDone(vals)}>Valider mon bilan</button>
    </div>
  );
}
