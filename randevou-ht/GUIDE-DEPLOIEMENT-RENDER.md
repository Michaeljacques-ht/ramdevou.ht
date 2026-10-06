# 🚀 Guide de déploiement — Randevou.ht sur Render (gratuit)

**Durée totale : environ 20 minutes. Aucune ligne de commande nécessaire — tout se fait dans le navigateur.**

Ce dont vous avez besoin :
- Le dossier `randevou-ht` décompressé sur votre ordinateur
- Une adresse email
- C'est tout. Pas de carte bancaire.

---

## ÉTAPE 1 — Créer un compte GitHub (5 min)

GitHub est le "casier" en ligne où votre code sera stocké. Render ira le chercher là.

1. Allez sur **github.com**
2. Cliquez sur **Sign up** (en haut à droite)
3. Entrez votre email, choisissez un mot de passe et un nom d'utilisateur (ex. `michaeljacques-ht`)
4. Confirmez votre email (un code vous est envoyé)

✅ Vous êtes connecté à GitHub.

---

## ÉTAPE 2 — Créer le dépôt et envoyer les fichiers (5 min)

1. Sur github.com, cliquez sur le bouton vert **New** (ou le **+** en haut à droite → **New repository**)
2. **Repository name** : tapez `randevou-ht`
3. Laissez **Public** coché
4. Cliquez sur **Create repository**
5. Sur la page qui s'ouvre, cliquez sur le petit lien **uploading an existing file**
6. Ouvrez le dossier `randevou-ht` sur votre ordinateur, **sélectionnez tout son contenu** (server.js, package.json, le dossier public, le dossier lib, etc.) et **glissez-déposez** tout dans la zone de la page GitHub

   ⚠️ **Important** : glissez le *contenu* du dossier, pas le dossier lui-même. Le fichier `server.js` doit apparaître à la racine.

   ⚠️ Si un dossier `data` existe, **ne l'envoyez pas** (il sera recréé automatiquement).

7. Attendez que tous les fichiers soient chargés (barre verte)
8. En bas, cliquez sur le bouton vert **Commit changes**

✅ Votre code est en ligne sur GitHub.

---

## ÉTAPE 3 — Créer un compte Render (2 min)

1. Allez sur **render.com**
2. Cliquez sur **Get Started** ou **Sign Up**
3. Choisissez **Sign up with GitHub** (c'est le plus simple)
4. GitHub vous demande l'autorisation → cliquez sur **Authorize Render**

✅ Render est connecté à votre GitHub.

---

## ÉTAPE 4 — Déployer le site (5 min)

1. Dans le tableau de bord Render, cliquez sur **New +** → **Web Service**
2. Render affiche la liste de vos dépôts GitHub → trouvez **randevou-ht** et cliquez sur **Connect**
   - S'il n'apparaît pas : cliquez sur **Configure account** et donnez accès au dépôt.
3. Remplissez le formulaire :

   | Champ | Valeur à mettre |
   |---|---|
   | **Name** | `randevou-ht` |
   | **Region** | `Ohio (US East)` (le plus proche d'Haïti) |
   | **Branch** | `main` |
   | **Runtime** | `Node` (détecté automatiquement) |
   | **Build Command** | laissez vide (ou `npm install`) |
   | **Start Command** | `node server.js` |
   | **Instance Type** | **Free** ✅ |

4. Cliquez sur le bouton **Deploy Web Service** en bas
5. Patientez 1 à 2 minutes. Vous verrez des lignes de texte défiler (c'est normal). Quand apparaît **"Your service is live"** avec un point vert → c'est fini!

✅ Votre site est en ligne à l'adresse : **https://randevou-ht.onrender.com**
(le nom exact est affiché en haut de la page Render)

---

## ÉTAPE 5 — Tester (2 min)

Ouvrez votre adresse dans le navigateur et vérifiez :

- [ ] La page d'accueil s'affiche avec l'annuaire
- [ ] `votre-adresse.onrender.com/salon-elegance` → page de réservation
- [ ] Connexion responsable : `marie@salonelegance.ht` / `demo123`
- [ ] Connexion admin : `admin@randevou.ht` / `admin123`

**Partagez ce lien** avec vos contacts, salons et cliniques pour la démonstration — il fonctionne partout, même sur téléphone.

---

## ⚠️ Les 2 limites du plan gratuit (à connaître)

1. **Mise en veille** : après 15 minutes sans visite, le site s'endort. Le prochain visiteur attend 30 à 60 secondes au premier chargement. Astuce : ouvrez le site vous-même 2 minutes avant une démonstration.

2. **Données non permanentes** : à chaque redémarrage de Render, la base `data/db.json` revient aux données de démonstration. Les rendez-vous et comptes créés par les testeurs seront effacés. **C'est acceptable pour une démo, pas pour de vrais clients.**

---

## 💰 Passer en production plus tard (quand vous aurez des clients)

Sur Render, dans les réglages de votre service :

1. **Instance Type** → passez de Free à **Starter** (~7 $/mois) → plus de mise en veille
2. **Disks** → **Add Disk** : nom `donnees`, chemin `/opt/render/project/src/data`, taille 1 GB (~0,25 $/mois) → vos données deviennent **permanentes**
3. **Custom Domains** → ajoutez `randevou.ht` quand vous aurez acheté le domaine (chez un registraire comme Namecheap, ~30–40 $/an pour un .ht)

Total production : environ **8 $/mois + le domaine**.

---

## 🔄 Mettre à jour le site plus tard

Quand je vous livre une nouvelle version d'un fichier :

1. Sur github.com, ouvrez votre dépôt `randevou-ht`
2. Cliquez sur **Add file** → **Upload files**
3. Glissez le fichier modifié (il remplace l'ancien)
4. **Commit changes**
5. Render redéploie **automatiquement** en 1–2 minutes. Rien d'autre à faire!

---

## 🆘 Problèmes fréquents

| Problème | Solution |
|---|---|
| "Build failed" sur Render | Vérifiez que `package.json` et `server.js` sont bien à la **racine** du dépôt GitHub (pas dans un sous-dossier) |
| Page blanche | Attendez 60 secondes (réveil du serveur) puis rechargez |
| Le dépôt n'apparaît pas dans Render | Render → Account Settings → GitHub → Configure → cochez le dépôt |
| Les données ont disparu | Normal sur le plan gratuit (voir limites ci-dessus) |

---

*Prochaine étape recommandée : quand vous aurez 3–5 entreprises intéressées, passez au VPS pour héberger Randevou.ht, Taksi Konekte et Micro Crédit Solidarité sur le même serveur (~6 $/mois pour les trois). Demandez-moi le guide VPS à ce moment-là.*
