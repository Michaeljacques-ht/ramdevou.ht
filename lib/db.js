// ============================================================
// Biznis Konekte — Base de données JSON (zéro dépendance)
// Migration facile vers MySQL/PostgreSQL plus tard :
// chaque "table" est un tableau d'objets avec id.
// ============================================================
const fs = require('fs');
const path = require('path');

/* Emplacement de la base.
   Sur Render, le dossier de l'application est effacé à chaque déploiement.
   DATA_DIR doit donc pointer vers le disque persistant (ex. /var/data).
   Sans cette variable, on retombe sur ./data, utile en local. */
const DOSSIER_DONNEES = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DOSSIER_DONNEES, 'db.json');

let db = null;
let saveTimer = null;

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  }, 100);
}

function load() {
  if (fs.existsSync(DB_PATH)) {
    db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const avant = JSON.stringify(Object.keys(db)) + (db.chambres || []).filter((c) => !Array.isArray(c.equipements)).length + (db.entreprises || []).filter((e) => !e.formule || !e.metier || !e.abonnement).length;
    // Migration douce pour les bases créées avant le module Séjours
    if (!db.chambres) db.chambres = [];
    // Module hôtellerie : équipements des chambres + carte restaurant/bar
    if (!db.carte) db.carte = [];
    // Gestion hôtelière : plans tarifaires et périodes saisonnières
    if (!db.tarifs) db.tarifs = [];
    if (!db.saisons) db.saisons = [];
    // Capacité détaillée des chambres
    db.chambres.forEach((c) => {
      if (c.adultes === undefined) c.adultes = c.capacite || 2;
      if (c.enfants === undefined) c.enfants = 0;
    });
    // Module scolaire : programmes et demandes d'inscription
    if (!db.programmes) db.programmes = [];
    if (!db.inscriptions) db.inscriptions = [];
    // Module dossiers : notaire, arpenteur, avocat, comptable
    if (!db.dossiers) db.dossiers = [];
    // Module catalogue : produits en vente
    if (!db.produits) db.produits = [];
    // Module vente : commandes avec livraison ou retrait
    if (!db.commandes) db.commandes = [];
    // Messages reçus : contact, partenariat, questions
    if (!db.messages) db.messages = [];
    // Journal de fréquentation, agrégé et purgé automatiquement
    if (!db.visites) db.visites = [];
    db.chambres.forEach((c) => {
      if (!Array.isArray(c.equipements)) c.equipements = [];
      // Galerie : les chambres créées avec une seule photo la conservent
      if (!Array.isArray(c.photos)) c.photos = c.photo ? [c.photo] : [];
    });
    // Métier : déduit de l'ancienne catégorie pour les entreprises existantes
    const DEPUIS_CATEGORIE = {
      'Beauté': 'salon-beaute', 'Santé': 'cabinet-medical', 'Formation': 'centre-formation',
      'Auto': 'garage', 'Maison': 'artisan', 'Juridique': 'avocat',
      'Hôtels & Restaurants': 'hotel', 'Restaurant': 'restaurant', 'Autre': 'autre'
    };
    // Abonnement : les entreprises déjà inscrites démarrent leur essai maintenant
    const forfaits = require('./forfaits.js');
    db.entreprises?.forEach((e) => {
      if (!e.abonnement) e.abonnement = forfaits.nouvelAbonnement('decouverte', new Date());
      if (!e.metier) e.metier = DEPUIS_CATEGORIE[e.categorie] || 'autre';
      if (!e.champs || typeof e.champs !== 'object') e.champs = {};
    });
    // Formule d'hébergement : les entreprises existantes restent en standard
    db.entreprises?.forEach((e) => { if (!e.formule) e.formule = 'standard'; if (!Array.isArray(e.inclus)) e.inclus = []; });
    if (!db.sejours) db.sejours = [];
    // Migration douce pour le module Paiements
    if (!db.paiements) db.paiements = [];
    if (!db.portefeuilles) db.portefeuilles = [];
    if (!db.retraits) db.retraits = [];
    // Ajouter le champ paye aux RDV/séjours existants
    db.rendezvous?.forEach((r) => { if (r.paye === undefined) r.paye = false; });
    db.sejours?.forEach((s) => { if (s.paye === undefined) s.paye = false; });
    // Écrire immédiatement si la migration a modifié la structure,
    // sans attendre la première action de l'utilisateur.
    const apres = JSON.stringify(Object.keys(db)) + (db.chambres || []).filter((c) => !Array.isArray(c.equipements)).length + (db.entreprises || []).filter((e) => !e.formule || !e.metier || !e.abonnement).length;
    if (avant !== apres) fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  } else {
    db = seed();
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    // Copie de sécurité de l'état précédent, avant d'écrire par-dessus
    try {
      if (fs.existsSync(DB_PATH)) fs.copyFileSync(DB_PATH, DB_PATH + '.bak');
    } catch { /* une sauvegarde ratée ne doit pas bloquer l'enregistrement */ }
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  }
  return db;
}

// ------------------------------------------------------------
// Données de démonstration
// ------------------------------------------------------------
function seed() {
  const now = new Date();
  const jour = (offset) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };

  const horairesDefaut = {
    lun: { ouvert: true, debut: '08:00', fin: '17:00' },
    mar: { ouvert: true, debut: '08:00', fin: '17:00' },
    mer: { ouvert: true, debut: '08:00', fin: '17:00' },
    jeu: { ouvert: true, debut: '08:00', fin: '17:00' },
    ven: { ouvert: true, debut: '08:00', fin: '17:00' },
    sam: { ouvert: true, debut: '09:00', fin: '14:00' },
    dim: { ouvert: false, debut: '09:00', fin: '13:00' }
  };

  const users = [
    { id: 'admin1', nom: 'Administrateur', email: 'admin@randevou.ht', motdepasse: 'admin123', role: 'admin', creeLe: now.toISOString() }
  ];

  const entreprises = [];  // Vide — les entreprises s'inscrivent elles-mêmes

  const services = [];  // Vide — chaque entreprise crée ses services

  const employes = [];  // Vide — chaque entreprise crée ses employés

  const rendezvous = [];  // Vide — pas de démo

  const avis = [];  // Vide — pas de démo

  const notifications = [];  // Vide

  return { users, entreprises, services, employes, rendezvous, avis, notifications, chambres: [], sejours: [], carte: [], tarifs: [], saisons: [], programmes: [], inscriptions: [], dossiers: [], produits: [], commandes: [], messages: [], visites: [], paiements: [], portefeuilles: [], retraits: [], sessions: {} };
}

module.exports = { load, save, uid, DB_PATH, DOSSIER_DONNEES, get db() { return db; } };
