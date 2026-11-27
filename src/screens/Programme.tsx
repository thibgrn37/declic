import { useState } from 'react';
import { SKILLS, TECHNIQUES, TECH_BY_ID } from '../content/techniques';
import { PHASES, levelOf, phaseOf, priorities, programWeek } from '../engine/engine';
import { useApp } from '../app/ctx';
import { EvidenceTag, Header, RefList } from '../components/ui';

export function Programme() {
  const { s } = useApp();
  const [open, setOpen] = useState<string | null>(null);
  if (open) return <TechDetail id={open} onBack={() => setOpen(null)} />;
  const w = programWeek(s);
  const ph = phaseOf(w);
  const prio = priorities(s);
  return (
    <>
      <Header />
      <h1>Programme</h1>
      <div className="card">
        <div className="row between"><span className="eyebrow">Semaine {Math.min(w, 8)} sur 8{w > 8 ? ' · cycle suivant' : ''}</span><span className="tag">{PHASES[ph].name}</span></div>
        <div className="phases" aria-label="Avancement du programme">
          {Array.from({ length: 8 }, (_, k) => <span key={k} className={k + 1 === Math.min(w, 8) ? 'now' : k + 1 < w ? 'past' : ''} />)}
        </div>
        <p className="small muted">{PHASES[ph].text}</p>
        <p className="small">Priorités actuelles : <b>{SKILLS[prio[0].skill]}</b> puis <b>{SKILLS[prio[1].skill]}</b>{prio[0].fromDebrief ? ' (signalé dans tes débriefs)' : ''}.</p>
      </div>
      <h2>Techniques</h2>
      <p className="small muted">Ta maîtrise de chaque technique. Touche une technique pour voir ses niveaux, les études qui la soutiennent, et t’entraîner librement.</p>
      {TECHNIQUES.map((t) => {
        const lv = levelOf(s, t.id);
        const count = s.sessions.filter((x) => x.techId === t.id).length;
        return (
          <button className="tech" key={t.id} onClick={() => { setOpen(t.id); window.scrollTo(0, 0); }}>
            <div className="row between" style={{ width: '100%' }}><h3>{t.name}</h3><EvidenceTag level={t.evidence} /></div>
            <div className="levels" style={{ width: '100%' }}>{t.levels.map((l) => <span key={l.n} className={l.n <= lv ? 'on' : ''} />)}</div>
            <span className="small muted">Niveau {lv} sur {t.levels.length} : {t.levels[lv - 1].name} · {count} séance{count > 1 ? 's' : ''}</span>
          </button>
        );
      })}
    </>
  );
}

function TechDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { s, play } = useApp();
  const t = TECH_BY_ID[id];
  const lv = levelOf(s, id);
  const logs = s.sessions.filter((x) => x.techId === id).slice(-5).reverse();
  return (
    <>
      <button className="link" onClick={onBack}>← Programme</button>
      <h1>{t.name}</h1>
      <div className="row"><EvidenceTag level={t.evidence} />{t.skills.map((k) => <span key={k} className="tag plain">{SKILLS[k]}</span>)}</div>
      <div className="card"><h3>Pourquoi ça marche</h3><p>{t.why}</p></div>
      <div className="card">
        <h3>Niveaux</h3>
        {t.levels.map((l) => (
          <div className="lvl-row" key={l.n}>
            <div><b>{l.n}. {l.name}</b>{l.n === lv && <span className="tag" style={{ marginLeft: 8 }}>Ton niveau</span>}<br /><span className="small muted">{l.goal} · {l.min} min</span></div>
            {l.n <= lv
              ? <button className="btn soft small" onClick={() => play({ techId: id, level: l.n, source: 'libre' })}>S’entraîner</button>
              : <span className="small muted">À débloquer</span>}
          </div>
        ))}
        <p className="small muted">Tu passes au niveau suivant après deux séances notées 4 ou 5. Deux séances notées 1 ou 2 te font consolider le niveau précédent.</p>
      </div>
      {logs.length > 0 && (
        <div className="card">
          <h3>Tes dernières séances</h3>
          {logs.map((x, k) => (
            <div key={k} className="row between small"><span>{x.date.split('-').reverse().slice(0, 2).join('/')} · niveau {x.level}</span><span className="muted">ressenti {x.rating}/5 · utilité {x.useful}/5</span></div>
          ))}
        </div>
      )}
      <div className="card"><h3>Sources</h3><RefList ids={t.refs} /></div>
    </>
  );
}
