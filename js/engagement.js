/* Page Engagement : frise des temps forts (data/engagement.json) */
(function () {
  var frise = document.getElementById('frise');
  var filtres = document.getElementById('frise-filtres');
  if (!frise) return;
  var TYPES = { tout: 'Tout', terrain: 'Sur le terrain', assemblee: "À l'Assemblée", mission: 'Missions' };
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var evts = [], filtre = 'tout';

  function quand(d, libelle) {
    if (libelle) return libelle;
    var p = d.split('-');
    if (!p[1]) return p[0];
    return (p[2] ? (+p[2] === 1 ? '1er' : +p[2]) + ' ' : '') + MOIS[+p[1] - 1] + ' ' + p[0];
  }
  function rendre() {
    var liste = evts.filter(function (e) { return filtre === 'tout' || e.type === filtre; });
    frise.innerHTML = liste.map(function (e) {
      return '<li class="frise-el t-' + e.type + '">' +
        '<p class="frise-date">' + quand(e.date, e.quand) + '</p>' +
        '<div class="carte frise-carte">' +
        (e.image ? '<img src="' + AI.esc(e.image) + '" alt="" loading="lazy">' : '') +
        '<span class="frise-type">' + AI.esc(TYPES[e.type] || e.type) + (e.commune ? ' · ' + AI.esc(e.commune) : '') + '</span>' +
        '<h3>' + AI.esc(e.titre) + '</h3>' +
        (e.texte ? '<p>' + AI.esc(e.texte) + '</p>' : '') +
        (e.lien ? '<a href="' + AI.esc(e.lien) + '" rel="noopener" target="_blank">Voir →</a>' : '') +
        '</div></li>';
    }).join('') || '<li class="frise-vide">Rien à afficher pour ce filtre.</li>';
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
  AI.json('data/engagement.json').then(function (d) {
    evts = d.evenements.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    rendre();
  }).catch(function () { frise.innerHTML = '<li class="frise-vide">La frise n\'a pas pu être chargée.</li>'; });
})();
