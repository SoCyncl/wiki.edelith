/* edelith-header.js
   The Immortal City of Edelith — Campaign Wiki Header
   Usage: <script src="edelith-header.js"></script>
   Drop anywhere in your HTML. Loads fonts and fitty itself.
*/

(function() {

  /* ============================================================
     1. EXTERNAL DEPENDENCIES
     ============================================================ */
  function loadLink(href, id) {
    if (id && document.getElementById(id)) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href;
    if (id) l.id = id;
    document.head.appendChild(l);
  }
  function loadScript(src, id, callback) {
    if (id && document.getElementById(id)) { if (callback) callback(); return; }
    var s = document.createElement('script');
    s.src = src; if (id) s.id = id;
    if (callback) s.onload = callback;
    document.head.appendChild(s);
  }

  loadLink('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&display=swap', 'ed-font-serif');
  loadLink('https://solar-icons.gitlab.io/i/icons.css', 'ed-font-solar');
  loadLink('/style/wiki.css', 'ed-header-styles');

  /* ============================================================
     2. HTML
     ============================================================ */
  var HTML = `
<div class="ed-tog-back"></div>

<div class="ed-tog">
  <div class="ed-tog-bulk">
    <div class="ed-tog-bulk2">
      <div class="ed-tog-bulk3">

        <!-- QUICK SEARCH / RECENT -->
        <div class="ed-tog-search">
          <div class="ed-tog-search-label">search the archives</div>
          <div class="ed-tog-search-row">
            <input type="text" class="ed-search-input" placeholder="Find an article, place, character..." />
            <button class="ed-search-btn"><i class="solar-icons" stroke="2" icon-name="magnifier"></i></button>
          </div>
          <div class="ed-tog-recent">
            <span>recently viewed:</span>
            <a href="#">The Sunken Quarter</a>
            <a href="#">House Vel'Aryn</a>
            <a href="#">The Undying Compact</a>
            <a href="#">Arcanist's Row</a>
          </div>
        </div>

        <!-- NAV LINK COLUMNS -->
        <div class="ed-tog-links">

          <div class="ed-tog-links2">
            <h1><b>the city</b></h1>
            <div>
              <a href="#">history of edelith</a>
              <a href="#">districts &amp; quarters</a>
              <a href="#">the immortal compact</a>
              <a href="#">laws &amp; governance</a>
              <a href="#">the undying courts</a>
            </div>
          </div>

          <div class="ed-tog-links2">
            <h1><b>factions</b></h1>
            <div>
              <a href="#">noble houses</a>
              <a href="#">the grey syndicate</a>
              <a href="#">the sunken faith</a>
              <a href="#">arcanist lodges</a>
              <a href="#">street guilds</a>
            </div>
          </div>

          <div class="ed-tog-links2">
            <h1><b>people</b></h1>
            <div>
              <a href="#">player characters</a>
              <a href="#">notable npcs</a>
              <a href="#">the immortals</a>
              <a href="#">deceased &amp; fallen</a>
            </div>
          </div>

          <div class="ed-tog-links2">
            <h1><b>the world</b></h1>
            <div>
              <a href="#">solstitheo (nation)</a>
              <a href="#">geography &amp; maps</a>
              <a href="#">religion &amp; gods</a>
              <a href="#">magic &amp; arcanology</a>
              <a href="#">beyond edelith</a>
            </div>
          </div>

          <div class="ed-tog-links2">
            <h1><b>chronicle</b></h1>
            <div>
              <a href="#">session logs</a>
              <a href="#">current arc</a>
              <a href="#">timeline of events</a>
              <a href="#">rumour board</a>
            </div>
          </div>

          <div class="ed-tog-links2">
            <h1><b>reference</b></h1>
            <div>
              <a href="#">rules &amp; homebrew</a>
              <a href="#">languages</a>
              <a href="#">glossary</a>
              <a href="#">contributor guide</a>
              <a href="https://edelith.org" target="_blank">main site</a>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>

  <!-- RIGHT PANEL: city sigil + atmosphere -->
  <div class="ed-tog-right">
    <div class="ed-tog-right-im">
      <div class="ed-tog-right-img"></div>
    </div>
    <div class="ed-tog-right2">
      <div class="ed-city-sigil">
        <div class="ed-sigil-ring"></div>
        <div class="ed-sigil-inner">
          <span>&#9670;</span>
        </div>
      </div>
      <div class="ed-city-title">
        <span>the immortal city</span>
        <b id="ed-city-name">edelith</b>
        <em>nation of solstitheo</em>
      </div>
      <div class="ed-tog-font">
        <div>text size</div>
        <button id="ed-font-up"><i class="solar-icons" stroke="2" icon-name="search-3-zoom-in"></i></button>
        <button id="ed-font-reset"><i class="solar-icons" stroke="2" icon-name="search-3"></i></button>
        <button id="ed-font-down"><i class="solar-icons" stroke="2" icon-name="search-3-zoom-out"></i></button>
      </div>
      <div class="ed-tog-font">
        <div>texture</div>
        <button id="ed-rough"><i class="solar-icons" stroke="2" icon-name="asteroid"></i></button>
        <button id="ed-smooth"><i class="solar-icons" stroke="2" icon-name="record"></i></button>
      </div>
      <div class="ed-arc-block">
        <div class="ed-arc-eyebrow">current arc</div>
        <div class="ed-arc-name">the sunken bells</div>
        <div class="ed-arc-session">session 24</div>
      </div>
    </div>
  </div>
</div>

<!-- FIXED TOP BAR -->
<div class="ed-menu">
  <div class="ed-menu2">
    <div class="ed-menu-left">
      <a href="/" class="ed-menu-wordmark">
        <span class="ed-menu-glyph">&#9670;</span>
        <span>edelith</span>
      </a>
      <div class="ed-menu-breadcrumb">campaign wiki</div>
    </div>
    <div class="ed-menu-right">
      <a href="#" class="ed-menu-link">
        <i class="solar-icons" stroke="2" icon-name="clock-circle"></i>recent changes
      </a>
      <a href="https://edelith.org" target="_blank" class="ed-menu-link">
        <i class="solar-icons" stroke="2" icon-name="arrow-right-up"></i>main site
      </a>
      <div id="ed-darkmode" class="ed-menu-link ed-menu-btn">
        <i class="solar-icons" stroke="2" icon-name="sun-2"></i>mode
      </div>
      <div id="ed-menu" class="ed-menu-link ed-menu-btn">
        <i class="solar-icons" stroke="2" icon-name="menu-lines-2"></i>archives
      </div>
    </div>
  </div>
</div>

<!-- BANNER / MASTHEAD -->
<div class="ed-ban">
  <div class="ed-ban-inner">
    <div class="ed-ban-bg"></div>
    <div class="ed-ban-content">
      <div class="ed-ban-eyebrow">the immortal city of</div>
      <h1 class="ed-ban-title" id="ed-ban-el">edelith</h1>
      <div class="ed-ban-sub"></div>
    </div>
  </div>
</div>
`;

  document.body.insertAdjacentHTML('afterbegin', HTML);

  /* ============================================================
     3. BEHAVIOUR
     ============================================================ */
  function initBehaviour() {
    if (typeof fitty !== 'undefined') {
      fitty('#ed-ban-el', { minSize: 28, maxSize: 76, multiLine: false });
    }

    /* restore prefs */
    if (localStorage.getItem('ed-darkMode') === 'true')   document.body.classList.add('darkmode');
    if (localStorage.getItem('ed-smoothMode') === 'true') document.body.classList.add('smooth');

    var r = document.documentElement;
    var savedFont = localStorage.getItem('ed-fontSize') || '15';
    var savedLine = localStorage.getItem('ed-lineHeight') || '24';
    r.style.setProperty('--fontSize',   savedFont + 'px');
    r.style.setProperty('--lineHeight', savedLine + 'px');

    document.getElementById('ed-darkmode').addEventListener('click', function() {
      var on = document.body.classList.toggle('darkmode');
      on ? localStorage.setItem('ed-darkMode','true') : localStorage.removeItem('ed-darkMode');
    });

    document.getElementById('ed-menu').addEventListener('click', function() {
      document.body.classList.toggle('ed-menu-open');
    });

    document.getElementById('ed-smooth').addEventListener('click', function() {
      document.body.classList.add('smooth');
      localStorage.setItem('ed-smoothMode','true');
    });
    document.getElementById('ed-rough').addEventListener('click', function() {
      document.body.classList.remove('smooth');
      localStorage.removeItem('ed-smoothMode');
    });

    function setFont(df, dl) {
      var f = parseFloat(r.style.getPropertyValue('--fontSize'))  || 15;
      var l = parseFloat(r.style.getPropertyValue('--lineHeight')) || 24;
      f = Math.min(32, Math.max(10, f + df));
      l = Math.min(42, Math.max(18, l + dl));
      r.style.setProperty('--fontSize',   f + 'px');
      r.style.setProperty('--lineHeight', l + 'px');
      localStorage.setItem('ed-fontSize',   f);
      localStorage.setItem('ed-lineHeight', l);
    }
    document.getElementById('ed-font-up').addEventListener('click',    function(){ setFont( 1, 1); });
    document.getElementById('ed-font-down').addEventListener('click',  function(){ setFont(-1,-1); });
    document.getElementById('ed-font-reset').addEventListener('click', function(){
      r.style.setProperty('--fontSize','15px');
      r.style.setProperty('--lineHeight','24px');
      localStorage.setItem('ed-fontSize','15');
      localStorage.setItem('ed-lineHeight','24');
    });

    /* close menu on backdrop click */
    document.querySelector('.ed-tog-back').addEventListener('click', function() {
      document.body.classList.remove('ed-menu-open');
    });

    /* ============================================================
       SEARCH — Lunr full-text
       Expects /search-index.json (array of { title, url, category, excerpt, tags[] })
       ============================================================ */
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/lunr.js/2.3.9/lunr.min.js', 'ed-lunr', function() {
      var searchData = [];
      var lunrIndex  = null;

      fetch('search-index.json')
        .then(function(res) { return res.json(); })
        .then(function(data) {
          searchData = data;
          lunrIndex = lunr(function() {
            this.ref('url');
            this.field('title',   { boost: 10 });
            this.field('tags',    { boost: 5  });
            this.field('excerpt');
            data.forEach(function(item) {
              this.add({
                url:     item.url,
                title:   item.title,
                tags:    item.tags.join(' '),
                excerpt: item.excerpt
              });
            }, this);
          });
        })
        .catch(function(err) {
          console.warn('Edelith search: could not load search-index.json', err);
        });

      function getOrCreateResultsContainer() {
        var c = document.querySelector('.ed-tog-results');
        if (!c) {
          c = document.createElement('div');
          c.className = 'ed-tog-results';
          document.querySelector('.ed-tog-search').appendChild(c);
        }
        return c;
      }

      function closeResults() {
        var c = document.querySelector('.ed-tog-results');
        if (c) c.classList.remove('is-open');
      }

      function doSearch(q) {
        var container = getOrCreateResultsContainer();
        q = q.trim();

        /* empty query — close and clear */
        if (!q) {
          container.classList.remove('is-open');
          container.innerHTML = '';
          return;
        }

        /* index not ready yet */
        if (!lunrIndex) {
          container.innerHTML = '<div class="ed-search-empty">Index still loading — try again in a moment.</div>';
          container.classList.add('is-open');
          return;
        }

        /* run the search */
        var raw = [];
        try {
          raw = lunrIndex.search(q + '~1');
          if (!raw.length) raw = lunrIndex.search(q + '*');
        } catch(e) {
          try { raw = lunrIndex.search(q); } catch(e2) { /* bad query, ignore */ }
        }

        var results = raw.slice(0, 8)
          .map(function(hit) { return searchData.find(function(d) { return d.url === hit.ref; }); })
          .filter(Boolean);

        if (!results.length) {
          container.innerHTML = '<div class="ed-search-empty">No results for \u201c' + q + '\u201d</div>';
          container.classList.add('is-open');
          return;
        }

        /* build result links */
        container.innerHTML = results.map(function(item) {
          return '<a href="' + item.url + '" class="ed-search-result">'
            + '<span class="ed-search-cat">'     + item.category + '</span>'
            + '<span class="ed-search-title">'   + item.title    + '</span>'
            + '<span class="ed-search-excerpt">' + item.excerpt  + '</span>'
            + '</a>';
        }).join('');

        /* close dropdown when a result is clicked */
        container.querySelectorAll('.ed-search-result').forEach(function(el) {
          el.addEventListener('click', function() {
            closeResults();
          });
        });

        container.classList.add('is-open');
      }

      var searchInput = document.querySelector('.ed-search-input');
      var searchBtn   = document.querySelector('.ed-search-btn');
      var timer;

      searchInput.addEventListener('input', function() {
        clearTimeout(timer);
        if (!searchInput.value.trim()) {
          closeResults();
          return;
        }
        timer = setTimeout(function() { doSearch(searchInput.value); }, 180);
      });

      searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { clearTimeout(timer); doSearch(searchInput.value); }
      });

      searchBtn.addEventListener('click', function() {
        clearTimeout(timer); doSearch(searchInput.value);
      });

    }); /* end lunr loader */

  } /* end initBehaviour */

  function loadFittyThenInit() {
    if (typeof fitty !== 'undefined') { initBehaviour(); return; }
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/fitty/2.3.6/fitty.min.js', 'ed-fitty', initBehaviour);
  }

  if (typeof jQuery === 'undefined') {
    loadScript('https://code.jquery.com/jquery-3.7.1.min.js', 'ed-jquery', loadFittyThenInit);
  } else {
    loadFittyThenInit();
  }

})();
