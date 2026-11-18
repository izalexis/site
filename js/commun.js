/* Comportements communs à toutes les pages */
(function () {
  document.documentElement.classList.add('js');

  // Menu mobile
  var burger = document.querySelector('.burger');
  var menu = document.getElementById('menu');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var ouvert = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!ouvert));
      menu.classList.toggle('ouvert', !ouvert);
    });
  }

  // Sous-menu « Infos utiles »
  document.querySelectorAll('.menu-groupe').forEach(function (g) {
    var b = g.querySelector('.menu-bouton');
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var o = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(o));
      g.classList.toggle('ouvert', o);
    });
  });
  function fermerGroupes() {
    document.querySelectorAll('.menu-groupe.ouvert').forEach(function (g) {
      g.classList.remove('ouvert'); g.querySelector('.menu-bouton').setAttribute('aria-expanded', 'false');
    });
  }
  document.addEventListener('click', function (e) { if (!e.target.closest('.menu-groupe')) fermerGroupes(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fermerGroupes(); });

  // Liens email (adresse assemblée en JS pour limiter le spam)
  document.querySelectorAll('.js-mail').forEach(function (a) {
    var adr = a.dataset.u + '@' + a.dataset.d;
    a.href = 'mailto:' + adr + '?subject=' + encodeURIComponent(a.dataset.sujet || 'Message depuis alexisizard.fr');
  });
  document.querySelectorAll('.js-mail-texte').forEach(function (el) {
    el.textContent = el.dataset.u + '@' + el.dataset.d;
  });
  document.querySelectorAll('.js-copier').forEach(function (b) {
    if (!navigator.clipboard) { b.hidden = true; return; }
    b.addEventListener('click', function () {
      navigator.clipboard.writeText(b.dataset.u + '@' + b.dataset.d).then(function () {
        var t = b.textContent; b.textContent = 'Copiée ✓';
        setTimeout(function () { b.textContent = t; }, 1800);
      });
    });
  });

  document.querySelectorAll('.js-annee').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // Apparition au défilement
  var els = document.querySelectorAll('.apparait');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('vu'); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('vu'); });
  }
})();

/* Petit utilitaire partagé */
window.AI = {
  json: function (url) { return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); },
  norm: function (s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); },
  esc: function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); },
  fmt: function (n) { return Number(n).toLocaleString('fr-FR'); }
};
