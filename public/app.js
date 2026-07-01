// Randevou.ht — utilitaires partagés
async function api(url, methode = 'GET', corps) {
  const r = await fetch(url, {
    method: methode,
    headers: { 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.erreur || 'Erreur serveur');
  return data;
}

function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('visible'), 3200);
}

function ech(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function etoiles(n) {
  const p = Math.round(n);
  return '★'.repeat(p) + '☆'.repeat(5 - p);
}

const MOIS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const JOURS_FR = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];

function dateFR(iso) {
  const d = new Date(iso + 'T12:00:00');
  return `${JOURS_FR[d.getDay()]} ${d.getDate()} ${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

function htg(n) { return Number(n).toLocaleString('fr-FR') + ' HTG'; }

const BADGE_STATUT = {
  en_attente: '<span class="badge badge-orange">En attente</span>',
  confirme: '<span class="badge badge-vert">Confirmé</span>',
  annule: '<span class="badge badge-rouge">Annulé</span>',
  termine: '<span class="badge badge-gris">Terminé</span>'
};

const ICONES_CAT = { 'Santé': '🩺', 'Beauté': '💇', 'Formation': '🎓', 'Auto': '🚗', 'Maison': '🏠', 'Restaurant': '🍽️', 'Juridique': '⚖️', 'Autre': '✨' };
