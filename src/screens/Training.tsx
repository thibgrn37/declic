import { useRef, useState } from 'react';
import {
  fmtDuration, mergeWorkouts, newId, parseDuration, parseGarminCsv, sessionLoad, sortWorkouts, trainingInsights, weeklyTraining,
} from '../engine/training';
import { addDays, fmtDay, parseKey, todayKey } from '../state/dates';
import type { Workout } from '../state/types';
import { useApp } from '../app/ctx';
import { Dots, RefList } from '../components/ui';

const RPE_HINT: Record<number, string> = {
  1: 'très facile', 2: 'facile', 3: 'modéré', 4: 'un peu dur', 5: 'dur', 6: 'dur', 7: 'très dur', 8: 'très dur', 9: 'presque maximal', 10: 'maximal',
};

function Rpe({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <>
      <div className="dots ten" role="group" aria-label="Effort ressenti">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button type="button" key={n} className={value === n ? 'on' : ''} aria-pressed={value === n} onClick={() => onChange(value === n ? 0 : n)}>{n}</button>
        ))}
      </div>
      <span className="small muted" style={{ fontWeight: 400 }}>{value ? `${value}/10 : ${RPE_HINT[value]}` : 'À noter environ 30 minutes après la séance.'}</span>
    </>
  );
}

interface Draft {
  id: string; date: string; time: string; sport: string; duration: string;
  hrAvg: string; hrMax: string; rpe: number; focus: number; confidence: number; note: string; source: Workout['source'];
}

const toDraft = (w: Workout): Draft => ({
  id: w.id, date: w.date, time: w.time, sport: w.sport, duration: fmtDuration(w.durationSec),
  hrAvg: w.hrAvg ? String(w.hrAvg) : '', hrMax: w.hrMax ? String(w.hrMax) : '',
  rpe: w.rpe || 0, focus: w.focus || 0, confidence: w.confidence || 0, note: w.note || '', source: w.source,
});

function fromDraft(d: Draft): Workout | null {
  const durationSec = parseDuration(d.duration);
  if (!durationSec || !d.date) return null;
  const n = (t: string) => { const v = parseInt(t, 10); return v > 0 && v < 260 ? v : undefined; };
  return {
    id: d.id, date: d.date, time: d.time, sport: d.sport.trim() || 'Entraînement', durationSec,
    hrAvg: n(d.hrAvg), hrMax: n(d.hrMax), rpe: d.rpe || undefined, focus: d.focus || undefined,
    confidence: d.confidence || undefined, note: d.note.trim() || undefined, source: d.source,
  };
}

function TrainingChart({ list }: { list: Workout[] }) {
  const weeks = weeklyTraining(list);
  const max = Math.max(60, ...weeks.map((w) => w.minutes));
  const W = 340, H = 130, l = 30, b = 20, top = 12, bw = (W - l - 8) / weeks.length;
  const y = (v: number) => top + (1 - v / max) * (H - top - b);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Minutes d’entraînement par semaine sur 8 semaines">
      {[0, max / 2, max].map((v) => (
        <g key={v}><line x1={l} x2={W - 8} y1={y(v)} y2={y(v)} stroke="var(--line)" /><text x={l - 5} y={y(v) + 3} textAnchor="end">{Math.round(v)}</text></g>
      ))}
      {weeks.map((w, i) => (
        <g key={w.week}>
          {w.minutes > 0 && <rect x={l + i * bw + 5} width={bw - 10} y={y(w.minutes)} height={y(0) - y(w.minutes)} rx="4" fill="var(--accent)" />}
          {w.load !== null && <text x={l + i * bw + bw / 2} y={y(w.minutes) - 3} textAnchor="middle">{w.load}</text>}
          <text x={l + i * bw + bw / 2} y={H - 6} textAnchor="middle">{i === weeks.length - 1 ? 'cette sem.' : i % 2 === 1 ? `${parseKey(w.week).getDate()}/${parseKey(w.week).getMonth() + 1}` : ''}</text>
        </g>
      ))}
    </svg>
  );
}

export function Training({ onDebrief }: { onDebrief: (w: Workout) => void }) {
  const { s, update } = useApp();
  const list = sortWorkouts(s.workouts || []);
  const lastSport = list[0]?.sport || s.profile?.sport || '';
  const blank = (): Draft => ({ id: newId(), date: todayKey(), time: '', sport: lastSport, duration: '', hrAvg: '', hrMax: '', rpe: 0, focus: 0, confidence: 0, note: '', source: 'manuel' });
  const [d, setD] = useState<Draft>(blank);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState('');
  const formRef = useRef<HTMLDivElement>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setMsg(''); setD({ ...d, [k]: v }); };
  const w = fromDraft(d);
  const mentalDays = new Set(s.sessions.map((x) => x.date));
  const insights = trainingInsights(s);

  const save = () => {
    if (!w) return;
    update((x) => {
      const arr = (x.workouts ||= []);
      const i = arr.findIndex((y) => y.id === w.id);
      if (i >= 0) arr[i] = w; else arr.push(w);
      x.workouts = sortWorkouts(arr);
    });
    const load = sessionLoad(w);
    setMsg(load !== null ? `Séance enregistrée. Charge : ${load} (effort ${w.rpe} × ${Math.round(w.durationSec / 60)} min).` : 'Séance enregistrée. Note ton effort ressenti pour calculer la charge.');
    setD(blank()); setEditing(false);
  };

  const importCsv = async (file: File) => {
    const found = parseGarminCsv(await file.text());
    if (!found.length) { setMsg('Aucune séance reconnue dans ce fichier. Il faut l’export CSV des activités de Garmin Connect.'); return; }
    let added = 0;
    update((x) => { const r = mergeWorkouts(x.workouts || [], found); x.workouts = r.list; added = r.added; });
    setMsg(added ? `${added} séance${added > 1 ? 's' : ''} importée${added > 1 ? 's' : ''}. Complète l’effort ressenti des plus récentes.` : 'Ces séances sont déjà dans Déclic.');
  };

  return (
    <>
      <div className="card" ref={formRef}>
        <h2>{editing ? 'Compléter la séance' : 'Nouvelle séance'}</h2>
        <p className="small muted">Ta montre mesure le corps, toi tu notes la tête. Les deux ensemble montrent ce que ta préparation mentale change à l’entraînement.</p>
        <div className="grid2">
          <label className="field">Sport<input type="text" id="wSport" value={d.sport} maxLength={40} onChange={(e) => set('sport', e.target.value)} placeholder="Squash" /></label>
          <label className="field">Durée<input type="text" id="wDur" inputMode="numeric" value={d.duration} onChange={(e) => set('duration', e.target.value)} placeholder="59:45" /></label>
          <label className="field">Date<input type="date" id="wDate" value={d.date} max={todayKey()} onChange={(e) => set('date', e.target.value)} /></label>
          <label className="field">Heure<input type="time" id="wTime" value={d.time} onChange={(e) => set('time', e.target.value)} /></label>
          <label className="field">FC moyenne<input type="number" id="wAvg" inputMode="numeric" value={d.hrAvg} onChange={(e) => set('hrAvg', e.target.value)} placeholder="bpm" /></label>
          <label className="field">FC max<input type="number" id="wMax" inputMode="numeric" value={d.hrMax} onChange={(e) => set('hrMax', e.target.value)} placeholder="bpm" /></label>
        </div>
        <div className="field"><span>Effort ressenti <span className="muted small" style={{ fontWeight: 400 }}>de 1 (très facile) à 10 (maximal)</span></span><Rpe value={d.rpe} onChange={(v) => set('rpe', v)} /></div>
        <div className="field"><span>Concentration pendant la séance</span><Dots value={d.focus} onChange={(v) => set('focus', v)} label="Concentration" /></div>
        <div className="field"><span>Confiance pendant la séance</span><Dots value={d.confidence} onChange={(v) => set('confidence', v)} label="Confiance" /></div>
        <label className="field">Note<input type="text" id="wNote" value={d.note} maxLength={200} onChange={(e) => set('note', e.target.value)} placeholder="Ex. bien resté dans l’échange après les fautes" /></label>
        <div className="row">
          <button className="btn" id="wSave" disabled={!w} onClick={save}>{editing ? 'Enregistrer' : 'Ajouter la séance'}</button>
          {editing && <button className="btn ghost" onClick={() => { setD(blank()); setEditing(false); }}>Annuler</button>}
        </div>
        {msg && <p className="small">{msg}</p>}
      </div>

      <div className="card">
        <h2>Importer depuis Garmin</h2>
        <p className="small muted">Sur connect.garmin.com : Activités, Toutes les activités, puis « Exporter en CSV ». Choisis ce fichier ici. Les séances déjà présentes sont ignorées.</p>
        <label className="btn ghost" style={{ alignSelf: 'flex-start', cursor: 'pointer' }}>
          Choisir le fichier CSV
          <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = ''; }} />
        </label>
      </div>

      {list.length > 0 && (
        <div className="card">
          <h2>Charge d’entraînement</h2>
          <TrainingChart list={list} />
          <p className="small muted">Minutes par semaine. Le chiffre au-dessus d’une barre est la charge (effort × minutes) des séances dont l’effort est noté.</p>
          <h3>Ton mental à l’entraînement</h3>
          {insights.length ? (
            <div className="stack">{insights.map((x) => <p key={x.text} className={`small insight ${x.tone}`}>{x.text}</p>)}</div>
          ) : (
            <p className="small muted">Note ton effort et ta concentration sur quelques séances, avec et sans séance Déclic la veille. Dès 3 séances de chaque côté, les écarts apparaissent ici. Ce sont des tendances, pas des preuves.</p>
          )}
          <details><summary className="small">Sources</summary><RefList ids={['foster2001', 'haddad2017', 'vancutsem2017']} /></details>
        </div>
      )}

      <div className="card">
        <h2>Mes séances</h2>
        {list.length === 0 ? <p className="muted">Tes séances apparaîtront ici, avec ton état mental du jour.</p> :
          list.slice(0, 40).map((x) => {
            const load = sessionLoad(x);
            const ci = s.checkins[x.date];
            const prep = mentalDays.has(x.date) ? 'Séance Déclic le jour même' : mentalDays.has(addDays(x.date, -1)) ? 'Séance Déclic la veille' : '';
            return (
              <div className="entry" key={x.id}>
                <div className="row between">
                  <h3>{x.sport}</h3>
                  <span className="small muted">{fmtDay(x.date)}{x.time ? ` · ${x.time.replace(':', ' h ')}` : ''}</span>
                </div>
                <p className="small num">
                  {fmtDuration(x.durationSec)}
                  {x.hrAvg ? ` · FC moy ${x.hrAvg}` : ''}{x.hrMax ? ` · max ${x.hrMax}` : ''}
                  {x.rpe ? ` · effort ${x.rpe}/10` : ''}{load !== null ? ` · charge ${load}` : ''}
                </p>
                {(x.focus || x.confidence || ci || prep) && (
                  <p className="small muted">
                    {[x.focus && `concentration ${x.focus}/5`, x.confidence && `confiance ${x.confidence}/5`, ci && `sommeil ${ci.sleep}/5, stress ${ci.stress}/5`].filter(Boolean).join(' · ')}
                  </p>
                )}
                {prep && <span className="tag solide" style={{ alignSelf: 'flex-start' }}>{prep}</span>}
                {x.note && <p className="small">{x.note}</p>}
                <div className="row">
                  <button className="link small" onClick={() => { setD(toDraft(x)); setEditing(true); setMsg(''); formRef.current?.scrollIntoView({ behavior: 'smooth' }); }}>{x.rpe ? 'Modifier' : 'Noter l’effort'}</button>
                  <button className="link small" onClick={() => onDebrief(x)}>Débriefer</button>
                  <button className="link small" style={{ color: 'var(--muted)' }} onClick={() => update((y) => { y.workouts = (y.workouts || []).filter((z) => z.id !== x.id); })}>Supprimer</button>
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
}
