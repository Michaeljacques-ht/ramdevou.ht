'use strict';
/* ==========================================================
   Envoi de courriels
   ----------------------------------------------------------
   Render bloque le port SMTP : impossible d'envoyer directement
   depuis le serveur. On passe donc par l'interface web d'un
   service d'envoi.

   Brevo est retenu par défaut : sa formule gratuite couvre
   300 courriels par jour, largement au-dessus des besoins
   d'une plateforme qui n'envoie que des codes de connexion.

   Sans clé configurée, les courriels sont écrits dans les
   journaux : le développement reste possible, et rien ne casse.
   ========================================================== */
const https = require('https');

const CLE = process.env.BREVO_API_KEY || '';
const EXPEDITEUR = process.env.COURRIEL_EXPEDITEUR || 'contact@bizniskonekte.tech';
const NOM_EXPEDITEUR = process.env.COURRIEL_NOM || 'Konekte';

function configure() { return !!CLE; }

/** Requête vers l'interface de Brevo. */
function appel(charge) {
  return new Promise((resoudre) => {
    const corps = JSON.stringify(charge);
    const req = https.request({
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': CLE,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(corps)
      },
      timeout: 12000
    }, (rep) => {
      let donnees = '';
      rep.on('data', (d) => { donnees += d; });
      rep.on('end', () => {
        const ok = rep.statusCode >= 200 && rep.statusCode < 300;
        if (!ok) console.error('[COURRIEL] échec', rep.statusCode, donnees.slice(0, 200));
        resoudre({ ok, code: rep.statusCode });
      });
    });
    req.on('error', (e) => { console.error('[COURRIEL] erreur réseau', e.message); resoudre({ ok: false }); });
    req.on('timeout', () => { req.destroy(); resoudre({ ok: false }); });
    req.write(corps);
    req.end();
  });
}

/** Gabarit commun : en-tête de marque, contenu, pied. */
function gabarit(titre, contenu) {
  return `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#EEF2F8;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:26px 12px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden">
    <tr><td style="height:5px;background:linear-gradient(90deg,#0B2C6B 60%,#F26B21 60%)"></td></tr>
    <tr><td style="padding:26px 28px 6px">
      <p style="margin:0;font-size:13px;font-weight:800;color:#F26B21;letter-spacing:.04em">KONEKTE</p>
      <h1 style="margin:10px 0 0;font-size:20px;color:#0B2C6B">${titre}</h1>
    </td></tr>
    <tr><td style="padding:12px 28px 26px;font-size:14.5px;line-height:1.6;color:#26364F">${contenu}</td></tr>
    <tr><td style="padding:16px 28px;background:#F5F8FD;font-size:12px;color:#5A6B85">
      Message automatique — merci de ne pas y répondre.<br>
      Une question ? WhatsApp +509 4490 1724 ou contact@bizniskonekte.tech
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

const MODELES = {
  code_connexion: (p) => ({
    sujet: `${p.code} — votre code de connexion`,
    titre: 'Votre code de connexion',
    contenu: `<p style="margin:0 0 14px">Bonjour ${p.nom || ''},</p>
      <p style="margin:0 0 16px">Voici le code à saisir pour accéder à votre espace :</p>
      <p style="margin:0;text-align:center;font-size:34px;font-weight:800;letter-spacing:.22em;color:#0B2C6B;
        background:#F5F8FD;border-radius:12px;padding:16px 0">${p.code}</p>
      <p style="margin:16px 0 0;font-size:13px;color:#5A6B85">Ce code expire dans 10 minutes.
      Si vous n'êtes pas à l'origine de cette connexion, changez votre mot de passe sans tarder.</p>`
  }),
  mdp_change: (p) => ({
    sujet: 'Votre mot de passe a été changé',
    titre: 'Mot de passe modifié',
    contenu: `<p style="margin:0 0 14px">Bonjour ${p.nom || ''},</p>
      <p style="margin:0">Le mot de passe de votre espace Konekte vient d'être modifié.
      Toutes les sessions ouvertes ont été fermées.</p>
      <p style="margin:14px 0 0;font-size:13px;color:#5A6B85"><strong>Si vous n'êtes pas à l'origine de ce
      changement</strong>, écrivez-nous immédiatement sur WhatsApp au +509 4490 1724.</p>`
  }),
  a2f_activee: (p) => ({
    sujet: 'Vérification en deux étapes activée',
    titre: 'Votre compte est mieux protégé',
    contenu: `<p style="margin:0 0 14px">Bonjour ${p.nom || ''},</p>
      <p style="margin:0">La vérification en deux étapes est désormais active sur votre espace.
      À chaque connexion, un code vous sera envoyé à ${p.destination}.</p>
      <p style="margin:14px 0 0;font-size:13px;color:#5A6B85">Si vous n'êtes pas à l'origine de ce changement,
      contactez-nous immédiatement.</p>`
  })
};

/**
 * Envoie un courriel à partir d'un modèle.
 * Retourne toujours une promesse résolue : un échec d'envoi ne doit
 * jamais interrompre le parcours de l'utilisateur.
 */
async function envoyer(destinataire, modele, parametres) {
  const m = MODELES[modele];
  if (!m) { console.error('[COURRIEL] modèle inconnu :', modele); return { ok: false }; }
  const { sujet, titre, contenu } = m(parametres || {});

  if (!configure()) {
    console.log(`[COURRIEL simulation → ${destinataire}] ${sujet}`);
    if (parametres && parametres.code) console.log(`   code : ${parametres.code}`);
    return { ok: true, simule: true };
  }
  return appel({
    sender: { email: EXPEDITEUR, name: NOM_EXPEDITEUR },
    to: [{ email: destinataire }],
    subject: sujet,
    htmlContent: gabarit(titre, contenu)
  });
}

module.exports = { envoyer, configure };
