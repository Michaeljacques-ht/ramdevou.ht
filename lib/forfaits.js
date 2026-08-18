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

const MOIS_ESSAI = 6;

const FORFAITS = {
  decouverte: {
    nom: { fr: 'Découverte', ht: 'Dekouvèt' },
    prixMois: 0,
    commission: 0.10,
    resume: {
      fr: 'Pour démarrer sans engagement.',
      ht: 'Pou kòmanse san angajman.'
    },
    limites: { services: 3, employes: 1, produits: 20 },
    avantages: {
      fr: ['Page publique', 'Rendez-vous en ligne', "Jusqu'à 3 services", '1 membre d\'équipe', 'Commission 10 %'],
      ht: ['Paj piblik', 'Randevou an liy', 'Jiska 3 sèvis', '1 moun nan ekip la', 'Komisyon 10 %']
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
    limites: { services: 0, employes: 0, produits: 0 },   // 0 = sans limite
    avantages: {
      fr: ['Services et équipe illimités', 'Catalogue et commandes', 'Rappels WhatsApp', 'Statistiques', 'Commission 5 %'],
      ht: ['Sèvis ak ekip san limit', 'Katalòg ak kòmand', 'Ranpèl WhatsApp', 'Estatistik', 'Komisyon 5 %']
    }
  },
  hotellerie: {
    nom: { fr: 'Hôtellerie & Commerce', ht: 'Otèl & Komès' },
    prixMois: 4000,
    commission: 0.03,
    plafondCommission: 500,
    resume: {
      fr: 'Pour les hôtels, restaurants et commerces à fort volume.',
      ht: 'Pou otèl, restoran ak komès ki gen anpil vant.'
    },
    limites: { services: 0, employes: 0, produits: 0 },
    avantages: {
      fr: ['Tout le forfait Pro', 'Chambres, séjours et tarifs', 'Restaurant et bar', 'Livraison et Taksi Konekte', 'Commission 3 %, plafonnée à 500 HTG'],
      ht: ['Tout sa Pro genyen', 'Chanm, sejou ak tarif', 'Restoran ak ba', 'Livrezon ak Taksi Konekte', 'Komisyon 3 %, maksimòm 500 HTG']
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
  const fin = ajouterMois(debut, MOIS_ESSAI);
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
    forfaits: CLES_FORFAITS.map((cle) => Object.assign({ cle }, FORFAITS[cle]))
  };
}

module.exports = {
  FORFAITS, CLES_FORFAITS, MOIS_ESSAI,
  nouvelAbonnement, etatAbonnement, commissionPour, limitesDe,
  catalogueForfaits, ajouterMois
};
