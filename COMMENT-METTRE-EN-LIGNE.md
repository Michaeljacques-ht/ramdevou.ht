# Mettre Konekte en ligne

Ce dossier contient **le projet entier, à jour**. Envoyez-le tel quel : il
remplace ce qui est sur GitHub, et plus rien ne peut manquer.

C'est la méthode à retenir. Envoyer seulement « les fichiers modifiés » est
fragile : il suffit d'en oublier un pour que la mise à jour ne fasse rien, ou
pour que le serveur refuse de démarrer. Avec le dossier complet, la question
ne se pose plus.

## Les cinq étapes

1. Décompressez `konekte.zip` sur votre ordinateur.
2. Sur **github.com**, ouvrez votre dépôt → **Add file** → **Upload files**.
3. Ouvrez le dossier `konekte` et glissez **tout son contenu** : les dossiers
   `lib` et `public`, puis `server.js`, `package.json` et les fichiers `.md`.

   ⚠️ Glissez le **contenu** du dossier, pas le dossier lui-même :
   `server.js` doit se retrouver à la racine du dépôt, pas dans
   `konekte/server.js`.

   ⚠️ S'il existe un dossier `data`, ne l'envoyez pas : vos vraies données
   vivent sur le disque de Render, pas sur GitHub.

4. Descendez tout en bas de la page → bouton vert **Commit changes**.
   **C'est l'étape qu'on oublie.** Sans ce clic, rien n'est enregistré : la
   page se referme et les fichiers sont perdus.
5. Sur **render.com** → votre service → onglet **Events** : un déploiement
   démarre dans la minute. Attendez le point vert **Live** (1 à 2 minutes).

## Vérifier en dix secondes

Ouvrez dans votre navigateur :

**https://www.bizniskonekte.tech/sw.js**

La deuxième ligne doit afficher :

```
const CACHE = 'konekte-v59';
```

Si elle affiche encore `biznis-v55`, le déploiement n'a pas eu lieu — ne
cherchez pas ailleurs, reprenez à l'étape 4.

Gardez ce réflexe pour toutes les mises à jour : ce numéro change à chaque
livraison, et c'est le seul moyen fiable de savoir ce qui tourne réellement.

## Ce que contient cette version

**Le nom et le logo.** La plateforme s'appelle Konekte et porte le nouveau
symbole : en-têtes, icône de l'application, favicon, écrans de connexion,
reçus, courriels. L'ancien logo peint sur le mur de la photo d'accueil a été
remplacé.

**La comptabilité.** Module complet en partie double, mais avec une saisie en
langage ordinaire : recettes, dépenses, caisses, créances clients, dettes
fournisseurs, TCA, résultat mensuel, balance, clôture et export pour votre
comptable. Les ventes encaissées par la plateforme s'y inscrivent toutes
seules. Compris dans le forfait Pro.

**Les précommandes.** Un produit peut être annoncé « Bientôt disponible »,
avec une date d'arrivée, et ouvert à la précommande.

**La répartition des fonctions.** Le métier décide ce que l'entreprise voit,
le forfait décide le volume et les options de croissance. Les cases à cocher
des fonctions ont disparu.

**La commission Découverte** passe à 7,5 %, ce qui place la bascule vers Pro
à exactement 20 000 HTG encaissés par mois.

## Si le déploiement échoue

Onglet **Logs** de votre service Render :

| Message | Cause |
|---|---|
| `Cannot find module './lib/compta.js'` | le dossier `lib` n'est pas monté |
| `Build failed` | `server.js` n'est pas à la racine du dépôt |
| `Cannot find module` (autre) | un dossier a été envoyé incomplet — refaites l'envoi |

## Sur votre téléphone

L'application déjà installée garde l'ancien nom et l'ancienne icône :
Android et iOS les figent au moment de l'ajout à l'écran d'accueil. Pour voir
Konekte, supprimez l'icône, rouvrez le site dans le navigateur, puis
**Ajouter à l'écran d'accueil**. Le site dans le navigateur, lui, se met à
jour tout seul.

## Reste à faire quand vous voudrez

- Les **guides PDF** et les **flyers** portent encore l'ancienne identité :
  demandez-les-moi, ils se régénèrent en une fois.
- Les **variables d'environnement** sur Render (`BREVO_API_KEY`, `VAPID_*`,
  `SEL_RECUS`, `DATA_DIR`) — voir `LISEZMOI.md`.
- Un **domaine `konekte`**, si vous voulez que l'adresse suive le nom. On
  l'ajoute à côté de l'actuel, les deux mènent au même site.
