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
    { id: 'admin1', nom: 'Administrateur', email: 'admin@randevou.ht', motdepasse: 'admin123', role: 'admin', creeLe: now.toISOString() },
    { id: 'u1', nom: 'Marie Dorval', email: 'marie@salonelegance.ht', motdepasse: 'demo123', role: 'responsable', entrepriseId: 'e1', creeLe: now.toISOString() },
    { id: 'u2', nom: 'Dr Jean Espoir', email: 'contact@cliniqueespoir.ht', motdepasse: 'demo123', role: 'responsable', entrepriseId: 'e2', creeLe: now.toISOString() }
  ];

  const entreprises = [
    {
      id: 'e1', slug: 'salon-elegance', nom: 'Salon Elegance', categorie: 'Beauté',
      description: "Salon de beauté moderne au cœur de Pétion-Ville. Coiffure, soins du visage, manucure et massage dans un cadre élégant et professionnel.",
      adresse: '12, Rue Grégoire, Pétion-Ville', telephone: '+509 3712 4589', whatsapp: '50937124589',
      email: 'contact@salonelegance.ht', statut: 'approuvee', plan: 'premium',
      couleur: '#5A3FFF', couleur2: '#FF6B00', logoTexte: 'SE',
      horaires: horairesDefaut, creeLe: now.toISOString()
    },
    {
      id: 'e2', slug: 'clinique-espoir', nom: 'Clinique Espoir', categorie: 'Santé',
      description: "Clinique médicale à Delmas offrant consultations générales, pédiatrie et suivi médical avec une équipe attentive et qualifiée.",
      adresse: 'Delmas 33, Port-au-Prince', telephone: '+509 2812 6644', whatsapp: '50928126644',
      email: 'contact@cliniqueespoir.ht', statut: 'approuvee', plan: 'gratuit',
      couleur: '#0E9F6E', couleur2: '#2563EB', logoTexte: 'CE',
      horaires: horairesDefaut, creeLe: now.toISOString()
    }
  ];

  const services = [
    { id: 's1', entrepriseId: 'e1', nom: 'Coupe + Barbe', duree: 45, prix: 750, actif: true },
    { id: 's2', entrepriseId: 'e1', nom: 'Soin visage', duree: 45, prix: 1500, actif: true },
    { id: 's3', entrepriseId: 'e1', nom: 'Massage détente', duree: 60, prix: 2500, actif: true },
    { id: 's4', entrepriseId: 'e1', nom: 'Manucure', duree: 45, prix: 600, actif: true },
    { id: 's5', entrepriseId: 'e2', nom: 'Consultation générale', duree: 30, prix: 1000, actif: true },
    { id: 's6', entrepriseId: 'e2', nom: 'Consultation pédiatrique', duree: 30, prix: 1200, actif: true },
    { id: 's7', entrepriseId: 'e2', nom: 'Contrôle tension + suivi', duree: 20, prix: 500, actif: true }
  ];

  const employes = [
    { id: 'p1', entrepriseId: 'e1', nom: 'Marie Dorval', poste: 'Responsable / Coiffeuse', actif: true },
    { id: 'p2', entrepriseId: 'e1', nom: 'Stéphania Louis', poste: 'Esthéticienne', actif: true },
    { id: 'p3', entrepriseId: 'e2', nom: 'Dr Jean Espoir', poste: 'Médecin généraliste', actif: true }
  ];

  const rendezvous = [
    { id: 'r1', entrepriseId: 'e1', serviceId: 's1', clientNom: 'Jean Michel', clientTel: '+509 4455 6677', clientEmail: '', date: jour(0), heure: '10:00', statut: 'confirme', creeLe: now.toISOString() },
    { id: 'r2', entrepriseId: 'e1', serviceId: 's2', clientNom: 'Natacha Pierre', clientTel: '+509 3311 2244', clientEmail: '', date: jour(0), heure: '11:30', statut: 'en_attente', creeLe: now.toISOString() },
    { id: 'r3', entrepriseId: 'e1', serviceId: 's3', clientNom: 'David Louis', clientTel: '+509 4890 1123', clientEmail: '', date: jour(1), heure: '13:00', statut: 'confirme', creeLe: now.toISOString() },
    { id: 'r4', entrepriseId: 'e1', serviceId: 's4', clientNom: 'Sophia Martin', clientTel: '+509 3766 9080', clientEmail: '', date: jour(1), heure: '14:30', statut: 'confirme', creeLe: now.toISOString() },
    { id: 'r5', entrepriseId: 'e2', serviceId: 's5', clientNom: 'Roseline Charles', clientTel: '+509 4102 5566', clientEmail: '', date: jour(0), heure: '09:00', statut: 'confirme', creeLe: now.toISOString() },
    { id: 'r6', entrepriseId: 'e1', serviceId: 's1', clientNom: 'Patrick Junior', clientTel: '+509 3245 7788', clientEmail: '', date: jour(-8), heure: '10:00', statut: 'termine', creeLe: now.toISOString() },
    { id: 'r7', entrepriseId: 'e1', serviceId: 's2', clientNom: 'Guerline Paul', clientTel: '+509 4877 2211', clientEmail: '', date: jour(-5), heure: '11:00', statut: 'termine', creeLe: now.toISOString() }
  ];

  const avis = [
    { id: 'a1', entrepriseId: 'e1', clientNom: 'Guerline Paul', note: 5, commentaire: 'Service impeccable, personnel très accueillant. Je recommande !', creeLe: now.toISOString() },
    { id: 'a2', entrepriseId: 'e1', clientNom: 'Patrick Junior', note: 4, commentaire: 'Très bonne coupe, léger retard mais bonne expérience globale.', creeLe: now.toISOString() },
    { id: 'a3', entrepriseId: 'e2', clientNom: 'Roseline Charles', note: 5, commentaire: 'Médecin à l’écoute, clinique propre et bien organisée.', creeLe: now.toISOString() }
  ];

  const notifications = [
    { id: 'n1', entrepriseId: 'e1', type: 'nouveau_rdv', message: 'Nouveau rendez-vous : Natacha Pierre — Soin visage', lu: false, creeLe: now.toISOString() }
  ];

  return { users, entreprises, services, employes, rendezvous, avis, notifications, chambres: [], sejours: [], sessions: {} };
}

module.exports = { load, save, uid, get db() { return db; } };
