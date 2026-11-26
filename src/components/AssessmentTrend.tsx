import { SKILLS, type SkillKey } from '../content/techniques';
import { addDays, fmtDay } from '../state/dates';
import { useApp } from '../app/ctx';

const COLORS: Record<SkillKey, string> = {
  stress: 'var(--warn)', confiance: 'var(--accent)', concentration: 'var(--good)', dialogue: 'var(--violet)', objectifs: 'var(--gold)',
};

/** Évolution de chaque compétence d'un bilan à l'autre. */
export function AssessmentTrend() {
  const { s } = useApp();
  const list = s.assessments.slice(-8);
  if (list.length < 2) {
    const next = addDays(s.assessments[0].date, 28);
    return <p className="small muted">Ton prochain bilan est prévu vers le {fmtDay(next)}. La courbe de progression apparaîtra à partir du deuxième.</p>;
  }
  const W = 340, H = 160, l = 26, r = 12, t = 10, b = 22;
  const x = (i: number) => l + (i * (W - l - r)) / (list.length - 1);
  const y = (v: number) => t + ((100 - v) * (H - t - b)) / 100;
  const keys = Object.keys(SKILLS) as SkillKey[];
  return (
    <>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Évolution des compétences d'un bilan à l'autre">
        {[0, 50, 100].map((v) => <g key={v}><line x1={l} x2={W - r} y1={y(v)} y2={y(v)} stroke="var(--line)" /><text x={l - 6} y={y(v) + 3} textAnchor="end">{v}</text></g>)}
        {list.map((a, i) => <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === list.length - 1 ? 'end' : 'middle'}>{fmtDay(a.date)}</text>)}
        {keys.map((k) => (
          <g key={k}>
            <path d={list.map((a, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(a.scores[k]).toFixed(1)}`).join(' ')} fill="none" stroke={COLORS[k]} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
            {list.map((a, i) => <circle key={i} cx={x(i)} cy={y(a.scores[k])} r={i === list.length - 1 ? 4 : 2.5} fill={COLORS[k]} />)}
          </g>
        ))}
      </svg>
      <div className="legend">{keys.map((k) => <span key={k}><i style={{ background: COLORS[k] }} />{SKILLS[k]}</span>)}</div>
    </>
  );
}
