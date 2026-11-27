import { useState } from 'react';
import { compDays } from '../engine/engine';
import { fmtDay, todayKey } from '../state/dates';
import { useApp } from '../app/ctx';
import { Header, RefList } from '../components/ui';
import { RoutineEditor } from './Player';

function protocol(cd: number): [string, string] {
  if (cd === 0) return ['Jour J', 'Routine d’avant-compétition, respiration, mots-clés. Le travail est fait : fais confiance à ta préparation.'];
  if (cd === 1) return ['La veille', 'Une visualisation courte de ta compétition, ton sac prêt, ton plan relu. Pas de nouvel exercice, coucher habituel.'];
  if (cd <= 3) return ['Affûtage', 'Séquence de compétition en imagerie et routine répétée. Moins d’informations anxiogènes (classements, réseaux).'];
  if (cd <= 7) return ['Mise en place', 'Ton programme passe en mode compétition : imagerie de la séquence de course ou de match, routine sous pression.'];
  return ['Construction', 'Tu suis ton programme normal. Le protocole compétition démarre automatiquement à J-7.'];
}

export function JourJ() {
  const { s, update, play } = useApp();
  const p = s.profile!;
  const cd = compDays(p);
  const t = todayKey();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [done, setDone] = useState<number[]>([]);
  const r = s.personal.routine;

  return (
    <>
      <Header />
      <h1>Jour J</h1>
      <button className="sos" onClick={() => play({ techId: 'urgence', level: 1, source: 'jourj' })}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8 12h8M12 8v8" /></svg>
        <span><b>Respiration d’urgence</b><span className="small">1 minute, expiration longue, pour faire redescendre la pression</span></span>
      </button>

      {cd === null || cd < 0 ? (
        <div className="card">
          <h2>{cd !== null && cd < 0 ? 'Compétition passée' : 'Prochaine compétition'}</h2>
          <p className="small muted">{cd !== null && cd < 0 ? `${p.compName || 'Ta compétition'} a eu lieu le ${fmtDay(p.compDate)}. Pense à ton débrief dans le Carnet, puis indique la suivante.` : 'Indique ta prochaine échéance : ton programme passera en mode compétition à J-7.'}</p>
          <label className="field">Nom<input type="text" id="cName" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Ex. Régionaux de cross" /></label>
          <label className="field">Date<input type="date" id="cDate" value={date} min={t} onChange={(e) => setDate(e.target.value)} /></label>
          <button className="btn" disabled={!date} onClick={() => update((x) => { x.profile!.compName = name.trim(); x.profile!.compDate = date; })}>Enregistrer</button>
        </div>
      ) : (
        <div className="card">
          <span className="eyebrow">{p.compName || 'Compétition'} · {fmtDay(p.compDate)}</span>
          <div className="countdown"><strong className="num">{cd === 0 ? 'J' : `J-${cd}`}</strong><span className="muted">{cd === 0 ? 'C’est aujourd’hui' : 'avant le départ'}</span></div>
          <div className="phases" aria-label="De J-7 à J">
            {Array.from({ length: 8 }, (_, k) => { const j = 7 - k; return <span key={k} className={j === cd ? 'now' : j > cd ? 'past' : ''} />; })}
          </div>
          <div><h3>{protocol(cd)[0]}</h3><p className="small muted">{protocol(cd)[1]}</p></div>
        </div>
      )}

      <div className="card">
        <h2>Ma routine</h2>
        <p className="small muted">{s.personal.trigger ? `À utiliser ${s.personal.trigger}.` : 'La routine avant ton geste clé. Garde-la courte : 3 à 5 étapes.'}</p>
        {r.length > 0 ? (
          <>
            <div>{r.map((x, k) => (
              <label className="check" key={k}><input type="checkbox" checked={done.includes(k)} onChange={(e) => setDone(e.target.checked ? [...done, k] : done.filter((y) => y !== k))} /><span>{x}</span></label>
            ))}</div>
            {done.length === r.length && <p className="small"><span className="tag solide">Prêt</span> Tu as déroulé toute ta routine.</p>}
          </>
        ) : null}
        <details>
          <summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>{r.length ? 'Modifier ma routine' : 'Créer ma routine'}</summary>
          <div style={{ marginTop: 10 }}><RoutineEditor /></div>
        </details>
      </div>

      <div className="card">
        <h3>Pourquoi une routine</h3>
        <RefList ids={['rupprecht2021']} />
      </div>
    </>
  );
}
