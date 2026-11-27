import { describe, expect, it } from 'vitest';
import { parseFit, parseTcx, readGarminFile } from './garminFiles';

/** Fabrique un petit fichier FIT avec un message « session ». */
function fitFile(startLocal: Date, timerSec: number, sport: number, subSport: number, avg: number, max: number): ArrayBuffer {
  const fields: [number, number][] = [[253, 4], [2, 4], [5, 1], [6, 1], [8, 4], [16, 1], [17, 1]];
  const defLen = 1 + 5 + fields.length * 3;
  const dataLen = 1 + fields.reduce((n, f) => n + f[1], 0);
  const buf = new ArrayBuffer(14 + defLen + dataLen + 2);
  const v = new DataView(buf);
  v.setUint8(0, 14); v.setUint8(1, 0x20); v.setUint16(2, 2132, true); v.setUint32(4, defLen + dataLen, true);
  '.FIT'.split('').forEach((c, i) => v.setUint8(8 + i, c.charCodeAt(0)));
  let p = 14;
  v.setUint8(p++, 0x40); v.setUint8(p++, 0); v.setUint8(p++, 0); v.setUint16(p, 18, true); p += 2; v.setUint8(p++, fields.length);
  for (const [num, size] of fields) { v.setUint8(p++, num); v.setUint8(p++, size); v.setUint8(p++, size === 4 ? 0x86 : 0x02); }
  const ts = Math.round(startLocal.getTime() / 1000) - Date.UTC(1989, 11, 31) / 1000;
  v.setUint8(p++, 0x00);
  v.setUint32(p, ts + timerSec, true); p += 4;
  v.setUint32(p, ts, true); p += 4;
  v.setUint8(p++, sport); v.setUint8(p++, subSport);
  v.setUint32(p, timerSec * 1000, true); p += 4;
  v.setUint8(p++, avg); v.setUint8(p++, max);
  return buf;
}

async function zipOf(name: string, data: ArrayBuffer): Promise<ArrayBuffer> {
  const raw = new Uint8Array(data);
  const comp = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
  const nameB = new TextEncoder().encode(name);
  const local = new Uint8Array(30 + nameB.length + comp.length);
  const lv = new DataView(local.buffer);
  lv.setUint32(0, 0x04034b50, true); lv.setUint16(8, 8, true); lv.setUint32(18, comp.length, true); lv.setUint32(22, raw.length, true);
  lv.setUint16(26, nameB.length, true); local.set(nameB, 30); local.set(comp, 30 + nameB.length);
  const central = new Uint8Array(46 + nameB.length);
  const cv = new DataView(central.buffer);
  cv.setUint32(0, 0x02014b50, true); cv.setUint16(10, 8, true); cv.setUint32(20, comp.length, true); cv.setUint32(24, raw.length, true);
  cv.setUint16(28, nameB.length, true); cv.setUint32(42, 0, true); central.set(nameB, 46);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, 1, true); ev.setUint16(10, 1, true);
  ev.setUint32(12, central.length, true); ev.setUint32(16, local.length, true);
  const all = new Uint8Array(local.length + central.length + end.length);
  all.set(local, 0); all.set(central, local.length); all.set(end, local.length + central.length);
  return all.buffer;
}

describe('fichiers Garmin', () => {
  const start = new Date(2026, 10, 27, 12, 30);
  it('lit une séance de squash dans un fichier FIT', () => {
    const [w] = parseFit(fitFile(start, 3585, 64, 94, 148, 176));
    expect(w).toMatchObject({ date: '2026-11-27', time: '12:30', sport: 'Squash', durationSec: 3585, hrAvg: 148, hrMax: 176, source: 'garmin' });
  });
  it('utilise le sport du profil quand la montre reste générique', () => {
    expect(parseFit(fitFile(start, 926, 0, 0, 147, 169), 'Squash')[0].sport).toBe('Squash');
  });
  it('ouvre le .zip de « Exporter l’original »', async () => {
    const zip = await zipOf('123456_ACTIVITY.fit', fitFile(start, 926, 64, 94, 147, 169));
    const [w] = await readGarminFile('123456.zip', zip);
    expect(w).toMatchObject({ sport: 'Squash', durationSec: 926, hrMax: 169 });
  });
  it('lit un fichier TCX', () => {
    const tcx = `<TrainingCenterDatabase><Activities><Activity Sport="Other"><Id>${start.toISOString()}</Id>
      <Lap><TotalTimeSeconds>1800</TotalTimeSeconds><AverageHeartRateBpm><Value>140</Value></AverageHeartRateBpm><MaximumHeartRateBpm><Value>170</Value></MaximumHeartRateBpm></Lap>
      <Lap><TotalTimeSeconds>1800</TotalTimeSeconds><AverageHeartRateBpm><Value>150</Value></AverageHeartRateBpm><MaximumHeartRateBpm><Value>176</Value></MaximumHeartRateBpm></Lap>
    </Activity></Activities></TrainingCenterDatabase>`;
    expect(parseTcx(tcx, 'Squash')[0]).toMatchObject({ date: '2026-11-27', time: '12:30', sport: 'Squash', durationSec: 3600, hrAvg: 145, hrMax: 176 });
  });
});
