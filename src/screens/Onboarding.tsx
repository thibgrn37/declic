import { useState } from 'react';
import { ITEMS, SCALE } from '../content/assessment';
import { SKILLS, SPORT_TYPES, TECH_BY_ID, type SkillKey, type SportType } from '../content/techniques';
import { PHASES, buildWeek, initialLevels, latestAssessment, priorities, scoreAssessment } from '../engine/engine';
import { mondayOf, todayKey } from '../state/dates';
import type { Assessment, Profile } from '../state/types';
import { useApp } from '../app/ctx';
import { Choice, Coach, Radar } from '../components/ui';

const DEFAULT_PROFILE: Profile = {
  name: '', sport: '', sportType: 'collectif', level: 'regional', minutes: 10, perWeek: 4, experience: false, compName: '', compDate: '',
};

export function ProfileForm({ value, onChange }: { value: Profile; onChange: (p: Profile) => void }) {
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="stack" style={{ gap: 14 }}>
      <label className="field">Prénom<input type="text" id="pName" value={value.name} maxLength={40} onChange={(e) => set('name', e.target.value)} placeholder="Ton prénom" /></label>
      <label className="field">Sport<input type="text" id="pSport" value={value.sport} maxLength={40} onChange={(e) => set('sport', e.target.value)} placeholder="Ex. trail, tennis, handball" /></label>
      <div className="field"><span>Ce qui compte le plus dans ton sport</span>
        <Choice label="Type de sport" value={value.sportType} onChange={(v: SportType) => set('sportType', v)}
          options={(Object.keys(SPORT_TYPES) as SportType[]).map((k) => ({ v: k, label: SPORT_TYPES[k].label, hint: SPORT_TYPES[k].hint }))} />
      </div>
      <div className="field"><span>Niveau</span>
        <Choice label="Niveau" value={value.level} onChange={(v) => set('level', v)} options={[{ v: 'loisir', label: 'Loisir' }, { v: 'regional', label: 'Compétition régionale' }, { v: 'national', label: 'National et plus' }]} />
      </div>
      <div className="field"><span>Séances de préparation mentale par semaine</span>
        <Choice label="Séances par semaine" value={value.perWeek} onChange={(v) => set('perWeek', v)} options={[{ v: 3, label: '3' }, { v: 4, label: '4' }, { v: 5, label: '5' }]} />
      </div>
      <div className="field"><span>As-tu déjà fait de la préparation mentale ?</span>
        <Choice label="Expérience" value={value.experience} onChange={(v) => set('experience', v)} options={[{ v: false, label: 'Non, jamais' }, { v: true, label: 'Oui' }]} />
      </div>
      <label className="field">Prochaine compétition<span className="muted small">Facultatif : active le protocole Jour J</span>
        <input type="text" id="pComp" value={value.compName} maxLength={80} onChange={(e) => set('compName', e.target.value)} placeholder="Ex. Régionaux de cross" /></label>
      <label className="field">Date<input type="date" id="pDate" value={value.compDate} onChange={(e) => set('compDate', e.target.value)} /></label>
    </div>
  );
}

function Bilan({ onDone, intro }: { onDone: (answers: Record<string, number>) => void; intro: string }) {
  const [ans, setAns] = useState<Record<string, number>>({});
  const n = Object.keys(ans).length;
  return (
    <div className="card">
      <div className="row between"><h2>Bilan mental</h2><span className="small muted num">{n}/{ITEMS.length}</span></div>
      <p className="small muted">{intro}</p>
      {ITEMS.map((it, k) => (
        <div className="q" key={it.id}>
          <span><span className="muted num">{k + 1}.</span> {it.text}</span>
          <div className="scale5" role="group" aria-label={it.text}>
            {SCALE.map((l, v) => (
              <button type="button" key={l} className={ans[it.id] === v + 1 ? 'on' : ''} aria-pressed={ans[it.id] === v + 1} onClick={() => setAns({ ...ans, [it.id]: v + 1 })}>{l}</button>
            ))}
          </div>
        </div>
      ))}
      <button className="btn wide" disabled={n < ITEMS.length} onClick={() => onDone(ans)}>{n < ITEMS.length ? `Encore ${ITEMS.length - n} réponse${ITEMS.length - n > 1 ? 's' : ''}` : 'Voir mon profil'}</button>
    </div>
  );
}

function SkillBars({ a, prev }: { a: Assessment; prev?: Assessment }) {
  return (
    <div className="stack">
      {(Object.keys(SKILLS) as SkillKey[]).map((k) => {
        const d = prev ? a.scores[k] - prev.scores[k] : 0;
        return (
          <div className="skill" key={k}>
            <span>{SKILLS[k]}</span>
            <span className="num small">{a.scores[k]}/100 {prev && d !== 0 && <span className={d > 0 ? 'delta-up' : 'delta-down'}>{d > 0 ? '+' : ''}{d}</span>}</span>
            <div className="bar"><span style={{ width: `${Math.max(3, a.scores[k])}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

export { SkillBars };

/** Premier lancement : profil, bilan, puis présentation du programme. */
export function Onboarding() {
  const { s, replace } = useApp();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [profile, setProfile] = useState<Profile>(s.profile || DEFAULT_PROFILE);
  const [assessment, setAssessment] = useState<Assessment | null>(null);

  if (step === 0) {
    return (
      <div className="app">
        <div className="top"><div className="brand"><i />Déclic</div></div>
        <h1>Ton mental s’entraîne comme ton corps</h1>
        <Coach title="Flint">Je suis ton coach mental. En 4 minutes, on fait ton bilan et je construis un programme de 8 semaines adapté à ton sport et à tes points faibles.</Coach>
        <div className="card">
          <h3>Comment ça marche</h3>
          <div className="stack small">
            <p><b>Des exercices validés.</b> Imagerie mentale, dialogue interne, routines, objectifs, respiration lente, attention : chaque technique cite les études qui la soutiennent.</p>
            <p><b>Des niveaux progressifs.</b> Chaque technique a 2 à 4 niveaux. Tu montes quand tu maîtrises, tu consolides quand c’est encore dur.</p>
            <p><b>Un programme qui s’adapte.</b> Ton check-in du jour, ton ressenti après chaque séance et tes débriefs de compétition modifient ce qui t’est proposé.</p>
          </div>
        </div>
        <button className="btn wide" onClick={() => setStep(1)}>Commencer mon bilan</button>
        <p className="small muted">Déclic est un outil d’entraînement mental, pas un soin. Si tu traverses une période difficile, parles-en à un professionnel de santé.</p>
      </div>
    );
  }
  if (step === 1) {
    return (
      <div className="app">
        <span className="eyebrow">Étape 1 sur 3</span>
        <h1>Ton profil</h1>
        <div className="card"><ProfileForm value={profile} onChange={setProfile} /></div>
        <button className="btn wide" disabled={!profile.sport.trim()} onClick={() => { setStep(2); window.scrollTo(0, 0); }}>Continuer</button>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="app">
        <span className="eyebrow">Étape 2 sur 3</span>
        <h1>Ton bilan</h1>
        <Bilan intro="Réponds en pensant à tes compétitions des derniers mois. Il n’y a pas de bonne réponse : plus tu es honnête, plus ton programme sera juste. Ce bilan est indicatif, ce n’est pas un test clinique."
          onDone={(ans) => { setAssessment(scoreAssessment(ans)); setStep(3); window.scrollTo(0, 0); }} />
      </div>
    );
  }
  // Étape 3 : résultat et programme
  const a = assessment!;
  const draft = { ...s, profile: { ...profile, name: profile.name.trim(), sport: profile.sport.trim() }, assessments: [a], programStart: mondayOf(todayKey()), plans: {} };
  draft.levels = initialLevels(a, draft.profile);
  const prio = priorities(draft);
  const week = buildWeek(draft, mondayOf(todayKey()));
  return (
    <div className="app">
      <span className="eyebrow">Étape 3 sur 3</span>
      <h1>Ton profil mental</h1>
      <div className="card">
        <Radar current={a.scores} />
        <SkillBars a={a} />
      </div>
      <Coach title="Ce que je retiens">
        Ton point fort : <strong>{SKILLS[prio[prio.length - 1].skill].toLowerCase()}</strong>. On va surtout travailler {SKILLS[prio[0].skill].toLowerCase()} et {SKILLS[prio[1].skill].toLowerCase()}.
        {a.imagery <= 3 ? ' Tes images mentales sont encore peu nettes : l’imagerie commencera par l’éveil des sens.' : ' Tes images mentales sont nettes : l’imagerie démarre directement sur ton geste clé.'}
      </Coach>
      <div className="card">
        <h2>Ton programme de 8 semaines</h2>
        {[1, 2, 3].map((ph) => (
          <div key={ph}><h3>{ph === 1 ? 'Semaines 1-2' : ph === 2 ? 'Semaines 3-5' : 'Semaines 6-8'} · {PHASES[ph].name}</h3><p className="small muted">{PHASES[ph].text}</p></div>
        ))}
        <p className="small">Après 4 semaines, tu refais le bilan pour mesurer tes progrès et réajuster.</p>
      </div>
      <div className="card">
        <h2>Cette semaine</h2>
        <ol className="stack" style={{ margin: 0, paddingLeft: 20 }}>
          {week.slots.map((sl, k) => <li key={k}><b>{TECH_BY_ID[sl.techId].name}</b><br /><span className="small muted">{sl.reason}</span></li>)}
        </ol>
      </div>
      <button className="btn wide" onClick={() => {
        const next = { ...draft, plans: { [week.wk]: week } };
        replace(next);
      }}>Démarrer mon programme</button>
      <button className="link" onClick={() => setStep(2)}>Refaire le bilan</button>
    </div>
  );
}

/** Bilan intermédiaire, toutes les 4 semaines. */
export function Reassess({ onClose }: { onClose: () => void }) {
  const { s, update } = useApp();
  const [result, setResult] = useState<Assessment | null>(null);
  const prev = latestAssessment(s);
  const first = s.assessments[0];
  return (
    <div className="player"><div className="in">
      <div className="row between"><span className="eyebrow">Nouveau bilan</span><button className="btn ghost small" onClick={onClose}>Fermer</button></div>
      {!result ? (
        <Bilan intro="Réponds en pensant à tes dernières semaines d’entraînement et de compétition." onDone={(ans) => {
          const a = scoreAssessment(ans);
          update((st) => { st.assessments.push(a); });
          setResult(a);
        }} />
      ) : (
        <div className="card result">
          <h2>Tes progrès</h2>
          <Radar current={result.scores} first={first?.scores} />
          <p className="small muted">En pointillé : ton premier bilan.</p>
          <SkillBars a={result} prev={prev} />
          <p className="small">Les séances des prochaines semaines visent maintenant tes nouveaux points faibles.</p>
          <button className="btn wide" onClick={onClose}>Continuer</button>
        </div>
      )}
    </div></div>
  );
}
