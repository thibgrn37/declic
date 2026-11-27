import { useState } from 'react';
import { ISSUES, compDays } from '../engine/engine';
import { fmtDay, todayKey } from '../state/dates';
import type { Debrief, IssueKey } from '../state/types';
import { useApp } from '../app/ctx';
import { Choice, Dots, Header } from '../components/ui';

export function Carnet() {
  const { s, update } = useApp();
  const cd = compDays(s.profile);
  const empty = (): Debrief => ({ date: todayKey(), title: cd !== null && cd <= 0 && cd > -4 ? s.profile?.compName || '' : '', kind: 'competition', feel: 0, good: '', bad: '', keep: '', issue: '' });
  const [d, setD] = useState<Debrief>(empty);
  const [saved, setSaved] = useState('');
  const set = <K extends keyof Debrief>(k: K, v: Debrief[K]) => { setSaved(''); setD({ ...d, [k]: v }); };
  const canSave = d.good.trim() || d.bad.trim() || d.keep.trim();

  return (
    <>
      <Header />
      <h1>Carnet</h1>
      <div className="card">
        <h2>Nouveau débrief</h2>
        <p className="small muted">Après une compétition ou un entraînement important. Ce que tu notes oriente tes prochaines séances.</p>
        <Choice label="Type" value={d.kind} onChange={(v) => set('kind', v)} options={[{ v: 'competition', label: 'Compétition' }, { v: 'entrainement', label: 'Entraînement' }]} />
        <label className="field">Événement<input type="text" id="dTitle" value={d.title} maxLength={100} onChange={(e) => set('title', e.target.value)} placeholder="Ex. Match contre Villeurbanne" /></label>
        <div className="field"><span>Ressenti global</span><Dots value={d.feel} onChange={(v) => set('feel', v)} label="Ressenti global" /></div>
        <label className="field">Ce qui a marché<textarea id="dGood" value={d.good} maxLength={1000} onChange={(e) => set('good', e.target.value)} placeholder="Un moment où j’étais pleinement dans l’action…" /></label>
        <label className="field">Ce qui m’a sorti de ma performance<textarea id="dBad" value={d.bad} maxLength={1000} onChange={(e) => set('bad', e.target.value)} placeholder="Une erreur, une pensée, un bruit…" /></label>
        <div className="field"><span>Le principal obstacle mental, s’il y en a eu un</span>
          <Choice label="Obstacle" value={d.issue} onChange={(v) => set('issue', v)}
            options={[{ v: '' as IssueKey | '', label: 'Aucun' }, ...(Object.keys(ISSUES) as IssueKey[]).map((k) => ({ v: k as IssueKey | '', label: ISSUES[k] }))]} />
        </div>
        <label className="field">Ce que je garde pour la prochaine fois<textarea id="dKeep" value={d.keep} maxLength={1000} onChange={(e) => set('keep', e.target.value)} placeholder="Une seule chose concrète" /></label>
        <button className="btn" disabled={!canSave} onClick={() => {
          update((x) => { x.debriefs.unshift({ ...d, title: d.title.trim(), date: todayKey() }); });
          setSaved(d.issue ? `Obstacle noté : ${ISSUES[d.issue].toLowerCase()}. Ton programme de la semaine prochaine en tient compte.` : 'Débrief enregistré.'); setD(empty());
        }}>Enregistrer le débrief</button>
        {saved && <p className="small"><span className="tag solide">Enregistré</span> {saved}</p>}
      </div>
      <div className="card">
        <h2>Mes débriefs</h2>
        {s.debriefs.length === 0 ? <p className="muted">Ton premier débrief apparaîtra ici. Si tu signales un obstacle mental, la semaine suivante cible cette compétence.</p> :
          s.debriefs.map((x, k) => (
            <div className="entry" key={k}>
              <div className="row between"><h3>{x.title || (x.kind === 'competition' ? 'Compétition' : 'Entraînement')}</h3><span className="small muted">{fmtDay(x.date)}{x.feel ? ` · ${x.feel}/5` : ''}</span></div>
              {x.issue && <span className="tag prometteur" style={{ alignSelf: 'flex-start' }}>{ISSUES[x.issue]}</span>}
              <dl>
                {x.good && <><dt>Marché</dt><dd>{x.good}</dd></>}
                {x.bad && <><dt>Sorti</dt><dd>{x.bad}</dd></>}
                {x.keep && <><dt>Je garde</dt><dd>{x.keep}</dd></>}
              </dl>
            </div>
          ))}
      </div>
    </>
  );
}
