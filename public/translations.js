// 🌐 Traductions Français / Kreyòl Ayisyen
const translations = {
  fr: {
    // Navigation
    'nav.accueil': 'Accueil',
    'nav.rechercher': 'Rechercher',
    'nav.connexion': 'Connexion',
    'nav.inscription': 'Inscription',
    'nav.deconnexion': 'Déconnexion',
    'nav.dashboard': 'Tableau de bord',
    
    // Accueil
    'home.titre': 'Réservez vos rendez-vous en ligne',
    'home.soustitre': 'Trouvez et réservez des services près de chez vous',
    'home.rechercher_service': 'Rechercher un service...',
    'home.filtre_hotels': '🏨 Hôtels & Restaurants',
    'home.aucun_resultat': 'Aucun résultat trouvé',
    'home.voir_plus': 'Voir plus',
    'home.avis_clients': 'Avis clients',
    'home.note': 'Note',
    'home.sur_5': 'sur 5',
    
    // Réservation RDV
    'rdv.titre': 'Réserver un rendez-vous',
    'rdv.etape': 'Étape {{n}} sur 4',
    'rdv.choisir_service': 'Choisissez un service',
    'rdv.choisir_date': 'Choisissez une date',
    'rdv.voir_creneaux': 'Voir les créneaux',
    'rdv.choisir_heure': 'Choisissez une heure',
    'rdv.coordonnees': 'Vos coordonnées',
    'rdv.nom': 'Nom complet',
    'rdv.telephone': 'Téléphone (WhatsApp)',
    'rdv.email': 'Email (recommandé)',
    'rdv.confirmer': 'Confirmer le rendez-vous',
    'rdv.enregistre': 'Rendez-vous enregistré !',
    'rdv.paiement_requis': '✅ Paiement requis',
    'rdv.montant': 'Montant à payer',
    'rdv.payer': '💳 Payer maintenant',
    'rdv.retour': '← Retour',
    'rdv.demande_envoyee': 'Demande envoyée !',
    
    // Séjour
    'sejour.titre': 'Réserver un séjour',
    'sejour.chambre': 'Chambre',
    'sejour.arrivee': 'Arrivée',
    'sejour.depart': 'Départ',
    'sejour.nuits': 'nuit(s)',
    'sejour.personnes': 'personne(s)',
    'sejour.prix_nuit': 'par nuit',
    'sejour.total': 'Total',
    'sejour.confirmer': 'Confirmer la demande de séjour',
    
    // Services
    'service.nom': 'Service',
    'service.duree': 'Durée',
    'service.prix': 'Prix',
    'service.min': 'min',
    'service.choisir': 'Choisir',
    
    // Portefeuille
    'portefeuille.titre': '💰 Portefeuille & Paiements',
    'portefeuille.solde': 'Solde disponible',
    'portefeuille.bloque': 'Bloqué (retraits en cours)',
    'portefeuille.total_recu': 'Total reçu',
    'portefeuille.total_retire': 'Total retiré',
    'portefeuille.historique': 'Historique des paiements',
    'portefeuille.date': 'Date',
    'portefeuille.type': 'Type',
    'portefeuille.montant_brut': 'Montant brut',
    'portefeuille.commission': 'Commission',
    'portefeuille.net': 'Net',
    'portefeuille.statut': 'Statut',
    'portefeuille.rdv': '📅 RDV',
    'portefeuille.sejour': '🛏️ Séjour',
    'portefeuille.confirme': 'Confirmé',
    'portefeuille.en_attente': 'En attente',
    
    // Retrait
    'retrait.titre': 'Demander un retrait',
    'retrait.montant': 'Montant (HTG)',
    'retrait.methode': 'Méthode',
    'retrait.moncash': 'MonCash',
    'retrait.natcash': 'NatCash',
    'retrait.destinataire': 'ID ou téléphone destinataire',
    'retrait.min': 'Minimum 1000 HTG',
    'retrait.demander': 'Demander le retrait',
    'retrait.obligatoires': 'Tous les champs obligatoires',
    'retrait.insuffisant': 'Solde insuffisant',
    'retrait.success': 'Demande de retrait envoyée. Vérifiez votre email de confirmation.',
    
    // Connexion
    'login.titre': 'Connexion',
    'login.email': 'Email',
    'login.mdp': 'Mot de passe',
    'login.connecter': 'Se connecter',
    'login.inscrir': 'Créer un compte',
    'login.erreur': 'Email ou mot de passe incorrect',
    
    // Inscription
    'signup.titre': 'Créer une entreprise',
    'signup.nom_entreprise': 'Nom de l\'entreprise',
    'signup.categorie': 'Catégorie',
    'signup.adresse': 'Adresse',
    'signup.telephone': 'Téléphone',
    'signup.nom_responsable': 'Nom du responsable',
    'signup.email': 'Email',
    'signup.mdp': 'Mot de passe',
    'signup.inscrire': 'S\'inscrire',
    'signup.connexion': 'J\'ai déjà un compte',
    
    // Dashboard
    'dashboard.services': '📅 Services',
    'dashboard.chambres': '🛏️ Chambres & Séjours',
    'dashboard.portefeuille': '💰 Portefeuille & Paiements',
    'dashboard.employes': '👥 Employés',
    'dashboard.avis': '⭐ Avis',
    'dashboard.profil': '🏢 Profil',
    'dashboard.parametres': '⚙️ Paramètres',
    'dashboard.rendez_vous': '📋 Rendez-vous',
    'dashboard.sejours': '🛏️ Séjours',
    
    // Messages WhatsApp
    'whatsapp.demande_recue': 'Demande reçue',
    'whatsapp.confirme': 'Rendez-vous confirmé',
    'whatsapp.sejour_confirme': 'Séjour confirmé',
    'whatsapp.rappel': 'Rappel rendez-vous',
    
    // Boutons génériques
    'btn.retour': '← Retour',
    'btn.suivant': 'Suivant',
    'btn.confirmer': 'Confirmer',
    'btn.annuler': 'Annuler',
    'btn.envoyer': 'Envoyer',
    'btn.ajouter': 'Ajouter',
    'btn.modifier': 'Modifier',
    'btn.supprimer': 'Supprimer',
    'btn.payer': '💳 Payer',
    
    // Messages
    'msg.merci': 'Merci !',
    'msg.succes': 'Succès !',
    'msg.erreur': 'Erreur',
    'msg.chargement': 'Chargement...',
    'msg.veuillez_attendre': 'Veuillez attendre...',
    'msg.obligatoire': '(obligatoire)',
    'msg.optionnel': '(optionnel)',
  },
  
  ht: {
    // Navigation
    'nav.accueil': 'Akèy',
    'nav.rechercher': 'Rechèche',
    'nav.connexion': 'Koneksyon',
    'nav.inscription': 'Enskripsyon',
    'nav.deconnexion': 'Dekoneksyon',
    'nav.dashboard': 'Tablo Bò',
    
    // Accueil
    'home.titre': 'Rezève randevou ou online',
    'home.soustitre': 'Gade ak rezève sèvis tou pre ou',
    'home.rechercher_service': 'Rechèche yon sèvis...',
    'home.filtre_hotels': '🏨 Otèl & Restoran',
    'home.aucun_resultat': 'Anyen pa jwenn',
    'home.voir_plus': 'Wè plis',
    'home.avis_clients': 'Avizavisyon klyan yo',
    'home.note': 'Nòt',
    'home.sur_5': 'sou 5',
    
    // Réservation RDV
    'rdv.titre': 'Rezève yon randevou',
    'rdv.etape': 'Etap {{n}} sou 4',
    'rdv.choisir_service': 'Chwazi yon sèvis',
    'rdv.choisir_date': 'Chwazi yon dat',
    'rdv.voir_creneaux': 'Wè ta yo',
    'rdv.choisir_heure': 'Chwazi yon lè',
    'rdv.coordonnees': 'Enfomasyon ou yo',
    'rdv.nom': 'Non konplet',
    'rdv.telephone': 'Nimewo (WhatsApp)',
    'rdv.email': 'Email (rekòmande)',
    'rdv.confirmer': 'Konfime randevou a',
    'rdv.enregistre': 'Randevou anrejistre !',
    'rdv.paiement_requis': '✅ Peye oblije',
    'rdv.montant': 'Montan pou peye',
    'rdv.payer': '💳 Peye kounye a',
    'rdv.retour': '← Tounen',
    'rdv.demande_envoyee': 'Demad voye !',
    
    // Séjour
    'sejour.titre': 'Rezève yon sejou',
    'sejour.chambre': 'Chanm',
    'sejour.arrivee': 'Arive',
    'sejour.depart': 'Ale',
    'sejour.nuits': 'nwit',
    'sejour.personnes': 'moun',
    'sejour.prix_nuit': 'pa nwit',
    'sejour.total': 'Total',
    'sejour.confirmer': 'Konfime demad sejou a',
    
    // Services
    'service.nom': 'Sèvis',
    'service.duree': 'Dire',
    'service.prix': 'Pri',
    'service.min': 'min',
    'service.choisir': 'Chwazi',
    
    // Portefeuille
    'portefeuille.titre': '💰 Pòtfèy & Peyman',
    'portefeuille.solde': 'Solde disponib',
    'portefeuille.bloque': 'Bloke (reti an kours)',
    'portefeuille.total_recu': 'Total resib',
    'portefeuille.total_retire': 'Total reti',
    'portefeuille.historique': 'Istwa peyman yo',
    'portefeuille.date': 'Dat',
    'portefeuille.type': 'Tip',
    'portefeuille.montant_brut': 'Montan bri',
    'portefeuille.commission': 'Komisyon',
    'portefeuille.net': 'Net',
    'portefeuille.statut': 'Estati',
    'portefeuille.rdv': '📅 Randevou',
    'portefeuille.sejour': '🛏️ Sejou',
    'portefeuille.confirme': 'Konfime',
    'portefeuille.en_attente': 'Nan atant',
    
    // Retrait
    'retrait.titre': 'Mande yon reti',
    'retrait.montant': 'Montan (HTG)',
    'retrait.methode': 'Metòd',
    'retrait.moncash': 'MonCash',
    'retrait.natcash': 'NatCash',
    'retrait.destinataire': 'ID oswa nimewo destinatè a',
    'retrait.min': 'Minimom 1000 HTG',
    'retrait.demander': 'Mande reti a',
    'retrait.obligatoires': 'Tout jaden obligatwa yo',
    'retrait.insuffisant': 'Solde pa ase',
    'retrait.success': 'Demad reti a voye. Verifye email konfirmasyon ou a.',
    
    // Connexion
    'login.titre': 'Koneksyon',
    'login.email': 'Email',
    'login.mdp': 'Modpas',
    'login.connecter': 'Konekte',
    'login.inscrir': 'Kreye yon kont',
    'login.erreur': 'Email oswa modpas ki pa bon',
    
    // Inscription
    'signup.titre': 'Kreye yon antrepriz',
    'signup.nom_entreprise': 'Non antrepriz la',
    'signup.categorie': 'Kategori',
    'signup.adresse': 'Adrès',
    'signup.telephone': 'Nimewo telefòn',
    'signup.nom_responsable': 'Non respònsab la',
    'signup.email': 'Email',
    'signup.mdp': 'Modpas',
    'signup.inscrire': 'Enskrip',
    'signup.connexion': 'Mwen gen deja yon kont',
    
    // Dashboard
    'dashboard.services': '📅 Sèvis',
    'dashboard.chambres': '🛏️ Chanm & Sejou',
    'dashboard.portefeuille': '💰 Pòtfèy & Peyman',
    'dashboard.employes': '👥 Travayè',
    'dashboard.avis': '⭐ Avizavisyon',
    'dashboard.profil': '🏢 Profil',
    'dashboard.parametres': '⚙️ Paramèt',
    'dashboard.rendez_vous': '📋 Randevou',
    'dashboard.sejours': '🛏️ Sejou',
    
    // Messages WhatsApp
    'whatsapp.demande_recue': 'Demad resib',
    'whatsapp.confirme': 'Randevou konfime',
    'whatsapp.sejour_confirme': 'Sejou konfime',
    'whatsapp.rappel': 'Ranpèl randevou',
    
    // Boutons génériques
    'btn.retour': '← Tounen',
    'btn.suivant': 'Vin swiv',
    'btn.confirmer': 'Konfime',
    'btn.annuler': 'Anile',
    'btn.envoyer': 'Voye',
    'btn.ajouter': 'Ajoute',
    'btn.modifier': 'Modifye',
    'btn.supprimer': 'Efase',
    'btn.payer': '💳 Peye',
    
    // Messages
    'msg.merci': 'Mèsi !',
    'msg.succes': 'Siksè !',
    'msg.erreur': 'Erè',
    'msg.chargement': 'Ap chaje...',
    'msg.veuillez_attendre': 'Tanpri tann...',
    'msg.obligatoire': '(obligatwa)',
    'msg.optionnel': '(opsyonèl)',
  }
};

// Fonction pour obtenir la traduction
function t(key, lang = null) {
  const langue = lang || (localStorage.getItem('langue') || 'fr');
  const parts = key.split('.');
  let text = translations[langue];
  
  for (let part of parts) {
    if (text && typeof text === 'object') {
      text = text[part];
    } else {
      return key; // Retourne la clé si traduction non trouvée
    }
  }
  
  return text || key;
}

// Fonction pour changer de langue
function changerLangue(langue) {
  localStorage.setItem('langue', langue);
  document.documentElement.lang = langue;
  document.body.dataset.langue = langue;
  // Appliquer traductions sans recharger
  appliquerTraductions(langue);
  // Mettre à jour le bouton langue
  const btn = document.getElementById('btnLangue');
  if (btn) {
    btn.textContent = langue === 'fr' ? '🌐 HT' : '🌐 FR';
  }
}


// Fonction pour appliquer les traductions automatiquement
function appliquerTraductions(lang = null) {
  const langue = lang || getLangue();
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key, langue);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key, langue);
  });
}

// Modifier la fonction changerLangue pour appliquer traductions
const changerLangueOriginal = window.changerLangue;


// Obtenir la langue courante
function getLangue() {
  return localStorage.getItem('langue') || 'fr';
}

// Initialiser la langue au chargement
window.addEventListener('DOMContentLoaded', () => {
  const langue = getLangue();
  document.documentElement.lang = langue;
  document.body.dataset.langue = langue;
});
