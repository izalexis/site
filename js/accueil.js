/* Accueil : défilé des communes, héros animé (carte, compteurs, stories) */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

  // Compteurs qui montent
  document.querySelectorAll('.js-compte').forEach(function (el) {
    var cible = +el.dataset.n;
    if (reduit) return;
    var t0 = null, duree = 1600;
    el.textContent = '0';
    function pas(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / duree), v = Math.round(cible * (1 - Math.pow(1 - p, 3)));
      el.textContent = AI.fmt(v);
      if (p < 1) requestAnimationFrame(pas);
    }
    setTimeout(function () { requestAnimationFrame(pas); }, 350);
    // filet de sécurité si l'onglet est en arrière-plan (requestAnimationFrame suspendu)
    setTimeout(function () { el.textContent = AI.fmt(cible); }, duree + 900);
  });

  // Bandeau des passages médias
  var bande = document.getElementById('medias-bande');
  if (bande) AI.json('data/medias.json').then(function (l) {
    var M = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    bande.innerHTML = l.slice(0, 14).map(function (m) {
      var p = m.d.split('-');
      return '<li><a href="medias.html" style="text-decoration:none"><div class="media-img"><img loading="lazy" src="stories/' + m.id + '.jpg" width="240" height="426" alt="Passage sur ' + AI.esc(m.media) + '"></div>' +
        '<p class="media-nom">' + AI.esc(m.media) + '</p><p class="media-date">' + (+p[2]) + ' ' + M[p[1] - 1] + ' ' + p[0] + '</p></a></li>';
    }).join('');
  }).catch(function () {});

  var piste = document.getElementById('defile');
  var cartesvg = document.getElementById('heros-carte');

  Promise.all([AI.json('data/communes.json'), AI.json('data/presence.json').catch(function () { return null; })]).then(function (r) {
    var d = r[0], pres = r[1], nom = {};
    d.communes.forEach(function (c) { nom[c.code] = c.nom; });

    if (piste) {
      var html = d.communes.slice().sort(function (a, b) { return b.pop - a.pop; })
        .map(function (c) { return '<span>' + AI.esc(c.nom) + '</span>'; }).join('');
      piste.innerHTML = html + html; // doublé pour une boucle continue
    }

    // Carte de la circo en fond du héros
    if (cartesvg) {
      cartesvg.setAttribute('viewBox', '0 0 ' + d.w + ' ' + d.h);
      cartesvg.setAttribute('preserveAspectRatio', 'xMaxYMid meet');
      var g = document.createElementNS(NS, 'g');
      d.communes.forEach(function (c) {
        var p = document.createElementNS(NS, 'path');
        p.setAttribute('d', c.d);
        if (pres && pres.communes[c.code]) p.setAttribute('class', 'vue');
        g.appendChild(p);
      });
      cartesvg.appendChild(g);
    }
    if (!pres) return;

    // Points qui s'allument au hasard sur la carte
    var gp = document.createElementNS(NS, 'g');
    gp.setAttribute('class', 'heros-points');
    cartesvg.appendChild(gp);
    function pulse(s) {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', s.x); c.setAttribute('cy', s.y); c.setAttribute('r', 7);
      gp.appendChild(c);
      setTimeout(function () { c.remove(); }, 2400);
    }

    // Story qui tourne
    var choix = pres.stories.filter(function (s) { return !s.v; });
    var lot = [];
    // une story par commune, au hasard, pour varier les lieux
    var vu = {};
    choix.slice().sort(function () { return Math.random() - .5; }).forEach(function (s) { if (!vu[s.c]) { vu[s.c] = 1; lot.push(s); } });
    lot = lot.slice(0, 8);
    var barres = document.getElementById('story-barres');
    barres.innerHTML = lot.map(function () { return '<i><span></span></i>'; }).join('');
    var im = document.getElementById('story-heros-img'), lieu = document.getElementById('story-heros-lieu'), date = document.getElementById('story-heros-date');
    lot.forEach(function (s) { var p = new Image(); p.src = 'stories/' + s.id + '.jpg'; });
    var i = -1, carteStory = document.getElementById('story-heros');
    function suivante() {
      i = (i + 1) % lot.length;
      var s = lot[i], p = s.d.split('-');
      carteStory.classList.remove('montre');
      void carteStory.offsetWidth;
      im.src = 'stories/' + s.id + '.jpg';
      im.alt = 'Story à ' + nom[s.c];
      lieu.textContent = nom[s.c];
      date.textContent = (+p[2]) + ' ' + MOIS[p[1] - 1] + ' ' + p[0];
      carteStory.classList.add('montre');
      barres.querySelectorAll('i').forEach(function (b, k) { b.className = k < i ? 'fait' : k === i ? 'encours' : ''; });
      pulse(s);
      for (var k = 0; k < 3; k++) setTimeout(function () { pulse(choix[Math.floor(Math.random() * choix.length)]); }, 600 + k * 700);
    }
    suivante();
    if (!reduit) setInterval(suivante, 3200);
  }).catch(function () {});
})();
