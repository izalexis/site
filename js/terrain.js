/* Page « Sur le terrain » : replay du mandat, calendrier, galeries et jeux à partir des stories */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var $ = function (id) { return document.getElementById(id); };
  var reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function dateLongue(iso, jour) {
    var p = iso.split('-'), d = new Date(+p[0], p[1] - 1, +p[2]);
    return (jour ? JOURS[d.getDay()] + ' ' : '') + (+p[2] === 1 ? '1er' : +p[2]) + ' ' + MOIS[p[1] - 1] + ' ' + p[0];
  }
  function img(s) { return 'stories/' + s.id + '.jpg'; }
  function hasard(a) { return a[Math.floor(Math.random() * a.length)]; }
  function melange(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  Promise.all([AI.json('data/communes.json'), AI.json('data/presence.json')]).then(function (r) {
    var carte = r[0], pres = r[1];
    var nom = {}, chemins = {}, points = [];
    carte.communes.forEach(function (c) { nom[c.code] = c.nom; });
    var stories = pres.stories;
    var sansStory = {};
    (pres.sans_story || []).forEach(function (m) { sansStory[m.code] = m; });
    var jours = []; // jours distincts, triés
    var parJour = {};
    stories.forEach(function (s, i) {
      s.i = i;
      if (!parJour[s.d]) { parJour[s.d] = []; jours.push(s.d); }
      parJour[s.d].push(s);
      s.j = jours.length - 1;
    });

    document.querySelectorAll('.js-stat').forEach(function (el) { el.textContent = AI.fmt(pres.stats[el.dataset.k]); });

    /* ---------- Carte ---------- */
    var svg = $('carte-terrain');
    svg.setAttribute('viewBox', '-6 -6 ' + (carte.w + 12) + ' ' + (carte.h + 12));
    var gC = document.createElementNS(NS, 'g'), gP = document.createElementNS(NS, 'g');
    gP.setAttribute('class', 'points');
    carte.communes.forEach(function (c) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', c.d);
      p.setAttribute('class', 'commune-t');
      p.setAttribute('tabindex', '0');
      p.setAttribute('role', 'button');
      var info = pres.communes[c.code];
      p.setAttribute('aria-label', c.nom + (info ? ', ' + info.jours + ' jours de terrain en story' : sansStory[c.code] ? ', visitée sans story' : ''));
      var t = document.createElementNS(NS, 'title'); t.textContent = c.nom; p.appendChild(t);
      p.addEventListener('click', function () { ouvrirCommune(c.code, true); });
      p.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrirCommune(c.code, true); } });
      gC.appendChild(p); chemins[c.code] = p;
    });
    stories.forEach(function (s) {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', s.x); c.setAttribute('cy', s.y); c.setAttribute('r', 5.5);
      gP.appendChild(c); points.push(c);
    });
    var defs = document.createElementNS(NS, 'defs');
    defs.innerHTML = '<pattern id="hachures" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="#a9b4d8"/><line x1="0" y1="0" x2="0" y2="9" stroke="#1b2c7a" stroke-width="3.5"/></pattern>';
    svg.appendChild(defs);
    svg.appendChild(gC); svg.appendChild(gP);

    function intensite(n) { return n >= 20 ? 1 : n >= 10 ? .82 : n >= 5 ? .64 : n >= 2 ? .46 : .3; }

    var courant = -1;
    function afficher(j, anime) {
      var vus = {}, nbJours = j + 1;
      for (var k = 0; k <= j; k++) parJour[jours[k]].forEach(function (s) { vus[s.c] = vus[s.c] || {}; vus[s.c][s.d] = 1; });
      var fin = j >= jours.length - 1, manuelles = 0;
      carte.communes.forEach(function (c) {
        var n = vus[c.code] ? Object.keys(vus[c.code]).length : 0;
        var sans = fin && !n && sansStory[c.code];
        if (sans) manuelles++;
        chemins[c.code].style.fill = n ? 'rgba(27,44,122,' + intensite(n) + ')' : sans ? 'url(#hachures)' : '';
        chemins[c.code].classList.toggle('vue', !!n || !!sans);
      });
      stories.forEach(function (s) {
        var on = s.j <= j, el = points[s.i];
        el.classList.toggle('on', on);
        el.classList.toggle('neuf', anime && s.j === j);
      });
      $('r-communes').textContent = Object.keys(vus).length + manuelles;
      $('r-jours').textContent = nbJours;
      $('r-date').textContent = dateLongue(jours[j], true);
      var s = parJour[jours[j]][parJour[jours[j]].length - 1];
      montrerStory(s);
      courant = j;
    }

    function montrerStory(s) {
      var im = $('r-img');
      im.hidden = false;
      im.src = img(s);
      im.alt = 'Story du ' + dateLongue(s.d) + ' à ' + nom[s.c];
      $('r-lieu').textContent = nom[s.c];
      $('r-legende').textContent = s.t || dateLongue(s.d, true);
    }

    /* ---------- Lecture ---------- */
    var curseur = $('curseur'), bouton = $('jouer'), minuterie = null;
    curseur.max = jours.length - 1; curseur.value = jours.length - 1;
    function stop() {
      clearInterval(minuterie); minuterie = null;
      bouton.setAttribute('aria-pressed', 'false');
      bouton.querySelector('.txt').textContent = courant >= jours.length - 1 ? 'Rejouer le mandat' : 'Reprendre';
    }
    function jouer() {
      if (courant >= jours.length - 1 || courant < 0) afficher(0, true);
      bouton.setAttribute('aria-pressed', 'true');
      bouton.querySelector('.txt').textContent = 'Pause';
      minuterie = setInterval(function () {
        if (courant >= jours.length - 1) return stop();
        afficher(courant + 1, true);
        curseur.value = courant;
      }, reduit ? 400 : 110);
    }
    bouton.addEventListener('click', function () { minuterie ? stop() : jouer(); });
    curseur.addEventListener('input', function () { if (minuterie) stop(); afficher(+curseur.value, false); });

    // état initial : tout le mandat, sans animation
    afficher(jours.length - 1, false);
    $('r-date').textContent = 'Juin 2022 – juin 2024';
    bouton.querySelector('.txt').textContent = 'Rejouer le mandat';

    /* ---------- Galerie d'une commune ---------- */
    function cartes(liste, avecLieu) {
      return liste.map(function (s) {
        return '<li class="vignette"><img loading="lazy" src="' + img(s) + '" width="240" height="426" alt="Story du ' + dateLongue(s.d) + ' à ' + AI.esc(nom[s.c]) + '">' +
          '<p><b>' + (avecLieu ? AI.esc(nom[s.c]) + ' · ' : '') + dateLongue(s.d) + '</b>' + (s.t ? '<span>' + AI.esc(s.t) + '</span>' : '') + '</p></li>';
      }).join('');
    }
    var actif = null;
    function ouvrirCommune(code, defiler) {
      if (minuterie) stop();
      if (actif) chemins[actif].classList.remove('actif');
      actif = code;
      chemins[code].classList.add('actif');
      var info = pres.communes[code], manuel = sansStory[code];
      var liste = stories.filter(function (s) { return s.c === code; });
      $('g-nom').textContent = nom[code];
      $('g-etiq').textContent = info ? 'Première story : ' + dateLongue(info.premiere) : 'Visitée pendant le mandat';
      $('g-resume').textContent = info
        ? info.jours + (info.jours > 1 ? ' journées racontées' : ' journée racontée') + ' en story · ' + info.n + (info.n > 1 ? ' stories' : ' story') + ", sans compter les visites sans photo"
        : manuel ? manuel.titre : 'Visitée pendant le mandat, sans story.';
      $('g-piste').innerHTML = (manuel ? '<li class="vignette vignette-absente"><div class="photo-absente"><span>Photo absente</span></div><p><b>' + AI.esc(manuel.titre) + '</b><span>' + AI.esc(manuel.texte) + '</span></p></li>' : '') + cartes(liste, false);
      $('galerie').hidden = false;
      if (liste.length) montrerStory(liste[liste.length - 1]);
      else { $('r-lieu').textContent = nom[code]; $('r-legende').textContent = manuel ? manuel.titre + ' (photo absente).' : 'Visitée sans story.'; $('r-img').hidden = true; }
      if (defiler) $('galerie').scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'nearest' });
    }
    $('g-fermer').addEventListener('click', function () {
      $('galerie').hidden = true;
      if (actif) chemins[actif].classList.remove('actif');
      actif = null;
    });

    /* ---------- Calendrier : toutes les stories du mandat (data/agenda.json) ---------- */
    var cal = $('calendrier');
    function lieuDe(l) { return nom[l] || (l === 'AN' ? 'Assemblée nationale' : l.indexOf('M:') === 0 ? l.slice(2) : l === 'A' ? 'Ailleurs' : ''); }
    function typeDe(l) { return nom[l] ? 'circo' : l === 'AN' ? 'an' : l.indexOf('M:') === 0 ? 'media' : 'ailleurs'; }
    var RANG = { circo: 0, an: 1, media: 2, ailleurs: 3 };
    function calendrier(agenda) {
      var debut = new Date(pres.debut), fin = new Date(pres.fin), html = '';
      var m = new Date(debut.getFullYear(), debut.getMonth(), 1);
      function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
      while (m <= fin) {
        var y = m.getFullYear(), mo = m.getMonth(), nbj = new Date(y, mo + 1, 0).getDate(), decal = (m.getDay() + 6) % 7, nb = 0;
        var cases = '';
        for (var k = 0; k < decal; k++) cases += '<span class="c-vide"></span>';
        for (var dj = 1; dj <= nbj; dj++) {
          var d = new Date(y, mo, dj), id = iso(d), liste = agenda[id];
          if (d < debut || d > fin) { cases += '<span class="c-hors"></span>'; continue; }
          if (!liste) { cases += '<span class="c-rien"></span>'; continue; }
          nb++;
          var lieux = [], type = 'ailleurs';
          liste.forEach(function (s) {
            var t = typeDe(s[2]), n = lieuDe(s[2]);
            if (RANG[t] < RANG[type]) type = t;
            if (n && lieux.indexOf(n) < 0) lieux.push(n);
          });
          cases += '<button type="button" class="c-' + type + '" data-d="' + id + '" title="' + dateLongue(id) + (lieux.length ? ' : ' + AI.esc(lieux.join(', ')) : '') + '"><span class="sr">' + dateLongue(id) + '</span></button>';
        }
        html += '<div class="mois"><p class="mois-nom">' + MOIS[mo] + ' ' + y + '<small>' + (nb ? nb + ' j' : '') + '</small></p><div class="mois-grille">' + cases + '</div></div>';
        m = new Date(y, mo + 1, 1);
      }
      cal.innerHTML = html;
      cal.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-d]');
        if (!b) return;
        cal.querySelectorAll('.choisi').forEach(function (x) { x.classList.remove('choisi'); });
        b.classList.add('choisi');
        var liste = agenda[b.dataset.d], lieux = [];
        liste.forEach(function (s) { var n = lieuDe(s[2]); if (n && lieux.indexOf(n) < 0) lieux.push(n); });
        $('jour-titre').textContent = dateLongue(b.dataset.d, true) + (lieux.length ? ' · ' + lieux.join(', ') : '');
        $('jour-piste').innerHTML = liste.map(function (s) {
          var n = lieuDe(s[2]);
          return '<li class="vignette"><img loading="lazy" src="stories/' + s[0] + '.jpg" width="240" height="426" alt="Story du ' + dateLongue(b.dataset.d) + (n ? ', ' + AI.esc(n) : '') + '">' +
            '<p><b>' + (n ? AI.esc(n) + ' · ' : '') + s[1] + '</b>' + (s[4] ? '<span>' + AI.esc(s[4]) + '</span>' : '') + '</p></li>';
        }).join('');
        $('jour').hidden = false;
        $('jour').scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'nearest' });
      });
    }
    AI.json('data/agenda.json').then(calendrier).catch(function () { cal.innerHTML = '<p>Le calendrier n\'a pas pu être chargé.</p>'; });

    /* ---------- Jeu « Où étais-je ? » ---------- */
    var visitees = Object.keys(pres.communes);
    var parCommune = {};
    stories.forEach(function (s) { if (!s.v) (parCommune[s.c] = parCommune[s.c] || []).push(s); });
    var manches, n, score;
    function nouvellePartie() {
      manches = melange(Object.keys(parCommune)).slice(0, 5).map(function (c) { return hasard(parCommune[c]); });
      n = 0; score = 0; manche();
    }
    function manche() {
      var s = manches[n];
      $('jeu-zone').classList.remove('fini');
      $('jeu-img').src = img(s);
      $('jeu-num').textContent = 'Manche ' + (n + 1) + ' / ' + manches.length;
      $('jeu-q').innerHTML = 'Dans quelle commune étais-je&nbsp;?';
      $('jeu-expli').textContent = '';
      var choix = melange([s.c].concat(melange(visitees.filter(function (c) { return c !== s.c; })).slice(0, 3)));
      $('jeu-choix').innerHTML = choix.map(function (c) { return '<button class="btn quiz-rep" type="button" data-c="' + c + '">' + AI.esc(nom[c]) + '</button>'; }).join('');
    }
    $('jeu-choix').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-c]');
      if (!b || b.disabled) return;
      var s = manches[n];
      if (!b.dataset.c || b.dataset.suite) return;
      var bon = b.dataset.c === s.c;
      if (bon) score++;
      $('jeu-choix').querySelectorAll('button').forEach(function (x) {
        x.disabled = true;
        if (x.dataset.c === s.c) x.classList.add('bon');
        else if (x === b) x.classList.add('faux');
      });
      $('jeu-expli').innerHTML = (bon ? '<b>Bien vu&nbsp;!</b> ' : '<b>Raté.</b> ') + 'C\'était à ' + AI.esc(nom[s.c]) + ', le ' + dateLongue(s.d) + '. ' +
        '<button class="btn btn-blanc btn-sm" type="button" id="jeu-suite">' + (n < manches.length - 1 ? 'Manche suivante →' : 'Voir mon score') + '</button>';
      $('jeu-suite').focus();
    });
    $('jeu-expli').addEventListener('click', function (e) {
      if (!e.target.closest('#jeu-suite')) return;
      n++;
      if (n < manches.length) return manche();
      $('jeu-num').textContent = 'Résultat';
      $('jeu-q').innerHTML = '<span class="jeu-score">' + score + '<small> / ' + manches.length + '</small></span>' +
        (score === manches.length ? 'Vous connaissez la circo comme votre poche&nbsp;!' : score >= 3 ? 'Belle connaissance du territoire.' : 'La circo a encore des secrets pour vous.');
      $('jeu-choix').innerHTML = '<button class="btn btn-blanc" type="button" id="jeu-rejouer">Rejouer</button>';
      $('jeu-expli').textContent = '';
      $('jeu-rejouer').addEventListener('click', nouvellePartie);
    });
    nouvellePartie();

    /* ---------- « Et chez vous ? » ---------- */
    var sel = $('d-commune');
    carte.communes.slice().sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); }).forEach(function (c) {
      var o = document.createElement('option'); o.value = c.code; o.textContent = c.nom; sel.appendChild(o);
    });
    var dc = $('d-curseur');
    dc.addEventListener('input', function () { $('d-valeur').textContent = dc.value; });
    sel.addEventListener('change', function () { $('d-valider').disabled = !sel.value; $('d-res').innerHTML = ''; });
    $('d-valider').addEventListener('click', function () {
      var info = pres.communes[sel.value], vrai = info ? info.jours : 0, g = +dc.value, ecart = Math.abs(g - vrai);
      if (!info) {
        var m = sansStory[sel.value];
        $('d-res').innerHTML = '<b>Je suis bien venu&nbsp;!</b> ' + (m ? AI.esc(m.texte) : 'Mais sans story ce jour-là.') + ' <button class="btn btn-sm" type="button" id="d-voir">Voir sur la carte</button>';
        $('d-voir').addEventListener('click', function () { ouvrirCommune(sel.value, false); $('replay').scrollIntoView({ behavior: reduit ? 'auto' : 'smooth' }); });
        return;
      }
      var verdict = ecart === 0 ? 'Dans le mille&nbsp;!' : ecart <= 2 ? 'Presque&nbsp;!' : g < vrai ? 'Plus que ça&nbsp;!' : 'Un peu moins&nbsp;!';
      $('d-res').innerHTML = '<b>' + verdict + '</b> J\'ai raconté <b>' + vrai + (vrai > 1 ? ' journées' : ' journée') + '</b> à ' + AI.esc(nom[sel.value]) +
        ' en story, la première le ' + dateLongue(info.premiere) + '. Et ce n\'est qu\'une partie&nbsp;: beaucoup de rendez-vous n\'ont pas eu de story. ' +
        '<button class="btn btn-sm" type="button" id="d-voir">Voir les stories</button>';
      var voir = $('d-voir');
      if (voir) voir.addEventListener('click', function () { ouvrirCommune(sel.value, false); $('replay').scrollIntoView({ behavior: reduit ? 'auto' : 'smooth' }); });
    });
  }).catch(function (e) {
    console.error(e);
    var p = $('r-legende'); if (p) p.textContent = 'Les données n\'ont pas pu être chargées.';
  });
})();
