/* Revue de presse : lit data/presse.json (généré chaque matin par le robot) */
(function () {
  var liste = document.getElementById('presse-liste');
  if (!liste) return;
  var selCommune = document.getElementById('f-commune');
  var champTexte = document.getElementById('f-texte');
  var themesBox = document.getElementById('f-themes');
  var compte = document.getElementById('presse-compte');
  var plus = document.getElementById('presse-plus');
  var articles = [], theme = '', limite = 30;
  var THEMES = ['Transports', 'Sécurité', 'Éducation', 'Santé', 'Environnement', 'Économie', 'Urbanisme', 'Culture & sport', 'Vie locale'];

  function date(iso) {
    var d = new Date(iso);
    var j = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
    if (j === 0) return "Aujourd'hui";
    if (j === 1) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  }

  function rendre() {
    var c = selCommune.value, t = AI.norm(champTexte.value.trim());
    var res = articles.filter(function (a) {
      return (!c || a.c.indexOf(c) > -1) && (!theme || a.th.indexOf(theme) > -1) && (!t || AI.norm(a.t).indexOf(t) > -1);
    });
    compte.textContent = res.length + ' article' + (res.length > 1 ? 's' : '') + (c ? ' sur ' + c : '') + (theme ? ' · ' + theme : '');
    liste.innerHTML = res.slice(0, limite).map(function (a) {
      return '<li class="carte article">' +
        '<p class="article-meta"><span class="article-source">' + AI.esc(a.s) + '</span><span>' + date(a.d) + '</span></p>' +
        '<h3><a href="' + AI.esc(a.u) + '" target="_blank" rel="noopener">' + AI.esc(a.t) + '</a></h3>' +
        '<p class="article-tags">' + a.c.map(function (x) { return '<span class="tag-commune">' + AI.esc(x) + '</span>'; }).join('') +
        a.th.map(function (x) { return '<span class="tag-theme">' + AI.esc(x) + '</span>'; }).join('') + '</p></li>';
    }).join('') || '<li class="presse-vide">Aucun article ne correspond pour le moment.</li>';
    plus.hidden = res.length <= limite;
  }

  themesBox.innerHTML = ['Tous'].concat(THEMES).map(function (t, i) {
    return '<button type="button" data-t="' + (i ? t : '') + '" aria-pressed="' + (i === 0) + '">' + t + '</button>';
  }).join('');
  themesBox.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    theme = b.dataset.t; limite = 30;
    themesBox.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    rendre();
  });
  selCommune.addEventListener('change', function () { limite = 30; rendre(); });
  champTexte.addEventListener('input', function () { limite = 30; rendre(); });
  plus.addEventListener('click', function () { limite += 30; rendre(); });

  AI.json('data/presse.json').then(function (d) {
    articles = d.articles;
    var noms = {};
    articles.forEach(function (a) { a.c.forEach(function (c) { noms[c] = (noms[c] || 0) + 1; }); });
    Object.keys(noms).sort(function (a, b) { return a.localeCompare(b, 'fr'); }).forEach(function (n) {
      var o = document.createElement('option'); o.value = n; o.textContent = n + ' (' + noms[n] + ')'; selCommune.appendChild(o);
    });
    document.getElementById('n-articles').textContent = articles.length;
    document.getElementById('n-communes').textContent = Object.keys(noms).length;
    var m = new Date(d.maj);
    document.getElementById('maj').textContent = m.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + ' à ' + m.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    var q = new URLSearchParams(location.search).get('commune');
    if (q) {
      if (!noms[q]) { var o = document.createElement('option'); o.value = q; o.textContent = q + ' (0)'; selCommune.appendChild(o); }
      selCommune.value = q;
    }
    rendre();
  }).catch(function () {
    liste.innerHTML = '<li class="presse-vide">La revue de presse n\'a pas pu être chargée. Réessayez dans un instant.</li>';
  });
})();
