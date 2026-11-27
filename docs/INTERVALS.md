# Relier Garmin à Déclic (via intervals.icu)

Garmin ne donne pas accès à son API aux particuliers, et celle de Strava est maintenant réservée aux abonnés payants. intervals.icu est gratuit, reçoit tes séances directement de Garmin Connect, et a une API ouverte avec une clé personnelle. Déclic s'en sert pour récupérer tes séances toutes seules. Compter 5 minutes, une seule fois, de préférence sur un ordinateur.

## 1. Créer ton compte intervals.icu

1. Va sur https://intervals.icu et crée un compte gratuit (« Sign up »).
2. Il propose de relier une source : choisis **Garmin Connect** (pas Strava : les séances venues de Strava ne sont pas lisibles par l'API) et accepte les autorisations Garmin.
3. Tes séances récentes apparaissent dans le calendrier d'intervals.icu au bout de quelques minutes.

## 2. Récupérer ta clé API

1. Sur intervals.icu, ouvre **Settings** (ton profil, puis la roue dentée).
2. Tout en bas, section **Developer Settings** : clique sur **Generate** (ou « API key »).
3. Copie la clé affichée.

Tu n'as pas besoin de l'identifiant d'athlète : Déclic utilise le compte lié à la clé.

## 3. La coller dans Déclic

Dans Déclic : **Carnet** > **Entraînements** > carte **Garmin, en automatique**. Colle la clé, puis **Connecter**. Les 30 derniers jours arrivent tout de suite, puis chaque nouvelle séance à l'ouverture de l'appli.

Rien à configurer dans Vercel.

## Bon à savoir

- La clé est enregistrée avec tes données Déclic (ton compte, visible de toi seul). Elle ne donne accès qu'à intervals.icu. Si tu la crois exposée, régénère-la dans intervals.icu puis reconnecte Déclic.
- Si tu notes l'effort perçu sur ta montre après la séance, il arrive pré-rempli dans le petit débrief.
- intervals.icu a prévenu en octobre 2026 que les conditions de Garmin pourraient l'obliger à restreindre l'accès API aux données Garmin. Si ça arrive, Déclic affichera une erreur sur la carte. Il restera alors l'import d'un fichier Garmin (.fit, .zip, .csv) dans la même page.
- La version artifact (claude.ai) n'a pas de serveur : seul l'import de fichier y est disponible.
