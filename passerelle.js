'use strict';
/* ============================================================
   Passerelle MonCash — compte marchand direct
   ------------------------------------------------------------
   Remplace PLOP PLOP par une intégration directe à l'API MonCash
   de Digicel, sous le compte marchand EDUCA TECHNOLOGIE.

   Ce module expose exactement la même interface que plopplop.js
   (initierPaiement, verifierPaiement, retirer…) : le serveur ne
   voit aucune différence, seule la passerelle change.

   ------------------------------------------------------------
   CONFIGURATION (variables d'environnement)
     MONCASH_CLIENT_ID       Client Id du tableau de bord Digicel
     MONCASH_CLIENT_SECRET   Client Secret (à ne jamais committer)
     MONCASH_MODE            'production' (défaut) ou 'sandbox'
     MONCASH_HOTE            surcharge éventuelle du domaine API
     MONCASH_HOTE_REDIRECT   surcharge du domaine de redirection

   ------------------------------------------------------------
   À VÉRIFIER AVANT LA MISE EN PRODUCTION
   Les chemins d'API ci-dessous suivent la documentation MonCash
   telle que je la connais. Digicel peut les avoir fait évoluer.
   Comparez-les à la documentation de votre tableau de bord ; ils
   sont tous surchargeables par variable d'environnement.

   ATTENTION : MonCash ne traite que MonCash. NatCash et Kashpaw
   demandent chacun leur propre contrat marchand.
   ============================================================ */
const https = require('https');
const crypto = require('crypto');

const MODE = process.env.MONCASH_MODE === 'sandbox' ? 'sandbox' : 'production';

const MONCASH = {
  clientId: process.env.MONCASH_CLIENT_ID || '',
  clientSecret: process.env.MONCASH_CLIENT_SECRET || '',
  mode: MODE,
  hote: process.env.MONCASH_HOTE ||
    (MODE === 'sandbox' ? 'sandbox.moncashbutton.digicelgroup.com' : 'moncashbutton.digicelgroup.com'),
  hoteRedirect: process.env.MONCASH_HOTE_REDIRECT ||
    (MODE === 'sandbox' ? 'sandbox.moncashbutton.digicelgroup.com' : 'moncashbutton.digicelgroup.com'),
  cheminJeton: process.env.MONCASH_CHEMIN_JETON || '/Api/oauth/token',
  cheminCreation: process.env.MONCASH_CHEMIN_CREATION || '/Api/v1/CreatePayment',
  cheminVerif: process.env.MONCASH_CHEMIN_VERIF || '/Api/v1/RetrieveOrderPayment',
  cheminTransfert: process.env.MONCASH_CHEMIN_TRANSFERT || '/Api/v1/Transfert',
  cheminRedirect: process.env.MONCASH_CHEMIN_REDIRECT || '/Moncash-middleware/Payment/Redirect',
  montantMinHTG: 5
};

const passerelleActive = () => !!(MONCASH.clientId && MONCASH.clientSecret);

// MonCash ne propose qu'un moyen de paiement ; la liste garde la même
// forme que celle de PLOP PLOP pour que l'interface reste identique.
const METHODES = [{ id: 'moncash', nom: 'MonCash' }];
const METHODES_RETRAIT = [{ id: 'moncash', nom: 'MonCash' }];

/* ------------------------------------------------------------
   Appel HTTP générique
   ------------------------------------------------------------ */
function appel(chemin, methode, corpsObjet, entetes) {
  return new Promise((resolve, reject) => {
    const corps = corpsObjet
      ? (typeof corpsObjet === 'string' ? corpsObjet : JSON.stringify(corpsObjet))
      : null;
    const [hote, port] = String(MONCASH.hote).split(':');
    const req = https.request({
      hostname: hote,
      port: port ? Number(port) : 443,
      path: chemin,
      method: methode,
      timeout: 20000,
      headers: Object.assign(
        { Accept: 'application/json' },
        corps ? { 'Content-Length': Buffer.byteLength(corps) } : {},
        entetes || {}
      )
    }, (rep) => {
      let data = '';
      rep.on('data', (c) => { data += c; });
      rep.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch { /* réponse non JSON */ }
        resolve({ code: rep.statusCode, corps: json, brut: data });
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('MonCash ne répond pas (délai dépassé).')); });
    req.on('error', (e) => reject(new Error('MonCash injoignable : ' + e.message)));
    if (corps) req.write(corps);
    req.end();
  });
}

/* ------------------------------------------------------------
   Jeton d'accès — obtenu par authentification Basic, puis réutilisé
   jusqu'à son expiration pour éviter un appel inutile à chaque paiement.
   ------------------------------------------------------------ */
let jetonCache = { valeur: null, expireLe: 0 };

async function obtenirJeton() {
  if (jetonCache.valeur && Date.now() < jetonCache.expireLe - 30000) return jetonCache.valeur;
  const basic = Buffer.from(`${MONCASH.clientId}:${MONCASH.clientSecret}`).toString('base64');
  const rep = await appel(MONCASH.cheminJeton, 'POST', 'scope=read,write&grant_type=client_credentials', {
    Authorization: 'Basic ' + basic,
    'Content-Type': 'application/x-www-form-urlencoded'
  });
  const c = rep.corps || {};
  if (rep.code !== 200 || !c.access_token) {
    throw new Error(c.error_description || c.error || `Authentification MonCash refusée (HTTP ${rep.code}).`);
  }
  jetonCache = {
    valeur: c.access_token,
    expireLe: Date.now() + (Number(c.expires_in || 59) * 1000)
  };
  return jetonCache.valeur;
}

/* ------------------------------------------------------------
   Création d'un paiement
   Retourne { ok, urlPaiement, transactionId, methode }
   ------------------------------------------------------------ */
async function initierPaiement({ reference, montant }) {
  if (!passerelleActive()) {
    return { ok: false, error: 'Passerelle non configurée (MONCASH_CLIENT_ID / MONCASH_CLIENT_SECRET).' };
  }
  const somme = Math.round(Number(montant));
  if (!Number.isFinite(somme) || somme < MONCASH.montantMinHTG) {
    return { ok: false, error: `Montant minimum : ${MONCASH.montantMinHTG} HTG.` };
  }
  let jeton, rep;
  try {
    jeton = await obtenirJeton();
    rep = await appel(MONCASH.cheminCreation, 'POST',
      { amount: somme, orderId: String(reference) },
      { Authorization: 'Bearer ' + jeton, 'Content-Type': 'application/json' });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const c = rep.corps || {};
  const token = (c.payment_token && c.payment_token.token) || c.token || null;
  if (rep.code < 200 || rep.code >= 300 || !token) {
    return {
      ok: false,
      error: c.message || c.error_description || `MonCash a refusé la transaction (HTTP ${rep.code}).`,
      codePasserelle: rep.code
    };
  }
  return {
    ok: true,
    urlPaiement: `https://${MONCASH.hoteRedirect}${MONCASH.cheminRedirect}?token=${encodeURIComponent(token)}`,
    transactionId: token,
    methode: 'moncash'
  };
}

/* ------------------------------------------------------------
   Vérification d'un paiement
   Retourne { ok, paye, infos } — même forme que PLOP PLOP.
   ------------------------------------------------------------ */
async function verifierPaiement(reference) {
  if (!passerelleActive()) {
    return { ok: false, paye: false, error: 'Passerelle non configurée.' };
  }
  let rep;
  try {
    const jeton = await obtenirJeton();
    rep = await appel(MONCASH.cheminVerif, 'POST',
      { orderId: String(reference) },
      { Authorization: 'Bearer ' + jeton, 'Content-Type': 'application/json' });
  } catch (e) {
    return { ok: false, paye: false, error: e.message };
  }

  const c = rep.corps || {};
  const p = c.payment || c;
  const statut = String(p.message || p.status || '').toLowerCase();
  // MonCash confirme par « successful » ; tout autre état signifie
  // que le client n'a pas encore réglé, ou que le paiement a échoué.
  if (rep.code >= 200 && rep.code < 300 && statut === 'successful') {
    return {
      ok: true, paye: true, infos: {
        transactionId: p.transaction_id || p.transactionId || null,
        methode: 'moncash',
        payeur: p.payer || null,
        montant: p.cost != null ? Number(p.cost) : null,
        dateTransaction: p.timestamp || p.date || ''
      }
    };
  }
  return {
    ok: true, paye: false,
    message: p.message || c.message || 'Paiement non encore confirmé par MonCash.'
  };
}

/* ------------------------------------------------------------
   Retrait / versement vers un portefeuille MonCash
   Nécessite un compte « MFS Prefunded » approvisionné.
   ------------------------------------------------------------ */
function nouvelleReferenceRetrait() {
  return 'WD-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' +
    crypto.randomBytes(3).toString('hex').toUpperCase();
}

async function retirer({ montant, methode, destinataire, reference }) {
  if (!passerelleActive()) {
    return { ok: false, error: 'Passerelle non configurée.' };
  }
  if (methode && methode !== 'moncash') {
    return { ok: false, error: 'Cette passerelle ne verse que vers MonCash.' };
  }
  const numero = String(destinataire || '').replace(/\D/g, '');
  if (numero.length < 8) return { ok: false, error: 'Numéro MonCash invalide.' };
  const somme = Math.round(Number(montant));
  if (!Number.isFinite(somme) || somme <= 0) return { ok: false, error: 'Montant invalide.' };

  let rep;
  try {
    const jeton = await obtenirJeton();
    rep = await appel(MONCASH.cheminTransfert, 'POST',
      { amount: somme, receiver: numero, desc: reference || nouvelleReferenceRetrait() },
      { Authorization: 'Bearer ' + jeton, 'Content-Type': 'application/json' });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const c = rep.corps || {};
  const t = c.transfer || c;
  if (rep.code < 200 || rep.code >= 300) {
    return {
      ok: false,
      error: c.message || c.error_description || `Versement refusé (HTTP ${rep.code}).`,
      codePasserelle: rep.code
    };
  }
  return {
    ok: true,
    retrait: {
      reference: t.desc || reference || null,
      transactionId: t.transaction_id || t.transactionId || null,
      destinataire: numero,
      montant: somme
    }
  };
}

async function verifierRetrait(reference) {
  // MonCash ne propose pas de consultation d'un versement passé :
  // le résultat est donné au moment du transfert.
  return { ok: false, error: 'MonCash ne permet pas de consulter un versement après coup.', reference };
}

module.exports = {
  PLOP: MONCASH,          // alias : le serveur lit passerelle.PLOP.montantMinHTG
  MONCASH,
  passerelleActive, METHODES, METHODES_RETRAIT,
  initierPaiement, verifierPaiement,
  retirer, verifierRetrait, nouvelleReferenceRetrait
};
