# Randevou.ht — Plateforme de prise de rendez-vous pour entreprises haïtiennes

## Démarrage (Windows)

1. Décompressez le dossier `randevou-ht` (par exemple sur le Bureau).
2. Double-cliquez sur **demarrer.bat** (Node.js doit être installé — même version que pour Taksi Konekte).
3. Ouvrez votre navigateur sur **http://localhost:3000**

Aucune installation `npm install` n'est nécessaire : le projet fonctionne avec Node.js seul.

## Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| Responsable (Salon Elegance) | marie@salonelegance.ht | demo123 |
| Responsable (Clinique Espoir) | contact@cliniqueespoir.ht | demo123 |
| Administrateur plateforme | admin@randevou.ht | admin123 |

## Pages principales

- `/` — Accueil public : recherche, catégories, annuaire
- `/salon-elegance` — Exemple d'URL personnalisée d'entreprise (réservation en ligne)
- `/inscription.html` — Inscription d'une nouvelle entreprise
- `/connexion.html` — Connexion
- `/dashboard.html` — Tableau de bord responsable
- `/admin.html` — Espace administrateur (validation des entreprises, plans)

## Fonctionnalités incluses (MVP)

- Annuaire public avec recherche + filtres par catégorie
- Page publique personnalisée par entreprise (couleurs, logo, description, horaires, équipe, avis)
- Réservation client en 4 étapes avec créneaux calculés en temps réel
  (horaires d'ouverture × durée du service × rendez-vous existants × nombre d'employés actifs)
- Tableau de bord : statistiques, graphique d'activité 14 jours, rendez-vous récents
- Gestion des rendez-vous : confirmer / annuler / terminer, filtres
- Calendrier hebdomadaire visuel
- Gestion des services (durée, prix HTG, activer/masquer)
- Gestion des employés (capacité de créneaux simultanés)
- Avis clients avec note moyenne
- Personnalisation (couleurs, initiales logo, description) avec aperçu en direct
- Horaires d'ouverture par jour
- Notifications internes (cloche) + lien WhatsApp direct (wa.me)
- Administration : validation/suspension des entreprises, plan Gratuit/Premium, statistiques globales

## Données

Base JSON auto-créée dans `data/db.json`. Pour repartir de zéro : supprimez ce fichier et relancez.
La structure (users, entreprises, services, rendezvous, avis, notifications) est directement
transposable en tables MySQL/PostgreSQL pour la version production.

## Prochaines étapes suggérées

1. **SMS/WhatsApp réels** : brancher Twilio dans `server.js` (les points d'envoi sont déjà marqués par `console.log('[NOTIFICATION...`).
2. **Emails** : SendGrid sur les mêmes points.
3. **Paiement** : MonCash/NatCash au moment de la confirmation.
4. **Mots de passe hachés** (bcrypt) et HTTPS avant toute mise en ligne.
5. **Hébergement** : VPS (DigitalOcean/Hostinger) avec Nginx + nom de domaine randevou.ht.
