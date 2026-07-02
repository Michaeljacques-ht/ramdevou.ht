<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Administration — Randevou.ht</title>
<link rel="stylesheet" href="/style.css">
<style>
body { background: var(--gris-clair); }
.entete { background: var(--marine); color: #fff; padding: 16px 0; }
.principal { max-width: 1060px; margin: 24px auto; padding: 0 20px; }
.cartes-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
.stat { background: #fff; border: 1px solid var(--bordure); border-radius: 14px; padding: 16px 18px; }
.stat .valeur { font-size: 26px; font-weight: 800; }
@media (max-width: 800px){ .cartes-stats { grid-template-columns: 1fr 1fr; } }
</style>
</head>
<body>
<header class="entete">
  <div class="conteneur flex entre">
    <a class="logo" style="color:#fff" href="/"><img src="/logo-marque.png" alt="" style="height:32px;width:auto;background:#fff;border-radius:8px;padding:2px">Randevou.ht <span class="badge badge-bleu" style="margin-left:6px">Admin</span></a>
    <button class="btn btn-contour btn-petit" onclick="deconnexion()">Se déconnecter</button>
  </div>
</header>

<main class="principal">
  <h1 style="font-size:20px" class="mb">Administration de la plateforme</h1>
  <div class="cartes-stats" id="stats"></div>

  <div class="carte mt"><div class="carte-corps">
    <div class="flex entre" style="flex-wrap:wrap;gap:10px">
      <h2 style="font-size:16px">Entreprises inscrites</h2>
      <select id="filtre" style="width:auto" onchange="dessiner()">
        <option value="">Toutes</option>
        <option value="en_attente">En attente de validation</option>
        <option value="approuvee">Approuvées</option>
        <option value="suspendue">Suspendues</option>
      </select>
    </div>
    <div style="overflow:auto" class="mt"><table id="tableEnt"></table></div>
  </div></div>
</main>

<script src="/app.js"></script>
<script>
let entreprises = [];
const BADGE_ENT = {
  approuvee: '<span class="badge badge-vert">Approuvée</span>',
  en_attente: '<span class="badge badge-orange">En attente</span>',
  suspendue: '<span class="badge badge-rouge">Suspendue</span>'
};

async function deconnexion(){ await api('/api/deconnexion','POST'); location.href='/'; }

async function charger(){
  try {
    const moi = await api('/api/moi');
    if (moi.role !== 'admin') { location.href = '/dashboard.html'; return; }
  } catch { location.href='/connexion.html'; return; }
  const s = await api('/api/admin/stats');
  document.getElementById('stats').innerHTML = `
    <div class="stat"><span class="petit muet">Entreprises</span><div class="valeur">${s.entreprises}</div></div>
    <div class="stat"><span class="petit muet">En attente</span><div class="valeur" style="color:var(--orange)">${s.enAttente}</div></div>
    <div class="stat"><span class="petit muet">Rendez-vous</span><div class="valeur">${s.rendezvous}</div></div>
    <div class="stat"><span class="petit muet">Avis</span><div class="valeur">${s.avis}</div></div>
    <div class="stat"><span class="petit muet">Utilisateurs</span><div class="valeur">${s.utilisateurs}</div></div>`;
  entreprises = await api('/api/admin/entreprises');
  dessiner();
}

function dessiner(){
  const f = document.getElementById('filtre').value;
  const liste = entreprises.filter(e=>!f || e.statut===f);
  document.getElementById('tableEnt').innerHTML =
    '<tr><th>Entreprise</th><th>Catégorie</th><th>Contact</th><th>Activité</th><th>Plan</th><th>Statut</th><th>Actions</th></tr>' +
    (liste.length ? liste.map(e=>`
    <tr>
      <td><strong>${ech(e.nom)}</strong><div class="petit muet"><a target="_blank" href="/${e.slug}">/${e.slug} ↗</a></div></td>
      <td>${ICONES_CAT[e.categorie]||'✨'} ${ech(e.categorie)}</td>
      <td class="petit">${ech(e.email)}<br>${ech(e.telephone)||'—'}</td>
      <td class="petit">${e.totalRdv} rendez-vous<br><span class="etoiles">${etoiles(e.note)}</span> (${e.total})</td>
      <td>
        <select onchange="majEnt('${e.id}',{plan:this.value})" style="width:auto;padding:5px 8px;font-size:13px">
          <option value="gratuit" ${e.plan==='gratuit'?'selected':''}>Gratuit</option>
          <option value="premium" ${e.plan==='premium'?'selected':''}>Premium</option>
        </select>
      </td>
      <td>${BADGE_ENT[e.statut]}</td>
      <td><div class="flex" style="gap:6px">
        ${e.statut!=='approuvee' ? `<button class="btn btn-succes btn-petit" onclick="majEnt('${e.id}',{statut:'approuvee'})">Approuver</button>` : ''}
        ${e.statut==='approuvee' ? `<button class="btn btn-danger btn-petit" onclick="majEnt('${e.id}',{statut:'suspendue'})">Suspendre</button>` : ''}
      </div></td>
    </tr>`).join('') : '<tr><td colspan="7" class="muet centre">Aucune entreprise pour ce filtre.</td></tr>');
}

async function majEnt(id, donnees){
  await api('/api/admin/entreprises/'+id,'PUT',donnees);
  toast('Entreprise mise à jour.');
  entreprises = await api('/api/admin/entreprises');
  dessiner();
}

charger();
</script>
</body>
</html>
