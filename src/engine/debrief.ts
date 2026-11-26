import type { IssueKey } from '../state/types';

// Détection des obstacles mentaux dans le texte libre d'un débrief, à partir d'un lexique français.
// Simple et local : aucune donnée ne quitte l'appareil.

const LEXICON: Record<IssueKey, RegExp> = {
  stress: /\b(stress\w*|pression|angoiss\w*|anxi\w*|trac|tendu\w*|crisp\w*|nerv\w*|panique\w*|trembl\w*|boule au ventre|jambes? coupées?|peur de (perdre|rater|mal faire)|souffle court|paralys\w*)/gi,
  pensees: /(je suis nul|nulle?\b|négati\w*|je me suis (dit|répété)|critiqu\w*|m['’]en (suis )?voul\w*|rumin\w*|ressass\w*|pas capable|toujours pareil|encore raté|je me suis énervé contre moi|honte)/gi,
  attention: /(déconcentr[a-zà-ÿ]*|(perdu|manqu[a-zà-ÿ]*) (de |ma )?concentration|distrai[a-zà-ÿ]*|ailleurs|perdu le fil|absent[a-zà-ÿ]*|pensé à autre chose|déconnect[a-zà-ÿ]*|dispers[a-zà-ÿ]*|gên[a-zà-ÿ]* par)/gi,
  motivation: /(démotiv[a-zà-ÿ]*|(manqu[a-zà-ÿ]*|pas) (de )?motiv[a-zà-ÿ]*|pas envie|plus envie|lassitude|lassé[a-zà-ÿ]*|ennui[a-zà-ÿ]*|flemme|abandonn[a-zà-ÿ]*|lâché|sans énergie|à quoi bon)/gi,
  confiance: /(dout\w*|confiance|pas à la hauteur|impressionn\w*|intimid\w*|pas légitime|pas cru en moi|peur de l['’]adversaire|complexé\w*|inférieur\w*)/gi,
};

// « pas stressé », « aucune pression » : on ignore les mentions niées juste avant le mot.
const NEGATION = /(pas|aucun\w*|sans|jamais|plus)\s+(\w+\s+)?$/i;

export function detectIssues(text: string): { issue: IssueKey; hits: number }[] {
  const t = text.toLowerCase();
  const out: { issue: IssueKey; hits: number }[] = [];
  (Object.keys(LEXICON) as IssueKey[]).forEach((k) => {
    let hits = 0;
    for (const m of t.matchAll(LEXICON[k])) {
      const before = t.slice(Math.max(0, (m.index ?? 0) - 18), m.index ?? 0);
      if (k === 'confiance' && /confiance/.test(m[0]) && !/(manqu[a-zà-ÿ]*|perdu|pas|plus|sans|aucune)\s+(d['’]|de\s+|la\s+)?$/.test(before)) continue; // « confiance » seule est plutôt positive
      if (k !== 'confiance' && NEGATION.test(before)) continue;
      hits++;
    }
    if (hits) out.push({ issue: k, hits });
  });
  return out.sort((a, b) => b.hits - a.hits);
}
