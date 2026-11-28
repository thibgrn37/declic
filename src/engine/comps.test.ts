import { describe, expect, it } from 'vitest';
import { addComp, nextAfterActive, recentPastComp, removeComp, syncComps, upcomingComps } from './comps';
import { compDays } from './engine';
import type { Profile } from '../state/types';

const prof = (): Profile => ({ name: 'T', sport: 'squash', sportType: 'precision', level: 'regional', minutes: 10, perWeek: 4, experience: false, compName: '', compDate: '' });

describe('calendrier des tournois', () => {
  it('reprend la compétition unique des anciennes versions', () => {
    const p = { ...prof(), compName: 'Open A', compDate: '2026-12-05' };
    syncComps(p, '2026-11-28');
    expect(p.comps).toEqual([{ name: 'Open A', date: '2026-12-05' }]);
    expect(p.compDate).toBe('2026-12-05');
  });

  it('suit toujours le prochain tournoi, quel que soit l’ordre d’ajout', () => {
    const p = prof();
    addComp(p, { name: 'Open B', date: '2026-12-20' }, '2026-11-28');
    addComp(p, { name: 'Open A', date: '2026-12-05' }, '2026-11-28');
    expect(p.compName).toBe('Open A');
    expect(compDays(p, '2026-11-28')).toBe(7);
    expect(nextAfterActive(p, '2026-11-28')?.name).toBe('Open B');
  });

  it('enchaîne le protocole J-7 sur le tournoi suivant une fois le premier passé', () => {
    const p = prof();
    addComp(p, { name: 'Open A', date: '2026-12-05' }, '2026-11-28');
    addComp(p, { name: 'Open B', date: '2026-12-10' }, '2026-11-28');
    expect(syncComps(p, '2026-12-06')).toBe(true);
    expect(p.compName).toBe('Open B');
    expect(compDays(p, '2026-12-06')).toBe(4);
    expect(recentPastComp(p, '2026-12-06')?.name).toBe('Open A');
    expect(upcomingComps(p, '2026-12-06')).toHaveLength(1);
  });

  it('garde le dernier tournoi passé quand rien n’est prévu, pour le débrief', () => {
    const p = prof();
    addComp(p, { name: 'Open A', date: '2026-12-05' }, '2026-11-28');
    syncComps(p, '2026-12-07');
    expect(compDays(p, '2026-12-07')).toBe(-2);
  });

  it('retire un tournoi et passe au suivant', () => {
    const p = prof();
    addComp(p, { name: 'Open A', date: '2026-12-05' }, '2026-11-28');
    addComp(p, { name: 'Open B', date: '2026-12-20' }, '2026-11-28');
    removeComp(p, { name: 'Open A', date: '2026-12-05' }, '2026-11-28');
    expect(p.comps).toHaveLength(1);
    expect(p.compName).toBe('Open B');
    removeComp(p, { name: 'Open B', date: '2026-12-20' }, '2026-11-28');
    expect(p.compDate).toBe('');
  });

  it('oublie les tournois passés depuis plus d’un mois', () => {
    const p = prof();
    addComp(p, { name: 'Vieux', date: '2026-10-01' }, '2026-09-20');
    addComp(p, { name: 'Open A', date: '2026-12-05' }, '2026-11-28');
    expect(p.comps!.map((c) => c.name)).toEqual(['Open A']);
  });
});

