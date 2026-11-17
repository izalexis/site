/* Trouver mon bureau de vote : Base Adresse Nationale + points d'adresses du REU (INSEE) */
(function () {
  var champ = document.getElementById('bv-adresse');
  if (!champ) return;
  var sugg = document.getElementById('bv-suggestions');
  var resultat = document.getElementById('bv-resultat');
  var bureaux = null, codes = null, minuterie, propositions = [], choixIdx = -1;

  var pret = Promise.all([AI.json('data/bureaux.json'), AI.json('data/communes.json')]).then(function (r) {
    bureaux = r[0];
    codes = {};
    r[1].communes.forEach(function (c) { codes[c.code] = c.nom; });
  });

  function fermer() { sugg.hidden = true; champ.setAttribute('aria-expanded', 'false'); choixIdx = -1; }

  function chercher(q) {
    pret.then(function () {
      return fetch('https://api-adresse.data.gouv.fr/search/?limit=10&autocomplete=1&q=' + encodeURIComponent(q));
    }).then(function (r) { return r.json(); }).then(function (d) {
      propositions = d.features.filter(function (f) { return codes[f.properties.citycode]; }).slice(0, 6);
      if (!propositions.length) {
        sugg.innerHTML = '<li class="bv-hors">Aucune adresse trouvée dans la 3<sup>e</sup> circonscription.</li>';
      } else {
        sugg.innerHTML = propositions.map(function (f, i) {
          return '<li role="option" id="bv-o' + i + '" data-i="' + i + '">' + AI.esc(f.properties.label) + '</li>';
        }).join('');
      }
      sugg.hidden = false; champ.setAttribute('aria-expanded', 'true');
    }).catch(function () {
      sugg.innerHTML = '<li class="bv-hors">Service d\'adresses indisponible, réessayez.</li>'; sugg.hidden = false;
    });
  }

  function trouver(f) {
    var cc = f.properties.citycode, lon = f.geometry.coordinates[0], lat = f.geometry.coordinates[1];
    var k = Math.cos(lat * Math.PI / 180), meilleur = null, dmin = Infinity;
    Object.keys(bureaux).forEach(function (id) {
      if (id.indexOf(cc + '_') !== 0) return;
      bureaux[id].p.forEach(function (p) {
        var dx = (p[0] - lon) * k, dy = p[1] - lat, d = dx * dx + dy * dy;
        if (d < dmin) { dmin = d; meilleur = id; }
      });
    });
    if (!meilleur) {
      resultat.innerHTML = '<div class="bv-res bv-erreur"><p>Je n\'ai pas trouvé de bureau pour cette adresse. Contactez votre mairie.</p></div>';
      return;
    }
    var b = bureaux[meilleur];
    var nb = Object.keys(bureaux).filter(function (id) { return id.indexOf(cc + '_') === 0; }).length;
    var lieu = [b.l, b.a, b.c].filter(Boolean).join(', ');
    resultat.innerHTML =
      '<div class="bv-res">' +
      '<p class="bv-res-pour">Pour le ' + AI.esc(f.properties.label) + '</p>' +
      '<p class="bv-res-num">Bureau n°&nbsp;' + b.n + '</p>' +
      '<p class="bv-res-lieu">' + AI.esc(b.l || 'Lieu de vote') + '</p>' +
      '<p class="bv-res-adr">' + AI.esc([b.a, b.c].filter(Boolean).join(' · ')) + '</p>' +
      (nb === 1 ? '<p class="bv-res-note">C\'est l\'unique bureau de ' + AI.esc(b.c) + '.</p>' : '<p class="bv-res-note">' + AI.esc(b.c) + ' compte ' + nb + ' bureaux. Résultat indicatif établi d\'après les adresses des électeurs (INSEE)&nbsp;: votre carte électorale fait foi.</p>') +
      '<a class="btn btn-rouge btn-sm" target="_blank" rel="noopener" href="https://www.openstreetmap.org/search?query=' + encodeURIComponent(lieu) + '">Voir sur une carte →</a>' +
      '</div>';
  }

  function choisir(i) {
    var f = propositions[i]; if (!f) return;
    champ.value = f.properties.label; fermer(); trouver(f);
  }

  champ.addEventListener('input', function () {
    clearTimeout(minuterie);
    var q = champ.value.trim();
    if (q.length < 4) { fermer(); return; }
    minuterie = setTimeout(function () { chercher(q); }, 250);
  });
  champ.addEventListener('keydown', function (e) {
    var items = sugg.querySelectorAll('[role=option]');
    if (sugg.hidden || !items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      choixIdx = (choixIdx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach(function (x, j) { x.classList.toggle('sel', j === choixIdx); });
      champ.setAttribute('aria-activedescendant', 'bv-o' + choixIdx);
    } else if (e.key === 'Enter') { e.preventDefault(); choisir(choixIdx < 0 ? 0 : choixIdx); }
    else if (e.key === 'Escape') { fermer(); }
  });
  sugg.addEventListener('mousedown', function (e) {
    var li = e.target.closest('[role=option]'); if (li) { e.preventDefault(); choisir(+li.dataset.i); }
  });
  champ.addEventListener('blur', function () { setTimeout(fermer, 150); });
})();
