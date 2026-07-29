// ============================================================
// Randevou.ht — Base de données JSON (zéro dépendance)
// Migration facile vers MySQL/PostgreSQL plus tard :
// chaque "table" est un tableau d'objets avec id.
// ============================================================
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

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
    // Migration douce pour les bases créées avant le module Séjours
    if (!db.chambres) db.chambres = [];
    if (!db.sejours) db.sejours = [];
    // Migration douce pour le module Paiements
    if (!db.paiements) db.paiements = [];
    if (!db.portefeuilles) db.portefeuilles = [];
    if (!db.retraits) db.retraits = [];
    // Ajouter le champ paye aux RDV/séjours existants
    db.rendezvous?.forEach((r) => { if (r.paye === undefined) r.paye = false; });
    db.sejours?.forEach((s) => { if (s.paye === undefined) s.paye = false; });
  } else {
    db = seed();
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
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

  return { users, entreprises, services, employes, rendezvous, avis, notifications, chambres: [], sejours: [], paiements: [], portefeuilles: [], retraits: [], sessions: {} };
}

module.exports = { load, save, uid, get db() { return db; } };
