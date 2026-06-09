/**
 * LUSTROUS EXPANSE WIKI — wiki.js
 * Features: dark mode (persisted), live search, TOC highlighting,
 *           collapsible sections, image lightbox, page transitions,
 *           sidebar category tree.
 */

(function () {
  'use strict';

  /* ── 1. Dark Mode ───────────────────────────────────────────── */
  const DarkMode = {
    KEY: 'wiki-theme',
    btn: null,

    init() {
      this.btn = document.getElementById('mode-toggle');
      const saved = sessionStorage.getItem(this.KEY) || localStorage.getItem(this.KEY);
      if (saved === 'dark') this.apply('dark', false);
      else this.apply('light', false);
      if (this.btn) this.btn.addEventListener('click', () => this.toggle());
    },

    apply(mode, animate = true) {
      const html = document.documentElement;
      if (animate) html.style.transition = 'none'; // let CSS handle it
      if (mode === 'dark') {
        html.classList.add('dark');
        if (this.btn) this.btn.textContent = '☀️';
        if (this.btn) this.btn.title = 'Switch to light mode';
      } else {
        html.classList.remove('dark');
        if (this.btn) this.btn.textContent = '🌙';
        if (this.btn) this.btn.title = 'Switch to dark mode';
      }
      localStorage.setItem(this.KEY, mode);
      sessionStorage.setItem(this.KEY, mode);
    },

    toggle() {
      const isDark = document.documentElement.classList.contains('dark');
      this.apply(isDark ? 'light' : 'dark');
    }
  };

  /* ── 2. Live Search ─────────────────────────────────────────── */
  const Search = {
    input: null,
    results: null,
    pages: [], // populated by page data

    init() {
      this.input = document.getElementById('wiki-search');
      this.results = document.getElementById('search-results');
      if (!this.input || !this.results) return;

      // Build search index from global WIKI_PAGES if available
      if (typeof WIKI_PAGES !== 'undefined') {
        this.pages = WIKI_PAGES;
      }

      this.input.addEventListener('input', () => this.query(this.input.value));
      this.input.addEventListener('focus', () => {
        if (this.input.value.trim()) this.results.classList.add('visible');
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.wiki-header__search')) {
          this.results.classList.remove('visible');
        }
      });
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.results.classList.remove('visible');
          this.input.blur();
        }
      });
    },

    query(term) {
      term = term.trim();
      this.results.innerHTML = '';
      if (!term || term.length < 2) {
        this.results.classList.remove('visible');
        return;
      }

      const lower = term.toLowerCase();
      const matches = this.pages.filter(p =>
        p.name.toLowerCase().includes(lower) ||
        (p.excerpt && p.excerpt.toLowerCase().includes(lower))
      ).slice(0, 8);

      if (matches.length === 0) {
        this.results.innerHTML = `<div class="search-no-results">No pages found for "<em>${this.escape(term)}</em>"</div>`;
      } else {
        matches.forEach(p => {
          const item = document.createElement('a');
          item.className = 'search-result-item';
          item.href = p.href || '#';
          item.innerHTML = `
            <span class="search-result-item__type">${this.escape(p.type || 'Page')}</span>
            <span>
              <span class="search-result-item__name">${this.highlight(p.name, term)}</span>
              ${p.excerpt ? `<span class="search-result-item__excerpt">${this.escape(p.excerpt)}</span>` : ''}
            </span>`;
          this.results.appendChild(item);
        });
      }
      this.results.classList.add('visible');
    },

    highlight(text, term) {
      const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return this.escape(text).replace(re, '<mark>$1</mark>');
    },

    escape(str) {
      return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
  };

  /* ── 3. TOC Active Highlighting ─────────────────────────────── */
  const TocHighlight = {
    links: [],
    headings: [],
    observer: null,

    init() {
      const toc = document.querySelector('.toc-list');
      if (!toc) return;

      this.links = Array.from(toc.querySelectorAll('a[href^="#"]'));
      this.headings = this.links
        .map(a => document.getElementById(a.getAttribute('href').slice(1)))
        .filter(Boolean);

      if (!this.headings.length) return;

      this.observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const id = entry.target.id;
              this.links.forEach(a => {
                a.classList.toggle('toc-active', a.getAttribute('href') === '#' + id);
              });
            }
          });
        },
        {
          rootMargin: `-${getComputedStyle(document.documentElement)
            .getPropertyValue('--header-h').trim()} 0px -70% 0px`
        }
      );

      this.headings.forEach(h => this.observer.observe(h));
    },

    destroy() {
      if (this.observer) this.observer.disconnect();
    }
  };

  /* ── 4. TOC Toggle ──────────────────────────────────────────── */
  const TocToggle = {
    init() {
      const btn = document.querySelector('.toc-toggle');
      if (!btn) return;
      const body = document.querySelector('.toc-body');
      btn.addEventListener('click', () => {
        const hidden = body.classList.toggle('hidden');
        btn.textContent = hidden ? '[show]' : '[hide]';
      });
    }
  };

  /* ── 5. Collapsible Sidebar Sections ────────────────────────── */
  const SidebarCollapse = {
    init() {
      document.querySelectorAll('.sidebar-section__header').forEach(header => {
        const section = header.closest('.sidebar-section');
        // Restore state
        const key = 'sidebar-' + (section.dataset.key || Math.random());
        const saved = localStorage.getItem(key);
        if (saved === 'collapsed') section.classList.add('collapsed');

        header.addEventListener('click', () => {
          const now = section.classList.toggle('collapsed');
          localStorage.setItem(key, now ? 'collapsed' : 'open');
        });
      });
    }
  };

  /* ── 6. Collapsible Infobox Sections ────────────────────────── */
  const InfboxCollapse = {
    init() {
      document.querySelectorAll('.infobox__section-header').forEach(header => {
        const body = header.nextElementSibling;
        if (!body || !body.classList.contains('infobox__section-body')) return;
        header.addEventListener('click', () => {
          const now = header.classList.toggle('collapsed');
          body.classList.toggle('collapsed', now);
        });
      });
    }
  };

  /* ── 7. Image Lightbox ──────────────────────────────────────── */
  const Lightbox = {
    el: null,
    img: null,
    cap: null,

    init() {
      this.el = document.getElementById('lightbox');
      if (!this.el) return;
      this.img = this.el.querySelector('img');
      this.cap = document.getElementById('lightbox-caption');
      const closeBtn = document.getElementById('lightbox-close');

      document.querySelectorAll('.gallery-item, [data-lightbox]').forEach(item => {
        item.addEventListener('click', () => {
          const src = item.dataset.src || item.querySelector('img')?.src;
          const caption = item.dataset.caption || item.querySelector('figcaption')?.textContent || '';
          if (src) this.open(src, caption);
        });
      });

      closeBtn?.addEventListener('click', () => this.close());
      this.el.addEventListener('click', (e) => {
        if (e.target === this.el) this.close();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.el.classList.contains('open')) this.close();
      });
    },

    open(src, caption) {
      this.img.src = src;
      if (this.cap) this.cap.textContent = caption;
      this.el.classList.add('open');
      document.body.style.overflow = 'hidden';
    },

    close() {
      this.el.classList.remove('open');
      document.body.style.overflow = '';
    }
  };

  /* ── 8. Mobile Sidebar Toggle ────────────────────────────────── */
  const MobileSidebar = {
    init() {
      const btn = document.getElementById('sidebar-toggle');
      const sidebar = document.getElementById('wiki-sidebar');
      if (!btn || !sidebar) return;

      btn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (
          sidebar.classList.contains('open') &&
          !sidebar.contains(e.target) &&
          e.target !== btn
        ) {
          sidebar.classList.remove('open');
        }
      });
    }
  };

  /* ── 9. Smooth Scroll Offset (for fixed header) ──────────────── */
  const SmoothScroll = {
    init() {
      document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', (e) => {
          const id = a.getAttribute('href').slice(1);
          const target = document.getElementById(id);
          if (!target) return;
          e.preventDefault();
          const headerH = parseInt(
            getComputedStyle(document.documentElement).getPropertyValue('--header-h')
          ) || 52;
          const y = target.getBoundingClientRect().top + window.scrollY - headerH - 12;
          window.scrollTo({ top: y, behavior: 'smooth' });
        });
      });
    }
  };

  /* ── 10. Page Transition Overlay ────────────────────────────── */
  const PageTransition = {
    overlay: null,

    init() {
      this.overlay = document.getElementById('page-transition-overlay');
      if (!this.overlay) return;

      // Fade in on load
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.overlay.style.opacity = '0';
        });
      });

      // Fade out on internal link clicks
      document.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;
        link.addEventListener('click', (e) => {
          e.preventDefault();
          this.overlay.classList.add('active');
          setTimeout(() => { window.location.href = href; }, 220);
        });
      });
    }
  };

  /* ── 11. Active Sidebar Link ────────────────────────────────── */
  const SidebarActive = {
    init() {
      const current = window.location.pathname.split('/').pop();
      document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.split('/').pop() === current) {
          link.classList.add('active');
          // Ensure parent section is open
          const section = link.closest('.sidebar-section');
          if (section) section.classList.remove('collapsed');
        }
      });
    }
  };

  /* ── 12. Details / Collapsible Sections ─────────────────────── */
  const CollapsibleDetails = {
    init() {
      // already handled natively by <details>, but we can add animation
      document.querySelectorAll('details.collapsible-section').forEach(el => {
        el.addEventListener('toggle', () => {
          // Animation is done via CSS
        });
      });
    }
  };

  /* ── Boot ───────────────────────────────────────────────────── */
  function boot() {
    DarkMode.init();
    Search.init();
    TocHighlight.init();
    TocToggle.init();
    SidebarCollapse.init();
    InfboxCollapse.init();
    Lightbox.init();
    MobileSidebar.init();
    SmoothScroll.init();
    PageTransition.init();
    SidebarActive.init();
    CollapsibleDetails.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Expose for external page-data injection
  window.WikiJS = { DarkMode, Search, Lightbox };
})();
