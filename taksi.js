'use strict';
/* ============================================================
   Choix de la passerelle de paiement
   ------------------------------------------------------------
   PASSERELLE=moncash  → compte marchand EDUCA Technologie (MonCash seul)
   PASSERELLE=plop     → PLOP PLOP (MonCash + NatCash + Kashpaw)

   Sans variable, le choix se fait sur les identifiants présents :
   MonCash s'il est configuré, PLOP PLOP sinon. Cela permet de
   basculer d'une passerelle à l'autre sans redéployer le code.
   ============================================================ */
const plopplop = require('../plopplop.js');
const moncash = require('./moncash.js');

const choix = String(process.env.PASSERELLE || '').toLowerCase();

let passerelle, nom;
if (choix === 'moncash') { passerelle = moncash; nom = 'moncash'; }
else if (choix === 'plop' || choix === 'plopplop') { passerelle = plopplop; nom = 'plopplop'; }
else if (moncash.passerelleActive()) { passerelle = moncash; nom = 'moncash'; }
else { passerelle = plopplop; nom = 'plopplop'; }

// Trace au démarrage : sans elle, un défaut de configuration ne se
// découvre qu'au premier paiement raté.
console.log(`[PAIEMENT] Passerelle : ${nom} — ${passerelle.passerelleActive() ? 'configurée' : 'NON configurée (mode simulation)'}`);

module.exports = Object.assign({}, passerelle, { nomPasserelle: nom });
