import { useMemo, useState } from 'react';
import { ISSUES, compDays } from '../engine/engine';
import { detectIssues } from '../engine/debrief';
import { diffDays, fmtDay, todayKey } from '../state/dates';
import type { Debrief, IssueKey, Workout } from '../state/types';
import { Training } from './Training';
import { fmtDuration } from '../engine/training';
import { useApp } from '../app/ctx';
import { Choice, Dots, Header } from '../components/ui';

/** Ressenti et performance perçue sur les derniers débriefs. */
function Trend({ list }: { list: Debrief[] }) {
  const pts = list.filter((d) => d.feel || d.perf).slice(0, 12).reverse();
  if (pts.length < 2) return <p className="small muted">La courbe apparaît à partir de deux débriefs notés.</p>;
  const W = 340, H = 130, l = 22, r = 10, t = 10, b = 22;
  const x = (i: number) => l + (i * (W - l - r)) / Math.max(1, pts.length - 1);
  const y = (v: number) => t + ((5 - v) * (H - t - b)) / 4;
  const line = (key: 'feel' | 'perf', col: string) => {
    let d = '';
    let pen = false;
    pts.forEach((p, i) => { const v = p[key]; if (v) { d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `; pen = true; } else pen = false; });
    return (
      <g>
        <path d={d} fill="none" stroke={col} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (p[key] ? <circle key={i} cx={x(i)} cy={y(p[key]!)} r="3" fill={col} /> : null))}
      </g>
    );
  };
  return (
    <>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ressenti et performance sur les derniers débriefs">
        {[1, 3, 5].map((v) => <g key={v}><line x1={l} x2={W - r} y1={y(v)} y2={y(v)} stroke="var(--line)" /><text x={l - 6} y={y(v) + 3} textAnchor="end">{v}</text></g>)}
        <text x={x(0)} y={H - 6}>{fmtDay(pts[0].date)}</text>
        <text x={x(pts.length - 1)} y={H - 6} textAnchor="end">{fmtDay(pts[pts.length - 1].date)}</text>
        {line('feel', 'var(--accent)')}
        {line('perf', 'var(--gold)')}
      </svg>
      <div className="legend"><span><i style={{ background: 'var(--accent)' }} />Ressenti</span><span><i style={{ background: 'var(--gold)' }} />Performance perçue</span></div>
    </>
  );
}

function ObstacleCounts({ list }: { list: Debrief[] }) {
  const counts = new Map<IssueKey, number>();
  for (const d of list) {
    if (diffDays(d.date, todayKey()) > 60) continue;
    const keys = new Set<IssueKey>([...(d.issue ? [d.issue] : []), ...(d.detected || [])]);
    keys.forEach((k) => counts.set(k, (counts.get(k) || 0) + 1));
  }
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!rows.length) return <p className="small muted">Aucun obstacle mental relevé ces deux derniers mois.</p>;
  const max = rows[0][1];
  return (
    <div className="stack">
      {rows.map(([k, n]) => (
        <div className="skill" key={k}>
          <span className="small">{ISSUES[k]}</span><span className="small num muted">{n} débrief{n > 1 ? 's' : ''}</span>
          <div className="bar"><span style={{ width: `${(n / max) * 100}%`, background: 'var(--gold)' }} /></div>
        </div>
      ))}
    </div>
  );
}

type View = 'debriefs' | 'training';
let nextView: View | null = null;
/** Ouvre le Carnet sur une vue donnée (depuis l'écran Aujourd'hui). */
export const openCarnetOn = (v: View) => { nextView = v; };

export function Carnet() {
  const [view, setView] = useState<View>(() => { const v = nextView || 'debriefs'; nextView = null; return v; });
  const { s, update } = useApp();
  const cd = compDays(s.profile);
  const empty = (): Debrief => ({ date: todayKey(), title: cd !== null && cd <= 0 && cd > -4 ? s.profile?.compName || '' : '', kind: 'competition', feel: 0, perf: 0, good: '', bad: '', keep: '', issue: '' });
  const [d, setD] = useState<Debrief>(empty);
  const [touchedIssue, setTouchedIssue] = useState(false);
  const [saved, setSaved] = useState('');
  const [from, setFrom] = useState<Workout | null>(null);
  const set = <K extends keyof Debrief>(k: K, v: Debrief[K]) => { setSaved(''); setD({ ...d, [k]: v }); };
  const canSave = d.good.trim() || d.bad.trim() || d.keep.trim();
  const detected = useMemo(() => detectIssues(`${d.bad} ${d.good}`).map((x) => x.issue), [d.bad, d.good]);
  // Tant que l'utilisateur n'a pas choisi lui-même, l'obstacle principal suit la détection.
  const issue: IssueKey | '' = touchedIssue ? d.issue : detected[0] || '';

  const debriefWorkout = (w: Workout) => {
    setD({ ...empty(), kind: 'entrainement', date: w.date, title: `${w.sport}, ${fmtDay(w.date)}`, good: '', perf: 0 });
    setTouchedIssue(false); setSaved(''); setFrom(w);
    setView('debriefs'); window.scrollTo(0, 0);
  };
  return (
    <>
      <Header />
      <h1>Carnet</h1>
      <Choice label="Vue du carnet" value={view} onChange={setView} options={[{ v: 'debriefs', label: 'Débriefs' }, { v: 'training', label: 'Entraînements' }]} />
      {view === 'training' ? <Training onDebrief={debriefWorkout} /> : <>
      <div className="card">
        <h2>Nouveau débrief</h2>
        <p className="small muted">{from ? `Séance de ${from.sport} du ${fmtDay(from.date)} (${fmtDuration(from.durationSec)}${from.rpe ? `, effort ${from.rpe}/10` : ''}).` : 'Après une compétition ou un entraînement important. Ce que tu notes oriente tes prochaines séances.'}</p>
        <Choice label="Type" value={d.kind} onChange={(v) => set('kind', v)} options={[{ v: 'competition', label: 'Compétition' }, { v: 'entrainement', label: 'Entraînement' }]} />
        <label className="field">Événement<input type="text" id="dTitle" value={d.title} maxLength={100} onChange={(e) => set('title', e.target.value)} placeholder="Ex. Match contre Villeurbanne" /></label>
        <div className="field"><span>Ressenti global <span className="muted small" style={{ fontWeight: 400 }}>comment tu t’es senti</span></span><Dots value={d.feel} onChange={(v) => set('feel', v)} label="Ressenti global" /></div>
        <div className="field"><span>Performance <span className="muted small" style={{ fontWeight: 400 }}>selon toi, par rapport à ton niveau</span></span><Dots value={d.perf || 0} onChange={(v) => set('perf', v)} label="Performance perçue" /></div>
        <label className="field">Ce qui a marché<textarea id="dGood" value={d.good} maxLength={1000} onChange={(e) => set('good', e.target.value)} placeholder="Un moment où j’étais pleinement dans l’action…" /></label>
        <label className="field">Ce qui m’a sorti de ma performance<textarea id="dBad" value={d.bad} maxLength={1000} onChange={(e) => set('bad', e.target.value)} placeholder="Une erreur, une pensée, un bruit… Écris librement : Déclic repère les obstacles." /></label>
        {detected.length > 0 && (
          <p className="small">Repéré dans ton texte : {detected.map((k) => <span key={k} className="tag prometteur" style={{ marginRight: 4 }}>{ISSUES[k]}</span>)}</p>
        )}
        <div className="field"><span>Le principal obstacle mental</span>
          <Choice label="Obstacle" value={issue} onChange={(v) => { setTouchedIssue(true); set('issue', v); }}
            options={[{ v: '' as IssueKey | '', label: 'Aucun' }, ...(Object.keys(ISSUES) as IssueKey[]).map((k) => ({ v: k as IssueKey | '', label: ISSUES[k] }))]} />
        </div>
        <label className="field">Ce que je garde pour la prochaine fois<textarea id="dKeep" value={d.keep} maxLength={1000} onChange={(e) => set('keep', e.target.value)} placeholder="Une seule chose concrète" /></label>
        <button className="btn" disabled={!canSave} onClick={() => {
          update((x) => { x.debriefs.unshift({ ...d, issue, detected, title: d.title.trim(), date: from ? d.date : todayKey() }); });
          setSaved(issue ? `Obstacle noté : ${ISSUES[issue].toLowerCase()}. Tes prochaines semaines en tiennent compte.` : 'Tu le retrouves ci-dessous.');
          setD(empty());
          setTouchedIssue(false);
          setFrom(null);
        }}>Enregistrer le débrief</button>
        {saved && <p className="small"><span className="tag solide">Enregistré</span> {saved}</p>}
      </div>
      {s.debriefs.length > 0 && (
        <div className="card">
          <h2>Tendances</h2>
          <Trend list={s.debriefs} />
          <h3>Obstacles des 2 derniers mois</h3>
          <ObstacleCounts list={s.debriefs} />
        </div>
      )}
      <div className="card">
        <h2>Mes débriefs</h2>
        {s.debriefs.length === 0 ? <p className="muted">Ton premier débrief apparaîtra ici. Les obstacles que tu signales orientent les semaines suivantes.</p> :
          s.debriefs.map((x, k) => (
            <div className="entry" key={k}>
              <div className="row between"><h3>{x.title || (x.kind === 'competition' ? 'Compétition' : 'Entraînement')}</h3><span className="small muted">{fmtDay(x.date)}{x.feel ? ` · ressenti ${x.feel}/5` : ''}{x.perf ? ` · perf ${x.perf}/5` : ''}</span></div>
              {x.issue && <span className="tag prometteur" style={{ alignSelf: 'flex-start' }}>{ISSUES[x.issue]}</span>}
              <dl>
                {x.good && <><dt>Marché</dt><dd>{x.good}</dd></>}
                {x.bad && <><dt>Sorti</dt><dd>{x.bad}</dd></>}
                {x.keep && <><dt>Je garde</dt><dd>{x.keep}</dd></>}
              </dl>
            </div>
          ))}
      </div>
      </>}
    </>
  );
}
