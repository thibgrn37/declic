import type { ReactNode } from 'react';
import { REFERENCES, type EvidenceLevel } from '../content/evidence';
import { SKILLS, type SkillKey } from '../content/techniques';
import { streakInfo } from '../engine/engine';
import type { State } from '../state/types';
import { useApp } from '../app/ctx';

export const Icon = {
  today: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M10 8.5v7l6-3.5z" fill="currentColor" /></svg>,
  programme: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></svg>,
  jourj: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M5 21V4h11l-2 4 2 4H5" /></svg>,
  carnet: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M9 9h6M9 13h4" /></svg>,
  progres: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="m12 3 8 5v8l-8 5-8-5V8z" /><path d="m12 8 4 2.5v3L12 16l-4-2.5v-3z" /></svg>,
  flame: <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2.5 1.3-4 2.5-5 .2 2 1 3 2 3.5C11 9 11 5.5 12 2z" fill="var(--gold)" /></svg>,
};

export function Medal({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path d="M13 3h6l2 9h-6zM21 3h6l-2 9h-6z" fill={on ? 'var(--accent)' : 'var(--line)'} />
      <circle cx="20" cy="25" r="11" fill={on ? 'var(--gold)' : 'var(--surface-2)'} stroke={on ? 'var(--gold)' : 'var(--line)'} strokeWidth="2" />
      <path d="m20 18 2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7-3.4-3.3 4.7-.7z" fill={on ? 'var(--surface)' : 'var(--line)'} />
    </svg>
  );
}

/** Flint, le coach : un renard géométrique. */
export function Fox() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M8 10 24 22 32 20 40 22 56 10 52 34 32 56 12 34z" fill="var(--accent)" />
      <path d="M12 34 32 56 52 34 40 36 32 44 24 36z" fill="var(--surface)" stroke="var(--line)" />
      <path d="M8 10 20 26 24 22zM56 10 44 26 40 22z" fill="var(--ink)" opacity=".85" />
      <circle cx="24" cy="31" r="2.6" fill="var(--on-accent)" />
      <circle cx="40" cy="31" r="2.6" fill="var(--on-accent)" />
      <path d="m29.5 44 2.5 3 2.5-3z" fill="var(--ink)" />
    </svg>
  );
}

export function Coach({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="coach"><Fox /><div className="bubble"><b>{title}</b>{children}</div></div>
  );
}

export function Header() {
  const { s } = useApp();
  const st = streakInfo(s);
  return (
    <div className="top">
      <div className="brand"><i />Déclic</div>
      <div className="streak num" title="Jours de suite avec une séance (un jour de repos pardonné par semaine)">{Icon.flame}{st.n} j</div>
    </div>
  );
}

export function EvidenceTag({ level }: { level: EvidenceLevel }) {
  return <span className={`tag ${level}`}>{level === 'solide' ? 'Preuves solides' : 'Preuves prometteuses'}</span>;
}

export function RefList({ ids }: { ids: string[] }) {
  return (
    <div className="stack">
      {ids.map((id) => {
        const r = REFERENCES[id];
        if (!r) return null;
        return (
          <div className="ref" key={id}>
            <strong>{r.short}</strong>
            <span>{r.finding}</span>
            <span className="muted small">{r.full}</span>
            {r.url && <a href={r.url} target="_blank" rel="noreferrer">Lire la source</a>}
          </div>
        );
      })}
    </div>
  );
}

export function Choice<T extends string | number | boolean>({ value, options, onChange, label }: {
  value: T; options: { v: T; label: string; hint?: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button type="button" key={String(o.v)} className={o.v === value ? 'on' : ''} aria-pressed={o.v === value} onClick={() => onChange(o.v)}>
          {o.label}{o.hint && <small>{o.hint}</small>}
        </button>
      ))}
    </div>
  );
}

export function Dots({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="dots" role="group" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} className={value === n ? 'on' : ''} aria-pressed={value === n} onClick={() => onChange(n)}>{n}</button>
      ))}
    </div>
  );
}

const KEYS = Object.keys(SKILLS) as SkillKey[];
const SHORT: Record<SkillKey, string> = { stress: 'Stress', confiance: 'Confiance', concentration: 'Concentration', dialogue: 'Dialogue', objectifs: 'Objectifs' };

/** Radar des compétences : bilan actuel, et le premier bilan en pointillé. */
export function Radar({ current, first }: { current: Record<SkillKey, number>; first?: Record<SkillKey, number> }) {
  const cx = 170, cy = 145, R = 95, n = KEYS.length;
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const poly = (v: Record<SkillKey, number>) => KEYS.map((k, i) => pt(i, (R * Math.max(4, v[k])) / 100).join(',')).join(' ');
  return (
    <svg className="radar" viewBox="0 0 340 290" role="img" aria-label="Profil de compétences mentales">
      {[25, 50, 75, 100].map((v) => (
        <polygon key={v} points={KEYS.map((_, i) => pt(i, (R * v) / 100).join(',')).join(' ')} fill="none" stroke="var(--line)" />
      ))}
      {KEYS.map((_, i) => <line key={i} x1={cx} y1={cy} x2={pt(i, R)[0]} y2={pt(i, R)[1]} stroke="var(--line)" />)}
      {first && <polygon points={poly(first)} fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="4 4" />}
      <polygon points={poly(current)} fill="var(--accent)" fillOpacity=".2" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
      {KEYS.map((k, i) => {
        const [x, y] = pt(i, R + 22);
        const anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end';
        return (
          <g key={k}>
            <text x={x} y={y} textAnchor={anchor}>{SHORT[k]}</text>
            <text x={x} y={y + 14} textAnchor={anchor} style={{ fill: 'var(--ink)', fontWeight: 700 }}>{current[k]}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function fill(text: string, s: State): string {
  const p = s.personal;
  const q = (v: string, fb: string) => (v ? `« ${v} »` : fb);
  const map: Record<string, string> = {
    gesture: p.gesture || 'ton geste clé',
    place: p.place || 'ton lieu d’entraînement',
    cueInstr: q(p.cueInstr, 'ton mot technique'),
    cueMotiv: q(p.cueMotiv, 'ton mot de motivation'),
    negative: q(p.negative, 'ta phrase habituelle'),
    reframe: q(p.reframe, 'ta nouvelle phrase'),
    trigger: p.trigger || 'juste avant ton geste',
    strength: p.strength || 'ta force',
    comp: s.profile?.compName || 'ta prochaine compétition',
  };
  return text.replace(/\{(\w+)\}/g, (m, k: string) => map[k] ?? m);
}
