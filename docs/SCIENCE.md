# Bases scientifiques de Déclic

Chaque technique proposée dans Déclic repose sur des études publiées. Les références complètes sont dans `src/content/evidence.ts` et s'affichent dans l'appli (onglet Programme, puis une technique).

Deux niveaux de preuve sont affichés :

- **Preuves solides** : au moins une méta-analyse montre un effet sur la performance sportive.
- **Preuves prometteuses** : effets sur des indicateurs psychologiques (stress, flow…) ou petites études. À confirmer.

| Technique | Niveau | Ce que disent les études | Comment Déclic l'applique |
|---|---|---|---|
| Imagerie mentale | Solide | Liu et al. (2025), 86 essais, 3 593 sportifs : effet moyen (SMD = 0,50), meilleurs gains avec ~10 min, 3 fois par semaine, sur plusieurs mois, en combinant avec d'autres techniques. Qualité des preuves jugée faible (GRADE). Simonsmeier et al. (2018) : l'effet dépend du niveau d'expertise. Holmes & Collins (2001) : modèle PETTLEP. | Séances d'environ 10 min, 2 à 3 fois par semaine dès la phase 2. 4 niveaux : éveil des sens (si les images sont floues au bilan), geste clé, séquence de compétition, gestion de l'imprévu. Consignes PETTLEP (position, tenue, temps réel, émotion). |
| Dialogue interne | Solide | Hatzigeorgiadis et al. (2011), 32 études : effet modéré (ES = 0,48). Consignes techniques plus efficaces pour les gestes fins, phrases de motivation pour force et endurance. Effet plus fort quand le dialogue interne est entraîné. | Le type de mot-clé principal dépend du type de sport choisi au profil. Progression : repérer, construire, utiliser en situation, retourner une pensée négative. |
| Routine pré-performance | Solide | Rupprecht et al. (2021), ~800 sportifs, 15 sports : la routine améliore la performance, avec ou sans pression, quels que soient l'âge, le niveau et la complexité de la routine. | L'utilisateur construit une routine courte (3 à 5 étapes), la répète à blanc puis sous pression imaginée. Elle reste accessible dans l'onglet Jour J. |
| Objectifs | Solide | Williamson et al. (2022), méta-analyse : la fixation d'objectifs améliore la performance. | Objectif de résultat, de performance et 2 objectifs de processus, avec un bilan hebdomadaire. |
| Respiration lente | Prometteur | Lehrer et al. (2020), 58 essais : effet petit à modéré, parmi les plus nets sur l'anxiété et la performance. Pagaduan et al. (2020), 6 essais chez des sportifs : gains sur certaines performances, études petites. | Respiration autour de 6 cycles par minute (5-5), puis expiration longue (4-6), puis version terrain d'une minute. Proposée automatiquement quand le check-in montre un stress élevé. |
| Attention au présent | Prometteur | Bühlmayer et al. (2017), 9 essais : effet sur le flow et l'appréhension (SMD = 0,72), et sur la performance en sports de précision. Wang et al. (2023) : pas d'effet démontré sur l'anxiété. | Proposée en complément, surtout quand la concentration ou le stress sont des points faibles. |

## Entraînements et charge

Déclic calcule la charge d'une séance avec la méthode **session-RPE** (Foster et al., 2001) : effort perçu sur l'échelle CR-10 × durée en minutes. Haddad et al. (2017) la jugent valide et fiable dans de nombreux sports, y compris les sports intermittents. Van Cutsem et al. (2017) montrent que la fatigue mentale augmente l'effort perçu sans changer la fréquence cardiaque : c'est pourquoi Déclic demande l'effort ressenti, la concentration et la confiance à côté des données de la montre.

Les rapprochements affichés (concentration avec ou sans séance Déclic la veille, effort selon le sommeil, concentration selon le stress) ne s'affichent qu'avec au moins 3 séances de chaque côté et un écart d'au moins 0,4 point. Ce sont des tendances personnelles, pas des preuves de cause à effet.

Le **petit débrief** d'une séance (effort, concentration, confiance, ce qui a gêné) adapte le programme : un obstacle signalé fait proposer, le jour même ou le lendemain, une séance ciblée (le stress mène à la respiration, le doute à l'imagerie, etc.), avec la séance prévue en alternative. Il pèse aussi sur la semaine suivante (obstacle −8 points sur la compétence liée, concentration ou confiance notées 1 ou 2 : −4), moins qu'un débrief complet (−12). Ce sont des choix de conception, pas des résultats d'études.

## Limites

- Le **bilan** de Déclic est une auto-évaluation écrite pour l'appli. Il couvre des dimensions mesurées par les questionnaires de compétences mentales en sport, mais ce n'est pas un test validé ni un outil de diagnostic.
- Les **règles d'adaptation** (monter de niveau après deux séances notées 4 ou 5, consolider après deux séances notées 1 ou 2, séance allégée si stress ≥ 4, sommeil ≤ 2, ou séance d'entraînement notée 8/10 ou plus le jour même ou la veille) sont des choix de conception raisonnables, pas des résultats d'études. Elles sont dans `src/engine/engine.ts` et testées dans `src/engine/engine.test.ts`.
- Plusieurs méta-analyses signalent un biais de publication possible et des études de petite taille. Les effets réels peuvent être plus faibles.
- Déclic est un outil d'entraînement mental, pas un soin. Les exercices ne remplacent pas un professionnel de santé.

## Exercice retiré par rapport au premier prototype

L'« ancre de confiance » (associer un souvenir à un geste) venait de la PNL, qui n'a pas de base scientifique solide. Elle a été remplacée par l'imagerie de maîtrise et le dialogue interne. Les exercices « trois fiertés » et « 5-4-3-2-1 », sans étude en contexte sportif, ont aussi été retirés.
