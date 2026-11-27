// Lecture des fichiers exportés depuis Garmin Connect : .fit (« Exporter l'original », souvent dans un .zip) et .tcx.
// Tout se passe dans le navigateur : aucun fichier n'est envoyé ailleurs.
import { dkey } from '../state/dates';
import type { Workout } from '../state/types';
import { parseGarminCsv } from './training';

const FIT_EPOCH = Date.UTC(1989, 11, 31) / 1000;
const p2 = (n: number) => String(n).padStart(2, '0');
const hhmm = (d: Date) => `${p2(d.getHours())}:${p2(d.getMinutes())}`;

/** Sports FIT (profil Garmin). Les sous-sports de raquette précisent le nom. */
const FIT_SPORT: Record<number, string> = {
  1: 'Course à pied', 2: 'Vélo', 4: 'Cardio', 5: 'Natation', 6: 'Basket', 7: 'Football', 8: 'Tennis', 10: 'Musculation', 11: 'Marche',
  13: 'Ski alpin', 15: 'Aviron', 17: 'Randonnée', 19: 'Paddle', 20: 'Musculation', 31: 'Escalade', 37: 'Stand-up paddle', 41: 'Kayak',
  43: 'Yoga', 53: 'Course sur tapis', 62: 'HIIT', 64: 'Sport de raquette',
};
const FIT_SUBSPORT: Record<number, string> = { 84: 'Pickleball', 85: 'Padel', 94: 'Squash', 95: 'Badminton', 96: 'Racquetball', 97: 'Tennis de table' };

interface FieldDef { num: number; size: number }
interface MsgDef { little: boolean; global: number; fields: FieldDef[]; devSize: number }

/** Extrait la ou les sessions d'un fichier FIT. `fallbackSport` sert quand la montre n'indique qu'un sport générique. */
export function parseFit(buf: ArrayBuffer, fallbackSport = 'Entraînement'): Workout[] {
  const v = new DataView(buf);
  if (buf.byteLength < 14) return [];
  const headerSize = v.getUint8(0);
  const dataSize = v.getUint32(4, true);
  if (String.fromCharCode(v.getUint8(8), v.getUint8(9), v.getUint8(10), v.getUint8(11)) !== '.FIT') return [];
  const end = Math.min(buf.byteLength, headerSize + dataSize);
  const defs = new Map<number, MsgDef>();
  const out: Workout[] = [];
  let i = headerSize;

  const readField = (pos: number, size: number, little: boolean): number | null => {
    if (size === 1) { const x = v.getUint8(pos); return x === 0xff ? null : x; }
    if (size === 2) { const x = v.getUint16(pos, little); return x === 0xffff ? null : x; }
    if (size === 4) { const x = v.getUint32(pos, little); return x === 0xffffffff ? null : x; }
    return null;
  };

  while (i < end) {
    const h = v.getUint8(i++);
    if (h & 0x80) {
      // En-tête compressé (horodatage) : message de données, type local sur 2 bits.
      const def = defs.get((h >> 5) & 0x3);
      if (!def) break;
      i += def.fields.reduce((n, f) => n + f.size, 0) + def.devSize;
      continue;
    }
    const local = h & 0x0f;
    if (h & 0x40) {
      const little = v.getUint8(i + 1) === 0;
      const global = v.getUint16(i + 2, little);
      const n = v.getUint8(i + 4);
      i += 5;
      const fields: FieldDef[] = [];
      for (let k = 0; k < n; k++) { fields.push({ num: v.getUint8(i), size: v.getUint8(i + 1) }); i += 3; }
      let devSize = 0;
      if (h & 0x20) {
        const nd = v.getUint8(i++);
        for (let k = 0; k < nd; k++) { devSize += v.getUint8(i + 1); i += 3; }
      }
      defs.set(local, { little, global, fields, devSize });
      continue;
    }
    const def = defs.get(local);
    if (!def) break;
    if (def.global === 18) {
      const f: Record<number, number | null> = {};
      let pos = i;
      for (const fd of def.fields) { f[fd.num] = readField(pos, fd.size, def.little); pos += fd.size; }
      const start = f[2] ?? f[253];
      const timer = f[8] ?? f[7];
      if (start != null && timer) {
        const d = new Date((start + FIT_EPOCH) * 1000);
        const sport = (f[6] != null && FIT_SUBSPORT[f[6]]) || (f[5] != null && FIT_SPORT[f[5]]) || fallbackSport;
        const durationSec = Math.round(timer / 1000);
        out.push({
          id: `g-${dkey(d)}-${hhmm(d)}-${durationSec}`, date: dkey(d), time: hhmm(d), sport, durationSec,
          hrAvg: f[16] ?? undefined, hrMax: f[17] ?? undefined, source: 'garmin',
        });
      }
    }
    i += def.fields.reduce((n, fd) => n + fd.size, 0) + def.devSize;
  }
  return out;
}

const TCX_SPORT: Record<string, string> = { Running: 'Course à pied', Biking: 'Vélo' };

/** Fichier TCX (XML) : une activité par bloc <Activity>. */
export function parseTcx(text: string, fallbackSport = 'Entraînement'): Workout[] {
  const out: Workout[] = [];
  for (const m of text.matchAll(/<Activity\b([^>]*)>([\s\S]*?)<\/Activity>/g)) {
    const sportAttr = m[1].match(/Sport="([^"]+)"/)?.[1] || '';
    const body = m[2];
    const id = body.match(/<Id>([^<]+)<\/Id>/)?.[1];
    if (!id) continue;
    const d = new Date(id.trim());
    if (Number.isNaN(d.getTime())) continue;
    const laps = [...body.matchAll(/<Lap\b[\s\S]*?<\/Lap>/g)].map((l) => l[0]);
    let dur = 0, hrWeighted = 0, hrMax = 0;
    for (const lap of laps) {
      const t = parseFloat(lap.match(/<TotalTimeSeconds>([\d.]+)<\/TotalTimeSeconds>/)?.[1] || '0');
      const avg = parseFloat(lap.match(/<AverageHeartRateBpm>\s*<Value>(\d+)<\/Value>/)?.[1] || '0');
      const max = parseFloat(lap.match(/<MaximumHeartRateBpm>\s*<Value>(\d+)<\/Value>/)?.[1] || '0');
      dur += t; hrWeighted += avg * t; hrMax = Math.max(hrMax, max);
    }
    if (!dur) continue;
    const durationSec = Math.round(dur);
    out.push({
      id: `g-${dkey(d)}-${hhmm(d)}-${durationSec}`, date: dkey(d), time: hhmm(d), sport: TCX_SPORT[sportAttr] || fallbackSport, durationSec,
      hrAvg: hrWeighted ? Math.round(hrWeighted / dur) : undefined, hrMax: hrMax || undefined, source: 'garmin',
    });
  }
  return out;
}

/** Fichiers d'une archive ZIP (méthodes « stockée » et « deflate »). */
export async function unzip(buf: ArrayBuffer): Promise<{ name: string; data: ArrayBuffer }[]> {
  const v = new DataView(buf);
  let eocd = -1;
  for (let k = buf.byteLength - 22; k >= Math.max(0, buf.byteLength - 65557); k--) {
    if (v.getUint32(k, true) === 0x06054b50) { eocd = k; break; }
  }
  if (eocd < 0) return [];
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const out: { name: string; data: ArrayBuffer }[] = [];
  for (let k = 0; k < count && v.getUint32(p, true) === 0x02014b50; k++) {
    const method = v.getUint16(p + 10, true);
    const csize = v.getUint32(p + 20, true);
    const nlen = v.getUint16(p + 28, true), xlen = v.getUint16(p + 30, true), clen = v.getUint16(p + 32, true);
    const off = v.getUint32(p + 42, true);
    const name = new TextDecoder().decode(new Uint8Array(buf, p + 46, nlen));
    p += 46 + nlen + xlen + clen;
    const start = off + 30 + v.getUint16(off + 26, true) + v.getUint16(off + 28, true);
    const raw = buf.slice(start, start + csize);
    if (method === 0) out.push({ name, data: raw });
    else if (method === 8 && typeof DecompressionStream !== 'undefined') {
      const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      out.push({ name, data: await new Response(stream).arrayBuffer() });
    }
  }
  return out;
}

/** Lit un fichier Garmin quel que soit son format (.csv, .fit, .tcx ou .zip qui les contient). */
export async function readGarminFile(name: string, buf: ArrayBuffer, fallbackSport?: string): Promise<Workout[]> {
  const ext = name.toLowerCase().split('.').pop();
  if (ext === 'zip') {
    const files = await unzip(buf);
    const all = await Promise.all(files.map((f) => readGarminFile(f.name, f.data, fallbackSport)));
    return all.flat();
  }
  if (ext === 'fit') return parseFit(buf, fallbackSport);
  const text = new TextDecoder().decode(buf);
  if (ext === 'tcx') return parseTcx(text, fallbackSport);
  if (ext === 'csv') return parseGarminCsv(text);
  return [];
}
