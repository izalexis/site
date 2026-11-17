/* Accueil : remplit le défilé avec les 47 communes */
(function () {
  var piste = document.getElementById('defile');
  if (!piste) return;
  AI.json('data/communes.json').then(function (d) {
    var noms = d.communes.slice().sort(function (a, b) { return b.pop - a.pop; }).map(function (c) { return c.nom; });
    var html = noms.map(function (n) { return '<span>' + AI.esc(n) + '</span>'; }).join('');
    piste.innerHTML = html + html; // doublé pour une boucle continue
  }).catch(function () {});
})();
