// ============================================================
// Randevou.ht — Serveur (Node.js pur, zéro dépendance)
// Lancer :  node server.js   →  http://localhost:3000
// ============================================================
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const store = require('./lib/db');
const plopplop = require('./plopplop.js');
const metiers = require('./lib/metiers.js');
const taksi = require('./lib/taksi.js');

// ---- Paramètres commerciaux ----
const COMMISSION_RANDEVOU = 0.15;   // part Randevou.ht sur chaque encaissement
const MONTANT_MIN_RETRAIT = 1000;   // retrait minimum du portefeuille, en HTG

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const db = store.load();

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml; charset=utf-8', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json; charset=utf-8' };

// ---------------- Utilitaires ----------------
function json(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}
function lireCorps(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => { b += c; if (b.length > 4e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch { resolve({}); } });
  });
}
function cookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('='); if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1));
  });
  return out;
}
function utilisateurConnecte(req) {
  const token = cookies(req).rdv_session;
  const userId = token && db.sessions[token];
  return db.users.find((u) => u.id === userId) || null;
}
function slugifier(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
}
// ---- Formule d'hébergement et prestations incluses (resort / tout inclus) ----
const FORMULES = ['standard', 'resort'];
const INCLUS = {
  petitdej:   { fr: 'Petit-déjeuner',            ht: 'Ti dejene',            ico: '🥐' },
  dejeuner:   { fr: 'Déjeuner',                  ht: 'Manje midi',           ico: '🍽️' },
  diner:      { fr: 'Dîner',                     ht: 'Manje aswè',           ico: '🍛' },
  collations: { fr: 'Collations à volonté',      ht: 'Ti manje a volonte',   ico: '🍪' },
  boissons:   { fr: 'Boissons sans alcool',      ht: 'Bwason san alkòl',     ico: '🧃' },
  alcool:     { fr: 'Boissons alcoolisées',      ht: 'Bwason ak alkòl',      ico: '🍹' },
  barouvert:  { fr: 'Bar ouvert',                ht: 'Ba louvri',            ico: '🍸' },
  piscine:    { fr: 'Accès piscine',             ht: 'Aksè pisin',           ico: '🏊' },
  plage:      { fr: 'Accès plage privée',        ht: 'Aksè plaj prive',      ico: '🏖️' },
  animations: { fr: 'Animations et soirées',     ht: 'Animasyon ak sware',   ico: '🎶' },
  sport:      { fr: 'Activités sportives',       ht: 'Aktivite espòtif',     ico: '🏐' },
  nautique:   { fr: 'Sports nautiques',          ht: 'Espò nan dlo',         ico: '🚤' },
  spa:        { fr: 'Accès spa',                 ht: 'Aksè espa',            ico: '💆' },
  gym:        { fr: 'Salle de sport',            ht: 'Sal espò',             ico: '🏋️' },
  kids:       { fr: 'Club enfants',              ht: 'Klib timoun',          ico: '🧒' },
  navette:    { fr: 'Navette aéroport',          ht: 'Navèt ayewopò',        ico: '🚐' },
  wifi:       { fr: 'Wi-Fi partout',             ht: 'Wi-Fi toupatou',       ico: '📶' },
  parking:    { fr: 'Parking',                   ht: 'Pakin',                ico: '🅿️' }
};
const CLES_INCLUS = Object.keys(INCLUS);
function nettoyerInclus(v) {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((k) => CLES_INCLUS.includes(k)))];
}

// ---- Équipements de chambre (catalogue fermé, clés stables) ----
const EQUIPEMENTS = {
  clim: { fr: 'Climatiseur', ht: 'Èkondisyone', ico: '❄️' },
  ventilateur: { fr: 'Ventilateur', ht: 'Vantilatè', ico: '🌀' },
  wifi: { fr: 'Internet Wi-Fi', ht: 'Entènèt Wi-Fi', ico: '📶' },
  litdouble: { fr: 'Lit double', ht: 'Kabann doub', ico: '🛏️' },
  litsimple: { fr: 'Lit simple', ht: 'Kabann senp', ico: '🛌' },
  tv: { fr: 'Téléviseur', ht: 'Televizyon', ico: '📺' },
  netflix: { fr: 'Netflix / streaming', ht: 'Netflix / striming', ico: '🎬' },
  eauchaude: { fr: 'Eau chaude', ht: 'Dlo cho', ico: '🚿' },
  sdb: { fr: 'Salle de bain privée', ht: 'Twalèt prive', ico: '🛁' },
  balcon: { fr: 'Balcon', ht: 'Balkon', ico: '🌅' },
  frigo: { fr: 'Réfrigérateur', ht: 'Frijidè', ico: '🧊' },
  coffre: { fr: 'Coffre-fort', ht: 'Kòf-fò', ico: '🔒' },
  inverter: { fr: 'Inverter / courant 24h', ht: 'Envètè / kouran 24h', ico: '🔋' },
  parking: { fr: 'Parking', ht: 'Pakin', ico: '🅿️' },
  piscine: { fr: 'Accès piscine', ht: 'Aksè pisin', ico: '🏊' },
  petitdej: { fr: 'Petit-déjeuner inclus', ht: 'Ti dejene enkli', ico: '🥐' }
};
const CLES_EQUIPEMENTS = Object.keys(EQUIPEMENTS);
function nettoyerEquipements(v) {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((k) => CLES_EQUIPEMENTS.includes(k)))];
}

// ---- Carte restaurant & bar ----
const CATEGORIES_CARTE = ['entree', 'plat', 'accompagnement', 'dessert', 'boisson', 'cocktail', 'biere', 'vin', 'spiritueux'];

// ---- Vente en ligne : modes de remise et statuts de commande ----
const MODES_REMISE = [
  { cle: 'cueillette', fr: 'Retrait sur place',  ht: 'Vin chèche',    ico: '🏪' },
  { cle: 'livraison',  fr: 'Livraison',          ht: 'Livrezon',      ico: '🛵' }
];
const STATUTS_COMMANDE = [
  { cle: 'nouvelle',    fr: 'Nouvelle',            ht: 'Nouvo',          badge: 'badge-orange' },
  { cle: 'confirmee',   fr: 'Confirmée',           ht: 'Konfime',        badge: 'badge-bleu' },
  { cle: 'preparation', fr: 'En préparation',      ht: 'Ap prepare',     badge: 'badge-violet' },
  { cle: 'prete',       fr: 'Prête',               ht: 'Pare',           badge: 'badge-bleu' },
  { cle: 'en_route',    fr: 'En route',            ht: 'Sou wout',       badge: 'badge-violet' },
  { cle: 'livree',      fr: 'Livrée / retirée',    ht: 'Livre / pran',   badge: 'badge-vert' },
  { cle: 'annulee',     fr: 'Annulée',             ht: 'Anile',          badge: 'badge-rouge' }
];
// Étapes visibles par le client selon le mode choisi
function etapesCommande(mode) {
  return mode === 'livraison'
    ? ['nouvelle', 'confirmee', 'preparation', 'en_route', 'livree']
    : ['nouvelle', 'confirmee', 'preparation', 'prete', 'livree'];
}
function nettoyerZones(v) {
  if (!Array.isArray(v)) return [];
  return v.map((z) => ({
    nom: String(z.nom || '').slice(0, 60),
    frais: Math.max(0, Math.min(+z.frais || 0, 100000)),
    delai: String(z.delai || '').slice(0, 40)
  })).filter((z) => z.nom).slice(0, 30);
}

// Distance en km entre deux points (formule de Haversine)
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function noteMoyenne(entrepriseId) {
  const a = db.avis.filter((x) => x.entrepriseId === entrepriseId);
  if (!a.length) return { note: 0, total: 0 };
  return { note: Math.round((a.reduce((s, x) => s + x.note, 0) / a.length) * 10) / 10, total: a.length };
}
function notifier(entrepriseId, type, message) {
  db.notifications.unshift({ id: store.uid(), entrepriseId, type, message, lu: false, creeLe: new Date().toISOString() });
  store.save();
}

// ---------------- Envoi d'emails (API Brevo, gratuit 300/jour) ----------------
// Configuration par variables d'environnement sur Render :
//   BREVO_API_KEY    = votre clé API Brevo (xkeysib-...)
//   EMAIL_EXPEDITEUR = l'adresse expéditrice vérifiée dans Brevo
// Sans ces variables, l'email est simplement affiché dans les journaux (mode simulation).
const https = require('https');
// ---------------- Envoi WhatsApp (API officielle Meta Cloud) ----------------
// Configuration par variables d'environnement sur Render :
//   WHATSAPP_TOKEN     = jeton d'accès permanent Meta
//   WHATSAPP_PHONE_ID  = identifiant du numéro de téléphone WhatsApp Business
//   WHATSAPP_LANG      = langue des modèles (défaut : fr)
// Les modèles rdv_recu, rdv_statut et rdv_rappel doivent être approuvés dans Meta Business.
// Sans configuration, les messages sont affichés dans les journaux (mode simulation).
// -------- Gestion portefeuille --------
function creerOuObtenirPortefeuille(entrepriseId) {
  let p = db.portefeuilles.find((x) => x.id === entrepriseId);
  if (!p) {
    p = { id: entrepriseId, solde: 0, soldeBloque: 0, totalRecu: 0, totalRetire: 0, creeLe: new Date().toISOString() };
    db.portefeuilles.push(p);
  }
  return p;
}
function creerPaiement(entrepriseId, commandeType, commandeId, montant, methodePaiement, clientEmail, clientNom) {
  const reference = `${commandeType[0].toUpperCase()}${commandeId.slice(0, 8)}${Date.now().toString(36).toUpperCase()}`;
  const paiement = {
    id: store.uid(), entrepriseId, reference, commandeType, commandeId, montantBrut: montant,
    commission: Math.round(montant * COMMISSION_RANDEVOU), montantNet: Math.round(montant * (1 - COMMISSION_RANDEVOU)),
    methodePaiement: methodePaiement || 'all', clientEmail, clientNom,
    statut: 'en_attente', transactionId: null, creeLe: new Date().toISOString()
  };
  db.paiements.push(paiement);
  return paiement;
}

function normaliserTel(tel) {
  let n = String(tel || '').replace(/\D/g, '');
  if (n.length === 8) n = '509' + n; // numéro haïtien local → indicatif 509
  return n.length >= 10 ? n : null;
}
function envoyerWhatsApp(tel, nomModele, parametres) {
  const numero = normaliserTel(tel);
  if (!numero) return;
  const jeton = process.env.WHATSAPP_TOKEN, phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!jeton || !phoneId) {
    console.log(`[WHATSAPP simulation → ${numero}] modèle ${nomModele} : ${parametres.join(' | ')}`);
    return;
  }
  const corps = JSON.stringify({
    messaging_product: 'whatsapp', to: numero, type: 'template',
    template: {
      name: nomModele,
      language: { code: process.env.WHATSAPP_LANG || 'fr' },
      components: [{ type: 'body', parameters: parametres.map((t) => ({ type: 'text', text: String(t).slice(0, 200) })) }]
    }
  });
  const req = require('https').request({
    hostname: 'graph.facebook.com', path: `/v21.0/${phoneId}/messages`, method: 'POST',
    headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(corps) }
  }, (rep) => {
    let b = ''; rep.on('data', (c) => b += c);
    rep.on('end', () => { if (rep.statusCode >= 300) console.log(`[WHATSAPP erreur ${rep.statusCode}]`, b.slice(0, 200)); });
  });
  req.on('error', (e) => console.log('[WHATSAPP erreur]', e.message));
  req.end(corps);
}

function envoyerEmail(destinataire, sujet, html) {
  if (!destinataire || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(destinataire)) return;
  const cle = process.env.BREVO_API_KEY, exp = process.env.EMAIL_EXPEDITEUR;
  if (!cle || !exp) {
    console.log(`[EMAIL simulation → ${destinataire}] ${sujet}`);
    return;
  }
  const corps = JSON.stringify({
    sender: { name: 'Randevou.ht', email: exp },
    to: [{ email: destinataire }],
    subject: sujet,
    htmlContent: html
  });
  const req = https.request({
    hostname: 'api.brevo.com', path: '/v3/smtp/email', method: 'POST',
    headers: { 'api-key': cle, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(corps) }
  }, (rep) => {
    if (rep.statusCode >= 300) console.log(`[EMAIL erreur ${rep.statusCode} → ${destinataire}]`);
    rep.resume();
  });
  req.on('error', (e) => console.log('[EMAIL erreur]', e.message));
  req.end(corps);
}
function gabaritEmail(titre, couleur, lignes, pied) {
  return `<!DOCTYPE html><html lang="fr"><body style="margin:0;background:#F2F4F7;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #E4E7EC">
    <div style="background:${couleur};color:#fff;padding:22px 26px">
      <div style="font-size:13px;opacity:.85;font-weight:bold">📅 Randevou.ht</div>
      <h1 style="margin:6px 0 0;font-size:21px">${titre}</h1>
    </div>
    <div style="padding:24px 26px;color:#101828;font-size:15px;line-height:1.65">${lignes}</div>
    <div style="padding:16px 26px;border-top:1px solid #E4E7EC;color:#667085;font-size:12px">${pied || 'Randevou.ht — La plateforme haïtienne de prise de rendez-vous en ligne.'}</div>
  </div></body></html>`;
}
// Vue publique du service d'urgence.
// L'état d'affluence n'est transmis que s'il est récent : une information
// périmée pourrait orienter quelqu'un vers un service saturé.
function urgencePublique(e) {
  const u = e.urgence;
  if (!u || !u.actif) return null;
  const heures = u.etatMaj ? (Date.now() - new Date(u.etatMaj).getTime()) / 3600000 : Infinity;
  const etatRecent = heures <= 12;
  return {
    permanence: !!u.permanence,
    telephone: u.telephone || e.telephone || '',
    telephone2: u.telephone2 || '',
    ambulance: !!u.ambulance,
    telAmbulance: u.telAmbulance || '',
    capacites: u.capacites || [],
    consigne: u.consigne || '',
    horaires: u.horaires || '',
    etat: etatRecent ? u.etat : null,
    etatDepuis: etatRecent ? Math.round(heures) : null,
    garde: (u.gardeDebut && u.gardeFin)
      ? { debut: u.gardeDebut, fin: u.gardeFin,
          active: new Date().toISOString().slice(0, 10) >= u.gardeDebut
               && new Date().toISOString().slice(0, 10) <= u.gardeFin }
      : null
  };
}

function publicEntreprise(e) {
  const { note, total } = noteMoyenne(e.id);
  return { slug: e.slug, nom: e.nom, categorie: e.categorie, description: e.description, adresse: e.adresse, telephone: e.telephone, whatsapp: e.whatsapp, couleur: e.couleur, couleur2: e.couleur2, logoTexte: e.logoTexte, logoImage: e.logoImage || '', photoFond: e.photoFond || '', horaires: e.horaires, plan: e.plan, latitude: e.latitude ?? null, longitude: e.longitude ?? null,
    formule: e.formule || 'standard', inclus: e.inclus || [], noteFormule: e.noteFormule || '',
    metier: e.metier || 'autre', champs: e.champs || {}, urgence: urgencePublique(e),
    note, totalAvis: total };
}

// ---------------- Calcul des créneaux disponibles ----------------
const JOURS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
// ---------------- Séjours (chambres d'hôtel) ----------------
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// ================= Gestion hôtelière : tarification =================
// Un plan tarifaire est une façon de vendre la même chambre : tarif standard,
// non remboursable moins cher, ou avec petit-déjeuner. Une saison ajuste ces
// prix sur une période. Les taxes et l'acompte sont réglés par l'établissement.

/** Saison applicable à une date donnée (la plus récemment créée l'emporte). */
function saisonPour(entrepriseId, date) {
  return db.saisons
    .filter((s) => s.entrepriseId === entrepriseId && s.actif && date >= s.debut && date <= s.fin)
    .sort((a, b) => b.creeLe.localeCompare(a.creeLe))[0] || null;
}

/** Liste des dates d'un séjour (la nuit de départ n'est pas facturée). */
function nuitsDu(arrivee, depart) {
  const out = [];
  const d = new Date(arrivee + 'T00:00:00Z'), fin = new Date(depart + 'T00:00:00Z');
  while (d < fin) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}

/**
 * Devis complet d'un séjour, nuit par nuit.
 * Le détail est renvoyé pour que le client voie ce qu'il paie.
 */
function devisSejour(e, chambre, plan, arrivee, depart) {
  const nuits = nuitsDu(arrivee, depart);
  const base = plan && plan.prixNuit > 0 ? plan.prixNuit : chambre.prixNuit;
  const detail = nuits.map((date) => {
    const s = saisonPour(e.id, date);
    let prix = base;
    if (s) prix = s.type === 'pourcentage' ? Math.round(base * (1 + s.valeur / 100)) : Math.max(0, base + s.valeur);
    return { date, prix, saison: s ? s.nom : '' };
  });
  const sousTotal = detail.reduce((n, x) => n + x.prix, 0);
  const h = e.hotel || {};
  const taxes = [];
  if (h.taxeSejour > 0) taxes.push({ nom: 'Taxe de séjour', montant: Math.round(h.taxeSejour * nuits.length) });
  if (h.tauxTaxe > 0) taxes.push({ nom: `Taxes (${h.tauxTaxe}%)`, montant: Math.round(sousTotal * h.tauxTaxe / 100) });
  const totalTaxes = taxes.reduce((n, x) => n + x.montant, 0);
  const total = sousTotal + totalTaxes;
  const pctAcompte = Math.max(0, Math.min(+h.acompte || 0, 100));
  return {
    nuits: nuits.length, detail, base, sousTotal, taxes, totalTaxes, total,
    plan: plan ? { id: plan.id, nom: plan.nom, remboursable: plan.remboursable, petitDejeuner: plan.petitDejeuner } : null,
    acompte: pctAcompte ? Math.round(total * pctAcompte / 100) : 0,
    pourcentageAcompte: pctAcompte
  };
}

/** Contrôle des règles de vente : séjour minimum et délai de réservation. */
function verifierRegles(e, arrivee, depart) {
  const h = e.hotel || {};
  const n = nbNuits(arrivee, depart);
  if (h.sejourMin && n < h.sejourMin)
    return `Séjour minimum de ${h.sejourMin} nuit${h.sejourMin > 1 ? 's' : ''}.`;
  if (h.sejourMax && n > h.sejourMax)
    return `Séjour maximum de ${h.sejourMax} nuits.`;
  return null;
}

function nbNuits(arrivee, depart) {
  return Math.round((new Date(depart + 'T12:00:00Z') - new Date(arrivee + 'T12:00:00Z')) / 86400000);
}
// Chambres restantes pour un type donné sur la période [arrivee, depart)
function chambresRestantes(chambre, arrivee, depart, ignorerId) {
  const occupees = db.sejours.filter((s) =>
    s.chambreId === chambre.id &&
    s.id !== ignorerId &&
    ['en_attente', 'confirme'].includes(s.statut) &&
    s.arrivee < depart && arrivee < s.depart // chevauchement de périodes
  ).length;
  return Math.max(0, (+chambre.quantite || 1) - occupees);
}
function validerPeriode(arrivee, depart) {
  if (!DATE_RE.test(arrivee || '') || !DATE_RE.test(depart || '')) return 'Dates invalides.';
  const nuits = nbNuits(arrivee, depart);
  if (nuits < 1) return 'La date de départ doit être après la date d\'arrivée.';
  if (nuits > 90) return 'Séjour limité à 90 nuits.';
  const aujourdhui = new Date().toISOString().slice(0, 10);
  if (arrivee < aujourdhui) return 'La date d\'arrivée est déjà passée.';
  return null;
}

function creneauxDisponibles(entreprise, service, dateStr) {
  const jour = JOURS[new Date(dateStr + 'T12:00:00').getDay()];
  const h = entreprise.horaires[jour];
  if (!h || !h.ouvert) return [];
  // Capacité : réglage manuel de l'entreprise s'il existe, sinon nombre d'employés actifs
  const capacite = +entreprise.capaciteMax > 0
    ? +entreprise.capaciteMax
    : Math.max(1, db.employes.filter((p) => p.entrepriseId === entreprise.id && p.actif).length);
  const versMin = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
  const versHeure = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const pris = db.rendezvous.filter((r) => r.entrepriseId === entreprise.id && r.date === dateStr && ['en_attente', 'confirme'].includes(r.statut));
  const creneaux = [];
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const minMaintenant = new Date().getHours() * 60 + new Date().getMinutes();
  for (let m = versMin(h.debut); m + service.duree <= versMin(h.fin); m += 30) {
    if (dateStr === aujourdhui && m <= minMaintenant) continue;
    const chevauche = pris.filter((r) => {
      const s = db.services.find((x) => x.id === r.serviceId);
      const debut = versMin(r.heure), fin = debut + (s ? s.duree : 30);
      return m < fin && m + service.duree > debut;
    }).length;
    if (chevauche < capacite) creneaux.push(versHeure(m));
  }
  return creneaux;
}

// ---------------- Routes API ----------------
async function api(req, res, url) {
  const p = url.pathname;
  const q = url.searchParams;
  const user = utilisateurConnecte(req);
  const corps = ['POST', 'PUT', 'DELETE'].includes(req.method) ? await lireCorps(req) : {};
  const monEntreprise = () => user && db.entreprises.find((e) => e.id === user.entrepriseId);

  // ---- Authentification ----
  if (p === '/api/inscription' && req.method === 'POST') {
    const { nomResponsable, email, motdepasse, nomEntreprise, categorie, telephone, adresse } = corps;
    if (!nomResponsable || !email || !motdepasse || !nomEntreprise || !categorie)
      return json(res, 400, { erreur: 'Tous les champs obligatoires doivent être remplis.' });
    if (db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()))
      return json(res, 400, { erreur: 'Un compte existe déjà avec cet email.' });
    let slug = slugifier(nomEntreprise); let i = 1;
    while (db.entreprises.find((e) => e.slug === slug)) slug = slugifier(nomEntreprise) + '-' + ++i;
    const entreprise = {
      id: store.uid(), slug, nom: nomEntreprise, categorie, description: '',
      adresse: adresse || '', telephone: telephone || '', whatsapp: (telephone || '').replace(/\D/g, ''),
      email, statut: 'en_attente', plan: 'gratuit', couleur: '#2563EB', couleur2: '#F59E0B',
      metier: metiers.CLES_METIERS.includes(corps.metier) ? corps.metier : 'autre',
      champs: {},
      logoTexte: nomEntreprise.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
      horaires: { lun: { ouvert: true, debut: '08:00', fin: '17:00' }, mar: { ouvert: true, debut: '08:00', fin: '17:00' }, mer: { ouvert: true, debut: '08:00', fin: '17:00' }, jeu: { ouvert: true, debut: '08:00', fin: '17:00' }, ven: { ouvert: true, debut: '08:00', fin: '17:00' }, sam: { ouvert: true, debut: '09:00', fin: '13:00' }, dim: { ouvert: false, debut: '09:00', fin: '13:00' } },
      creeLe: new Date().toISOString()
    };
    const nouvelUser = { id: store.uid(), nom: nomResponsable, email, motdepasse, role: 'responsable', entrepriseId: entreprise.id, creeLe: new Date().toISOString() };
    db.entreprises.push(entreprise); db.users.push(nouvelUser);
    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = nouvelUser.id; store.save();
    res.setHeader('Set-Cookie', `rdv_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    return json(res, 200, { ok: true, role: 'responsable' });
  }

  if (p === '/api/connexion' && req.method === 'POST') {
    const u = db.users.find((x) => x.email.toLowerCase() === (corps.email || '').toLowerCase() && x.motdepasse === corps.motdepasse);
    if (!u) return json(res, 401, { erreur: 'Email ou mot de passe incorrect.' });
    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = u.id; store.save();
    res.setHeader('Set-Cookie', `rdv_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    return json(res, 200, { ok: true, role: u.role });
  }

  if (p === '/api/deconnexion' && req.method === 'POST') {
    const t = cookies(req).rdv_session; if (t) delete db.sessions[t]; store.save();
    res.setHeader('Set-Cookie', 'rdv_session=; Path=/; Max-Age=0');
    return json(res, 200, { ok: true });
  }

  if (p === '/api/moi') {
    if (!user) return json(res, 401, { erreur: 'Non connecté' });
    const e = monEntreprise();
    return json(res, 200, { id: user.id, nom: user.nom, email: user.email, role: user.role, entreprise: e ? { ...e, motdepasse: undefined } : null });
  }

  // ---- Public : annuaire ----
  // Référentiel des métiers (vocabulaire, modules, champs)
  if (p === '/api/metiers' && req.method === 'GET') return json(res, 200, metiers.referentiel());

  if (p === '/api/entreprises' && req.method === 'GET') {
    let liste = db.entreprises.filter((e) => e.statut === 'approuvee');
    const cat = q.get('categorie'), recherche = (q.get('q') || '').toLowerCase();
    if (cat && cat !== 'Tout') liste = liste.filter((e) => e.categorie === cat);
    if (q.get('formule') === 'resort') liste = liste.filter((e) => e.formule === 'resort');
    if (q.get('urgence') === '1') liste = liste.filter((e) => e.urgence && e.urgence.actif);
    const met = q.get('metier'), fam = q.get('famille');
    if (met) liste = liste.filter((e) => e.metier === met);
    if (fam) liste = liste.filter((e) => metiers.metierDe(e).famille === fam);
    if (recherche) liste = liste.filter((e) => (e.nom + ' ' + e.description + ' ' + e.adresse + ' ' + e.categorie).toLowerCase().includes(recherche));
    // Tri par distance si le client partage sa position (?lat=&lng=)
    const lat0 = Number(q.get('lat')), lng0 = Number(q.get('lng'));
    if (Number.isFinite(lat0) && Number.isFinite(lng0)) {
      const sortie = liste.map((e) => {
        const v = publicEntreprise(e);
        v.distanceKm = (e.latitude != null && e.longitude != null)
          ? Math.round(distanceKm(lat0, lng0, e.latitude, e.longitude) * 10) / 10
          : null;
        return v;
      });
      sortie.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));
      return json(res, 200, sortie);
    }
    return json(res, 200, liste.map(publicEntreprise));
  }

  const mPub = p.match(/^\/api\/entreprises\/([a-z0-9-]+)$/);
  if (mPub && req.method === 'GET') {
    const e = db.entreprises.find((x) => x.slug === mPub[1] && x.statut === 'approuvee');
    if (!e) return json(res, 404, { erreur: 'Entreprise introuvable' });
    return json(res, 200, {
      ...publicEntreprise(e),
      services: db.services.filter((s) => s.entrepriseId === e.id && s.actif),
      chambres: db.chambres.filter((c) => c.entrepriseId === e.id && c.actif).map((c) => ({ id: c.id, nom: c.nom, description: c.description, prixNuit: c.prixNuit, capacite: c.capacite, quantite: c.quantite, photo: c.photo || '', equipements: c.equipements || [],
                       adultes: c.adultes ?? c.capacite, enfants: c.enfants ?? 0 })),
      carte: db.carte.filter((a) => a.entrepriseId === e.id && a.disponible).map((a) => ({ id: a.id, nom: a.nom, description: a.description, categorie: a.categorie, prix: a.prix, volume: a.volume || '', photo: a.photo || '' })),
      equipementsRef: EQUIPEMENTS,
      hotel: metiers.aModule(e, 'hotellerie') ? (e.hotel || {}) : null,
      tarifs: metiers.aModule(e, 'hotellerie')
        ? db.tarifs.filter((x) => x.entrepriseId === e.id && x.actif)
            .map((x) => ({ id: x.id, nom: x.nom, description: x.description, chambreId: x.chambreId,
                           prixNuit: x.prixNuit, remboursable: x.remboursable, petitDejeuner: x.petitDejeuner }))
        : [],
      inclusRef: INCLUS,
      produits: metiers.aModule(e, 'catalogue')
        ? db.produits.filter((x) => x.entrepriseId === e.id && x.disponible && (x.stock === null || x.stock > 0))
            .map((x) => ({ id: x.id, nom: x.nom, description: x.description, rayon: x.rayon, marque: x.marque,
                           prix: x.prix, prixPromo: x.prixPromo, unite: x.unite, photo: x.photo || '',
                           stockFaible: x.stock !== null && x.stock <= Math.max(x.seuilAlerte, 3) }))
        : [],
      vente: metiers.aModule(e, 'commandes') && e.vente && e.vente.commandesActives ? {
        cueillette: !!e.vente.cueillette, livraison: !!e.vente.livraison,
        zones: e.vente.zones || [], fraisBase: e.vente.fraisBase || 0,
        seuilGratuite: e.vente.seuilGratuite || 0, minimumCommande: e.vente.minimumCommande || 0,
        horairesCueillette: e.vente.horairesCueillette || '', delaiPreparation: e.vente.delaiPreparation || '',
        paiementEnLigne: e.vente.paiementEnLigne !== false, paiementRemise: e.vente.paiementRemise !== false,
        consigne: e.vente.consigne || ''
      } : null,
      capacitesRef: metiers.CAPACITES_URGENCE,
      etatsRef: metiers.ETATS_URGENCE,
      programmes: db.programmes.filter((x) => x.entrepriseId === e.id && x.ouvert).map((x) => ({
        id: x.id, nom: x.nom, description: x.description, anneeScolaire: x.anneeScolaire,
        fraisInscription: x.fraisInscription, scolarite: x.scolarite, periodicite: x.periodicite,
        documents: x.documents || [],
        placesRestantes: x.places > 0
          ? Math.max(0, x.places - db.inscriptions.filter((i) => i.programmeId === x.id && i.statut === 'inscrit').length)
          : null
      })),
      employes: db.employes.filter((x) => x.entrepriseId === e.id && x.actif).map((x) => ({ nom: x.nom, poste: x.poste })),
      avis: db.avis.filter((a) => a.entrepriseId === e.id).slice(0, 20)
    });
  }

  // Disponibilité d'une chambre sur une période + prix total
  if (p === '/api/disponibilites-sejour' && req.method === 'GET') {
    const e = db.entreprises.find((x) => x.slug === q.get('slug') && x.statut === 'approuvee');
    const c = e && db.chambres.find((x) => x.id === q.get('chambre') && x.entrepriseId === e.id && x.actif);
    if (!c) return json(res, 404, { erreur: 'Chambre introuvable' });
    const arrivee = q.get('arrivee'), depart = q.get('depart');
    const errPeriode = validerPeriode(arrivee, depart);
    if (errPeriode) return json(res, 400, { erreur: errPeriode });
    const errRegle = verifierRegles(e, arrivee, depart);
    if (errRegle) return json(res, 400, { erreur: errRegle });
    const restantes = chambresRestantes(c, arrivee, depart);
    const plan = q.get('plan') ? db.tarifs.find((x) => x.id === q.get('plan') && x.entrepriseId === e.id && x.actif) : null;
    const devis = devisSejour(e, c, plan, arrivee, depart);
    return json(res, 200, Object.assign({ disponible: restantes > 0, restantes, prixNuit: devis.base, prixTotal: devis.total }, devis));
  }

  // ---- Paiement d'une réservation ----
  if (p === '/api/paiements/ouvrir' && req.method === 'POST') {
    const { commandeType, slug } = corps;
    let { commandeId } = corps;
    if (!['rdv', 'sejour', 'commande'].includes(commandeType)) return json(res, 400, { erreur: 'Type de commande invalide' });
    const e = db.entreprises.find((x) => x.slug === slug && x.statut === 'approuvee');
    if (!e) return json(res, 404, { erreur: 'Entreprise introuvable' });
    
    let montant = 0, clientNom = '', clientEmail = '';
    if (commandeType === 'rdv') {
      const r = db.rendezvous.find((x) => x.id === commandeId && x.entrepriseId === e.id);
      if (!r) return json(res, 404, { erreur: 'Rendez-vous introuvable' });
      const s = db.services.find((x) => x.id === r.serviceId);
      montant = s ? s.prix : 0;
      clientNom = r.clientNom; clientEmail = r.clientEmail;
    } else if (commandeType === 'sejour') {
      const s = db.sejours.find((x) => x.id === commandeId && x.entrepriseId === e.id);
      if (!s) return json(res, 404, { erreur: 'Séjour introuvable' });
      montant = s.prixTotal;
      clientNom = s.clientNom; clientEmail = s.clientEmail;
    } else {
      // Commande boutique : on paie le total, frais de remise compris
      const c = db.commandes.find((x) => (x.id === commandeId || x.reference === commandeId) && x.entrepriseId === e.id);
      if (!c) return json(res, 404, { erreur: 'Commande introuvable' });
      if (c.paye) return json(res, 409, { erreur: 'Cette commande est déjà payée.' });
      if (c.statut === 'annulee') return json(res, 409, { erreur: 'Cette commande a été annulée.' });
      montant = c.total;
      clientNom = c.clientNom; clientEmail = '';
      commandeId = c.id;
    }
    
    if (montant < plopplop.PLOP.montantMinHTG) return json(res, 400, { erreur: `Montant minimum : ${plopplop.PLOP.montantMinHTG} HTG` });
    
    const paiement = creerPaiement(e.id, commandeType, commandeId, montant, 'all', clientEmail, clientNom);
    try {
      const result = await plopplop.initierPaiement({ reference: paiement.reference, montant, methode: 'all' });
      if (result.ok) {
        paiement.transactionId = result.transactionId;
        paiement.urlPaiement = result.urlPaiement;
        store.save();
        return json(res, 200, { ok: true, paiementId: paiement.id, urlPaiement: result.urlPaiement, montant, reference: paiement.reference });
      } else {
        db.paiements = db.paiements.filter((x) => x !== paiement);
        return json(res, 402, { erreur: result.error || 'La passerelle a refusé la transaction.' });
      }
    } catch (err) {
      db.paiements = db.paiements.filter((x) => x !== paiement);
      return json(res, 503, { erreur: 'Passerelle de paiement indisponible. Réessayez ultérieurement.' });
    }
  }

  // ---- Vérifier un paiement ----
  if (p === '/api/paiements/verifier' && req.method === 'POST') {
    const { paiementId } = corps;
    const paiement = db.paiements.find((x) => x.id === paiementId);
    if (!paiement) return json(res, 404, { erreur: 'Paiement introuvable' });
    
    try {
      const verification = await plopplop.verifierPaiement(paiement.reference);
      if (verification.ok && verification.paye) {
        const infos = verification.infos || {};
        paiement.statut = 'confirme';
        paiement.methode = infos.methode || '';
        paiement.dateConfirmation = new Date().toISOString();
        paiement.idTransaction = infos.transactionId || paiement.reference;
        
        // Créditer le portefeuille de l'entreprise
        const port = creerOuObtenirPortefeuille(paiement.entrepriseId);
        port.solde += paiement.montantNet;
        port.totalRecu += paiement.montantNet;
        
        // Traiter selon le type de commande
        const e = db.entreprises.find((x) => x.id === paiement.entrepriseId);
        if (paiement.commandeType === 'rdv') {
          const r = db.rendezvous.find((x) => x.id === paiement.commandeId);
          if (r) {
            r.paye = true;
            r.statut = 'confirme';  // Automatiquement confirmé après paiement
            r.transactionId = paiement.idTransaction;
            // Notification WhatsApp uniquement (avec montant + référence)
            const svc = db.services.find(s => s.id === r.serviceId);
            envoyerWhatsApp(r.clientTel, 'rdv_statut_paye', [
              r.clientNom,
              e?.nom || '',
              svc?.nom || '',
              r.date,
              r.heure,
              r.prixTotal.toLocaleString('fr-HT'),
              e?.adresse || '',
              r.id
            ]);
            // Notifier l'entreprise
            notifier(paiement.entrepriseId, 'rdv_paye', `Rendez-vous payé : ${r.clientNom} — ${db.services.find(s => s.id === r.serviceId)?.nom || ''} le ${r.date}`);
          }
        } else if (paiement.commandeType === 'sejour') {
          const s = db.sejours.find((x) => x.id === paiement.commandeId);
          if (s) {
            s.paye = true;
            s.transactionId = paiement.idTransaction;
            // Notification WhatsApp uniquement (avec montant + référence)
            const chambre = db.chambres.find(c => c.id === s.chambreId);
            envoyerWhatsApp(s.clientTel, 'sejour_statut_paye', [
              s.clientNom,
              e?.nom || '',
              chambre?.nom || '',
              s.arrivee,
              s.depart,
              s.nuits,
              s.prixTotal.toLocaleString('fr-HT'),
              e?.adresse || '',
              s.id
            ]);
          }
        } else if (paiement.commandeType === 'commande') {
          const c = db.commandes.find((x) => x.id === paiement.commandeId);
          if (c) {
            c.paye = true;
            c.transactionId = paiement.idTransaction;
            c.methodePaiement = paiement.methode || '';
            // Une commande payée passe directement en confirmée, avec décompte du stock
            if (!c.stockDecompte) {
              c.lignes.forEach((l) => {
                const pr = db.produits.find((x) => x.id === l.produitId);
                if (pr && pr.stock !== null) pr.stock = Math.max(0, pr.stock - l.quantite);
              });
              c.stockDecompte = true;
            }
            if (c.statut === 'nouvelle') c.statut = 'confirmee';
            c.journal.push({ le: new Date().toISOString(), texte: 'Paiement reçu — ' + c.total.toLocaleString('fr-HT') + ' HTG' });
            c.majLe = new Date().toISOString();
            envoyerWhatsApp(c.clientTel, 'commande_payee', [
              c.clientNom, e?.nom || '', c.reference,
              c.total.toLocaleString('fr-HT') + ' HTG',
              c.mode === 'livraison' ? 'livraison' : 'retrait sur place'
            ]);
            notifier(paiement.entrepriseId, 'commande_payee', `Commande ${c.reference} payée — ${c.total.toLocaleString('fr-HT')} HTG`);
          }
        }
        
        store.save();
        return json(res, 200, { ok: true, statut: 'confirme', montantNet: paiement.montantNet });
      } else {
        return json(res, 402, { ok: false, statut: 'en_attente',
          erreur: verification.message || verification.error || 'Paiement non encore confirmé.' });
      }
    } catch (err) {
      return json(res, 503, { erreur: 'Vérification impossible. Réessayez ultérieurement.' });
    }
  }
  if (p === '/api/sejours' && req.method === 'POST') {
    const e = db.entreprises.find((x) => x.slug === corps.slug && x.statut === 'approuvee');
    const c = e && db.chambres.find((x) => x.id === corps.chambreId && x.entrepriseId === e.id && x.actif);
    if (!c) return json(res, 404, { erreur: 'Chambre introuvable' });
    if (!corps.clientNom || !corps.clientTel) return json(res, 400, { erreur: 'Nom et téléphone obligatoires.' });
    const errPeriode = validerPeriode(corps.arrivee, corps.depart);
    if (errPeriode) return json(res, 400, { erreur: errPeriode });
    if (chambresRestantes(c, corps.arrivee, corps.depart) < 1)
      return json(res, 409, { erreur: 'Cette chambre est complète sur ces dates. Essayez d\'autres dates ou un autre type de chambre.' });
    // La capacité est refusée, pas rabotée en silence : le client doit savoir
    // que sa réservation ne couvre pas tout son groupe.
    const demandes = Math.max(1, +corps.nbPersonnes || 1);
    if (c.capacite && demandes > c.capacite)
      return json(res, 400, { erreur: `Cette chambre accueille ${c.capacite} personne${c.capacite > 1 ? 's' : ''} au maximum. Choisissez un autre type de chambre.` });
    const errRegle = verifierRegles(e, corps.arrivee, corps.depart);
    if (errRegle) return json(res, 400, { erreur: errRegle });
    const plan = corps.planId ? db.tarifs.find((x) => x.id === corps.planId && x.entrepriseId === e.id && x.actif) : null;
    const devis = devisSejour(e, c, plan, corps.arrivee, corps.depart);
    const nuits = devis.nuits;
    const sejour = {
      id: store.uid(), entrepriseId: e.id, chambreId: c.id,
      clientNom: String(corps.clientNom).slice(0, 80), clientTel: String(corps.clientTel).slice(0, 20),
      clientEmail: String(corps.clientEmail || '').slice(0, 120),
      arrivee: corps.arrivee, depart: corps.depart, nuits,
      nbPersonnes: demandes,
      planId: plan ? plan.id : '', planNom: plan ? plan.nom : '',
      sousTotal: devis.sousTotal, taxes: devis.taxes, totalTaxes: devis.totalTaxes,
      acompte: devis.acompte, detailNuits: devis.detail,
      prixTotal: devis.total, statut: 'en_attente', creeLe: new Date().toISOString()
    };
    db.sejours.push(sejour);
    notifier(e.id, 'nouveau_sejour', `Nouveau séjour : ${sejour.clientNom} — ${c.nom}, du ${sejour.arrivee} au ${sejour.depart} (${nuits} nuit${nuits > 1 ? 's' : ''})`);
    // WhatsApp Séjour reçu (plus d'email) — voir CONFIG-WHATSAPP-TEMPLATES.md
    envoyerWhatsApp(sejour.clientTel, 'sejour_recu', [
      sejour.clientNom,
      e.nom,
      sejour.arrivee,
      sejour.depart,
      sejour.nuits,
      sejour.nbPersonnes,
      sejour.prixTotal.toLocaleString('fr-HT')
    ]);
    return json(res, 200, { ok: true, reference: sejour.id, prix: sejour.prixTotal });
  }

  // ---- Créneaux disponibles (client) ----
  if (p === '/api/disponibilites' && req.method === 'GET') {
    const e = db.entreprises.find((x) => x.slug === q.get('slug'));
    const s = e && db.services.find((x) => x.id === q.get('service') && x.entrepriseId === e.id);
    if (!e || !s || !q.get('date')) return json(res, 400, { erreur: 'Paramètres invalides' });
    return json(res, 200, { creneaux: creneauxDisponibles(e, s, q.get('date')) });
  }

  // ---- Réservation d'un rendez-vous (client) ----
  if (p === '/api/reservations' && req.method === 'POST') {
    const e = db.entreprises.find((x) => x.slug === corps.slug && x.statut === 'approuvee');
    const s = e && db.services.find((x) => x.id === corps.serviceId && x.entrepriseId === e.id);
    if (!e || !s) return json(res, 400, { erreur: 'Entreprise ou service invalide.' });
    if (!corps.clientNom || !corps.clientTel || !corps.date || !corps.heure)
      return json(res, 400, { erreur: 'Nom, téléphone, date et heure sont obligatoires.' });
    if (!creneauxDisponibles(e, s, corps.date).includes(corps.heure))
      return json(res, 409, { erreur: "Ce créneau n'est plus disponible. Choisissez-en un autre." });
    const rdv = { id: store.uid(), entrepriseId: e.id, serviceId: s.id, clientNom: corps.clientNom, clientTel: corps.clientTel, clientEmail: corps.clientEmail || '', date: corps.date, heure: corps.heure, statut: 'en_attente', paye: false, prixTotal: s.prix || 0, creeLe: new Date().toISOString() };
    db.rendezvous.push(rdv);
    store.save();
    notifier(e.id, 'nouveau_rdv', `Nouveau rendez-vous : ${rdv.clientNom} — ${s.nom} le ${rdv.date} à ${rdv.heure}`);
    // Notification WhatsApp uniquement (les emails clients ont été retirés)
    envoyerWhatsApp(rdv.clientTel, 'rdv_recu', [rdv.clientNom, e.nom, s.nom, rdv.date, rdv.heure]);
    return json(res, 200, { ok: true, reference: rdv.id, entreprise: e.nom, service: s.nom, date: rdv.date, heure: rdv.heure, whatsapp: e.whatsapp });
  }

  // ---- Passer une commande (public, sans compte) ----
  if (p === '/api/commandes' && req.method === 'POST') {
    const e = db.entreprises.find((x) => x.slug === corps.slug && x.statut === 'approuvee');
    if (!e || !metiers.aModule(e, 'commandes')) return json(res, 400, { erreur: 'Cette boutique ne prend pas de commande en ligne.' });
    const v = e.vente || {};
    if (!v.commandesActives) return json(res, 400, { erreur: 'Cette boutique ne prend pas de commande en ligne pour le moment.' });
    if (!Array.isArray(corps.lignes) || !corps.lignes.length) return json(res, 400, { erreur: 'Votre panier est vide.' });
    if (!corps.clientNom || !corps.clientTel) return json(res, 400, { erreur: 'Nom et téléphone obligatoires.' });

    const mode = corps.mode === 'livraison' ? 'livraison' : 'cueillette';
    if (mode === 'livraison' && !v.livraison) return json(res, 400, { erreur: 'La livraison n\'est pas proposée.' });
    if (mode === 'cueillette' && !v.cueillette) return json(res, 400, { erreur: 'Le retrait sur place n\'est pas proposé.' });
    if (mode === 'livraison' && !corps.adresse) return json(res, 400, { erreur: 'Indiquez l\'adresse de livraison.' });

    // Les prix et le stock sont revérifiés ici : ceux envoyés par le
    // navigateur ne sont jamais utilisés pour le calcul.
    const lignes = [];
    for (const l of corps.lignes.slice(0, 60)) {
      const pr = db.produits.find((x) => x.id === l.produitId && x.entrepriseId === e.id && x.disponible);
      if (!pr) return json(res, 409, { erreur: 'Un produit de votre panier n\'est plus disponible.' });
      const q = Math.max(1, Math.min(+l.quantite || 1, 999));
      if (pr.stock !== null && pr.stock < q)
        return json(res, 409, { erreur: `Stock insuffisant pour ${pr.nom} (${pr.stock} restant${pr.stock > 1 ? 's' : ''}).` });
      const unitaire = pr.prixPromo > 0 ? pr.prixPromo : pr.prix;
      lignes.push({ produitId: pr.id, nom: pr.nom, unite: pr.unite || '', quantite: q, prixUnitaire: unitaire, total: unitaire * q });
    }
    const sousTotal = lignes.reduce((s, l) => s + l.total, 0);
    if (v.minimumCommande && sousTotal < v.minimumCommande)
      return json(res, 400, { erreur: `Commande minimum : ${v.minimumCommande.toLocaleString('fr-HT')} HTG.` });

    // Frais de livraison : zone choisie, sinon frais de base ; gratuit au-delà du seuil
    let frais = 0, zoneNom = '';
    if (mode === 'livraison') {
      const zone = (v.zones || []).find((z) => z.nom === corps.zone);
      frais = zone ? zone.frais : (v.fraisBase || 0);
      zoneNom = zone ? zone.nom : '';
      if (v.seuilGratuite && sousTotal >= v.seuilGratuite) frais = 0;
    }

    const modePaie = corps.paiement === 'enligne' ? 'enligne' : 'remise';
    if (modePaie === 'enligne' && v.paiementEnLigne === false)
      return json(res, 400, { erreur: 'Le paiement en ligne n\'est pas proposé par cette boutique.' });
    if (modePaie === 'remise' && v.paiementRemise === false)
      return json(res, 400, { erreur: 'Cette boutique demande le paiement en ligne.' });

    const maintenant = new Date().toISOString();
    const cmd = {
      id: store.uid(), entrepriseId: e.id,
      reference: 'C' + Date.now().toString(36).toUpperCase().slice(-6),
      lignes, sousTotal, frais, total: sousTotal + frais,
      mode, zone: zoneNom,
      adresse: mode === 'livraison' ? String(corps.adresse).slice(0, 200) : '',
      repere: String(corps.repere || '').slice(0, 140),
      creneau: String(corps.creneau || '').slice(0, 60),
      clientNom: String(corps.clientNom).slice(0, 90),
      clientTel: String(corps.clientTel).slice(0, 20),
      message: String(corps.message || '').slice(0, 300),
      paiement: corps.paiement === 'enligne' ? 'enligne' : 'remise',
      paye: false, transactionId: null,
      statut: 'nouvelle', stockDecompte: false, noteInterne: '',
      journal: [{ le: maintenant, texte: 'Commande reçue' }],
      creeLe: maintenant, majLe: maintenant
    };
    db.commandes.push(cmd); store.save();
    notifier(e.id, 'nouvelle_commande', `Commande ${cmd.reference} — ${cmd.total.toLocaleString('fr-HT')} HTG (${mode})`);
    envoyerWhatsApp(cmd.clientTel, 'commande_recue',
      [cmd.clientNom, e.nom, cmd.reference, cmd.total.toLocaleString('fr-HT') + ' HTG',
       mode === 'livraison' ? 'livraison' : 'retrait sur place']);
    return json(res, 200, {
      ok: true, reference: cmd.reference, sousTotal, frais, total: cmd.total,
      mode, paiement: modePaie, commandeId: cmd.id, boutique: e.nom, whatsapp: e.whatsapp,
      delai: mode === 'livraison' ? (v.delaiPreparation || '') : (v.horairesCueillette || '')
    });
  }

  // ---- Suivi public d'une commande ----
  if (p === '/api/commandes/suivi' && req.method === 'POST') {
    const e = db.entreprises.find((x) => x.slug === corps.slug && x.statut === 'approuvee');
    if (!e) return json(res, 400, { erreur: 'Boutique invalide.' });
    const ref = String(corps.reference || '').trim().toUpperCase();
    const tel = String(corps.telephone || '').replace(/\D/g, '').slice(-8);
    const c = db.commandes.find((x) => x.entrepriseId === e.id && x.reference === ref
      && String(x.clientTel).replace(/\D/g, '').slice(-8) === tel);
    if (!c) return json(res, 404, { erreur: 'Aucune commande ne correspond à ces informations.' });
    const etapes = etapesCommande(c.mode);
    const st = STATUTS_COMMANDE.find((s) => s.cle === c.statut);
    return json(res, 200, {
      reference: c.reference, statut: c.statut, statutLib: st ? st.fr : c.statut,
      etapes: etapes.map((k) => { const s = STATUTS_COMMANDE.find((x) => x.cle === k); return { cle: k, fr: s.fr, ht: s.ht }; }),
      etapeIndex: etapes.indexOf(c.statut),
      mode: c.mode, lignes: c.lignes, sousTotal: c.sousTotal, frais: c.frais, total: c.total,
      adresse: c.adresse, creneau: c.creneau, paye: !!c.paye, paiement: c.paiement || 'remise',
      passeeLe: c.creeLe.slice(0, 10), majLe: c.majLe.slice(0, 10)
    });
  }

  // ---- Suivi public d'un dossier (référence + téléphone) ----
  if (p === '/api/dossiers/suivi' && req.method === 'POST') {
    const e = db.entreprises.find((x) => x.slug === corps.slug && x.statut === 'approuvee');
    if (!e || !metiers.aModule(e, 'dossiers')) return json(res, 400, { erreur: 'Établissement invalide.' });
    const ref = String(corps.reference || '').trim().toUpperCase();
    const tel = String(corps.telephone || '').replace(/\D/g, '').slice(-8);
    if (!ref || !tel) return json(res, 400, { erreur: 'Référence et téléphone obligatoires.' });
    const d = db.dossiers.find((x) => x.entrepriseId === e.id && x.reference === ref
      && String(x.clientTel).replace(/\D/g, '').slice(-8) === tel);
    // Message identique en cas d'échec, pour ne pas révéler l'existence d'une référence
    if (!d) return json(res, 404, { erreur: 'Aucun dossier ne correspond à ces informations.' });
    const etapes = metiers.etapesDe(e.metier);
    const idx = etapes.findIndex((x) => x.cle === d.etape);
    const st = metiers.STATUTS_DOSSIER.find((x) => x.cle === d.statut);
    // Vue restreinte : ni honoraires, ni notes internes
    return json(res, 200, {
      reference: d.reference, objet: d.objet, clientNom: d.clientNom,
      statut: d.statut, statutLib: st ? st.fr : d.statut,
      etape: d.etape, etapeIndex: idx, etapes: etapes.map((x) => ({ cle: x.cle, fr: x.fr, ht: x.ht })),
      pieces: d.pieces, echeance: d.echeance,
      ouvertLe: d.creeLe.slice(0, 10), majLe: d.majLe.slice(0, 10)
    });
  }

  // ---- Demande d'inscription scolaire (public, sans compte) ----
  if (p === '/api/inscriptions' && req.method === 'POST') {
    const e = db.entreprises.find((x) => x.slug === corps.slug && x.statut === 'approuvee');
    if (!e || !metiers.aModule(e, 'inscriptions')) return json(res, 400, { erreur: 'Établissement invalide.' });
    const pr = db.programmes.find((x) => x.id === corps.programmeId && x.entrepriseId === e.id && x.ouvert);
    if (!pr) return json(res, 400, { erreur: 'Programme indisponible ou fermé aux inscriptions.' });
    if (!corps.eleveNom || !corps.parentNom || !corps.parentTel)
      return json(res, 400, { erreur: "Nom de l'élève, nom et téléphone du responsable sont obligatoires." });
    if (pr.places > 0) {
      const pris = db.inscriptions.filter((x) => x.programmeId === pr.id && x.statut === 'inscrit').length;
      if (pris >= pr.places) return json(res, 409, { erreur: 'Toutes les places de ce programme sont prises.' });
    }
    const ins = {
      id: store.uid(), entrepriseId: e.id, programmeId: pr.id,
      eleveNom: String(corps.eleveNom).slice(0, 90),
      eleveNaissance: String(corps.eleveNaissance || '').slice(0, 10),
      eleveSexe: ['F', 'M'].includes(corps.eleveSexe) ? corps.eleveSexe : '',
      ecoleProvenance: String(corps.ecoleProvenance || '').slice(0, 90),
      parentNom: String(corps.parentNom).slice(0, 90),
      parentLien: String(corps.parentLien || '').slice(0, 40),
      parentTel: String(corps.parentTel).slice(0, 20),
      parentEmail: String(corps.parentEmail || '').slice(0, 90),
      message: String(corps.message || '').slice(0, 400),
      statut: 'en_attente', note: '', creeLe: new Date().toISOString()
    };
    db.inscriptions.push(ins); store.save();
    notifier(e.id, 'nouvelle_inscription', `Demande d'inscription : ${ins.eleveNom} — ${pr.nom}`);
    envoyerWhatsApp(ins.parentTel, 'inscription_recue', [ins.parentNom, e.nom, ins.eleveNom, pr.nom]);
    return json(res, 200, { ok: true, reference: ins.id, etablissement: e.nom, programme: pr.nom,
                            fraisInscription: pr.fraisInscription, whatsapp: e.whatsapp });
  }

  // ---- Avis client ----
  if (p === '/api/avis' && req.method === 'POST') {
    const e = db.entreprises.find((x) => x.slug === corps.slug && x.statut === 'approuvee');
    if (!e || !corps.clientNom || !corps.note) return json(res, 400, { erreur: 'Données invalides.' });
    db.avis.unshift({ id: store.uid(), entrepriseId: e.id, clientNom: corps.clientNom, note: Math.min(5, Math.max(1, +corps.note)), commentaire: (corps.commentaire || '').slice(0, 500), creeLe: new Date().toISOString() });
    store.save();
    notifier(e.id, 'nouvel_avis', `Nouvel avis (${corps.note}/5) de ${corps.clientNom}`);
    return json(res, 200, { ok: true });
  }

  // Espace responsable (authentifié) 
  if (p.startsWith('/api/mon-') || p.startsWith('/api/rendezvous') || p.startsWith('/api/sejours') || p === '/api/stats' || p === '/api/notifications') {
    if (!user || user.role !== 'responsable') return json(res, 401, { erreur: 'Connexion requise' });
    const e = monEntreprise();
    if (!e) return json(res, 404, { erreur: 'Entreprise introuvable' });

    if (p === '/api/mon-entreprise' && req.method === 'GET')
      return json(res, 200, Object.assign({}, e, {
        modulesDisponibles: metiers.MODULES,
        modulesMetier: metiers.metierDe(e).modules,
        modulesActifs: metiers.modulesActifs(e)
      }));
    if (p === '/api/mon-entreprise' && req.method === 'PUT') {
      ['nom', 'description', 'adresse', 'telephone', 'whatsapp', 'email', 'categorie', 'couleur', 'couleur2', 'logoTexte', 'horaires'].forEach((k) => {
        if (corps[k] !== undefined) e[k] = corps[k];
      });
      // Métier et champs propres au métier
      if (corps.metier !== undefined) {
        if (!metiers.CLES_METIERS.includes(corps.metier)) return json(res, 400, { erreur: 'Type d\'activité invalide.' });
        e.metier = corps.metier;
        e.champs = metiers.nettoyerChamps(e.metier, e.champs);  // ne garder que ce qui reste pertinent
      }
      if (corps.champs !== undefined) e.champs = metiers.nettoyerChamps(e.metier || 'autre', corps.champs);
      // Modules choisis par l'entreprise : elle affine ce que son métier propose
      if (corps.modulesOff !== undefined) e.modulesOff = metiers.nettoyerModules(corps.modulesOff);
      if (corps.modulesOn !== undefined) e.modulesOn = metiers.nettoyerModules(corps.modulesOn);
      // Formule d'hébergement : standard ou resort (tout inclus)
      if (corps.formule !== undefined) {
        if (!FORMULES.includes(corps.formule)) return json(res, 400, { erreur: 'Formule invalide.' });
        if (corps.formule === 'resort' && !metiers.aModule(e, 'hotellerie'))
          return json(res, 400, { erreur: 'La formule tout inclus concerne les hôtels et resorts.' });
        e.formule = corps.formule;
      }
      if (corps.inclus !== undefined) e.inclus = nettoyerInclus(corps.inclus);
      if (corps.noteFormule !== undefined) e.noteFormule = String(corps.noteFormule).slice(0, 200);
      // Position géographique (latitude / longitude)
      if (corps.latitude !== undefined || corps.longitude !== undefined) {
        if (corps.latitude === '' || corps.latitude === null) { e.latitude = null; e.longitude = null; }
        else {
          const lat = Number(corps.latitude), lng = Number(corps.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180)
            return json(res, 400, { erreur: 'Coordonnées invalides. Latitude entre -90 et 90, longitude entre -180 et 180.' });
          e.latitude = Math.round(lat * 1e6) / 1e6;
          e.longitude = Math.round(lng * 1e6) / 1e6;
        }
      }
      if (corps.capaciteMax !== undefined) e.capaciteMax = Math.max(0, Math.min(50, +corps.capaciteMax || 0));
      // Images (base64) : logo max ~350 Ko, photo de fond max ~1,5 Mo
      const imgValide = (v, max) => v === '' || (typeof v === 'string' && v.startsWith('data:image/') && v.length <= max);
      if (corps.logoImage !== undefined) {
        if (!imgValide(corps.logoImage, 350000)) return json(res, 400, { erreur: 'Logo invalide ou trop lourd (350 Ko max après compression).' });
        e.logoImage = corps.logoImage;
      }
      if (corps.photoFond !== undefined) {
        if (!imgValide(corps.photoFond, 1500000)) return json(res, 400, { erreur: 'Photo invalide ou trop lourde (1,5 Mo max après compression).' });
        e.photoFond = corps.photoFond;
      }
      store.save(); return json(res, 200, e);
    }

    if (p === '/api/mon-entreprise/services' && req.method === 'GET')
      return json(res, 200, db.services.filter((s) => s.entrepriseId === e.id));
    if (p === '/api/mon-entreprise/services' && req.method === 'POST') {
      if (!corps.nom || !corps.duree) return json(res, 400, { erreur: 'Nom et durée obligatoires.' });
      const s = { id: store.uid(), entrepriseId: e.id, nom: corps.nom, duree: +corps.duree, prix: +corps.prix || 0, actif: true };
      db.services.push(s); store.save(); return json(res, 200, s);
    }
    const mSrv = p.match(/^\/api\/mon-entreprise\/services\/(\w+)$/);
    if (mSrv) {
      const s = db.services.find((x) => x.id === mSrv[1] && x.entrepriseId === e.id);
      if (!s) return json(res, 404, { erreur: 'Service introuvable' });
      if (req.method === 'PUT') { ['nom'].forEach(k => corps[k] !== undefined && (s[k] = corps[k])); if (corps.duree) s.duree = +corps.duree; if (corps.prix !== undefined) s.prix = +corps.prix; if (corps.actif !== undefined) s.actif = !!corps.actif; store.save(); return json(res, 200, s); }
      if (req.method === 'DELETE') { db.services = db.services.filter((x) => x !== s); store.save(); return json(res, 200, { ok: true }); }
    }

    // ---- Chambres (module Séjours) ----
    // Les modules sont contrôlés côté serveur, pas seulement masqués dans l'interface
    if (p.startsWith('/api/mon-entreprise/carte') && !metiers.aModule(e, 'carte'))
      return json(res, 403, { erreur: 'Le module Restaurant & Bar n\'est pas disponible pour votre type d\'activité.' });
    if (p.startsWith('/api/mon-entreprise/chambres') && !metiers.aModule(e, 'hotellerie'))
      return json(res, 403, { erreur: 'Le module Chambres & Séjours n\'est pas disponible pour votre type d\'activité.' });

    // ================= Gestion hôtelière =================
    if ((p.startsWith('/api/mon-entreprise/tarifs') || p.startsWith('/api/mon-entreprise/saisons')
         || p.startsWith('/api/mon-entreprise/hotel')) && !metiers.aModule(e, 'hotellerie'))
      return json(res, 403, { erreur: 'Le module Chambres & Séjours n\'est pas activé.' });

    // ---- Politiques de l'établissement ----
    if (p === '/api/mon-entreprise/hotel' && req.method === 'GET')
      return json(res, 200, e.hotel || {});

    if (p === '/api/mon-entreprise/hotel' && req.method === 'PUT') {
      const h = e.hotel || {};
      if (corps.checkin !== undefined) h.checkin = String(corps.checkin).slice(0, 5);
      if (corps.checkout !== undefined) h.checkout = String(corps.checkout).slice(0, 5);
      if (corps.sejourMin !== undefined) h.sejourMin = Math.max(0, Math.min(+corps.sejourMin || 0, 60));
      if (corps.sejourMax !== undefined) h.sejourMax = Math.max(0, Math.min(+corps.sejourMax || 0, 365));
      if (corps.tauxTaxe !== undefined) h.tauxTaxe = Math.max(0, Math.min(+corps.tauxTaxe || 0, 50));
      if (corps.taxeSejour !== undefined) h.taxeSejour = Math.max(0, Math.min(+corps.taxeSejour || 0, 100000));
      if (corps.acompte !== undefined) h.acompte = Math.max(0, Math.min(+corps.acompte || 0, 100));
      if (corps.annulation !== undefined) h.annulation = String(corps.annulation).slice(0, 400);
      if (corps.delaiAnnulation !== undefined) h.delaiAnnulation = Math.max(0, Math.min(+corps.delaiAnnulation || 0, 90));
      if (corps.conditions !== undefined) h.conditions = String(corps.conditions).slice(0, 600);
      if (corps.animaux !== undefined) h.animaux = !!corps.animaux;
      if (corps.fumeur !== undefined) h.fumeur = !!corps.fumeur;
      e.hotel = h; store.save(); return json(res, 200, h);
    }

    // ---- Plans tarifaires ----
    if (p === '/api/mon-entreprise/tarifs' && req.method === 'GET')
      return json(res, 200, db.tarifs.filter((x) => x.entrepriseId === e.id));

    if (p === '/api/mon-entreprise/tarifs' && req.method === 'POST') {
      if (!corps.nom) return json(res, 400, { erreur: 'Le nom du plan est obligatoire.' });
      const tf = {
        id: store.uid(), entrepriseId: e.id,
        nom: String(corps.nom).slice(0, 70),
        description: String(corps.description || '').slice(0, 300),
        chambreId: String(corps.chambreId || '').slice(0, 40),   // vide = toutes les chambres
        prixNuit: Math.max(0, +corps.prixNuit || 0),             // 0 = prix de la chambre
        remboursable: corps.remboursable === undefined ? true : !!corps.remboursable,
        petitDejeuner: !!corps.petitDejeuner,
        actif: corps.actif === undefined ? true : !!corps.actif,
        creeLe: new Date().toISOString()
      };
      db.tarifs.push(tf); store.save(); return json(res, 200, tf);
    }

    const mTar = p.match(/^\/api\/mon-entreprise\/tarifs\/(\w+)$/);
    if (mTar) {
      const tf = db.tarifs.find((x) => x.id === mTar[1] && x.entrepriseId === e.id);
      if (!tf) return json(res, 404, { erreur: 'Plan tarifaire introuvable' });
      if (req.method === 'PUT') {
        if (corps.nom) tf.nom = String(corps.nom).slice(0, 70);
        if (corps.description !== undefined) tf.description = String(corps.description).slice(0, 300);
        if (corps.chambreId !== undefined) tf.chambreId = String(corps.chambreId).slice(0, 40);
        if (corps.prixNuit !== undefined) tf.prixNuit = Math.max(0, +corps.prixNuit || 0);
        if (corps.remboursable !== undefined) tf.remboursable = !!corps.remboursable;
        if (corps.petitDejeuner !== undefined) tf.petitDejeuner = !!corps.petitDejeuner;
        if (corps.actif !== undefined) tf.actif = !!corps.actif;
        store.save(); return json(res, 200, tf);
      }
      if (req.method === 'DELETE') {
        db.tarifs = db.tarifs.filter((x) => x !== tf);
        store.save(); return json(res, 200, { ok: true });
      }
    }

    // ---- Saisons tarifaires ----
    if (p === '/api/mon-entreprise/saisons' && req.method === 'GET')
      return json(res, 200, db.saisons.filter((x) => x.entrepriseId === e.id)
        .sort((a, b) => a.debut.localeCompare(b.debut)));

    if (p === '/api/mon-entreprise/saisons' && req.method === 'POST') {
      if (!corps.nom || !corps.debut || !corps.fin) return json(res, 400, { erreur: 'Nom, début et fin obligatoires.' });
      if (corps.fin < corps.debut) return json(res, 400, { erreur: 'La date de fin doit suivre la date de début.' });
      const s = {
        id: store.uid(), entrepriseId: e.id,
        nom: String(corps.nom).slice(0, 60),
        debut: String(corps.debut).slice(0, 10), fin: String(corps.fin).slice(0, 10),
        type: corps.type === 'montant' ? 'montant' : 'pourcentage',
        valeur: Math.max(-100000, Math.min(+corps.valeur || 0, 100000)),
        actif: corps.actif === undefined ? true : !!corps.actif,
        creeLe: new Date().toISOString()
      };
      db.saisons.push(s); store.save(); return json(res, 200, s);
    }

    const mSai = p.match(/^\/api\/mon-entreprise\/saisons\/(\w+)$/);
    if (mSai) {
      const s = db.saisons.find((x) => x.id === mSai[1] && x.entrepriseId === e.id);
      if (!s) return json(res, 404, { erreur: 'Saison introuvable' });
      if (req.method === 'PUT') {
        if (corps.nom) s.nom = String(corps.nom).slice(0, 60);
        if (corps.debut) s.debut = String(corps.debut).slice(0, 10);
        if (corps.fin) s.fin = String(corps.fin).slice(0, 10);
        if (s.fin < s.debut) return json(res, 400, { erreur: 'La date de fin doit suivre la date de début.' });
        if (corps.type !== undefined) s.type = corps.type === 'montant' ? 'montant' : 'pourcentage';
        if (corps.valeur !== undefined) s.valeur = Math.max(-100000, Math.min(+corps.valeur || 0, 100000));
        if (corps.actif !== undefined) s.actif = !!corps.actif;
        store.save(); return json(res, 200, s);
      }
      if (req.method === 'DELETE') {
        db.saisons = db.saisons.filter((x) => x !== s);
        store.save(); return json(res, 200, { ok: true });
      }
    }

    // ---- Planning d'occupation ----
    if (p === '/api/mon-entreprise/occupation' && req.method === 'GET') {
      if (!metiers.aModule(e, 'hotellerie')) return json(res, 403, { erreur: 'Module non activé.' });
      const debut = q.get('debut') || new Date().toISOString().slice(0, 10);
      const jours = Math.max(1, Math.min(+q.get('jours') || 14, 60));
      const chambres = db.chambres.filter((c) => c.entrepriseId === e.id && c.actif);
      const dates = [];
      const d = new Date(debut + 'T00:00:00Z');
      for (let i = 0; i < jours; i++) { dates.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
      return json(res, 200, {
        dates,
        chambres: chambres.map((c) => ({
          id: c.id, nom: c.nom, quantite: c.quantite,
          occupation: dates.map((jour) => {
            const pris = db.sejours.filter((s) => s.chambreId === c.id
              && ['en_attente', 'confirme'].includes(s.statut)
              && s.arrivee <= jour && s.depart > jour).length;
            return { jour, pris, libres: Math.max(0, c.quantite - pris) };
          })
        }))
      });
    }

    // ================= Vente : réglages de remise =================
    if (p.startsWith('/api/mon-entreprise/vente') && !metiers.aModule(e, 'commandes'))
      return json(res, 403, { erreur: 'Le module Commandes & livraison n\'est pas activé.' });

    if (p === '/api/mon-entreprise/vente' && req.method === 'GET')
      return json(res, 200, { vente: e.vente || {}, modes: MODES_REMISE });

    if (p === '/api/mon-entreprise/vente' && req.method === 'PUT') {
      const v = e.vente || {};
      if (corps.commandesActives !== undefined) v.commandesActives = !!corps.commandesActives;
      if (corps.cueillette !== undefined) v.cueillette = !!corps.cueillette;
      if (corps.livraison !== undefined) v.livraison = !!corps.livraison;
      if (corps.zones !== undefined) v.zones = nettoyerZones(corps.zones);
      if (corps.fraisBase !== undefined) v.fraisBase = Math.max(0, Math.min(+corps.fraisBase || 0, 100000));
      // 0 = pas de gratuité au-delà d'un montant
      if (corps.seuilGratuite !== undefined) v.seuilGratuite = Math.max(0, Math.min(+corps.seuilGratuite || 0, 10000000));
      if (corps.minimumCommande !== undefined) v.minimumCommande = Math.max(0, Math.min(+corps.minimumCommande || 0, 10000000));
      if (corps.horairesCueillette !== undefined) v.horairesCueillette = String(corps.horairesCueillette).slice(0, 120);
      if (corps.delaiPreparation !== undefined) v.delaiPreparation = String(corps.delaiPreparation).slice(0, 60);
      if (corps.consigne !== undefined) v.consigne = String(corps.consigne).slice(0, 300);
      if (corps.paiementEnLigne !== undefined) v.paiementEnLigne = !!corps.paiementEnLigne;
      if (corps.paiementRemise !== undefined) v.paiementRemise = !!corps.paiementRemise;
      if (v.livraison && !(v.zones || []).length && !v.fraisBase) v.fraisBase = v.fraisBase || 0;
      e.vente = v; store.save();
      return json(res, 200, v);
    }

    // ================= Commandes reçues =================
    if (p.startsWith('/api/mon-entreprise/commandes') && !metiers.aModule(e, 'commandes'))
      return json(res, 403, { erreur: 'Le module Commandes & livraison n\'est pas activé.' });

    if (p === '/api/mon-entreprise/commandes' && req.method === 'GET') {
      const liste = db.commandes.filter((c) => c.entrepriseId === e.id)
        .sort((a, b) => b.creeLe.localeCompare(a.creeLe));
      return json(res, 200, { commandes: liste, statuts: STATUTS_COMMANDE, modes: MODES_REMISE });
    }

    const mCmd = p.match(/^\/api\/mon-entreprise\/commandes\/(\w+)$/);
    if (mCmd && req.method === 'PUT') {
      const c = db.commandes.find((x) => x.id === mCmd[1] && x.entrepriseId === e.id);
      if (!c) return json(res, 404, { erreur: 'Commande introuvable' });
      if (corps.statut !== undefined) {
        if (!STATUTS_COMMANDE.some((s) => s.cle === corps.statut)) return json(res, 400, { erreur: 'Statut invalide.' });
        const avant = c.statut;
        // Le stock est décompté à la confirmation, et remis en cas d'annulation
        if (corps.statut === 'confirmee' && !c.stockDecompte) {
          c.lignes.forEach((l) => {
            const pr = db.produits.find((x) => x.id === l.produitId);
            if (pr && pr.stock !== null) pr.stock = Math.max(0, pr.stock - l.quantite);
          });
          c.stockDecompte = true;
        }
        if (corps.statut === 'annulee' && c.stockDecompte) {
          c.lignes.forEach((l) => {
            const pr = db.produits.find((x) => x.id === l.produitId);
            if (pr && pr.stock !== null) pr.stock = pr.stock + l.quantite;
          });
          c.stockDecompte = false;
        }
        c.statut = corps.statut;
        c.journal.push({ le: new Date().toISOString(), texte: 'Statut : ' + corps.statut });
        if (avant !== c.statut) {
          const st = STATUTS_COMMANDE.find((s) => s.cle === c.statut);
          envoyerWhatsApp(c.clientTel, 'commande_statut',
            [c.clientNom, e.nom, c.reference, st ? st.fr : c.statut,
             c.mode === 'livraison' ? 'livraison' : 'retrait sur place']);
        }
      }
      if (corps.note !== undefined) c.noteInterne = String(corps.note).slice(0, 300);
      if (corps.creneau !== undefined) c.creneau = String(corps.creneau).slice(0, 60);
      c.majLe = new Date().toISOString();
      store.save(); return json(res, 200, c);
    }

    // ---- Livraison par Taksi Konekte ----
    const mTaksi = p.match(/^\/api\/mon-entreprise\/commandes\/(\w+)\/taksi$/);
    if (mTaksi && req.method === 'POST') {
      if (!metiers.aModule(e, 'commandes')) return json(res, 403, { erreur: 'Module Commandes & livraison non activé.' });
      const c = db.commandes.find((x) => x.id === mTaksi[1] && x.entrepriseId === e.id);
      if (!c) return json(res, 404, { erreur: 'Commande introuvable' });
      if (c.mode !== 'livraison') return json(res, 400, { erreur: 'Cette commande est en retrait sur place.' });
      if (c.statut === 'annulee') return json(res, 409, { erreur: 'Cette commande a été annulée.' });
      const r = await taksi.demanderCourse(c, e);
      c.taksi = { mode: r.mode, courseId: r.courseId || null, lienSuivi: r.lienSuivi || '',
                  demandeeLe: new Date().toISOString() };
      c.journal.push({ le: new Date().toISOString(),
                       texte: r.mode === 'api' ? 'Course Taksi Konekte demandée' : 'Course Taksi Konekte à transmettre manuellement' });
      if (c.statut === 'prete' || c.statut === 'preparation') {
        c.statut = 'en_route';
        envoyerWhatsApp(c.clientTel, 'commande_statut',
          [c.clientNom, e.nom, c.reference, 'En route', 'livraison']);
      }
      c.majLe = new Date().toISOString();
      store.save();
      return json(res, 200, r);
    }

    if (p === '/api/mon-entreprise/taksi/etat' && req.method === 'GET')
      return json(res, 200, { actif: taksi.actif() });

    // ================= Module catalogue =================
    if (p.startsWith('/api/mon-entreprise/produits') && !metiers.aModule(e, 'catalogue'))
      return json(res, 403, { erreur: 'Le module Catalogue n\'est pas disponible pour votre type d\'activité.' });

    if (p === '/api/mon-entreprise/produits' && req.method === 'GET') {
      const liste = db.produits.filter((x) => x.entrepriseId === e.id);
      const rayons = [...new Set([...metiers.rayonsDe(e.metier), ...liste.map((x) => x.rayon).filter(Boolean)])];
      return json(res, 200, {
        produits: liste,
        rayons,
        alertes: liste.filter((x) => x.stock !== null && x.stock <= x.seuilAlerte).length
      });
    }

    if (p === '/api/mon-entreprise/produits' && req.method === 'POST') {
      if (!corps.nom || !(+corps.prix > 0)) return json(res, 400, { erreur: 'Nom et prix obligatoires.' });
      if (corps.photo && !(String(corps.photo).startsWith('data:image/') && corps.photo.length <= 900000))
        return json(res, 400, { erreur: 'Photo invalide ou trop lourde.' });
      const pr = {
        id: store.uid(), entrepriseId: e.id,
        nom: String(corps.nom).slice(0, 90),
        description: String(corps.description || '').slice(0, 300),
        rayon: String(corps.rayon || '').slice(0, 50),
        reference: String(corps.reference || '').slice(0, 40),
        marque: String(corps.marque || '').slice(0, 50),
        prix: Math.max(1, +corps.prix),
        prixPromo: corps.prixPromo ? Math.max(0, +corps.prixPromo) : 0,
        unite: String(corps.unite || '').slice(0, 24),
        // stock null = quantité non suivie
        stock: corps.stock === null || corps.stock === '' || corps.stock === undefined ? null : Math.max(0, Math.min(+corps.stock || 0, 1000000)),
        seuilAlerte: Math.max(0, Math.min(+corps.seuilAlerte || 0, 100000)),
        photo: corps.photo || '',
        disponible: corps.disponible === undefined ? true : !!corps.disponible,
        creeLe: new Date().toISOString()
      };
      db.produits.push(pr); store.save(); return json(res, 200, pr);
    }

    const mProd = p.match(/^\/api\/mon-entreprise\/produits\/(\w+)$/);
    if (mProd) {
      const pr = db.produits.find((x) => x.id === mProd[1] && x.entrepriseId === e.id);
      if (!pr) return json(res, 404, { erreur: 'Produit introuvable' });
      if (req.method === 'PUT') {
        if (corps.nom) pr.nom = String(corps.nom).slice(0, 90);
        if (corps.description !== undefined) pr.description = String(corps.description).slice(0, 300);
        if (corps.rayon !== undefined) pr.rayon = String(corps.rayon).slice(0, 50);
        if (corps.reference !== undefined) pr.reference = String(corps.reference).slice(0, 40);
        if (corps.marque !== undefined) pr.marque = String(corps.marque).slice(0, 50);
        if (corps.prix) pr.prix = Math.max(1, +corps.prix);
        if (corps.prixPromo !== undefined) pr.prixPromo = corps.prixPromo ? Math.max(0, +corps.prixPromo) : 0;
        if (corps.unite !== undefined) pr.unite = String(corps.unite).slice(0, 24);
        if (corps.stock !== undefined)
          pr.stock = corps.stock === null || corps.stock === '' ? null : Math.max(0, Math.min(+corps.stock || 0, 1000000));
        if (corps.seuilAlerte !== undefined) pr.seuilAlerte = Math.max(0, Math.min(+corps.seuilAlerte || 0, 100000));
        if (corps.photo !== undefined) {
          if (corps.photo && !(String(corps.photo).startsWith('data:image/') && corps.photo.length <= 900000))
            return json(res, 400, { erreur: 'Photo invalide ou trop lourde.' });
          pr.photo = corps.photo;
        }
        if (corps.disponible !== undefined) pr.disponible = !!corps.disponible;
        // Mouvement de stock rapide : +N ou -N
        if (corps.mouvement !== undefined && pr.stock !== null)
          pr.stock = Math.max(0, Math.min(pr.stock + (+corps.mouvement || 0), 1000000));
        store.save(); return json(res, 200, pr);
      }
      if (req.method === 'DELETE') {
        db.produits = db.produits.filter((x) => x !== pr);
        store.save(); return json(res, 200, { ok: true });
      }
    }

    // ================= Module urgences =================
    if (p.startsWith('/api/mon-entreprise/urgence') && !metiers.aModule(e, 'urgences'))
      return json(res, 403, { erreur: 'Le module Urgences n\'est pas disponible pour votre type d\'activité.' });

    if (p === '/api/mon-entreprise/urgence' && req.method === 'GET')
      return json(res, 200, {
        urgence: e.urgence || {},
        capacites: metiers.CAPACITES_URGENCE,
        etats: metiers.ETATS_URGENCE
      });

    if (p === '/api/mon-entreprise/urgence' && req.method === 'PUT') {
      const u = e.urgence || {};
      if (corps.actif !== undefined) u.actif = !!corps.actif;
      if (corps.permanence !== undefined) u.permanence = !!corps.permanence;   // 24h/24
      if (corps.telephone !== undefined) u.telephone = String(corps.telephone).replace(/[^\d+ ]/g, '').slice(0, 20);
      if (corps.telephone2 !== undefined) u.telephone2 = String(corps.telephone2).replace(/[^\d+ ]/g, '').slice(0, 20);
      if (corps.ambulance !== undefined) u.ambulance = !!corps.ambulance;
      if (corps.telAmbulance !== undefined) u.telAmbulance = String(corps.telAmbulance).replace(/[^\d+ ]/g, '').slice(0, 20);
      if (corps.capacites !== undefined) u.capacites = metiers.nettoyerCapacites(corps.capacites);
      if (corps.consigne !== undefined) u.consigne = String(corps.consigne).slice(0, 300);
      if (corps.horaires !== undefined) u.horaires = String(corps.horaires).slice(0, 120);
      // Garde (pharmacies) : période déclarée
      if (corps.gardeDebut !== undefined) u.gardeDebut = String(corps.gardeDebut).slice(0, 10);
      if (corps.gardeFin !== undefined) u.gardeFin = String(corps.gardeFin).slice(0, 10);
      // État d'affluence, horodaté pour signaler une information ancienne
      if (corps.etat !== undefined) {
        if (!metiers.ETATS_URGENCE.some((x) => x.cle === corps.etat))
          return json(res, 400, { erreur: 'État invalide.' });
        u.etat = corps.etat;
        u.etatMaj = new Date().toISOString();
      }
      e.urgence = u; store.save();
      return json(res, 200, u);
    }

    // ================= Module dossiers =================
    if (p.startsWith('/api/mon-entreprise/dossiers') && !metiers.aModule(e, 'dossiers'))
      return json(res, 403, { erreur: 'Le module Dossiers n\'est pas disponible pour votre type d\'activité.' });

    if (p === '/api/mon-entreprise/dossiers' && req.method === 'GET') {
      const liste = db.dossiers.filter((d) => d.entrepriseId === e.id)
        .sort((a, b) => b.majLe.localeCompare(a.majLe));
      return json(res, 200, { dossiers: liste, etapes: metiers.etapesDe(e.metier),
                              pieces: metiers.PIECES_DOSSIER[e.metier] || [] });
    }

    if (p === '/api/mon-entreprise/dossiers' && req.method === 'POST') {
      if (!corps.clientNom || !corps.objet)
        return json(res, 400, { erreur: 'Le nom du client et l\'objet du dossier sont obligatoires.' });
      const etapes = metiers.etapesDe(e.metier);
      const maintenant = new Date().toISOString();
      const d = {
        id: store.uid(), entrepriseId: e.id,
        reference: 'D' + Date.now().toString(36).toUpperCase().slice(-6),
        objet: String(corps.objet).slice(0, 120),
        description: String(corps.description || '').slice(0, 600),
        clientNom: String(corps.clientNom).slice(0, 90),
        clientTel: String(corps.clientTel || '').slice(0, 20),
        clientEmail: String(corps.clientEmail || '').slice(0, 90),
        localisation: String(corps.localisation || '').slice(0, 140),
        statut: 'ouvert',
        etape: etapes[0].cle,
        pieces: Array.isArray(corps.pieces)
          ? corps.pieces.map((x) => ({ nom: String(x.nom || x).slice(0, 80), fournie: !!x.fournie })).slice(0, 25)
          : [],
        honoraires: Math.max(0, +corps.honoraires || 0),
        avance: Math.max(0, +corps.avance || 0),
        echeance: String(corps.echeance || '').slice(0, 10),
        journal: [{ le: maintenant, texte: 'Dossier ouvert' }],
        creeLe: maintenant, majLe: maintenant
      };
      db.dossiers.push(d); store.save();
      if (d.clientTel) envoyerWhatsApp(d.clientTel, 'dossier_ouvert', [d.clientNom, e.nom, d.objet, d.reference]);
      return json(res, 200, d);
    }

    const mDos = p.match(/^\/api\/mon-entreprise\/dossiers\/(\w+)$/);
    if (mDos) {
      const d = db.dossiers.find((x) => x.id === mDos[1] && x.entrepriseId === e.id);
      if (!d) return json(res, 404, { erreur: 'Dossier introuvable' });
      if (req.method === 'PUT') {
        const etapes = metiers.etapesDe(e.metier);
        const avant = { etape: d.etape, statut: d.statut };
        if (corps.objet) d.objet = String(corps.objet).slice(0, 120);
        if (corps.description !== undefined) d.description = String(corps.description).slice(0, 600);
        if (corps.clientNom) d.clientNom = String(corps.clientNom).slice(0, 90);
        if (corps.clientTel !== undefined) d.clientTel = String(corps.clientTel).slice(0, 20);
        if (corps.clientEmail !== undefined) d.clientEmail = String(corps.clientEmail).slice(0, 90);
        if (corps.localisation !== undefined) d.localisation = String(corps.localisation).slice(0, 140);
        if (corps.honoraires !== undefined) d.honoraires = Math.max(0, +corps.honoraires || 0);
        if (corps.avance !== undefined) d.avance = Math.max(0, +corps.avance || 0);
        if (corps.echeance !== undefined) d.echeance = String(corps.echeance).slice(0, 10);
        if (corps.pieces !== undefined && Array.isArray(corps.pieces))
          d.pieces = corps.pieces.map((x) => ({ nom: String(x.nom || x).slice(0, 80), fournie: !!x.fournie })).slice(0, 25);
        if (corps.etape !== undefined) {
          if (!etapes.some((x) => x.cle === corps.etape)) return json(res, 400, { erreur: 'Étape invalide.' });
          d.etape = corps.etape;
        }
        if (corps.statut !== undefined) {
          if (!metiers.STATUTS_DOSSIER.some((s) => s.cle === corps.statut)) return json(res, 400, { erreur: 'Statut invalide.' });
          d.statut = corps.statut;
        }
        if (corps.note) d.journal.push({ le: new Date().toISOString(), texte: String(corps.note).slice(0, 200) });
        // Journal automatique des changements d'étape et de statut
        if (avant.etape !== d.etape) {
          const lib = etapes.find((x) => x.cle === d.etape);
          d.journal.push({ le: new Date().toISOString(), texte: 'Étape : ' + (lib ? lib.fr : d.etape) });
          if (d.clientTel && corps.prevenir !== false)
            envoyerWhatsApp(d.clientTel, 'dossier_etape', [d.clientNom, e.nom, d.objet, lib ? lib.fr : d.etape, d.reference]);
        }
        if (avant.statut !== d.statut) {
          const s = metiers.STATUTS_DOSSIER.find((x) => x.cle === d.statut);
          d.journal.push({ le: new Date().toISOString(), texte: 'Statut : ' + (s ? s.fr : d.statut) });
        }
        d.journal = d.journal.slice(-60);
        d.majLe = new Date().toISOString();
        store.save(); return json(res, 200, d);
      }
      if (req.method === 'DELETE') {
        db.dossiers = db.dossiers.filter((x) => x !== d);
        store.save(); return json(res, 200, { ok: true });
      }
    }

    // ================= Module scolaire =================
    if ((p.startsWith('/api/mon-entreprise/programmes') || p.startsWith('/api/mon-entreprise/inscriptions'))
        && !metiers.aModule(e, 'inscriptions'))
      return json(res, 403, { erreur: 'Le module Inscriptions n\'est pas disponible pour votre type d\'activité.' });

    // ---- Programmes (niveaux, filières, formations) ----
    if (p === '/api/mon-entreprise/programmes' && req.method === 'GET') {
      const liste = db.programmes.filter((x) => x.entrepriseId === e.id).map((x) => ({
        ...x, inscrits: db.inscriptions.filter((i) => i.programmeId === x.id && i.statut === 'inscrit').length,
        demandes: db.inscriptions.filter((i) => i.programmeId === x.id && i.statut === 'en_attente').length
      }));
      return json(res, 200, liste);
    }

    if (p === '/api/mon-entreprise/programmes' && req.method === 'POST') {
      if (!corps.nom) return json(res, 400, { erreur: 'Le nom du programme est obligatoire.' });
      const pr = {
        id: store.uid(), entrepriseId: e.id,
        nom: String(corps.nom).slice(0, 90),
        description: String(corps.description || '').slice(0, 400),
        anneeScolaire: String(corps.anneeScolaire || '').slice(0, 20),
        places: Math.max(0, Math.min(+corps.places || 0, 5000)),
        fraisInscription: Math.max(0, +corps.fraisInscription || 0),
        scolarite: Math.max(0, +corps.scolarite || 0),
        periodicite: ['mensuel', 'trimestriel', 'annuel'].includes(corps.periodicite) ? corps.periodicite : 'mensuel',
        documents: Array.isArray(corps.documents) ? corps.documents.map((d) => String(d).slice(0, 80)).slice(0, 15) : [],
        ouvert: corps.ouvert === undefined ? true : !!corps.ouvert,
        creeLe: new Date().toISOString()
      };
      db.programmes.push(pr); store.save(); return json(res, 200, pr);
    }

    const mProg = p.match(/^\/api\/mon-entreprise\/programmes\/(\w+)$/);
    if (mProg) {
      const pr = db.programmes.find((x) => x.id === mProg[1] && x.entrepriseId === e.id);
      if (!pr) return json(res, 404, { erreur: 'Programme introuvable' });
      if (req.method === 'PUT') {
        if (corps.nom) pr.nom = String(corps.nom).slice(0, 90);
        if (corps.description !== undefined) pr.description = String(corps.description).slice(0, 400);
        if (corps.anneeScolaire !== undefined) pr.anneeScolaire = String(corps.anneeScolaire).slice(0, 20);
        if (corps.places !== undefined) pr.places = Math.max(0, Math.min(+corps.places || 0, 5000));
        if (corps.fraisInscription !== undefined) pr.fraisInscription = Math.max(0, +corps.fraisInscription || 0);
        if (corps.scolarite !== undefined) pr.scolarite = Math.max(0, +corps.scolarite || 0);
        if (corps.periodicite && ['mensuel', 'trimestriel', 'annuel'].includes(corps.periodicite)) pr.periodicite = corps.periodicite;
        if (corps.documents !== undefined) pr.documents = Array.isArray(corps.documents) ? corps.documents.map((d) => String(d).slice(0, 80)).slice(0, 15) : [];
        if (corps.ouvert !== undefined) pr.ouvert = !!corps.ouvert;
        store.save(); return json(res, 200, pr);
      }
      if (req.method === 'DELETE') {
        if (db.inscriptions.some((i) => i.programmeId === pr.id))
          return json(res, 409, { erreur: 'Ce programme a des inscriptions. Fermez-le plutôt que de le supprimer.' });
        db.programmes = db.programmes.filter((x) => x !== pr);
        store.save(); return json(res, 200, { ok: true });
      }
    }

    // ---- Demandes d'inscription reçues ----
    if (p === '/api/mon-entreprise/inscriptions' && req.method === 'GET') {
      const liste = db.inscriptions.filter((i) => i.entrepriseId === e.id)
        .sort((a, b) => b.creeLe.localeCompare(a.creeLe))
        .map((i) => ({ ...i, programme: db.programmes.find((x) => x.id === i.programmeId) || null }));
      return json(res, 200, liste);
    }

    const mIns = p.match(/^\/api\/mon-entreprise\/inscriptions\/(\w+)$/);
    if (mIns && req.method === 'PUT') {
      const i = db.inscriptions.find((x) => x.id === mIns[1] && x.entrepriseId === e.id);
      if (!i) return json(res, 404, { erreur: 'Demande introuvable' });
      const STATUTS = ['en_attente', 'acceptee', 'inscrit', 'refusee'];
      if (corps.statut !== undefined) {
        if (!STATUTS.includes(corps.statut)) return json(res, 400, { erreur: 'Statut invalide.' });
        // Contrôle des places au moment de valider l'inscription
        if (corps.statut === 'inscrit' && i.statut !== 'inscrit') {
          const pr = db.programmes.find((x) => x.id === i.programmeId);
          if (pr && pr.places > 0) {
            const pris = db.inscriptions.filter((x) => x.programmeId === pr.id && x.statut === 'inscrit').length;
            if (pris >= pr.places) return json(res, 409, { erreur: 'Toutes les places de ce programme sont prises.' });
          }
        }
        i.statut = corps.statut;
      }
      if (corps.note !== undefined) i.note = String(corps.note).slice(0, 300);
      store.save();
      const pr = db.programmes.find((x) => x.id === i.programmeId);
      const libelles = { acceptee: 'acceptée', inscrit: 'confirmée', refusee: 'refusée', en_attente: 'en attente' };
      if (['acceptee', 'inscrit', 'refusee'].includes(i.statut))
        envoyerWhatsApp(i.parentTel, 'inscription_statut',
          [i.parentNom, e.nom, i.eleveNom, pr ? pr.nom : '', libelles[i.statut]]);
      return json(res, 200, i);
    }

    // ---- Carte restaurant & bar (gestion) ----
    if (p === '/api/mon-entreprise/carte' && req.method === 'GET')
      return json(res, 200, db.carte.filter((a) => a.entrepriseId === e.id));

    if (p === '/api/mon-entreprise/carte' && req.method === 'POST') {
      if (!corps.nom || !(+corps.prix > 0)) return json(res, 400, { erreur: 'Nom et prix obligatoires.' });
      if (!CATEGORIES_CARTE.includes(corps.categorie)) return json(res, 400, { erreur: 'Catégorie invalide.' });
      if (corps.photo && !(String(corps.photo).startsWith('data:image/') && corps.photo.length <= 900000))
        return json(res, 400, { erreur: 'Photo invalide ou trop lourde.' });
      const a = {
        id: store.uid(), entrepriseId: e.id,
        nom: String(corps.nom).slice(0, 80),
        description: String(corps.description || '').slice(0, 300),
        categorie: corps.categorie,
        prix: Math.max(1, +corps.prix),
        volume: String(corps.volume || '').slice(0, 40),
        photo: corps.photo || '',
        disponible: corps.disponible === undefined ? true : !!corps.disponible
      };
      db.carte.push(a); store.save(); return json(res, 200, a);
    }

    const mCarte = p.match(/^\/api\/mon-entreprise\/carte\/(\w+)$/);
    if (mCarte) {
      const a = db.carte.find((x) => x.id === mCarte[1] && x.entrepriseId === e.id);
      if (!a) return json(res, 404, { erreur: 'Article introuvable' });
      if (req.method === 'PUT') {
        if (corps.nom) a.nom = String(corps.nom).slice(0, 80);
        if (corps.description !== undefined) a.description = String(corps.description).slice(0, 300);
        if (corps.categorie !== undefined) {
          if (!CATEGORIES_CARTE.includes(corps.categorie)) return json(res, 400, { erreur: 'Catégorie invalide.' });
          a.categorie = corps.categorie;
        }
        if (corps.prix) a.prix = Math.max(1, +corps.prix);
        if (corps.volume !== undefined) a.volume = String(corps.volume).slice(0, 40);
        if (corps.photo !== undefined) {
          if (corps.photo && !(String(corps.photo).startsWith('data:image/') && corps.photo.length <= 900000))
            return json(res, 400, { erreur: 'Photo invalide ou trop lourde.' });
          a.photo = corps.photo;
        }
        if (corps.disponible !== undefined) a.disponible = !!corps.disponible;
        store.save(); return json(res, 200, a);
      }
      if (req.method === 'DELETE') {
        db.carte = db.carte.filter((x) => x !== a);
        store.save(); return json(res, 200, { ok: true });
      }
    }

    if (p === '/api/mon-entreprise/chambres' && req.method === 'GET')
      return json(res, 200, db.chambres.filter((c) => c.entrepriseId === e.id));
    if (p === '/api/mon-entreprise/chambres' && req.method === 'POST') {
      if (!corps.nom || !(+corps.prixNuit > 0)) return json(res, 400, { erreur: 'Nom et prix par nuit obligatoires.' });
      if (corps.photo && !(String(corps.photo).startsWith('data:image/') && corps.photo.length <= 900000))
        return json(res, 400, { erreur: 'Photo invalide ou trop lourde.' });
      const c = {
        id: store.uid(), entrepriseId: e.id, nom: String(corps.nom).slice(0, 60),
        description: String(corps.description || '').slice(0, 300),
        prixNuit: Math.max(1, +corps.prixNuit), capacite: Math.max(1, Math.min(+corps.capacite || 2, 20)),
        quantite: Math.max(1, Math.min(+corps.quantite || 1, 200)), photo: corps.photo || '',
        equipements: nettoyerEquipements(corps.equipements), actif: true
      };
      db.chambres.push(c); store.save(); return json(res, 200, c);
    }
    const mChb = p.match(/^\/api\/mon-entreprise\/chambres\/(\w+)$/);
    if (mChb) {
      const c = db.chambres.find((x) => x.id === mChb[1] && x.entrepriseId === e.id);
      if (!c) return json(res, 404, { erreur: 'Chambre introuvable' });
      if (req.method === 'PUT') {
        if (corps.nom) c.nom = String(corps.nom).slice(0, 60);
        if (corps.description !== undefined) c.description = String(corps.description).slice(0, 300);
        if (corps.prixNuit) c.prixNuit = Math.max(1, +corps.prixNuit);
        if (corps.capacite) c.capacite = Math.max(1, Math.min(+corps.capacite, 20));
        if (corps.quantite) c.quantite = Math.max(1, Math.min(+corps.quantite, 200));
        if (corps.photo !== undefined) {
          if (corps.photo && !(String(corps.photo).startsWith('data:image/') && corps.photo.length <= 900000))
            return json(res, 400, { erreur: 'Photo invalide ou trop lourde.' });
          c.photo = corps.photo;
        }
        if (corps.equipements !== undefined) c.equipements = nettoyerEquipements(corps.equipements);
        if (corps.actif !== undefined) c.actif = !!corps.actif;
        store.save(); return json(res, 200, c);
      }
      if (req.method === 'DELETE') {
        db.chambres = db.chambres.filter((x) => x !== c);
        store.save(); return json(res, 200, { ok: true });
      }
    }

    // ---- Séjours du responsable ----
    if (p === '/api/sejours' && req.method === 'GET') {
      const liste = db.sejours.filter((s) => s.entrepriseId === e.id)
        .sort((a, b) => b.creeLe.localeCompare(a.creeLe))
        .map((s) => ({ ...s, chambre: db.chambres.find((c) => c.id === s.chambreId) || null }));
      return json(res, 200, liste);
    }
    const mSej = p.match(/^\/api\/sejours\/(\w+)$/);
    if (mSej && req.method === 'PUT') {
      const s = db.sejours.find((x) => x.id === mSej[1] && x.entrepriseId === e.id);
      if (!s) return json(res, 404, { erreur: 'Séjour introuvable' });
      if (corps.statut && ['confirme', 'annule', 'termine', 'en_attente'].includes(corps.statut)) {
        s.statut = corps.statut;
        const c = db.chambres.find((x) => x.id === s.chambreId);
        const libelle = { confirme: 'confirmé', annule: 'annulé', termine: 'terminé', en_attente: 'remis en attente' }[corps.statut];
        if (['confirme', 'annule'].includes(corps.statut)) {
          const conf = corps.statut === 'confirme';
          envoyerEmail(s.clientEmail, `Séjour ${libelle} — ${e.nom}`, gabaritEmail(
            conf ? 'Séjour confirmé 🎉' : 'Séjour annulé', conf ? (e.couleur || '#2563EB') : '#B42318',
            `<p>Bonjour <strong>${s.clientNom}</strong>,</p>
             <p>Votre séjour chez <strong>${e.nom}</strong>${c ? ' (' + c.nom + ')' : ''} du <strong>${s.arrivee}</strong> au <strong>${s.depart}</strong> (${s.nuits} nuit${s.nuits > 1 ? 's' : ''}, ${s.prixTotal.toLocaleString('fr-HT')} HTG) a été <strong>${libelle}</strong>.</p>
             ${conf ? `<p style="background:#D1FADF;border-radius:10px;padding:12px 14px;font-size:14px">✅ Nous vous attendons le ${s.arrivee}${e.adresse ? ' à : ' + e.adresse : ''}. Le paiement se fait sur place.</p>` : `<p>Vous pouvez réserver d'autres dates à tout moment sur Randevou.ht.</p>`}`,
            `Référence : ${s.id}`
          ));
        }
        if (['confirme', 'annule'].includes(corps.statut))
          envoyerWhatsApp(s.clientTel, 'rdv_statut', [s.clientNom, e.nom, s.arrivee + ' → ' + s.depart, s.nuits + ' nuit(s)', libelle]);
        store.save(); return json(res, 200, s);
      }
      return json(res, 400, { erreur: 'Statut invalide' });
    }

    // ---- Portefeuille et transactions ----
    if (p === '/api/mon-entreprise/portefeuille' && req.method === 'GET') {
      const port = creerOuObtenirPortefeuille(e.id);
      const transactions = db.paiements.filter((x) => x.entrepriseId === e.id)
        .sort((a, b) => b.creeLe.localeCompare(a.creeLe))
        .slice(0, 50);  // 50 dernières
      const retraits = db.retraits.filter((x) => x.entrepriseId === e.id)
        .sort((a, b) => b.demandeLe.localeCompare(a.demandeLe));
      return json(res, 200, { portefeuille: port, transactions, retraits });
    }

    // ---- Demander un retrait ----
    if (p === '/api/mon-entreprise/retraits' && req.method === 'POST') {
      const { montant, methode, destinataire } = corps;
      const port = creerOuObtenirPortefeuille(e.id);
      if (montant < MONTANT_MIN_RETRAIT) return json(res, 400, { erreur: `Montant minimum : ${MONTANT_MIN_RETRAIT} HTG` });
      if (montant > port.solde) return json(res, 402, { erreur: 'Solde insuffisant' });
      if (!['moncash', 'natcash'].includes(methode)) return json(res, 400, { erreur: 'Méthode invalide' });
      if (!destinataire || destinataire.length < 5) return json(res, 400, { erreur: 'Identifiant destinataire invalide' });
      
      const retrait = {
        id: store.uid(), entrepriseId: e.id, montant, methode, destinataire,
        statut: 'en_attente', reference: 'RET' + Date.now().toString(36).toUpperCase(),
        demandeLe: new Date().toISOString(), transactionId: null
      };
      db.retraits.push(retrait);
      port.soldeBloque += montant;  // Le montant est bloqué en attendant le retrait
      store.save();
      
      console.log(`[RETRAIT demandé] ${e.nom} — ${montant} HTG via ${methode} → ${destinataire}`);
      return json(res, 200, { ok: true, retraitId: retrait.id, reference: retrait.reference });
    }

    // ---- Historique des retraits ----
    if (p === '/api/mon-entreprise/retraits' && req.method === 'GET') {
      const retraits = db.retraits.filter((x) => x.entrepriseId === e.id)
        .sort((a, b) => b.demandeLe.localeCompare(a.demandeLe));
      return json(res, 200, retraits);
    }

    if (p === '/api/mon-entreprise/employes' && req.method === 'GET')
      return json(res, 200, db.employes.filter((x) => x.entrepriseId === e.id));
    if (p === '/api/mon-entreprise/employes' && req.method === 'POST') {
      if (!corps.nom) return json(res, 400, { erreur: 'Nom obligatoire.' });
      const emp = { id: store.uid(), entrepriseId: e.id, nom: corps.nom, poste: corps.poste || '', actif: true };
      db.employes.push(emp); store.save(); return json(res, 200, emp);
    }
    const mEmp = p.match(/^\/api\/mon-entreprise\/employes\/(\w+)$/);
    if (mEmp && req.method === 'DELETE') {
      db.employes = db.employes.filter((x) => !(x.id === mEmp[1] && x.entrepriseId === e.id));
      store.save(); return json(res, 200, { ok: true });
    }

    if (p === '/api/mon-entreprise/avis' && req.method === 'GET')
      return json(res, 200, db.avis.filter((a) => a.entrepriseId === e.id));

    if (p === '/api/rendezvous' && req.method === 'GET') {
      let liste = db.rendezvous.filter((r) => r.entrepriseId === e.id);
      if (q.get('date')) liste = liste.filter((r) => r.date === q.get('date'));
      if (q.get('du') && q.get('au')) liste = liste.filter((r) => r.date >= q.get('du') && r.date <= q.get('au'));
      liste = liste.map((r) => ({ ...r, service: db.services.find((s) => s.id === r.serviceId) || null }));
      liste.sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));
      return json(res, 200, liste);
    }
    const mRdv = p.match(/^\/api\/rendezvous\/(\w+)$/);
    if (mRdv && req.method === 'PUT') {
      const r = db.rendezvous.find((x) => x.id === mRdv[1] && x.entrepriseId === e.id);
      if (!r) return json(res, 404, { erreur: 'Rendez-vous introuvable' });
      if (corps.statut && ['confirme', 'annule', 'termine', 'en_attente'].includes(corps.statut)) {
        r.statut = corps.statut;
        const libelle = { confirme: 'confirmé', annule: 'annulé', termine: 'terminé', en_attente: 'remis en attente' }[corps.statut];
        if (['confirme', 'annule'].includes(corps.statut)) {
          const srv = db.services.find((x) => x.id === r.serviceId);
          const conf = corps.statut === 'confirme';
          envoyerEmail(r.clientEmail, `Rendez-vous ${libelle} — ${e.nom}`, gabaritEmail(
            conf ? 'Rendez-vous confirmé 🎉' : 'Rendez-vous annulé', conf ? (e.couleur || '#2563EB') : '#B42318',
            `<p>Bonjour <strong>${r.clientNom}</strong>,</p>
             <p>Votre rendez-vous chez <strong>${e.nom}</strong>${srv ? ' (' + srv.nom + ')' : ''} du <strong>${r.date}</strong> à <strong>${r.heure}</strong> a été <strong>${libelle}</strong>.</p>
             ${conf ? `<p style="background:#D1FADF;border-radius:10px;padding:12px 14px;font-size:14px">✅ Présentez-vous quelques minutes en avance${e.adresse ? ' à : ' + e.adresse : ''}.</p>` : `<p>Vous pouvez réserver un autre créneau à tout moment sur Randevou.ht.</p>`}`,
            `Référence : ${r.id}`
          ));
        }
        if (['confirme', 'annule'].includes(corps.statut))
          envoyerWhatsApp(r.clientTel, 'rdv_statut', [r.clientNom, e.nom, r.date, r.heure, libelle]);
      }
      if (corps.date) r.date = corps.date;
      if (corps.heure) r.heure = corps.heure;
      store.save(); return json(res, 200, r);
    }

    if (p === '/api/stats') {
      const aujourdhui = new Date().toISOString().slice(0, 10);
      const debutMois = aujourdhui.slice(0, 8) + '01';
      const rdvs = db.rendezvous.filter((r) => r.entrepriseId === e.id);
      const actifs = rdvs.filter((r) => r.statut !== 'annule');
      const parJour = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        parJour[d.toISOString().slice(0, 10)] = 0;
      }
      actifs.forEach((r) => { if (parJour[r.date] !== undefined) parJour[r.date]++; });
      const { note, total } = noteMoyenne(e.id);
      return json(res, 200, {
        rdvAujourdhui: actifs.filter((r) => r.date === aujourdhui).length,
        rdvCeMois: actifs.filter((r) => r.date >= debutMois).length,
        clientsTotaux: new Set(actifs.map((r) => r.clientTel)).size,
        note, totalAvis: total,
        revenusMois: actifs.filter((r) => r.date >= debutMois && ['confirme', 'termine'].includes(r.statut))
          .reduce((s, r) => s + ((db.services.find((x) => x.id === r.serviceId) || {}).prix || 0), 0),
        parJour
      });
    }

    if (p === '/api/notifications' && req.method === 'GET') {
      const notifs = db.notifications.filter((n) => n.entrepriseId === e.id).slice(0, 30);
      return json(res, 200, notifs);
    }
    if (p === '/api/notifications' && req.method === 'PUT') {
      db.notifications.forEach((n) => { if (n.entrepriseId === e.id) n.lu = true; });
      store.save(); return json(res, 200, { ok: true });
    }
  }

  // ---- Administration ----
  if (p.startsWith('/api/admin')) {
    if (!user || user.role !== 'admin') return json(res, 401, { erreur: 'Accès administrateur requis' });
    if (p === '/api/admin/entreprises' && req.method === 'GET') {
      return json(res, 200, db.entreprises.map((e) => ({
        ...e, ...noteMoyenne(e.id),
        totalRdv: db.rendezvous.filter((r) => r.entrepriseId === e.id).length
      })));
    }
    const mAdm = p.match(/^\/api\/admin\/entreprises\/(\w+)$/);
    if (mAdm && req.method === 'PUT') {
      const e = db.entreprises.find((x) => x.id === mAdm[1]);
      if (!e) return json(res, 404, { erreur: 'Introuvable' });
      if (corps.statut && ['approuvee', 'en_attente', 'suspendue'].includes(corps.statut)) e.statut = corps.statut;
      if (corps.plan && ['gratuit', 'premium'].includes(corps.plan)) e.plan = corps.plan;
      store.save(); return json(res, 200, e);
    }
    if (p === '/api/admin/stats') {
      return json(res, 200, {
        entreprises: db.entreprises.length,
        enAttente: db.entreprises.filter((e) => e.statut === 'en_attente').length,
        rendezvous: db.rendezvous.length,
        avis: db.avis.length,
        utilisateurs: db.users.length
      });
    }
  }

  return json(res, 404, { erreur: 'Route introuvable' });
}

// ---------------- Fichiers statiques + pages ----------------
function statique(res, fichier) {
  const fp = path.join(PUBLIC_DIR, fichier);
  if (!fp.startsWith(PUBLIC_DIR) || !fs.existsSync(fp)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Page introuvable');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    // URL personnalisée : randevou.ht/salon-elegance
    const m = url.pathname.match(/^\/([a-z0-9-]+)$/);
    if (m && db.entreprises.find((e) => e.slug === m[1])) return statique(res, 'entreprise.html');
    if (url.pathname === '/') return statique(res, 'index.html');
    return statique(res, url.pathname.slice(1));
  } catch (err) {
    console.error(err);
    json(res, 500, { erreur: 'Erreur serveur' });
  }
});

// ---------------- Rappels automatiques la veille (J-1) ----------------
// Vérifie toutes les 30 minutes les rendez-vous confirmés de demain et les
// arrivées de séjour de demain, puis envoie WhatsApp + email une seule fois.
// NOTE : sur le plan gratuit de Render, le serveur s'endort après 15 min
// d'inactivité et les rappels ne partent pas pendant son sommeil. Passez au
// plan Starter (ou utilisez un ping UptimeRobot) pour des rappels fiables.
function envoyerRappels() {
  const demain = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  let modifie = false;
  // Rendez-vous de demain
  db.rendezvous.filter((r) => r.date === demain && r.statut === 'confirme' && !r.rappelEnvoye).forEach((r) => {
    const e = db.entreprises.find((x) => x.id === r.entrepriseId);
    const s = db.services.find((x) => x.id === r.serviceId);
    if (!e) return;
    envoyerWhatsApp(r.clientTel, 'rdv_rappel', [r.clientNom, demain, r.heure, e.nom]);
    envoyerEmail(r.clientEmail, `Rappel : rendez-vous demain — ${e.nom}`, gabaritEmail(
      'Rappel de rendez-vous ⏰', e.couleur || '#2563EB',
      `<p>Bonjour <strong>${r.clientNom}</strong>,</p>
       <p>Petit rappel : vous avez rendez-vous <strong>demain ${demain} à ${r.heure}</strong> chez <strong>${e.nom}</strong>${s ? ' (' + s.nom + ')' : ''}.</p>
       <p style="background:#EFF4FF;border-radius:10px;padding:12px 14px;font-size:14px">📍 ${e.adresse || ''}${e.telephone ? ' — ☎️ ' + e.telephone : ''}</p>`,
      `Un empêchement ? Prévenez ${e.nom} dès que possible.`
    ));
    r.rappelEnvoye = true; modifie = true;
    console.log(`[RAPPEL J-1] ${r.clientNom} — ${e.nom} demain ${r.heure}`);
  });
  // Arrivées de séjour demain
  db.sejours.filter((s) => s.arrivee === demain && s.statut === 'confirme' && !s.rappelEnvoye).forEach((s) => {
    const e = db.entreprises.find((x) => x.id === s.entrepriseId);
    const c = db.chambres.find((x) => x.id === s.chambreId);
    if (!e) return;
    envoyerWhatsApp(s.clientTel, 'rdv_rappel', [s.clientNom, demain, 'votre arrivée' + (c ? ' (' + c.nom + ')' : ''), e.nom]);
    envoyerEmail(s.clientEmail, `Rappel : arrivée demain — ${e.nom}`, gabaritEmail(
      'Votre séjour commence demain 🛏️', e.couleur || '#2563EB',
      `<p>Bonjour <strong>${s.clientNom}</strong>,</p>
       <p>Nous vous attendons <strong>demain ${demain}</strong> chez <strong>${e.nom}</strong>${c ? ' (' + c.nom + ')' : ''} pour ${s.nuits} nuit${s.nuits > 1 ? 's' : ''} (départ le ${s.depart}).</p>
       <p style="background:#EFF4FF;border-radius:10px;padding:12px 14px;font-size:14px">📍 ${e.adresse || ''}${e.telephone ? ' — ☎️ ' + e.telephone : ''} — Paiement sur place : ${s.prixTotal.toLocaleString('fr-HT')} HTG</p>`,
      `Bon voyage ! Référence : ${s.id}`
    ));
    s.rappelEnvoye = true; modifie = true;
    console.log(`[RAPPEL J-1 séjour] ${s.clientNom} — ${e.nom} arrivée demain`);
  });
  if (modifie) store.save();
}
setInterval(envoyerRappels, 30 * 60 * 1000);
setTimeout(envoyerRappels, 20 * 1000); // première vérification 20 s après le démarrage

server.listen(PORT, () => {
  console.log('==================================================');
  console.log('  RANDEVOU.HT — Plateforme de rendez-vous en ligne');
  console.log('==================================================');
  console.log(`  Site           : http://localhost:${PORT}`);
  console.log(`  Démo entreprise: http://localhost:${PORT}/salon-elegance`);
  console.log('  Connexions de démonstration :');
  console.log('   • Responsable : marie@salonelegance.ht / demo123');
  console.log('   • Admin       : admin@randevou.ht / admin123');
  console.log('==================================================');
});
