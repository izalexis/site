/* Page Circonscription : carte SVG interactive + liste des communes */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.getElementById('carte-circo');
  var fiche = document.getElementById('fiche');
  var legende = document.getElementById('legende');
  var PALETTE = ['#2337c6', '#e4252f', '#ffd23f', '#5ed38a', '#8b5cf6', '#ff8a3d', '#14183d'];
  var data, chemins = {}, actif = null, mode = 'epci', couleursEpci = {};

  function court(epci) {
    return (epci || '').replace(/\s*\(.*\)\s*$/, '').replace(/^CA /, 'Agglo ').replace(/^CC /, 'Communauté de communes ').replace(/^CU /, 'CU ');
  }

  function couleur(c) {
    if (mode === 'epci') return couleursEpci[c.epci];
    var p = c.pop, t = p > 20000 ? 1 : p > 8000 ? .8 : p > 4000 ? .6 : p > 1500 ? .4 : p > 700 ? .25 : .12;
    return 'rgba(35,55,198,' + t + ')';
  }

  function peindre() {
    data.communes.forEach(function (c) { chemins[c.code].style.fill = couleur(c); });
    if (mode === 'epci') {
      legende.innerHTML = Object.keys(couleursEpci).map(function (e) {
        return '<span><i style="background:' + couleursEpci[e] + '"></i>' + AI.esc(court(e)) + '</span>';
      }).join('');
    } else {
      legende.innerHTML = [['< 700', .12], ['700 – 1 500', .25], ['1 500 – 4 000', .4], ['4 000 – 8 000', .6], ['8 000 – 20 000', .8], ['> 20 000', 1]].map(function (l) {
        return '<span><i style="background:rgba(35,55,198,' + l[1] + ')"></i>' + l[0] + ' hab.</span>';
      }).join('');
    }
  }

  function montrer(c) {
    if (actif) chemins[actif].classList.remove('actif');
    actif = c.code;
    var p = chemins[c.code];
    p.classList.add('actif');
    p.parentNode.appendChild(p); // passe au premier plan
    var rang = data.parPop.indexOf(c) + 1;
    fiche.innerHTML =
      '<p class="etiquette rouge-bg">' + (rang === 1 ? '1re commune' : rang + 'e commune') + ' par population</p>' +
      '<h3>' + AI.esc(c.nom) + '</h3>' +
      '<dl>' +
      '<div><dt>Habitants</dt><dd>' + AI.fmt(c.pop) + '</dd></div>' +
      '<div><dt>Code postal</dt><dd>' + AI.esc(c.cp) + '</dd></div>' +
      '<div><dt>Canton</dt><dd>' + AI.esc(c.canton) + '</dd></div>' +
      '<div><dt>Bureaux de vote</dt><dd>' + c.bureaux + '</dd></div>' +
      '<div class="large"><dt>Intercommunalité</dt><dd>' + AI.esc(court(c.epci)) + '</dd></div>' +
      '</dl>' +
      '<div class="fiche-liens"><a class="btn btn-sm" href="revue-de-presse.html?commune=' + encodeURIComponent(c.nom) + '">Son actualité</a>' +
      '<a class="btn btn-sm btn-jaune" href="bureau-de-vote.html">Mon bureau de vote</a></div>';
  }

  AI.json('data/communes.json').then(function (d) {
    data = d;
    data.parPop = d.communes.slice().sort(function (a, b) { return b.pop - a.pop; });
    var epcis = [];
    d.communes.forEach(function (c) { if (epcis.indexOf(c.epci) < 0) epcis.push(c.epci); });
    epcis.sort(function (a, b) {
      var na = d.communes.filter(function (c) { return c.epci === a; }).length;
      var nb = d.communes.filter(function (c) { return c.epci === b; }).length;
      return nb - na;
    }).forEach(function (e, i) { couleursEpci[e] = PALETTE[i % PALETTE.length]; });

    svg.setAttribute('viewBox', '-6 -6 ' + (d.w + 12) + ' ' + (d.h + 12));
    var g = document.createElementNS(NS, 'g');
    d.communes.forEach(function (c) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', c.d);
      p.setAttribute('class', 'commune');
      p.setAttribute('tabindex', '0');
      p.setAttribute('role', 'button');
      p.setAttribute('aria-label', c.nom + ', ' + AI.fmt(c.pop) + ' habitants');
      var t = document.createElementNS(NS, 'title'); t.textContent = c.nom; p.appendChild(t);
      p.addEventListener('click', function () { montrer(c); });
      p.addEventListener('mouseenter', function () { if (matchMedia('(hover: hover)').matches) montrer(c); });
      p.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); montrer(c); } });
      g.appendChild(p); chemins[c.code] = p;
    });
    svg.appendChild(g);
    // étiquettes des plus grandes communes
    data.parPop.slice(0, 6).forEach(function (c) {
      var t = document.createElementNS(NS, 'text');
      t.setAttribute('x', c.cx); t.setAttribute('y', c.cy); t.setAttribute('class', 'etiq');
      t.textContent = c.nom.replace('Saint-Germain-lès-Arpajon', 'St-Germain').replace('Brétigny-sur-Orge', 'Brétigny').replace('Marolles-en-Hurepoix', 'Marolles');
      svg.appendChild(t);
    });
    peindre();
    montrer(data.parPop[0]);

    // recherche
    var dl = document.getElementById('liste-communes');
    dl.innerHTML = d.communes.map(function (c) { return '<option value="' + AI.esc(c.nom) + '">'; }).join('');
    document.getElementById('cherche-commune').addEventListener('input', function (e) {
      var v = AI.norm(e.target.value);
      var c = d.communes.find(function (x) { return AI.norm(x.nom) === v; });
      if (c) { montrer(c); svg.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    });

    // liste
    document.getElementById('grille-communes').innerHTML = data.parPop.map(function (c) {
      return '<li><button type="button" data-code="' + c.code + '"><b>' + AI.esc(c.nom) + '</b><span>' + AI.fmt(c.pop) + ' hab.</span></button></li>';
    }).join('');
    document.getElementById('grille-communes').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      montrer(d.communes.find(function (c) { return c.code === b.dataset.code; }));
      svg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }).catch(function () {
    fiche.innerHTML = '<p>La carte n\'a pas pu être chargée.</p>';
  });

  document.getElementById('mode-carte').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || !data) return;
    mode = b.dataset.mode;
    this.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    peindre();
  });
})();
