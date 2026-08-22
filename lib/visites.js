'use strict';
/* ==========================================================
   Fréquentation de la plateforme
   ----------------------------------------------------------
   Ce module compte les visites, sans identifier les personnes.

   Ce qui est enregistré : la page consultée, le moment, le type
   d'appareil, la provenance, la langue et le fuseau horaire du
   navigateur. Aucune adresse IP n'est stockée : elle sert
   uniquement à calculer une empreinte anonyme, qui permet de
   distinguer deux visiteurs sans jamais remonter à quelqu'un.

   L'empreinte change chaque jour, grâce à un sel quotidien.
   Deux visites du même appareil à deux jours d'intervalle ne
   peuvent donc pas être reliées.
   ========================================================== */
const crypto = require('crypto');

const RETENTION_JOURS = 180;   // au-delà, les visites détaillées sont purgées
const SEL_BASE = process.env.SEL_VISITES || crypto.randomBytes(16).toString('hex');

/** Empreinte anonyme du visiteur, renouvelée chaque jour. */
function empreinte(ip, agent, jour) {
  return crypto.createHash('sha256')
    .update(`${SEL_BASE}|${jour}|${ip}|${agent}`)
    .digest('hex').slice(0, 16);
}

/** Type d'appareil, déduit de la signature du navigateur. */
function appareilDe(agent) {
  const a = String(agent || '').toLowerCase();
  if (/ipad|tablet/.test(a)) return 'tablette';
  if (/mobi|android|iphone/.test(a)) return 'téléphone';
  if (/bot|crawl|spider|slurp|bingpreview/.test(a)) return 'robot';
  return 'ordinateur';
}

/** Source de la visite, à partir de la page précédente. */
function sourceDe(referer, hote) {
  if (!referer) return 'direct';
  try {
    const h = new URL(referer).hostname.replace(/^www\./, '');
    if (hote && h === String(hote).replace(/^www\./, '').split(':')[0]) return 'interne';
    if (/facebook|fb\.com|instagram|messenger/.test(h)) return 'Facebook / Instagram';
    if (/whatsapp/.test(h)) return 'WhatsApp';
    if (/google|bing|duckduckgo|yahoo/.test(h)) return 'moteur de recherche';
    if (/tiktok/.test(h)) return 'TikTok';
    return h;
  } catch { return 'direct'; }
}

/**
 * Enregistre une visite.
 * `contexte` porte les éléments transmis par le navigateur (langue,
 * fuseau horaire), qui donnent une idée de la région sans géolocalisation.
 */
function enregistrer(db, { chemin, ip, agent, referer, hote, contexte }) {
  const appareil = appareilDe(agent);
  if (appareil === 'robot') return null;   // les robots ne sont pas des visiteurs

  const maintenant = new Date();
  const jour = maintenant.toISOString().slice(0, 10);
  const c = contexte || {};

  const v = {
    jour,
    heure: maintenant.getUTCHours(),
    le: maintenant.toISOString(),
    chemin: String(chemin || '/').slice(0, 120),
    // Page d'entreprise consultée, le cas échéant
    entreprise: /^\/[a-z0-9-]+$/i.test(chemin) ? String(chemin).slice(1, 60) : '',
    visiteur: empreinte(ip, agent, jour),
    appareil,
    source: sourceDe(referer, hote),
    langue: String(c.langue || '').slice(0, 12),
    fuseau: String(c.fuseau || '').slice(0, 60),
    installee: !!c.installee     // ouverte depuis l'écran d'accueil
  };
  db.visites.push(v);

  // Purge : on ne conserve pas indéfiniment le détail
  const limite = new Date(Date.now() - RETENTION_JOURS * 86400000).toISOString().slice(0, 10);
  if (db.visites.length > 200 && db.visites[0].jour < limite) {
    db.visites = db.visites.filter((x) => x.jour >= limite);
  }
  return v;
}

/** Région approximative, déduite du fuseau horaire. */
function regionDe(fuseau) {
  if (!fuseau) return 'Inconnue';
  const f = String(fuseau);
  if (f === 'America/Port-au-Prince') return 'Haïti';
  const carte = {
    'America/New_York': 'États-Unis (Est)', 'America/Chicago': 'États-Unis (Centre)',
    'America/Los_Angeles': 'États-Unis (Ouest)', 'America/Toronto': 'Canada',
    'America/Montreal': 'Canada', 'America/Santo_Domingo': 'République dominicaine',
    'Europe/Paris': 'France', 'America/Miami': 'États-Unis (Est)',
    'America/Cayenne': 'Guyane', 'America/Guadeloupe': 'Guadeloupe',
    'America/Martinique': 'Martinique'
  };
  if (carte[f]) return carte[f];
  const zone = f.split('/')[0];
  return { America: 'Amériques', Europe: 'Europe', Africa: 'Afrique',
           Asia: 'Asie', Pacific: 'Pacifique' }[zone] || f;
}

/** Statistiques agrégées sur une période. */
function statistiques(db, jours, entrepriseSlug) {
  const n = Math.max(1, Math.min(+jours || 30, 365));
  const depuis = new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  let visites = db.visites.filter((v) => v.jour >= depuis);
  if (entrepriseSlug) visites = visites.filter((v) => v.entreprise === entrepriseSlug);

  const compter = (cle, transf) => {
    const m = {};
    for (const v of visites) {
      const k = transf ? transf(v[cle]) : (v[cle] || '—');
      if (!k) continue;
      m[k] = (m[k] || 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };

  // Série quotidienne, jours vides compris
  const parJour = {};
  for (let i = n - 1; i >= 0; i--) {
    parJour[new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)] = { visites: 0, visiteurs: new Set() };
  }
  for (const v of visites) {
    if (parJour[v.jour]) {
      parJour[v.jour].visites++;
      parJour[v.jour].visiteurs.add(v.visiteur);
    }
  }

  const parHeure = new Array(24).fill(0);
  for (const v of visites) parHeure[v.heure]++;

  return {
    periode: n,
    total: visites.length,
    visiteurs: new Set(visites.map((v) => v.visiteur)).size,
    installees: visites.filter((v) => v.installee).length,
    parJour: Object.entries(parJour).map(([j, d]) => ({ jour: j, visites: d.visites, visiteurs: d.visiteurs.size })),
    parHeure,
    pages: compter('chemin').slice(0, 15),
    entreprises: compter('entreprise').filter(([k]) => k && k !== '—').slice(0, 15),
    sources: compter('source').slice(0, 10),
    appareils: compter('appareil'),
    regions: compter('fuseau', regionDe).slice(0, 12),
    langues: compter('langue', (l) => (String(l).startsWith('ht') ? 'Créole' :
      String(l).startsWith('fr') ? 'Français' : String(l).startsWith('en') ? 'Anglais' : (l || '—'))).slice(0, 6)
  };
}

module.exports = { enregistrer, statistiques, regionDe, RETENTION_JOURS };
