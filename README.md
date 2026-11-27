# Déclic

Appli web de préparation mentale pour sportifs. Les exercices s'appuient sur des études publiées et le programme s'adapte au profil et aux résultats de l'utilisateur.

## Ce que fait l'appli

- **Bilan initial** de 16 questions : 5 compétences (gestion du stress, confiance, concentration, dialogue interne, objectifs) et la netteté des images mentales.
- **Programme de 8 semaines** en 3 phases (fondations, construction, intégration). Chaque semaine combine un socle commun et des séances ciblées sur les points faibles.
- **6 techniques à niveaux progressifs** : imagerie mentale, dialogue interne, routine pré-performance, objectifs, respiration lente, attention au présent. Chaque technique affiche son niveau de preuve et ses sources.
- **Adaptation** :
  - le check-in du jour (stress, sommeil, énergie) ou une séance d'entraînement très dure peut transformer la séance en séance allégée ;
  - le ressenti noté après chaque séance fait monter ou consolider le niveau ;
  - les obstacles signalés dans les débriefs de compétition orientent la semaine suivante ;
  - à J-7 d'une compétition, le programme passe en protocole compétition ;
  - un nouveau bilan toutes les 4 semaines mesure les progrès et réajuste les priorités.
- **Jour J** : respiration d'urgence d'une minute, compte à rebours, routine personnelle.
- **Entraînements** (dans le Carnet) : saisie manuelle ou import CSV Garmin Connect, effort ressenti, concentration et confiance, charge hebdomadaire (session-RPE) et rapprochements avec les séances Déclic, le sommeil et le stress.
- **Carnet** de débriefs et écran **Progrès** (radar des compétences, régularité, humeur et stress, badges).
- **Guidage vocal** optionnel pendant les séances, pour garder les yeux fermés.

Les bases scientifiques et les limites sont détaillées dans [docs/SCIENCE.md](docs/SCIENCE.md).

## Stack

Vite, React 18 et TypeScript, sans serveur. Les données restent dans le navigateur (localStorage). Quand l'appli tourne comme artifact claude.ai, elle les enregistre aussi dans le compte de l'utilisateur.

```
src/
  content/   techniques, niveaux et scripts, bilan, références scientifiques
  engine/    calcul du bilan, programme, suggestions du jour, adaptation (+ tests)
  state/     types, dates, persistance
  screens/   écrans (accueil, programme, Jour J, carnet, progrès, séance, bilan)
```

## Commandes

```bash
npm install
npm run dev             # serveur de développement
npm test                # tests du moteur d'adaptation
npm run build           # build statique dans dist/ (déployable sur Vercel ou Netlify)
npm run build:artifact  # un seul fichier HTML autonome dans dist-single/
```
