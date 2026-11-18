/* Page Mon bilan : journal « Au fil du mandat » (data/engagement.json) */
(function () {
  var journal = document.getElementById('frise');
  var filtres = document.getElementById('frise-filtres');
  var annees = document.getElementById('fil-annees');
  if (!journal) return;
  var TYPES = { tout: 'Tout', terrain: 'Sur le terrain', assemblee: "À l'Assemblée", mission: 'Missions', media: 'Médias' };
  var LIB = Object.assign({ apres: 'Depuis le mandat' }, TYPES);
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var data, filtre = 'tout';

  function jour(d) { var p = d.split('-'); return p[2] ? (+p[2] === 1 ? '1er' : +p[2]) + ' ' + MOIS[+p[1] - 1] : ''; }

  function carte(e) {
    return '<article class="j-carte t-' + e.type + (e.image ? ' avec-img' : '') + '">' +
      (e.image ? '<figure class="j-img"><img loading="lazy" src="' + AI.esc(e.image) + '" width="240" height="426" alt="">' +
        (e.legende ? '<figcaption>' + AI.esc(e.legende) + '</figcaption>' : '') + '</figure>' : '') +
      '<div class="j-corps"><p class="j-meta"><span class="j-type">' + LIB[e.type] + (e.media ? ' · ' + AI.esc(e.media) : '') + '</span>' +
      (jour(e.date) ? '<span>' + jour(e.date) + '</span>' : '') + '</p>' +
      '<h3>' + AI.esc(e.titre) + '</h3><p>' + AI.esc(e.texte) + '</p>' +
      (e.communes && e.communes.length ? '<p class="j-communes">' + e.communes.map(function (c) { return '<span>' + AI.esc(c) + '</span>'; }).join('') + '</p>' : '') +
      '</div></article>';
  }

  function rendre() {
    var liste = data.evenements.filter(function (e) { return filtre === 'tout' || e.type === filtre; })
      .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    var html = '', an = null, mois = null;
    if (filtre === 'tout') {
      html += '<section class="j-annee j-apres"><h3 class="j-an">Et depuis</h3>' +
        data.apres.map(function (e) { return '<div class="j-mois"><p class="j-mois-nom">' + AI.esc(e.quand) + '</p><div class="j-cartes">' + carte(e) + '</div></div>'; }).join('') + '</section>';
    }
    liste.forEach(function (e) {
      var a = e.date.slice(0, 4), m = e.date.slice(0, 7);
      if (a !== an) {
        if (an) html += '</div></div></section>';
        html += '<section class="j-annee" id="an-' + a + '"><h3 class="j-an">' + a + '</h3>';
        an = a; mois = null;
      }
      if (m !== mois) {
        if (mois) html += '</div></div>';
        html += '<div class="j-mois"><p class="j-mois-nom">' + MOIS[+m.slice(5) - 1] + '</p><div class="j-cartes">';
        mois = m;
      }
      html += carte(e);
    });
    if (an) html += '</div></div></section>';
    journal.innerHTML = html || '<p class="frise-vide">Rien à afficher pour ce filtre.</p>';
  }

  filtres.innerHTML = Object.keys(TYPES).map(function (k) {
    return '<button type="button" data-t="' + k + '" aria-pressed="' + (k === 'tout') + '">' + TYPES[k] + '</button>';
  }).join('');
  filtres.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    filtre = b.dataset.t;
    filtres.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    rendre();
  });
  annees.innerHTML = ['2024', '2023', '2022'].map(function (a) { return '<a href="#an-' + a + '">' + a + '</a>'; }).join('');

  AI.json('data/engagement.json').then(function (d) { data = d; rendre(); })
    .catch(function () { journal.innerHTML = '<p class="frise-vide">Le fil du mandat n\'a pas pu être chargé.</p>'; });
})();
