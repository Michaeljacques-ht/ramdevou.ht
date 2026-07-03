// ============================================================
// Randevou.ht — Serveur (Node.js pur, zéro dépendance)
// Lancer :  node server.js   →  http://localhost:3000
// ============================================================
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const store = require('./lib/db');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const db = store.load();

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

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
function publicEntreprise(e) {
  const { note, total } = noteMoyenne(e.id);
  return { slug: e.slug, nom: e.nom, categorie: e.categorie, description: e.description, adresse: e.adresse, telephone: e.telephone, whatsapp: e.whatsapp, couleur: e.couleur, couleur2: e.couleur2, logoTexte: e.logoTexte, logoImage: e.logoImage || '', photoFond: e.photoFond || '', horaires: e.horaires, plan: e.plan, note, totalAvis: total };
}

// ---------------- Calcul des créneaux disponibles ----------------
const JOURS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
// ---------------- Séjours (chambres d'hôtel) ----------------
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
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
  if (p === '/api/entreprises' && req.method === 'GET') {
    let liste = db.entreprises.filter((e) => e.statut === 'approuvee');
    const cat = q.get('categorie'), recherche = (q.get('q') || '').toLowerCase();
    if (cat && cat !== 'Tout') liste = liste.filter((e) => e.categorie === cat);
    if (recherche) liste = liste.filter((e) => (e.nom + ' ' + e.description + ' ' + e.adresse + ' ' + e.categorie).toLowerCase().includes(recherche));
    return json(res, 200, liste.map(publicEntreprise));
  }

  const mPub = p.match(/^\/api\/entreprises\/([a-z0-9-]+)$/);
  if (mPub && req.method === 'GET') {
    const e = db.entreprises.find((x) => x.slug === mPub[1] && x.statut === 'approuvee');
    if (!e) return json(res, 404, { erreur: 'Entreprise introuvable' });
    return json(res, 200, {
      ...publicEntreprise(e),
      services: db.services.filter((s) => s.entrepriseId === e.id && s.actif),
      chambres: db.chambres.filter((c) => c.entrepriseId === e.id && c.actif).map((c) => ({ id: c.id, nom: c.nom, description: c.description, prixNuit: c.prixNuit, capacite: c.capacite, quantite: c.quantite, photo: c.photo || '' })),
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
    const restantes = chambresRestantes(c, arrivee, depart);
    const nuits = nbNuits(arrivee, depart);
    return json(res, 200, { disponible: restantes > 0, restantes, nuits, prixNuit: c.prixNuit, prixTotal: nuits * c.prixNuit });
  }

  // Réservation publique d'un séjour
  if (p === '/api/sejours' && req.method === 'POST') {
    const e = db.entreprises.find((x) => x.slug === corps.slug && x.statut === 'approuvee');
    const c = e && db.chambres.find((x) => x.id === corps.chambreId && x.entrepriseId === e.id && x.actif);
    if (!c) return json(res, 404, { erreur: 'Chambre introuvable' });
    if (!corps.clientNom || !corps.clientTel) return json(res, 400, { erreur: 'Nom et téléphone obligatoires.' });
    const errPeriode = validerPeriode(corps.arrivee, corps.depart);
    if (errPeriode) return json(res, 400, { erreur: errPeriode });
    if (chambresRestantes(c, corps.arrivee, corps.depart) < 1)
      return json(res, 409, { erreur: 'Cette chambre est complète sur ces dates. Essayez d\'autres dates ou un autre type de chambre.' });
    const nuits = nbNuits(corps.arrivee, corps.depart);
    const sejour = {
      id: store.uid(), entrepriseId: e.id, chambreId: c.id,
      clientNom: String(corps.clientNom).slice(0, 80), clientTel: String(corps.clientTel).slice(0, 20),
      clientEmail: String(corps.clientEmail || '').slice(0, 120),
      arrivee: corps.arrivee, depart: corps.depart, nuits,
      nbPersonnes: Math.max(1, Math.min(+corps.nbPersonnes || 1, +c.capacite || 10)),
      prixTotal: nuits * c.prixNuit, statut: 'en_attente', creeLe: new Date().toISOString()
    };
    db.sejours.push(sejour);
    notifier(e.id, 'nouveau_sejour', `Nouveau séjour : ${sejour.clientNom} — ${c.nom}, du ${sejour.arrivee} au ${sejour.depart} (${nuits} nuit${nuits > 1 ? 's' : ''})`);
    envoyerEmail(sejour.clientEmail, `Demande de séjour enregistrée — ${e.nom}`, gabaritEmail(
      'Demande de séjour enregistrée 🛏️', e.couleur || '#2563EB',
      `<p>Bonjour <strong>${sejour.clientNom}</strong>,</p>
       <p>Votre demande de réservation a bien été enregistrée :</p>
       <table style="width:100%;border-collapse:collapse;margin:14px 0">
         <tr><td style="padding:8px 0;color:#667085">Établissement</td><td style="padding:8px 0;text-align:right"><strong>${e.nom}</strong></td></tr>
         <tr><td style="padding:8px 0;color:#667085">Chambre</td><td style="padding:8px 0;text-align:right"><strong>${c.nom}</strong></td></tr>
         <tr><td style="padding:8px 0;color:#667085">Arrivée</td><td style="padding:8px 0;text-align:right"><strong>${sejour.arrivee}</strong></td></tr>
         <tr><td style="padding:8px 0;color:#667085">Départ</td><td style="padding:8px 0;text-align:right"><strong>${sejour.depart}</strong></td></tr>
         <tr><td style="padding:8px 0;color:#667085">Nuits</td><td style="padding:8px 0;text-align:right"><strong>${nuits}</strong></td></tr>
         <tr><td style="padding:8px 0;color:#667085">Personnes</td><td style="padding:8px 0;text-align:right"><strong>${sejour.nbPersonnes}</strong></td></tr>
         <tr><td style="padding:8px 0;color:#667085">Prix total</td><td style="padding:8px 0;text-align:right"><strong>${sejour.prixTotal.toLocaleString('fr-HT')} HTG</strong></td></tr>
         <tr><td style="padding:8px 0;color:#667085">Référence</td><td style="padding:8px 0;text-align:right">${sejour.id}</td></tr>
       </table>
       <p style="background:#FEF0C7;border-radius:10px;padding:12px 14px;font-size:14px">⏳ <strong>${e.nom}</strong> va confirmer votre séjour. Vous recevrez un email dès que c'est fait. Le paiement se fait directement auprès de l'établissement.</p>`,
      `Besoin de modifier ? Contactez ${e.nom}${e.telephone ? ' au ' + e.telephone : ''}.`
    ));
    envoyerWhatsApp(sejour.clientTel, 'rdv_recu', [sejour.clientNom, e.nom, c.nom, sejour.arrivee + ' → ' + sejour.depart, nuits + ' nuit(s), ' + sejour.prixTotal.toLocaleString('fr-HT') + ' HTG']);
    store.save();
    return json(res, 200, { ok: true, reference: sejour.id, entreprise: e.nom, chambre: c.nom, arrivee: sejour.arrivee, depart: sejour.depart, nuits, prixTotal: sejour.prixTotal, whatsapp: e.whatsapp || '' });
  }

  if (p === '/api/disponibilites' && req.method === 'GET') {
    const e = db.entreprises.find((x) => x.slug === q.get('slug'));
    const s = e && db.services.find((x) => x.id === q.get('service') && x.entrepriseId === e.id);
    if (!e || !s || !q.get('date')) return json(res, 400, { erreur: 'Paramètres invalides' });
    return json(res, 200, { creneaux: creneauxDisponibles(e, s, q.get('date')) });
  }

  // ---- Réservation (client) ----
  if (p === '/api/reservations' && req.method === 'POST') {
    const e = db.entreprises.find((x) => x.slug === corps.slug && x.statut === 'approuvee');
    const s = e && db.services.find((x) => x.id === corps.serviceId && x.entrepriseId === e.id);
    if (!e || !s) return json(res, 400, { erreur: 'Entreprise ou service invalide.' });
    if (!corps.clientNom || !corps.clientTel || !corps.date || !corps.heure)
      return json(res, 400, { erreur: 'Nom, téléphone, date et heure sont obligatoires.' });
    if (!creneauxDisponibles(e, s, corps.date).includes(corps.heure))
      return json(res, 409, { erreur: "Ce créneau n'est plus disponible. Choisissez-en un autre." });
    const rdv = { id: store.uid(), entrepriseId: e.id, serviceId: s.id, clientNom: corps.clientNom, clientTel: corps.clientTel, clientEmail: corps.clientEmail || '', date: corps.date, heure: corps.heure, statut: 'en_attente', creeLe: new Date().toISOString() };
    db.rendezvous.push(rdv);
    notifier(e.id, 'nouveau_rdv', `Nouveau rendez-vous : ${rdv.clientNom} — ${s.nom} le ${rdv.date} à ${rdv.heure}`);
    // Email de confirmation au client
    envoyerEmail(rdv.clientEmail, `Réservation enregistrée — ${e.nom}`, gabaritEmail(
      'Réservation enregistrée ✅', e.couleur || '#2563EB',
      `<p>Bonjour <strong>${rdv.clientNom}</strong>,</p>
       <p>Votre demande de rendez-vous a bien été enregistrée. Voici le récapitulatif :</p>
       <table style="width:100%;border-collapse:collapse;margin:14px 0">
         <tr><td style="padding:8px 0;color:#667085">Entreprise</td><td style="padding:8px 0;text-align:right"><strong>${e.nom}</strong></td></tr>
         <tr><td style="padding:8px 0;color:#667085">Service</td><td style="padding:8px 0;text-align:right"><strong>${s.nom}</strong></td></tr>
         <tr><td style="padding:8px 0;color:#667085">Date</td><td style="padding:8px 0;text-align:right"><strong>${rdv.date}</strong></td></tr>
         <tr><td style="padding:8px 0;color:#667085">Heure</td><td style="padding:8px 0;text-align:right"><strong>${rdv.heure}</strong></td></tr>
         <tr><td style="padding:8px 0;color:#667085">Adresse</td><td style="padding:8px 0;text-align:right">${e.adresse || ''}</td></tr>
         <tr><td style="padding:8px 0;color:#667085">Référence</td><td style="padding:8px 0;text-align:right">${rdv.id}</td></tr>
       </table>
       <p style="background:#FEF0C7;border-radius:10px;padding:12px 14px;font-size:14px">⏳ <strong>${e.nom}</strong> va confirmer votre rendez-vous. Vous recevrez un second email dès que c'est fait.</p>`,
      `Besoin de modifier ? Contactez directement ${e.nom}${e.telephone ? ' au ' + e.telephone : ''}.`
    ));
    envoyerWhatsApp(rdv.clientTel, 'rdv_recu', [rdv.clientNom, e.nom, s.nom, rdv.date, rdv.heure]);
    return json(res, 200, { ok: true, reference: rdv.id, entreprise: e.nom, service: s.nom, date: rdv.date, heure: rdv.heure, whatsapp: e.whatsapp });
  }

  if (p === '/api/avis' && req.method === 'POST') {
    const e = db.entreprises.find((x) => x.slug === corps.slug && x.statut === 'approuvee');
    if (!e || !corps.clientNom || !corps.note) return json(res, 400, { erreur: 'Données invalides.' });
    db.avis.unshift({ id: store.uid(), entrepriseId: e.id, clientNom: corps.clientNom, note: Math.min(5, Math.max(1, +corps.note)), commentaire: (corps.commentaire || '').slice(0, 500), creeLe: new Date().toISOString() });
    notifier(e.id, 'nouvel_avis', `Nouvel avis (${corps.note}/5) de ${corps.clientNom}`);
    return json(res, 200, { ok: true });
  }

  // ---- Espace responsable (authentifié) ----
  if (p.startsWith('/api/mon-') || p.startsWith('/api/rendezvous') || p.startsWith('/api/sejours') || p === '/api/stats' || p === '/api/notifications') {
    if (!user || user.role !== 'responsable') return json(res, 401, { erreur: 'Connexion requise' });
    const e = monEntreprise();
    if (!e) return json(res, 404, { erreur: 'Entreprise introuvable' });

    if (p === '/api/mon-entreprise' && req.method === 'GET') return json(res, 200, e);
    if (p === '/api/mon-entreprise' && req.method === 'PUT') {
      ['nom', 'description', 'adresse', 'telephone', 'whatsapp', 'email', 'categorie', 'couleur', 'couleur2', 'logoTexte', 'horaires'].forEach((k) => {
        if (corps[k] !== undefined) e[k] = corps[k];
      });
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
        quantite: Math.max(1, Math.min(+corps.quantite || 1, 200)), photo: corps.photo || '', actif: true
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
