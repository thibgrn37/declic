# Mettre Déclic en ligne

Objectif : l'appli à une adresse web (Vercel), installable sur le téléphone, avec les données sauvegardées en ligne (Supabase) et synchronisées entre téléphone et ordinateur. Les deux services ont une offre gratuite suffisante pour un usage perso. Compter 15 minutes.

## 1. Supabase (la sauvegarde)

1. Crée un compte sur https://supabase.com (« Start your project », connexion avec GitHub possible).
2. **New project** : nom `declic`, choisis un mot de passe de base de données (garde-le de côté, il ne sert pas à l'appli), région **West EU (Paris)** ou **Central EU (Frankfurt)**.
3. Quand le projet est prêt : **SQL Editor** > **New query**, colle le contenu de [`supabase/schema.sql`](../supabase/schema.sql), puis **Run**. Le message « Success. No rows returned » est attendu.
4. **Project Settings** > **API** (ou **Data API**) : note
   - **Project URL** (`https://xxxx.supabase.co`)
   - la clé **anon public** (ou **publishable key**).
   Ces deux valeurs peuvent être publiques : la sécurité repose sur les règles de la table (chacun ne lit que ses propres données).

## 2. Vercel (l'hébergement)

1. Crée un compte sur https://vercel.com avec **Continue with GitHub**.
2. **Add New…** > **Project** > importe le dépôt `thibgrn37/declic`.
3. Vercel détecte Vite. Avant de cliquer sur **Deploy**, ouvre **Environment Variables** et ajoute :
   - `VITE_SUPABASE_URL` = la Project URL
   - `VITE_SUPABASE_ANON_KEY` = la clé anon
4. **Deploy**. Au bout d'une minute, tu as une adresse du type `https://declic-xxx.vercel.app`.

Chaque fusion sur `main` redéploie l'appli automatiquement.

## 3. Relier les deux

Dans Supabase : **Authentication** > **URL Configuration** :
- **Site URL** = ton adresse Vercel ;
- **Redirect URLs** : ajoute la même adresse.

Sans ça, le lien de confirmation reçu par e-mail renverrait vers `localhost`.

## 4. Créer ton compte et installer l'appli

1. Sur l'ordinateur, ouvre l'adresse Vercel. Si tu avais déjà commencé dans le navigateur, tes données locales sont reprises. Va dans **Progrès** > **Sauvegarde en ligne** > **Créer mon compte**.
2. Clique sur le lien reçu par e-mail, puis connecte-toi. Tes données partent en ligne.
3. Sur le téléphone, ouvre la même adresse :
   - **iPhone** : dans Safari, bouton **Partager** > **Sur l'écran d'accueil** ;
   - **Android** : menu de Chrome > **Installer l'application**.
4. Ouvre Déclic depuis l'icône, touche **Se connecter** en haut de l'écran d'accueil : ton programme et tes séances arrivent.

Optionnel, une fois ton compte créé : **Authentication** > **Sign In / Providers** > désactive **Allow new users to sign up**, pour que personne d'autre ne crée de compte sur ton instance.

## Comment marche la synchro

- Tout est enregistré d'abord sur l'appareil : l'appli marche sans réseau (en avion, au fond d'un vestiaire).
- Dès que le réseau est là, les changements partent en ligne. Quand tu reviens sur l'appli, elle récupère ce que tu as fait sur l'autre appareil.
- Si les deux appareils ont été modifiés hors ligne, c'est la modification la plus récente qui l'emporte (pas de fusion fine). Pour un seul utilisateur, ça suffit.
- Un appareil qui n'a pas encore fait de bilan n'écrase jamais les données en ligne.

## Développement local avec Supabase

Copie `.env.example` en `.env.local` et remplis les deux valeurs. Sans ce fichier, l'appli fonctionne comme avant, sans compte.
