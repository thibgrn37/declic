const pad = (n: number) => String(n).padStart(2, '0');

/** Date locale au format AAAA-MM-JJ. */
export const dkey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const todayKey = () => dkey(new Date());
export const addDays = (k: string, n: number) => {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dkey(d);
};
export const diffDays = (a: string, b: string) => Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 864e5);
/** Lundi de la semaine qui contient k. */
export const mondayOf = (k: string) => {
  const d = parseKey(k);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dkey(d);
};
export const fmtDay = (k: string) => parseKey(k).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
export const fmtWeekday = (k: string) => parseKey(k).toLocaleDateString('fr-FR', { weekday: 'long' });
