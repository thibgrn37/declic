import { useState } from 'react';
import { BADGES, latestAssessment } from '../engine/engine';
import { addDays, fmtDay, mondayOf, todayKey } from '../state/dates';
import { freshState } from '../state/store';
import type { Profile } from '../state/types';
import { useApp } from '../app/ctx';
import { Header, Medal, Radar } from '../components/ui';
import { ProfileForm, SkillBars } from './Onboarding';
import { VoiceCard } from '../components/VoiceCard';
import { AssessmentTrend } from '../components/AssessmentTrend';
import { RemindersCard } from '../components/Reminders';

const STATUS: Record<string, string> = {
  chargement: 'Chargement…', compte: 'Enregistré dans ton compte', appareil: 'Enregistré sur cet appareil',
  erreur: 'Non enregistré dans le compte, gardé sur cet appareil', enregistrement: 'Enregistrement…',
};

function CheckinChart() {
  const { s } = useApp();
  const t = todayKey();
  const days = Array.from({ length: 14 }, (_, i) => addDays(t, i - 13));
  const W = 340, H = 130, l = 22, r = 8, top = 10, b = 22;
  const x = (i: number) => l + (i * (W - l - r)) / 13;
  const y = (v: number) => top + ((5 - v) * (H - top - b)) / 4;
  const line = (key: 'mood' | 'stress', col: string) => {
    let d = '';
    let pen = false;
    days.forEach((k, i) => {
      const c = s.checkins[k];
      if (c) { d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(c[key]).toFixed(1)} `; pen = true; } else pen = false;
    });
    return (
      <g>
        <path d={d} fill="none" stroke={col} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {days.map((k, i) => (s.checkins[k] ? <circle key={k} cx={x(i)} cy={y(s.checkins[k][key])} r="3" fill={col} /> : null))}
      </g>
    );
  };
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Humeur et stress sur 14 jours">
      {[1, 3, 5].map((v) => (
        <g key={v}><line x1={l} x2={W - r} y1={y(v)} y2={y(v)} stroke="var(--line)" /><text x={l - 6} y={y(v) + 3} textAnchor="end">{v}</text></g>
      ))}
      {[0, 7, 13].map((i) => <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === 13 ? 'end' : 'middle'}>{i === 13 ? 'auj.' : fmtDay(days[i])}</text>)}
      {line('mood', 'var(--accent)')}
      {line('stress', 'var(--warn)')}
    </svg>
  );
}

function WeeksChart() {
  const { s } = useApp();
  const wk = mondayOf(todayKey());
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(wk, (i - 7) * 7));
  const counts = weeks.map((w) => s.sessions.filter((x) => mondayOf(x.date) === w).length);
  const target = s.profile?.perWeek || 4;
  const max = Math.max(target, ...counts, 1);
  const W = 340, H = 120, l = 22, b = 20, top = 10, bw = (W - l - 8) / 8;
  const y = (v: number) => top + (1 - v / max) * (H - top - b);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Séances par semaine sur 8 semaines">
      <line x1={l} x2={W - 8} y1={y(target)} y2={y(target)} stroke="var(--accent)" strokeDasharray="4 4" />
      <text x={l - 6} y={y(target) + 3} textAnchor="end">{target}</text>
      <text x={l - 6} y={y(0) + 3} textAnchor="end">0</text>
      {counts.map((c, i) => (
        <g key={i}>
          <rect x={l + i * bw + 4} y={y(c)} width={bw - 8} height={Math.max(0, y(0) - y(c))} rx="3" fill={i === 7 ? 'var(--accent)' : 'var(--accent-soft)'} />
          {c > 0 && <text x={l + i * bw + bw / 2} y={y(c) - 3} textAnchor="middle">{c}</text>}
        </g>
      ))}
      <text x={l} y={H - 4}>il y a 7 sem.</text>
      <text x={W - 8} y={H - 4} textAnchor="end">cette sem.</text>
    </svg>
  );
}

export function Progres() {
  const app = useApp();
  const { s, update, replace } = app;
  const a = latestAssessment(s);
  const first = s.assessments[0];
  const [edit, setEdit] = useState<Profile | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const nCi = Object.keys(s.checkins).length;

  return (
    <>
      <Header />
      <h1>Progrès</h1>
      {a && (
        <div className="card">
          <div className="row between"><h2>Profil mental</h2><span className="small muted">bilan du {fmtDay(a.date)}</span></div>
          <Radar current={a.scores} first={s.assessments.length > 1 ? first.scores : undefined} />
          {s.assessments.length > 1 && <p className="small muted">En pointillé : ton premier bilan ({fmtDay(first.date)}).</p>}
          <SkillBars a={a} prev={s.assessments.length > 1 ? first : undefined} />
          <h3>Évolution</h3>
          <AssessmentTrend />
          <button className="btn ghost small" onClick={app.startReassess}>Refaire le bilan</button>
        </div>
      )}
      <div className="card">
        <div className="row between"><h2>Régularité</h2><span className="small muted">objectif : {s.profile?.perWeek} par semaine</span></div>
        <WeeksChart />
      </div>
      <div className="card">
        <div className="row between"><h2>Humeur et stress</h2><span className="small muted">14 jours</span></div>
        {nCi ? (
          <>
            <CheckinChart />
            <div className="legend"><span><i style={{ background: 'var(--accent)' }} />Humeur</span><span><i style={{ background: 'var(--warn)' }} />Stress</span></div>
          </>
        ) : <p className="muted">Ton premier check-in, sur l’écran Aujourd’hui, démarre cette courbe.</p>}
      </div>
      <div className="card">
        <div className="row between"><h2>Badges</h2><span className="small muted num">{s.badges.length}/{BADGES.length}</span></div>
        <div className="badges">
          {BADGES.map((b) => { const on = s.badges.includes(b.id); return <div key={b.id} className={`badge ${on ? 'got' : ''}`} title={b.hint}><Medal on={on} /><span>{b.name}</span>{!on && <span style={{ fontSize: '.7rem' }}>{b.hint}</span>}</div>; })}
        </div>
      </div>
      <div className="card">
        <div className="row between"><h2>Mon profil</h2>{!edit && <button className="btn ghost small" onClick={() => setEdit({ ...s.profile! })}>Modifier</button>}</div>
        {edit ? (
          <>
            <ProfileForm value={edit} onChange={setEdit} />
            <div className="row">
              <button className="btn" disabled={!edit.sport.trim()} onClick={() => { update((x) => { x.profile = { ...edit, name: edit.name.trim(), sport: edit.sport.trim() }; }); setEdit(null); }}>Enregistrer</button>
              <button className="btn ghost" onClick={() => setEdit(null)}>Annuler</button>
            </div>
            <p className="small muted">Le nombre de séances par semaine s’applique à partir de la semaine prochaine.</p>
          </>
        ) : (
          <p className="small muted">{s.profile?.name || 'Sans prénom'} · {s.profile?.sport} · {s.profile?.perWeek} séances par semaine</p>
        )}
      </div>
      <RemindersCard />
      <VoiceCard />
      <div className="card">
        <h3>Repartir de zéro</h3>
        <p className="small muted">Efface ton bilan, tes séances, tes check-ins et tes débriefs.</p>
        {confirmReset ? (
          <div className="row"><button className="btn danger" onClick={() => { replace(freshState()); setConfirmReset(false); }}>Oui, tout effacer</button><button className="btn ghost" onClick={() => setConfirmReset(false)}>Annuler</button></div>
        ) : <button className="btn ghost" onClick={() => setConfirmReset(true)}>Réinitialiser</button>}
      </div>
      <p className="savestate">{STATUS[app.status]}</p>
    </>
  );
}
