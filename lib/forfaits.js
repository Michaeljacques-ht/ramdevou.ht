'use strict';
/* ==========================================================
   Forfaits et abonnements
   ----------------------------------------------------------
   Chaque entreprise choisit un forfait à l'inscription, mais
   ne paie qu'après une période d'essai gratuite. Pendant
   l'essai, toutes les fonctions du forfait sont ouvertes.

   La commission prélevée sur les encaissements dépend du
   forfait : c'est ce qui rend l'offre gratuite viable.
   ========================================================== */

/* Période d'essai comptée en jours : 90 jours est une promesse plus
   nette que « 3 mois », dont la durée varie selon le mois de départ. */
const JOURS_ESSAI = 90;
const MOIS_ESSAI = 3;   // conservé pour les textes qui parlent en mois

const FORFAITS = {
  decouverte: {
    nom: { fr: 'Découverte', ht: 'Dekouvèt' },
    prixMois: 1000,
    commission: 0.08,
    resume: {
      fr: 'Pour démarrer simplement, avec l\'essentiel.',
      ht: 'Pou kòmanse senp, ak sa ki esansyèl.'
    },
    limites: { services: 3, employes: 1, produits: 20 },
    /* Modules ouverts par ce forfait. Les autres restent visibles
       mais verrouillés, avec une invitation à changer de formule. */
    modules: ['rdv', 'equipe', 'catalogue'],
    avantages: {
      fr: ['Page publique', 'Rendez-vous en ligne', "Jusqu'à 3 services", '1 membre d\'équipe', 'Commission 8 %'],
      ht: ['Paj piblik', 'Randevou an liy', 'Jiska 3 sèvis', '1 moun nan ekip la', 'Komisyon 8 %']
    }
  },
  pro: {
    nom: { fr: 'Pro', ht: 'Pro' },
    prixMois: 1500,
    commission: 0.05,
    populaire: true,
    resume: {
      fr: 'Pour les entreprises qui reçoivent régulièrement des clients.',
      ht: 'Pou biznis ki resevwa kliyan regilyèman.'
    },
    limites: { services: 0, employes: 0, produits: 0 },
    modules: ['rdv', 'equipe', 'catalogue', 'commandes', 'inscriptions', 'dossiers', 'urgences', 'carte', 'hotellerie'],   // 0 = sans limite
    avantages: {
      fr: ['Services et équipe illimités', 'Catalogue et commandes', 'Rappels WhatsApp', 'Statistiques', 'Commission 5 %'],
      ht: ['Sèvis ak ekip san limit', 'Katalòg ak kòmand', 'Ranpèl WhatsApp', 'Estatistik', 'Komisyon 5 %']
    }
  },
  hotellerie: {
    nom: { fr: 'Hôtellerie & Commerce', ht: 'Otèl & Komès' },
    prixMois: 2500,
    commission: 0.03,
    plafondCommission: 500,
    resume: {
      fr: 'Pour ceux qui encaissent beaucoup : la commission la plus basse.',
      ht: 'Pou moun ki ankese anpil : komisyon ki pi ba a.'
    },
    limites: { services: 0, employes: 0, produits: 0 },
    modules: ['rdv', 'equipe', 'catalogue', 'commandes', 'inscriptions', 'dossiers', 'urgences', 'carte', 'hotellerie'],
    avantages: {
      fr: ['Toutes les fonctions de Pro', 'Commission 3 % au lieu de 5 %', 'Plafonnée à 500 HTG par encaissement', 'Avantageux dès 50 000 HTG encaissés par mois', 'Support prioritaire'],
      ht: ['Tout fonksyon Pro yo', 'Komisyon 3 % olye 5 %', 'Maksimòm 500 goud pa peman', 'Pi avantaje apati 50 000 goud pa mwa', 'Sipò prioritè']
    }
  }
};

const CLES_FORFAITS = Object.keys(FORFAITS);

/** Ajoute des mois à une date, en gérant les fins de mois. */
function ajouterMois(date, n) {
  const d = new Date(date);
  const jour = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + n);
  if (d.getUTCDate() < jour) d.setUTCDate(0);   // 31 janvier + 1 mois = 28/29 février
  return d;
}

/** Abonnement initial, posé à l'inscription. */
function nouvelAbonnement(forfaitCle, maintenant) {
  const cle = FORFAITS[forfaitCle] ? forfaitCle : 'decouverte';
  const debut = maintenant || new Date();
  const fin = new Date(debut.getTime() + JOURS_ESSAI * 86400000);
  return {
    forfait: cle,
    essaiDebut: debut.toISOString().slice(0, 10),
    essaiFin: fin.toISOString().slice(0, 10),
    // Première échéance : le lendemain de la fin d'essai
    prochainPaiement: fin.toISOString().slice(0, 10),
    statut: 'essai',          // essai | actif | impaye | annule
    paiements: [],            // historique des règlements d'abonnement
    contrat: null             // rempli à la signature
  };
}

/** État courant, recalculé à la lecture : l'essai expire tout seul. */
function etatAbonnement(e, aujourdhui) {
  const a = e && e.abonnement;
  const jour = aujourdhui || new Date().toISOString().slice(0, 10);
  if (!a) return { forfait: 'decouverte', statut: 'essai', joursRestants: null, gratuit: true };
  const f = FORFAITS[a.forfait] || FORFAITS.decouverte;
  const enEssai = a.statut === 'essai' && jour <= a.essaiFin;
  const joursRestants = Math.max(0, Math.round(
    (new Date(a.essaiFin + 'T00:00:00Z') - new Date(jour + 'T00:00:00Z')) / 86400000));
  return {
    forfait: a.forfait,
    nom: f.nom,
    prixMois: f.prixMois,
    commission: f.commission,
    plafondCommission: f.plafondCommission || 0,
    statut: enEssai ? 'essai' : (a.statut === 'essai' ? 'a_regler' : a.statut),
    gratuit: enEssai || f.prixMois === 0,
    essaiDebut: a.essaiDebut,
    essaiFin: a.essaiFin,
    joursRestants: enEssai ? joursRestants : 0,
    prochainPaiement: a.prochainPaiement,
    contratSigne: !!(a.contrat && a.contrat.signature)
  };
}

/** Commission applicable à un encaissement, selon le forfait. */
function commissionPour(e, montant) {
  const a = e && e.abonnement;
  const f = (a && FORFAITS[a.forfait]) || FORFAITS.decouverte;
  let c = Math.round(montant * f.commission);
  if (f.plafondCommission) c = Math.min(c, f.plafondCommission);
  return c;
}

/** Limites du forfait (0 = illimité). */
function limitesDe(e) {
  const a = e && e.abonnement;
  const f = (a && FORFAITS[a.forfait]) || FORFAITS.decouverte;
  return f.limites;
}

/** Vue publique des forfaits, pour la page d'inscription. */
function catalogueForfaits() {
  return {
    moisEssai: MOIS_ESSAI,
    joursEssai: JOURS_ESSAI,
    forfaits: CLES_FORFAITS.map((cle) => Object.assign({ cle }, FORFAITS[cle]))
  };
}

/** Le forfait de l'entreprise ouvre-t-il ce module ? */
function forfaitAutorise(entreprise, module) {
  const cle = (entreprise && entreprise.abonnement && entreprise.abonnement.forfait) || 'decouverte';
  const f = FORFAITS[cle] || FORFAITS.decouverte;
  // Un forfait sans liste déclarée n'impose aucune restriction
  if (!Array.isArray(f.modules)) return true;
  return f.modules.includes(module);
}

/**
 * Vérifie qu'une création reste dans les limites du forfait.
 * Retourne null si c'est permis, sinon un message explicite.
 */
function limiteAtteinte(entreprise, quoi, nombreActuel) {
  const l = limitesDe(entreprise);
  const max = l[quoi];
  if (!max) return null;                    // 0 = illimité
  if (nombreActuel < max) return null;
  const noms = { services: 'services', employes: "membres d'équipe", produits: 'produits' };
  return `Votre forfait est limité à ${max} ${noms[quoi] || quoi}. Passez à un forfait supérieur pour en ajouter davantage.`;
}

/** Ce qui est ouvert et ce qui reste à débloquer, pour l'affichage. */
function etatFonctions(entreprise, nombres) {
  const cle = (entreprise && entreprise.abonnement && entreprise.abonnement.forfait) || 'decouverte';
  const f = FORFAITS[cle] || FORFAITS.decouverte;
  const l = limitesDe(entreprise);
  return {
    forfait: cle,
    nom: f.nom,
    modules: Array.isArray(f.modules) ? f.modules : null,
    limites: Object.entries(l).filter(([, max]) => max > 0).map(([quoi, max]) => ({
      quoi, max, utilise: (nombres && nombres[quoi]) || 0
    }))
  };
}

module.exports = {
  forfaitAutorise, limiteAtteinte, etatFonctions,
  FORFAITS, CLES_FORFAITS, MOIS_ESSAI, JOURS_ESSAI,
  nouvelAbonnement, etatAbonnement, commissionPour, limitesDe,
  catalogueForfaits, ajouterMois
};
