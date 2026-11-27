// Références scientifiques derrière chaque technique.
// Niveau « solide » : méta-analyse montrant un effet sur la performance sportive.
// Niveau « prometteur » : effets sur des indicateurs psychologiques ou petites études, à confirmer.

export type EvidenceLevel = 'solide' | 'prometteur';

export interface Reference {
  id: string;
  short: string; // forme courte affichée dans l'appli
  full: string; // référence complète
  finding: string; // ce que l'étude montre, en clair
  url?: string;
}

export const REFERENCES: Record<string, Reference> = {
  liu2025: {
    id: 'liu2025',
    short: 'Liu et al., 2025',
    full: 'Liu, Y., Zhao, S., Zhang, X., Zhang, X., Liang, T., & Ning, Z. (2025). The Effects of Imagery Practice on Athletes’ Performance: A Multilevel Meta-Analysis with Systematic Review. Behavioral Sciences, 15(5), 685. doi:10.3390/bs15050685',
    finding: '86 essais contrôlés, 3 593 sportifs : effet moyen de l’imagerie sur la performance (SMD = 0,50). Les meilleurs gains apparaissent avec environ 10 minutes, 3 fois par semaine, sur plusieurs mois, et en combinant l’imagerie avec d’autres techniques. Qualité des preuves jugée faible (GRADE), biais de publication possible.',
    url: 'https://www.mdpi.com/2076-328X/15/5/685',
  },
  holmes2001: {
    id: 'holmes2001',
    short: 'Holmes & Collins, 2001',
    full: 'Holmes, P. S., & Collins, D. J. (2001). The PETTLEP approach to motor imagery: A functional equivalence model for sport psychologists. Journal of Applied Sport Psychology, 13(1), 60–83.',
    finding: 'Modèle PETTLEP : l’imagerie est plus efficace quand elle ressemble à la pratique réelle (position du corps, tenue, environnement, tâche, timing réel, contenu adapté au niveau, émotions).',
  },
  simonsmeier2018: {
    id: 'simonsmeier2018',
    short: 'Simonsmeier et al., 2018',
    full: 'Simonsmeier, B. A., Frank, C., Gubelmann, H., & Schneider, M. (2018). The effects of motor imagery training on performance and mental representation of 7- to 15-year-old gymnasts of different levels of expertise. Sport, Exercise, and Performance Psychology, 7(2), 155–168. doi:10.1037/spy0000117',
    finding: 'Essai de 4 semaines (4 séances de 5 min par semaine, script PETTLEP) : gain net chez les gymnastes de haut niveau, pas chez les débutantes. Le niveau d’expertise compte, d’où des niveaux progressifs.',
    url: 'https://www.uni-trier.de/fileadmin/fb1/prof/PSY/PAE/Team/Schneider/SimonsmeierEtAl2018.pdf',
  },
  hatzi2011: {
    id: 'hatzi2011',
    short: 'Hatzigeorgiadis et al., 2011',
    full: 'Hatzigeorgiadis, A., Zourbanos, N., Galanis, E., & Theodorakis, Y. (2011). Self-talk and sports performance: A meta-analysis. Perspectives on Psychological Science, 6(4), 348–356. doi:10.1177/1745691611413136',
    finding: '32 études : effet modéré du dialogue interne sur la performance (ES = 0,48). Les consignes techniques marchent mieux pour les gestes fins, les phrases de motivation pour la force et l’endurance. L’effet est plus fort quand le dialogue interne est entraîné.',
    url: 'https://ir.lib.uth.gr/xmlui/handle/11615/28461',
  },
  rupprecht2021: {
    id: 'rupprecht2021',
    short: 'Rupprecht et al., 2021',
    full: 'Rupprecht, A., Tran, U., & Gröpel, P. (2021). The effectiveness of pre-performance routines in sports: A meta-analysis. International Review of Sport and Exercise Psychology. doi:10.1080/1750984X.2021.1944271',
    finding: 'Environ 800 sportifs, 15 sports : une routine avant le geste améliore la performance, en entraînement comme sous pression, quels que soient l’âge, le niveau ou la complexité de la routine.',
    url: 'https://www.eurekalert.org/news-releases/934597',
  },
  williamson2022: {
    id: 'williamson2022',
    short: 'Williamson et al., 2022',
    full: 'Williamson, O., et al. (2022). The performance and psychological effects of goal setting in sport: A systematic review and meta-analysis. International Review of Sport and Exercise Psychology. doi:10.1080/1750984X.2022.2116723',
    finding: 'Méta-analyse récente sur la fixation d’objectifs en sport : fixer des objectifs améliore la performance par rapport à « faire de son mieux ». Déclic combine objectifs de résultat, de performance et de processus.',
    url: 'https://www.tandfonline.com/doi/full/10.1080/1750984X.2022.2116723',
  },
  pagaduan2020: {
    id: 'pagaduan2020',
    short: 'Pagaduan et al., 2020',
    full: 'Pagaduan, J. C., Chen, Y.-S., Fell, J. W., & Wu, S. S. X. (2020). Can heart rate variability biofeedback improve athletic performance? A systematic review. Journal of Human Kinetics, 73, 103–114. doi:10.2478/hukin-2020-0004',
    finding: '6 essais, 187 sportifs : la respiration lente guidée (autour de 6 cycles par minute) améliore certaines performances (tir, passes, temps de réaction), mais les études sont petites.',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7386140',
  },
  lehrer2020: {
    id: 'lehrer2020',
    short: 'Lehrer et al., 2020',
    full: 'Lehrer, P., Kaur, K., Sharma, A., et al. (2020). Heart rate variability biofeedback improves emotional and physical health and performance: A systematic review and meta-analysis. Applied Psychophysiology and Biofeedback, 45(3), 109–129. doi:10.1007/s10484-020-09466-z',
    finding: '58 essais randomisés : effet petit à modéré de la respiration à fréquence de résonance, parmi les plus nets sur l’anxiété et la performance sportive ou artistique.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/32385728/',
  },
  buhlmayer2017: {
    id: 'buhlmayer2017',
    short: 'Bühlmayer et al., 2017',
    full: 'Bühlmayer, L., Birrer, D., Röthlin, P., Faude, O., & Donath, L. (2017). Effects of mindfulness practice on performance-relevant parameters and performance outcomes in sports: A meta-analytical review. Sports Medicine, 47, 2309–2321. doi:10.1007/s40279-017-0752-9',
    finding: '9 essais, 290 sportifs : la pleine conscience améliore des indicateurs comme le flow ou l’appréhension (SMD = 0,72), et la performance dans les sports de précision. Peu d’études, à confirmer.',
    url: 'https://core.ac.uk/download/154352926.pdf',
  },
  wang2023: {
    id: 'wang2023',
    short: 'Wang et al., 2023',
    full: 'Wang, Y., Lei, S.-M., & Fan, J. (2023). Effects of mindfulness-based interventions on promoting athletic performance and related factors among athletes: A systematic review and meta-analysis of randomized controlled trial. IJERPH, 20(3), 2038. doi:10.3390/ijerph20032038',
    finding: 'Effet sur l’acceptation et le flow (SMD = 0,81), mais pas d’effet démontré sur l’anxiété ou la santé mentale. Résultats encore hétérogènes.',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9915077/',
  },
};
