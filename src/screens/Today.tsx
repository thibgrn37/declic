import { useState } from 'react';
import { TECH_BY_ID } from '../content/techniques';
import { PHASES, compDays, ensureWeek, levelOf, phaseOf, reassessDue, streakInfo, suggestToday } from '../engine/engine';
import { fmtWeekday, mondayOf, todayKey } from '../state/dates';
import type { Checkin } from '../state/types';
import { useApp } from '../app/ctx';
import { Coach, Dots, EvidenceTag, Header } from '../components/ui';
import { fmtDuration } from '../engine/training';
import { openCarnetOn } from './Carnet';

const CI_ROWS: [keyof Checkin, string, string][] = [
  ['mood', 'Humeur', '1 = au plus bas, 5 = au top'],
  ['energy', 'Énergie', '1 = vidé, 5 = plein d’énergie'],
  ['sleep', 'Sommeil', '1 = très mauvaise nuit, 5 = excellente'],
  ['stress', 'Stress', '1 = détendu, 5 = très stressé'],
];

export function Today() {
  const app = useApp();
  const { s, update, play } = app;
  const t = todayKey();
  const plan = ensureWeek(s, t);
  const sug = suggestToday(s, t);
  const ci = s.checkins[t];
  const [draft, setDraft] = useState<Partial<Checkin>>({});
  const st = streakInfo(s);
  const phase = phaseOf(plan.programWeek);
  const cd = compDays(s.profile, t);
  const doneCount = plan.slots.filter((x) => x.doneDate).length;
  const goalsSet = s.personal.goals.process.some((x) => x.trim());
  const reviewedThisWeek = s.personal.goalReviews.some((r) => mondayOf(r.date) === mondayOf(t));
  const name = s.profile?.name ? `${s.profile.name}, ` : '';

  let coach: [string, string];
  if (!ci) coach = ['Check-in', `${name}comment tu te sens aujourd’hui ? Ton état du jour ajuste la séance proposée.`];
  else if (sug?.source === 'allegee') coach = ['Séance allégée', 'Journée chargée. Une régulation courte vaut mieux qu’une séance bâclée.'];
  else if (cd !== null && cd >= 0 && cd <= 7) coach = [cd === 0 ? 'Jour J' : `J-${cd}`, `Protocole compétition activé pour ${s.profile?.compName || 'ta compétition'}.`];
  else if (!sug) coach = ['Semaine bouclée', 'Toutes tes séances de la semaine sont faites. Le repos fait aussi partie de l’entraînement.'];
  else coach = [`Semaine ${plan.programWeek} · ${PHASES[phase].name}`, PHASES[phase].text];

  return (
    <>
      <Header />
      <Coach title={coach[0]}>{coach[1]}</Coach>

      {reassessDue(s, t) && (
        <div className="card" style={{ borderColor: 'var(--accent)' }}>
          <h3>C’est l’heure de ton nouveau bilan</h3>
          <p className="small muted">4 minutes pour mesurer tes progrès depuis le début et réorienter ton programme.</p>
          <button className="btn" onClick={app.startReassess}>Faire le bilan</button>
        </div>
      )}

      {sug && <SuggestionCard />}

      <div className="card">
        <div className="row between"><h2>Check-in</h2>{ci && <span className="tag solide">Fait</span>}</div>
        {ci ? (
          <p className="muted">Humeur {ci.mood}/5 · Énergie {ci.energy}/5 · Sommeil {ci.sleep}/5 · Stress {ci.stress}/5</p>
        ) : (
          <>
            {CI_ROWS.map(([k, l, h]) => (
              <div className="field" key={k}><span>{l} <span className="muted small" style={{ fontWeight: 400 }}>{h}</span></span>
                <Dots value={draft[k] || 0} onChange={(v) => setDraft({ ...draft, [k]: v })} label={l} /></div>
            ))}
            <button className="btn wide" disabled={CI_ROWS.some(([k]) => !draft[k])} onClick={() => update((x) => { x.checkins[t] = draft as Checkin; })}>Valider mon check-in</button>
          </>
        )}
      </div>

      <TrainingToday />

      <div className="card">
        <div className="row between"><h2>Ma semaine</h2><span className="small muted num">{doneCount}/{plan.slots.length} séances</span></div>
        <div className="week">
          {plan.slots.map((sl, k) => {
            const tech = TECH_BY_ID[sl.techId];
            const isNext = !sl.doneDate && plan.slots.findIndex((x) => !x.doneDate) === k;
            return (
              <div key={k} className={`slot ${sl.doneDate ? 'done' : isNext ? 'next' : ''}`}>
                <span className="mark">{sl.doneDate ? '✓' : k + 1}</span>
                <div>
                  <div className="row between"><b>{tech.name}</b><span className="small muted">{sl.doneDate ? fmtWeekday(sl.doneDate) : `niveau ${levelOf(s, sl.techId)}`}</span></div>
                  <span className="small muted">{sl.reason}</span>
                  {!sl.doneDate && !isNext && <div><button className="link small" onClick={() => play({ techId: sl.techId, level: levelOf(s, sl.techId), source: 'plan', slotIndex: k })}>Faire maintenant</button></div>}
                </div>
              </div>
            );
          })}
        </div>
        <p className="small muted">Régularité : {st.n} jour{st.n > 1 ? 's' : ''} de suite. {st.jokerLeft ? 'Un jour de repos reste pardonné cette semaine.' : 'Ton jour de repos de la semaine est utilisé.'}</p>
      </div>

      {goalsSet && !reviewedThisWeek && plan.programWeek >= 2 && (
        <div className="card">
          <h3>Bilan de tes objectifs</h3>
          <p className="small muted">2 minutes pour voir si tes objectifs de processus ont tenu cette semaine.</p>
          <button className="btn soft" onClick={() => play({ techId: 'objectifs', level: 2, source: 'libre' })}>Faire le point</button>
        </div>
      )}
    </>
  );
}

function SuggestionCard() {
  const { s, play } = useApp();
  const sug = suggestToday(s)!;
  const tech = TECH_BY_ID[sug.techId];
  const lv = tech.levels[sug.level - 1];
  return (
    <div className="card today">
      <span className="eyebrow">{sug.title} · {lv.min} min</span>
      <h2>{tech.name}</h2>
      <p><b>Niveau {lv.n} : {lv.name}.</b> {lv.goal}</p>
      <p className="small">{sug.reason}</p>
      <div className="row between">
        <div className="row" style={{ gap: 6 }}><EvidenceTag level={tech.evidence} /></div>
        <button className="btn" onClick={() => play({ techId: sug.techId, level: sug.level, source: sug.source, slotIndex: sug.slotIndex })}>Commencer</button>
      </div>
      {sug.alternative && (
        <button className="btn ghost small" onClick={() => play({ techId: sug.alternative!.techId, level: levelOf(s, sug.alternative!.techId), source: 'plan', slotIndex: sug.alternative!.slotIndex })}>
          Faire plutôt la séance prévue : {TECH_BY_ID[sug.alternative.techId].name}
        </button>
      )}
    </div>
  );
}

/** Entraînement du jour : rappel de le noter, pour relier le physique et le mental. */
function TrainingToday() {
  const { s, go } = useApp();
  const t = todayKey();
  const today = (s.workouts || []).filter((w) => w.date === t);
  const open = () => { openCarnetOn('training'); go('carnet'); };
  return (
    <div className="card">
      <div className="row between"><h2>Entraînement</h2>{today.length > 0 && <span className="tag solide">Noté</span>}</div>
      {today.length ? (
        <p className="muted small">{today.map((w) => `${w.sport} ${fmtDuration(w.durationSec)}${w.rpe ? `, effort ${w.rpe}/10` : ''}`).join(' · ')}</p>
      ) : (
        <p className="small muted">Tu t’entraînes aujourd’hui ? Note ta séance et ton ressenti pour voir l’effet de ta préparation mentale.</p>
      )}
      <button className="btn soft" style={{ alignSelf: 'flex-start' }} onClick={open}>{today.length ? 'Voir mes séances' : 'Noter une séance'}</button>
    </div>
  );
}
