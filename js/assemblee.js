/* Page « L'Assemblée en clair » : hémicycle, rôles, chemin d'une loi, semaine, quiz */
(function () {
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- Hémicycle ---------- */
  var svg = document.getElementById('hemicycle');
  var sieges = [];
  if (svg) {
    var TOTAL = 577, RANGS = 12, CX = 500, CY = 520, R0 = 170, R1 = 480;
    var rayons = [], somme = 0;
    for (var i = 0; i < RANGS; i++) { var r = R0 + (R1 - R0) * i / (RANGS - 1); rayons.push(r); somme += r; }
    var restant = TOTAL, parRang = rayons.map(function (r, i) {
      var n = i === RANGS - 1 ? restant : Math.round(TOTAL * r / somme); restant -= n; return n;
    });
    var pts = [];
    rayons.forEach(function (r, i) {
      var n = parRang[i];
      for (var k = 0; k < n; k++) {
        var a = Math.PI - (Math.PI * (k + .5) / n);
        pts.push({ x: CX + r * Math.cos(a), y: CY - r * Math.sin(a), a: a });
      }
    });
    // tri de gauche à droite (angle décroissant), puis du centre vers l'extérieur
    pts.sort(function (p, q) { return q.a - p.a; });
    var tribune = document.createElementNS(NS, 'rect');
    tribune.setAttribute('x', CX - 70); tribune.setAttribute('y', CY - 46); tribune.setAttribute('width', 140); tribune.setAttribute('height', 40);
    tribune.setAttribute('rx', 8); tribune.setAttribute('class', 'tribune');
    svg.appendChild(tribune);
    pts.forEach(function (p) {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', p.x.toFixed(1)); c.setAttribute('cy', p.y.toFixed(1)); c.setAttribute('r', 9.6);
      c.setAttribute('class', 'siege on');
      svg.appendChild(c); sieges.push(c);
    });
  }

  var CONCEPTS = {
    577: ['577 députés', "Chaque député est élu dans une circonscription, au scrutin majoritaire à deux tours, pour cinq ans. Un député représente en moyenne environ 118&nbsp;000 habitants."],
    289: ['289 : la majorité absolue', "Avec 289 voix, une majorité peut adopter une motion de censure et renverser le Gouvernement. C'est aussi le seuil qui assure à un camp de gouverner seul."],
    60: ['60 : saisir le Conseil constitutionnel', "60 députés (ou 60 sénateurs) peuvent demander au Conseil constitutionnel de vérifier qu'une loi respecte la Constitution avant sa promulgation."],
    58: ['58 : déposer une motion de censure', "Il faut la signature d'au moins un dixième des députés, soit 58, pour déposer une motion de censure contre le Gouvernement."],
    15: ['15 : former un groupe politique', "Un groupe donne des moyens et du temps de parole. Il faut au moins 15 députés pour en constituer un."],
    1: ['1 : votre député', "Un seul député par circonscription. Pour la 3<sup>e</sup> circonscription de l'Essonne, c'est un élu pour 47 communes et environ 152&nbsp;000 habitants."]
  };
  var choix = document.getElementById('hemi-choix');
  var texte = document.getElementById('hemi-texte');
  var compteur = document.getElementById('hemi-n');
  function allume(n) {
    var c = CONCEPTS[n];
    texte.innerHTML = '<h3>' + c[0] + '</h3><p>' + c[1] + '</p>';
    compteur.textContent = AI.fmt(n);
    sieges.forEach(function (s, i) {
      s.setAttribute('class', 'siege' + (i < n ? ' on' : '') + (n === 1 && i === 0 ? ' unique' : ''));
    });
    if (n === 1) { sieges[0].setAttribute('class', 'siege on unique'); }
    choix.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.n === n)); });
  }
  if (choix) {
    choix.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) allume(+b.dataset.n); });
    allume(577);
  }

  /* ---------- Onglets des rôles ---------- */
  var onglets = document.querySelectorAll('.roles-onglets [role=tab]');
  onglets.forEach(function (t, i) {
    t.addEventListener('click', function () {
      onglets.forEach(function (u, j) {
        u.setAttribute('aria-selected', String(i === j));
        document.getElementById('role-' + j).hidden = i !== j;
      });
    });
  });

  /* ---------- Chemin d'une loi ---------- */
  var ETAPES = [
    ['Le dépôt', "Un texte naît soit du Gouvernement (projet de loi, après avis du Conseil d'État), soit d'un parlementaire (proposition de loi). Il est déposé à l'Assemblée ou au Sénat."],
    ['La commission', "Le texte est d'abord examiné par l'une des huit commissions permanentes. Un rapporteur est désigné, les députés auditionnent, débattent et votent des amendements."],
    ['La séance publique', "Dans l'hémicycle, tous les députés peuvent intervenir et amender le texte, article par article, avant le vote sur l'ensemble."],
    ['La navette', "Le texte adopté part dans l'autre chambre, qui l'examine à son tour. Il fait des allers-retours jusqu'à ce que les deux assemblées l'adoptent dans les mêmes termes."],
    ['La commission mixte paritaire', "En cas de désaccord persistant, 7 députés et 7 sénateurs se réunissent pour trouver un texte commun, ensuite soumis aux deux chambres."],
    ['Le dernier mot', "Si l'accord est impossible, le Gouvernement peut demander à l'Assemblée nationale de statuer définitivement. C'est elle qui a le dernier mot."],
    ['Le Conseil constitutionnel', "Avant la promulgation, 60 députés, 60 sénateurs, le Président de la République, le Premier ministre ou le président d'une assemblée peuvent saisir le Conseil constitutionnel."],
    ['La promulgation', "Le Président de la République promulgue la loi dans les 15 jours. Elle est publiée au Journal officiel et s'applique, souvent après des décrets d'application."]
  ];
  var frise = document.getElementById('loi-frise');
  if (frise) {
    var pos = 0;
    frise.innerHTML = ETAPES.map(function (e, i) {
      return '<li><button type="button" data-i="' + i + '" aria-label="Étape ' + (i + 1) + ' : ' + AI.esc(e[0]) + '">' + (i + 1) + '</button></li>';
    }).join('');
    var montre = function (i) {
      pos = Math.max(0, Math.min(ETAPES.length - 1, i));
      document.getElementById('loi-num').textContent = 'Étape ' + (pos + 1) + ' / ' + ETAPES.length;
      document.getElementById('loi-titre').textContent = ETAPES[pos][0];
      document.getElementById('loi-texte').textContent = ETAPES[pos][1];
      frise.querySelectorAll('button').forEach(function (b, j) {
        b.classList.toggle('fait', j < pos); b.classList.toggle('actif', j === pos);
        b.setAttribute('aria-current', j === pos ? 'step' : 'false');
      });
      frise.style.setProperty('--p', pos / (ETAPES.length - 1));
      document.getElementById('loi-prec').disabled = pos === 0;
      document.getElementById('loi-suiv').textContent = pos === ETAPES.length - 1 ? 'Recommencer ↺' : 'Suivant →';
    };
    frise.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) montre(+b.dataset.i); });
    document.getElementById('loi-prec').addEventListener('click', function () { montre(pos - 1); });
    document.getElementById('loi-suiv').addEventListener('click', function () { montre(pos === ETAPES.length - 1 ? 0 : pos + 1); });
    montre(0);
  }

  /* ---------- Semaine type ---------- */
  var SEMAINE = [
    ['Lundi', 'En circonscription', ["Rendez-vous avec des maires et des habitants", "Visite d'entreprise ou d'exploitation agricole", "Permanence : accompagner les démarches bloquées"]],
    ['Mardi', 'À l\'Assemblée', ["Réunion du groupe politique : position sur les textes de la semaine", "Questions au Gouvernement dans l'hémicycle", "Séance publique : examen des textes et amendements"]],
    ['Mercredi', 'À l\'Assemblée', ["Commission : auditions et examen des textes", "Questions au Gouvernement", "Rendez-vous avec des associations, syndicats, experts"]],
    ['Jeudi', 'À l\'Assemblée', ["Séance publique et votes", "Travaux de mission ou de rapport", "Accueil de groupes d'Essonniens au Palais Bourbon"]],
    ['Vendredi', 'Retour en circo', ["Inaugurations, conseils d'école, réunions publiques", "Échanges avec les élus locaux sur leurs projets", "Réponse au courrier des habitants"]],
    ['Week-end', 'Sur le terrain', ["Marchés, fêtes de village, événements sportifs et associatifs", "Cérémonies patriotiques", "Écouter, noter, faire remonter"]]
  ];
  var jours = document.getElementById('semaine-jours');
  var contenu = document.getElementById('semaine-contenu');
  if (jours) {
    jours.innerHTML = SEMAINE.map(function (j, i) {
      return '<button type="button" role="tab" aria-selected="' + (i === 1) + '" data-i="' + i + '">' + j[0] + '</button>';
    }).join('');
    var jour = function (i) {
      var j = SEMAINE[i];
      contenu.innerHTML = '<p class="semaine-lieu ' + (j[1].indexOf('Assemblée') > -1 ? 'paris' : 'circo') + '">' + AI.esc(j[1]) + '</p><h3>' + j[0] + '</h3><ul>' +
        j[2].map(function (l) { return '<li>' + AI.esc(l) + '</li>'; }).join('') + '</ul>';
      jours.querySelectorAll('button').forEach(function (b, k) { b.setAttribute('aria-selected', String(k === i)); });
    };
    jours.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) jour(+b.dataset.i); });
    jour(1);
  }

  /* ---------- Quiz ---------- */
  var Q = [
    ['Combien de députés siègent à l\'Assemblée nationale ?', ['348', '577', '925'], 1, "577 députés. 348, c'est le nombre de sénateurs ; 925, les deux réunis en Congrès."],
    ['Pour combien de temps un député est-il élu ?', ['4 ans', '5 ans', '6 ans'], 1, "5 ans, sauf dissolution de l'Assemblée par le Président de la République."],
    ['Où siège l\'Assemblée nationale ?', ['Au Palais du Luxembourg', 'Au Palais Bourbon', 'Au Palais de l\'Élysée'], 1, "Au Palais Bourbon. Le Palais du Luxembourg accueille le Sénat."],
    ['Combien de signatures faut-il pour déposer une motion de censure ?', ['15', '58', '289'], 1, "58, soit un dixième des députés."],
    ['En cas de désaccord persistant avec le Sénat, qui a le dernier mot ?', ['Le Sénat', 'L\'Assemblée nationale', 'Le Conseil constitutionnel'], 1, "L'Assemblée nationale, si le Gouvernement le lui demande."],
    ['Combien de commissions permanentes compte l\'Assemblée ?', ['6', '8', '12'], 1, "8 commissions : affaires économiques, finances, lois, affaires sociales, culture, défense, affaires étrangères, développement durable."],
    ['Quel est l\'âge minimum pour être élu député ?', ['18 ans', '21 ans', '23 ans'], 0, "18 ans, depuis 2011."],
    ['Quel article de la Constitution permet de faire adopter un texte sans vote, sauf motion de censure ?', ['Article 16', 'Article 49.3', 'Article 89'], 1, "L'article 49 alinéa 3."],
    ['Combien de députés faut-il au minimum pour former un groupe ?', ['10', '15', '20'], 1, "15 députés."],
    ['Combien de députés compte l\'Essonne ?', ['6', '10', '13'], 1, "10 députés, un par circonscription. Alexis Izard a représenté la 3e de 2022 à 2024."]
  ];
  var boite = document.getElementById('quiz-boite');
  if (boite) {
    var n = 0, score = 0;
    var question = function () {
      var q = Q[n];
      boite.innerHTML =
        '<div class="quiz-barre"><span style="width:' + (n / Q.length * 100) + '%"></span></div>' +
        '<p class="quiz-num">Question ' + (n + 1) + ' / ' + Q.length + '</p>' +
        '<h3 class="quiz-q">' + AI.esc(q[0]) + '</h3>' +
        '<div class="quiz-reps">' + q[1].map(function (r, i) {
          return '<button class="btn quiz-rep" type="button" data-i="' + i + '">' + AI.esc(r) + '</button>';
        }).join('') + '</div><p class="quiz-expli" aria-live="polite"></p>';
    };
    var fin = function () {
      var msg = score >= 9 ? 'Incollable ! Vous pourriez siéger.' : score >= 6 ? 'Très bien ! Vous connaissez la maison.' : score >= 3 ? 'Pas mal ! Un petit tour au Palais Bourbon ?' : 'L\'Assemblée a encore des secrets pour vous.';
      boite.innerHTML = '<div class="quiz-fin"><p class="quiz-score">' + score + '<span>/' + Q.length + '</span></p><h3>' + msg + '</h3>' +
        '<div class="actions" style="justify-content:center"><button class="btn btn-rouge" type="button" id="quiz-partage">Partager mon score</button>' +
        '<button class="btn" type="button" id="quiz-rejouer">Rejouer</button></div><p class="quiz-expli" id="quiz-msg"></p></div>';
      document.getElementById('quiz-rejouer').onclick = function () { n = 0; score = 0; question(); };
      document.getElementById('quiz-partage').onclick = function () {
        var t = "J'ai eu " + score + '/10 au quiz sur l\'Assemblée nationale d\'Alexis Izard. Et vous ?';
        var u = location.origin + location.pathname + '#quiz';
        if (navigator.share) { navigator.share({ title: 'Quiz Assemblée', text: t, url: u }).catch(function () {}); }
        else if (navigator.clipboard) { navigator.clipboard.writeText(t + ' ' + u); document.getElementById('quiz-msg').textContent = 'Lien copié, collez-le où vous voulez !'; }
      };
    };
    boite.addEventListener('click', function (e) {
      var b = e.target.closest('.quiz-rep');
      if (b && !boite.dataset.repondu) {
        boite.dataset.repondu = '1';
        var q = Q[n], i = +b.dataset.i, ok = i === q[2];
        if (ok) score++;
        boite.querySelectorAll('.quiz-rep').forEach(function (x, j) {
          x.disabled = true;
          if (j === q[2]) x.classList.add('bon');
          else if (j === i) x.classList.add('faux');
        });
        var ex = boite.querySelector('.quiz-expli');
        ex.innerHTML = '<b>' + (ok ? 'Bonne réponse !' : 'Raté.') + '</b> ' + AI.esc(q[3]) +
          ' <button class="btn btn-bleu btn-sm" type="button" id="quiz-suite">' + (n === Q.length - 1 ? 'Voir mon score' : 'Question suivante →') + '</button>';
        document.getElementById('quiz-suite').onclick = function () { delete boite.dataset.repondu; n++; n < Q.length ? question() : fin(); };
      }
    });
    question();
  }
})();
