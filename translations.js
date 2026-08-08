/* ==========================================================
   Randevou.ht — Système de design
   Structure reprise d'EDUCA Formation : palette marine/bleu/
   orange, cartes à grand rayon, boutons en dégradé, badges en
   pilule, et la signature « barre dégradée + titre dégradé ».
   Les noms de classes d'origine sont conservés.
   ========================================================== */
:root {
  /* — Palette — */
  --marine: #0B2C6B;
  --marine-2: #071E4C;
  --bleu: #2563EB;
  --bleu-vif: #3B82F6;
  --bleu-fonce: #1E40AF;
  --bleu-clair: #EEF3FE;
  --orange: #F26B21;
  --orange-fond: #FFF0E6;
  --violet: #6D4AC4;
  --vert: #0EA46B;
  --vert-clair: #12B76A;
  --vert-fond: #E3F7EF;
  --rouge: #E23D3D;
  --rouge-fond: #FDEBEB;
  --ambre: #F5A623;

  /* — Encre et surfaces — */
  --encre: #16233C;
  --texte: #3D4A5C;
  --gris: #6B7789;
  --gris-clair: #F1F4F9;
  --bordure: #E8ECF3;
  --fond: #F7F9FC;

  /* — Rayons — */
  --r-carte: 20px;
  --r-champ: 12px;
  --r-pilule: 14px;
  --rayon: 20px;

  /* — Ombres et dégradés — */
  --ombre: 0 10px 30px rgba(11,44,107,.08);
  --ombre-f: 0 16px 40px rgba(11,44,107,.14);
  --degrade: linear-gradient(90deg, #0B2C6B 0%, #2563EB 100%);
  --degrade-accent: linear-gradient(90deg, #0B2C6B 0%, #2563EB 55%, #F26B21 100%);
}

* { box-sizing: border-box; margin: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif;
  color: var(--texte); background: var(--fond);
  line-height: 1.6; font-size: 15px; -webkit-font-smoothing: antialiased;
}
a { color: var(--bleu); text-decoration: none; font-weight: 600; }
a:hover { text-decoration: underline; }
img { max-width: 100%; }
h1, h2, h3 { color: var(--encre); line-height: 1.2; letter-spacing: -.02em; font-weight: 800; }
h2 { letter-spacing: -.01em; font-weight: 750; }

.conteneur { max-width: 1180px; margin: 0 auto; padding: 0 22px; }

/* ---------- Boutons ---------- */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 12px 22px; border-radius: var(--r-champ); border: 0;
  font-weight: 700; font-size: 14.5px; cursor: pointer; font-family: inherit;
  white-space: nowrap; transition: transform .12s, box-shadow .12s, background .12s;
}
.btn:hover { text-decoration: none; }
.btn:focus-visible { outline: 3px solid var(--orange); outline-offset: 3px; }
.btn-primaire { background: var(--degrade); color: #fff; box-shadow: 0 6px 16px rgba(11,44,107,.20); }
.btn-primaire:hover { transform: translateY(-1px); box-shadow: var(--ombre-f); color: #fff; }
.btn-contour { background: #fff; color: var(--marine); border: 1.5px solid var(--bordure); }
.btn-contour:hover { background: var(--bleu-clair); border-color: var(--bleu); color: var(--marine); }
.btn-fantome { background: transparent; color: var(--texte); }
.btn-fantome:hover { background: var(--gris-clair); color: var(--encre); }
.btn-succes { background: linear-gradient(90deg, #07845A, #0EA46B); color: #fff; box-shadow: 0 6px 16px rgba(7,132,90,.22); }
.btn-succes:hover { transform: translateY(-1px); color: #fff; }
.btn-danger { background: var(--rouge-fond); color: #B02121; }
.btn-danger:hover { background: #FBDCDC; }
.btn-petit { padding: 8px 15px; font-size: 13px; border-radius: 10px; }
.btn-large { padding: 14px 26px; font-size: 15.5px; }
.btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }

/* ---------- Badges ---------- */
.badge {
  display: inline-block; padding: 3px 12px; border-radius: 99px;
  font-size: 12px; font-weight: 700; letter-spacing: .01em;
}
.badge-bleu { background: var(--bleu-clair); color: var(--marine); }
.badge-vert { background: var(--vert-fond); color: #07684A; }
.badge-orange { background: var(--orange-fond); color: #C4520E; }
.badge-rouge { background: var(--rouge-fond); color: #B02121; }
.badge-gris { background: var(--gris-clair); color: var(--gris); }
.badge-violet { background: #EFEAFB; color: #4B2E9E; }

/* ---------- Cartes ---------- */
.carte {
  background: #fff; border: 1px solid var(--bordure);
  border-radius: var(--r-carte); box-shadow: var(--ombre);
}
.carte-corps { padding: 22px; }
.panneau {
  background: #fff; border: 1px solid var(--bordure);
  border-radius: var(--r-champ); padding: 18px; margin-bottom: 14px;
}
/* Bandeau dégradé en tête de carte — signature EDUCA */
.carte-signature { position: relative; overflow: hidden; }
.carte-signature::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 5px;
  background: var(--degrade-accent);
}

/* ---------- Éléments de signature ---------- */
.eyebrow {
  display: inline-block; background: var(--bleu-clair); border-radius: 99px;
  padding: 6px 15px; font-size: 11px; font-weight: 800; letter-spacing: .16em;
  color: var(--marine); text-transform: uppercase; margin-bottom: 18px;
}
.titre-degrade {
  background: linear-gradient(90deg, #1E5FE0, #6D4AC4);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.titre-degrade-2 {
  background: linear-gradient(90deg, #6D4AC4, #F26B21);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}

/* ---------- Formulaires ---------- */
label { display: block; font-weight: 700; font-size: 13px; margin: 15px 0 6px; color: var(--encre); }
input, select, textarea {
  width: 100%; padding: 12px 14px; border: 1.5px solid var(--bordure);
  border-radius: var(--r-champ); font-family: inherit; font-size: 15px;
  background: #fff; color: var(--texte);
}
input:focus, select:focus, textarea:focus {
  outline: 0; border-color: var(--bleu); box-shadow: 0 0 0 4px rgba(37,99,235,.12);
}
input::placeholder, textarea::placeholder { color: #A7B0BE; }
.aide { font-size: 12px; color: var(--gris); margin-top: 5px; }
.champ-erreur { color: var(--rouge); font-size: 13px; margin-top: 8px; min-height: 18px; }

/* ---------- Alertes ---------- */
.alerte { padding: 14px 18px; border-radius: var(--r-champ); margin-bottom: 18px; font-size: 14px; font-weight: 600; }
.alerte-ok { background: var(--vert-fond); color: #07684A; }
.alerte-ko { background: var(--rouge-fond); color: #B02121; }

/* ---------- Barre de navigation publique ---------- */
.nav {
  position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,.96);
  backdrop-filter: blur(8px); border-bottom: 1px solid var(--bordure);
  box-shadow: 0 1px 3px rgba(11,44,107,.04);
}
.nav-int { display: flex; align-items: center; gap: 26px; height: 70px; }
.logo {
  display: flex; align-items: center; gap: 9px;
  font-size: 20px; font-weight: 800; letter-spacing: -.01em; color: var(--marine);
}
.logo:hover { text-decoration: none; }
.logo-icone {
  width: 38px; height: 38px; border-radius: 12px; background: var(--bleu-clair);
  display: grid; place-items: center; font-size: 18px;
}
.nav-liens { display: flex; gap: 6px; margin-left: 8px; }
.nav-liens a {
  color: var(--texte); font-weight: 600; font-size: 14px;
  padding: 8px 13px; border-radius: var(--r-pilule);
}
.nav-liens a:hover, .nav-liens a.actif {
  color: var(--marine); background: var(--bleu-clair); text-decoration: none;
}
.nav-droite { margin-left: auto; display: flex; gap: 10px; align-items: center; }
@media (max-width: 820px) { .nav-liens { display: none; } }

/* ---------- Tableaux ---------- */
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th {
  text-align: left; color: var(--gris); font-size: 11.5px; text-transform: uppercase;
  letter-spacing: .08em; font-weight: 700; padding: 11px 12px;
  border-bottom: 1.5px solid var(--bordure);
}
td { padding: 13px 12px; border-bottom: 1px solid var(--bordure); vertical-align: middle; }
td.num { text-align: right; font-variant-numeric: tabular-nums; }
tr:last-child td { border-bottom: none; }

/* ---------- Utilitaires ---------- */
.grille { display: grid; gap: 18px; }
.g2 { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
.g3 { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.g4 { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.flex { display: flex; align-items: center; gap: 10px; }
.entre { justify-content: space-between; }
.muet { color: var(--gris); }
.petit { font-size: 13px; }
.centre { text-align: center; }
.mt { margin-top: 16px; }
.mb { margin-bottom: 16px; }
.avatar {
  width: 38px; height: 38px; border-radius: 99px; background: var(--degrade);
  color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 14px;
  flex-shrink: 0; box-shadow: 0 4px 12px rgba(37,99,235,.28);
}
.etoiles { color: var(--ambre); letter-spacing: 2px; }

/* ---------- Toast ---------- */
#toast {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(80px);
  background: var(--marine-2); color: #fff; padding: 13px 22px; border-radius: var(--r-champ);
  font-size: 14px; opacity: 0; transition: .3s; z-index: 200;
  box-shadow: 0 12px 34px rgba(7,30,76,.34); max-width: 90vw;
}
#toast.visible { opacity: 1; transform: translateX(-50%) translateY(0); }

/* ---------- Modale ---------- */
.voile {
  position: fixed; inset: 0; background: rgba(11,44,107,.48); z-index: 100;
  display: none; align-items: flex-start; justify-content: center;
  padding: 40px 16px; overflow: auto;
}
.voile.ouvert { display: flex; }
.modale {
  background: #fff; border-radius: var(--r-carte); width: 100%; max-width: 480px;
  padding: 26px; box-shadow: 0 24px 64px rgba(7,30,76,.32);
}

@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
