import { describe, expect, it } from 'vitest';
import { detectIssues } from './debrief';

describe('détection des obstacles', () => {
  it('repère le stress et les pensées négatives', () => {
    const r = detectIssues('Gros stress au départ, jambes coupées. Après la faute je me suis dit que j’étais nul.');
    expect(r.map((x) => x.issue)).toEqual(expect.arrayContaining(['stress', 'pensees']));
    expect(r[0].issue).toBe('stress');
  });
  it('ignore les mentions niées', () => {
    expect(detectIssues('Pas stressé du tout, aucune pression.')).toEqual([]);
  });
  it('ne prend pas « confiance » positive pour un obstacle', () => {
    expect(detectIssues('J’avais confiance, bon match.')).toEqual([]);
    expect(detectIssues('J’ai manqué de confiance au deuxième set.')[0].issue).toBe('confiance');
  });
  it('ne prend pas une concentration ou une motivation positives pour des obstacles', () => {
    expect(detectIssues('J’étais très concentré et motivé.')).toEqual([]);
    expect(detectIssues('Gros manque de motivation cette semaine.')[0].issue).toBe('motivation');
  });
  it('repère la perte de concentration', () => {
    expect(detectIssues('Le public m’a distrait, j’ai perdu le fil.')[0].issue).toBe('attention');
  });
});
