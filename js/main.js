/* ==========================================================================
   VicGames — main.js
   Меню, прогресс скролла, появление блоков, фильтры каталога, параллакс.
   ========================================================================== */

(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(pointer: fine)');

  /* ----------------------------------------------------------------------
     Header, scroll progress, back-to-top
     ---------------------------------------------------------------------- */

  var header = document.getElementById('siteHeader');
  var progress = document.getElementById('scrollProgress');
  var toTop = document.getElementById('toTop');
  var year = document.getElementById('year');

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  function onScroll() {
    var top = window.pageYOffset || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;

    if (header) {
      header.classList.toggle('is-scrolled', top > 8);
    }
    if (progress) {
      var ratio = docHeight > 0 ? Math.min(top / docHeight, 1) : 0;
      progress.style.transform = 'scaleX(' + ratio + ')';
    }
    if (toTop) {
      toTop.hidden = top < 640;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({
        top: 0,
        behavior: reduceMotion.matches ? 'auto' : 'smooth'
      });
    });
  }

  /* ----------------------------------------------------------------------
     Mobile navigation
     ---------------------------------------------------------------------- */

  var burger = document.getElementById('burger');
  var mobileNav = document.getElementById('mobileNav');

  function closeMenu() {
    if (!burger || !mobileNav) return;
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
    mobileNav.hidden = true;
    header.classList.remove('menu-open');
    document.body.classList.remove('no-scroll');
  }

  function openMenu() {
    if (!burger || !mobileNav) return;
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Закрыть меню');
    mobileNav.hidden = false;
    header.classList.add('menu-open');
    document.body.classList.add('no-scroll');
  }

  if (burger && mobileNav) {
    burger.addEventListener('click', function () {
      var isOpen = burger.getAttribute('aria-expanded') === 'true';
      if (isOpen) closeMenu();
      else openMenu();
    });

    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        burger.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 980) closeMenu();
    });
  }

  /* ----------------------------------------------------------------------
     Reveal on scroll
     ---------------------------------------------------------------------- */

  var revealItems = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));

  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealItems.forEach(function (item) { revealObserver.observe(item); });
  } else {
    revealItems.forEach(function (item) { item.classList.add('is-visible'); });
  }

  /* ----------------------------------------------------------------------
     Catalog filters
     ---------------------------------------------------------------------- */

  var grid = document.getElementById('gamesGrid');
  var cards = grid ? Array.prototype.slice.call(grid.querySelectorAll('.game-card')) : [];
  var genreButtons = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
  var platformButtons = Array.prototype.slice.call(document.querySelectorAll('[data-platform]'));
  var searchInput = document.getElementById('gameSearch');
  var searchClear = document.getElementById('searchClear');
  var resultCount = document.getElementById('resultCount');
  var resultLabel = document.getElementById('resultCountLabel');
  var status = document.getElementById('catalogStatus');
  var emptyState = document.getElementById('emptyState');
  var resetButton = document.getElementById('resetFilters');
  var gamesSection = document.getElementById('games');

  var state = { genre: 'all', platform: 'all', query: '' };
  var validGenres = ['all', 'horror', 'puzzle', 'arcade', 'hidden', 'creative', 'online'];
  var validPlatforms = ['all', 'google', 'rustore', 'playgama'];

  function normalize(value) {
    return String(value || '').toLowerCase().replace(/ё/g, 'е').trim();
  }

  function pluralGames(count) {
    var mod10 = count % 10;
    var mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return 'игра';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'игры';
    return 'игр';
  }

  function cardMatches(card) {
    var genres = (card.getAttribute('data-genres') || '').split(/\s+/);
    var platforms = (card.getAttribute('data-platforms') || '').split(/\s+/);

    if (state.genre !== 'all' && genres.indexOf(state.genre) === -1) return false;
    if (state.platform !== 'all' && platforms.indexOf(state.platform) === -1) return false;

    if (state.query) {
      var haystack = normalize(
        (card.getAttribute('data-title') || '') + ' ' +
        card.textContent + ' ' +
        genres.join(' ')
      );
      if (haystack.indexOf(state.query) === -1) return false;
    }

    return true;
  }

  function syncUrl() {
    if (!window.history || !window.history.replaceState) return;
    var params = new URLSearchParams();
    if (state.genre !== 'all') params.set('genre', state.genre);
    if (state.platform !== 'all') params.set('platform', state.platform);
    if (state.query) params.set('q', state.query);
    var qs = params.toString();
    var url = window.location.pathname + (qs ? '?' + qs : '');
    try {
      window.history.replaceState(null, '', url);
    } catch (error) {
      /* ignore (file:// или ограниченное окружение) */
    }
  }

  function applyFilters() {
    var visible = 0;

    cards.forEach(function (card) {
      var match = cardMatches(card);
      card.hidden = !match;
      if (match) visible += 1;
    });

    genreButtons.forEach(function (button) {
      var active = button.getAttribute('data-filter') === state.genre;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    platformButtons.forEach(function (button) {
      var active = button.getAttribute('data-platform') === state.platform;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    if (resultCount) resultCount.textContent = String(visible);
    if (resultLabel) resultLabel.textContent = pluralGames(visible);
    if (emptyState) emptyState.hidden = visible !== 0;
    if (status) {
      status.textContent = 'Показано ' + visible + ' ' + pluralGames(visible) + ' из ' + cards.length;
    }

    syncUrl();
  }

  function resetFilters() {
    state.genre = 'all';
    state.platform = 'all';
    state.query = '';
    if (searchInput) searchInput.value = '';
    if (searchClear) searchClear.hidden = true;
    applyFilters();
  }

  genreButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      state.genre = button.getAttribute('data-filter');
      applyFilters();
    });
  });

  platformButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      state.platform = button.getAttribute('data-platform');
      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      state.query = normalize(searchInput.value);
      if (searchClear) searchClear.hidden = searchInput.value.length === 0;
      applyFilters();
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', function () {
      if (!searchInput) return;
      searchInput.value = '';
      state.query = '';
      searchClear.hidden = true;
      searchInput.focus();
      applyFilters();
    });
  }

  if (resetButton) {
    resetButton.addEventListener('click', resetFilters);
  }

  /* Быстрые ссылки: ?genre=online&platform=playgama&q=... */
  (function initStateFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var genre = params.get('genre');
    var platform = params.get('platform');
    var query = params.get('q');

    if (genre && validGenres.indexOf(genre) !== -1) state.genre = genre;
    if (platform && validPlatforms.indexOf(platform) !== -1) state.platform = platform;
    if (query) {
      state.query = normalize(query);
      if (searchInput) searchInput.value = query;
      if (searchClear) searchClear.hidden = false;
    }

    if (cards.length) applyFilters();
  })();

  /* Переходы из hero и подвала: применить фильтр и прокрутить к каталогу */
  document.querySelectorAll('[data-jump-filter], [data-jump-platform]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      var genre = link.getAttribute('data-jump-filter');
      var platform = link.getAttribute('data-jump-platform');
      event.preventDefault();

      if (genre && validGenres.indexOf(genre) !== -1) state.genre = genre;
      if (platform && validPlatforms.indexOf(platform) !== -1) state.platform = platform;

      applyFilters();
      closeMenu();

      if (gamesSection) {
        gamesSection.scrollIntoView({
          behavior: reduceMotion.matches ? 'auto' : 'smooth',
          block: 'start'
        });
      }
    });
  });

  /* ----------------------------------------------------------------------
     Лёгкий параллакс коллажа за курсором
     ---------------------------------------------------------------------- */

  var hero = document.querySelector('.hero');
  var heroVisual = document.querySelector('.hero__visual');
  var ticking = false;
  var pointer = { x: 0, y: 0 };

  function renderParallax() {
    ticking = false;
    if (!heroVisual) return;
    var x = pointer.x * 8;
    var y = pointer.y * 8;
    heroVisual.style.transform = 'translate3d(' + x.toFixed(2) + 'px, ' + y.toFixed(2) + 'px, 0)';
  }

  if (hero && heroVisual && finePointer.matches && !reduceMotion.matches) {
    hero.addEventListener('pointermove', function (event) {
      var rect = hero.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / rect.width - 0.5;
      pointer.y = (event.clientY - rect.top) / rect.height - 0.5;
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(renderParallax);
      }
    });

    hero.addEventListener('pointerleave', function () {
      pointer.x = 0;
      pointer.y = 0;
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(renderParallax);
      }
    });
  }
})();
