# Relier Strava à Déclic

Ta montre Garmin envoie déjà chaque séance sur Strava. Une fois Strava relié, Déclic récupère tes nouvelles séances tout seul, à chaque ouverture de l'appli, et te propose un petit débrief. Compter 5 minutes, une seule fois.

Pourquoi Strava et pas Garmin directement : l'API de Garmin est réservée aux entreprises partenaires, sur dossier. Celle de Strava est ouverte pour un usage personnel. Et une appli web ne peut pas lire Apple Santé.

## 1. Créer ta « clé » Strava

1. Sur un ordinateur, va sur https://www.strava.com/settings/api, connecté à ton compte Strava.
2. Remplis le formulaire :
   - **Application Name** : `Déclic`
   - **Category** : `Training`
   - **Website** : ton adresse Vercel, par exemple `https://declic-xxx.vercel.app`
   - **Authorization Callback Domain** : la même adresse **sans** `https://`, par exemple `declic-xxx.vercel.app`
   - une image quelconque pour l'icône
3. Valide. Strava affiche **Client ID** (un nombre) et **Client Secret** (cliquer sur « show »). Garde la page ouverte.

## 2. Donner la clé à Vercel

1. Sur https://vercel.com, ouvre le projet **declic**, puis **Settings** > **Environment Variables**.
2. Ajoute deux variables :
   - `STRAVA_CLIENT_ID` = le Client ID
   - `STRAVA_CLIENT_SECRET` = le Client Secret
3. Va dans **Deployments**, sur le dernier déploiement clique **⋯** > **Redeploy**.

Le secret reste sur le serveur Vercel : il n'est jamais envoyé au téléphone.

## 3. Connecter

Dans Déclic : **Carnet** > **Entraînements** > **Connecter Strava**, puis **Autoriser** sur la page Strava.

Si l'appli est installée sur l'écran d'accueil de l'iPhone et que la page Strava s'ouvre dans Safari, ce n'est pas grave : le lien est enregistré dans ton compte Déclic, et il suffit d'être connecté à ce compte dans les deux.

## Limites

- Une appli Strava personnelle ne peut relier qu'un seul compte, le tien. C'est voulu.
- Strava ne transmet que ce qu'il reçoit de Garmin : sport, date, durée, fréquence cardiaque. L'effort ressenti, la concentration et la confiance, c'est toi qui les notes dans le petit débrief.
- La version artifact (claude.ai) n'a pas de serveur : il reste l'import d'un fichier Garmin.
