/* Page « Dans les médias » : passages racontés en stories, filtrables par média */
(function () {
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var grille = document.getElementById('m-grille'), filtres = document.getElementById('m-filtres');
  function date(iso) { var p = iso.split('-'); return (+p[2] === 1 ? '1er' : +p[2]) + ' ' + MOIS[p[1] - 1] + ' ' + p[0]; }
  // « Sud Radio et BFMTV » compte pour les deux médias
  function noms(m) { return m.media.split(/\s+et\s+/); }

  AI.json('data/medias.json').then(function (liste) {
    var compte = {};
    liste.forEach(function (m) { noms(m).forEach(function (n) { if (!/Télévision/.test(n)) compte[n] = (compte[n] || 0) + 1; }); });
    var tri = Object.keys(compte).sort(function (a, b) { return compte[b] - compte[a] || a.localeCompare(b); });
    document.querySelectorAll('.js-m').forEach(function (el) { el.textContent = el.dataset.k === 'n' ? liste.length : tri.length; });

    var actif = '';
    function boutons() {
      filtres.innerHTML = [['', 'Tous (' + liste.length + ')']].concat(tri.map(function (n) { return [n, n + ' (' + compte[n] + ')']; }))
        .map(function (b) { return '<button type="button" data-m="' + AI.esc(b[0]) + '" aria-pressed="' + (b[0] === actif) + '">' + AI.esc(b[1]) + '</button>'; }).join('');
    }
    function afficher() {
      var l = liste.filter(function (m) { return !actif || noms(m).indexOf(actif) >= 0; });
      grille.innerHTML = l.map(function (m) {
        return '<li class="media-carte apparait vu"><div class="media-img"><img loading="lazy" src="stories/' + m.id + '.jpg" width="240" height="426" alt="Story : passage sur ' + AI.esc(m.media) + ' le ' + date(m.d) + '"></div>' +
          '<p class="media-nom">' + AI.esc(m.media) + '</p><p class="media-date">' + date(m.d) + '</p>' +
          (m.sujet ? '<p class="media-sujet">' + AI.esc(m.sujet) + '</p>' : '') + '</li>';
      }).join('');
    }
    filtres.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      actif = b.dataset.m; boutons(); afficher();
    });
    boutons(); afficher();
  }).catch(function () { grille.innerHTML = '<li>Les passages médias n\'ont pas pu être chargés.</li>'; });
})();
