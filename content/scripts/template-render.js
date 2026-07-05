'use strict';

/* ══════════════════════════════════════════════════
   Edelith Wiki — app.js
   Features: markdown pages, [[wiki links]], infobox,
   auto-TOC, lightbox, galleries, search, backlinks
══════════════════════════════════════════════════ */

/* ── state ── */
let manifest       = null;
let pageIndex      = {};   // slug → { title, category }
let searchCache    = null; // [{ slug, title, category, text }]
let backlinksIndex = null; // slug → [{ slug, title }]
const lb = { images: [], idx: 0, el: null, imgEl: null, capEl: null };

/* ── elements ── */
const contentEl       = document.getElementById('content');
const navEl           = document.getElementById('navCategories');
const searchInput     = document.getElementById('searchInput');
const searchResultsEl = document.getElementById('searchResults');

init();

/* ══════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════ */
async function init() {
  manifest = await fetch('pages.json').then(r => r.json());

  document.getElementById('site-name').textContent  = manifest.siteTitle;
  document.getElementById('footerText').textContent =
    `${manifest.siteTitle} — ${manifest.tagline}`;
  document.title = manifest.siteTitle;

  buildIndex();
  buildNav();
  bindSearch();
  bindNavToggle();
  createLightboxDOM();

  window.addEventListener('hashchange', loadFromHash);
  loadFromHash();
}

/* ══════════════════════════════════════════════════
   PAGE INDEX + NAV
══════════════════════════════════════════════════ */
function buildIndex() {
  manifest.categories.forEach(cat =>
    cat.pages.forEach(p => { pageIndex[p.slug] = { title: p.title, category: cat.name }; })
  );
}

function buildNav() {
  navEl.innerHTML = '';
  manifest.categories.forEach(cat => {
    const block = document.createElement('div');
    block.className = 'nav-category';

    const h = document.createElement('h2');
    h.textContent = cat.name;
    block.appendChild(h);

    const ul = document.createElement('ul');
    cat.pages.forEach(p => {
      const li = document.createElement('li');
      const a  = document.createElement('a');
      a.href = `#${p.slug}`;
      a.textContent = p.title;
      a.dataset.slug = p.slug;
      li.appendChild(a);
      ul.appendChild(li);
    });
    block.appendChild(ul);
    navEl.appendChild(block);
  });
}

/* ══════════════════════════════════════════════════
   ROUTING + PAGE LOAD
══════════════════════════════════════════════════ */
function loadFromHash() {
  const slug = (location.hash || `#${manifest.home}`).slice(1);
  loadPage(slug);
}

async function loadPage(slug) {
  highlightActiveNav(slug);
  contentEl.innerHTML = '<p class="loading">Loading…</p>';

  let raw;
  try {
    const res = await fetch(`pages/${slug}.md`);
    if (!res.ok) throw new Error();
    raw = await res.text();
  } catch {
    contentEl.innerHTML =
      `<h1>Page not found</h1><p>No page at <code>${esc(slug)}</code> yet.</p>`;
    return;
  }

  const { meta, bodyHTML } = parseContent(raw);

  const article = document.createElement('article');
  article.innerHTML = `
    <header class="page-header">
      <h1>${esc(meta.title || pageIndex[slug]?.title || slug)}</h1>
      ${meta.subtitle ? `<p class="page-subtitle">${esc(meta.subtitle)}</p>` : ''}
    </header>
    <div class="page-body" id="pageBody">${bodyHTML}</div>
    <div class="backlinks" id="backlinks"></div>
  `;

  contentEl.innerHTML = '';
  contentEl.appendChild(article);

  const pageBody = article.querySelector('#pageBody');
  buildTOC(pageBody);
  activateLightboxImages(pageBody);
  window.scrollTo(0, 0);

  // Backlinks — async, won't block render
  buildBacklinks(slug).then(links =>
    renderBacklinks(links, article.querySelector('#backlinks'))
  );
}

/* ══════════════════════════════════════════════════
   CONTENT PARSING PIPELINE
   raw md → front matter → infobox → galleries → wiki links → marked
══════════════════════════════════════════════════ */
function parseContent(raw) {
  const { meta, body: b0 } = parseFrontMatter(raw);
  const { infoboxHTML, body: b1 } = extractInfobox(b0);
  const b2 = convertGalleries(b1);
  const b3 = convertWikiLinks(b2);
  const contentHTML = marked.parse(b3);
  return { meta, bodyHTML: infoboxHTML + contentHTML };
}

function parseFrontMatter(raw) {
  const meta = {};
  let body = raw;
  if (raw.startsWith('---')) {
    const end = raw.indexOf('\n---', 3);
    if (end !== -1) {
      raw.slice(3, end).trim().split('\n').forEach(line => {
        const i = line.indexOf(':');
        if (i > -1) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      });
      body = raw.slice(end + 4).replace(/^\n/, '');
    }
  }
  return { meta, body };
}

/* ── Infobox: :::infobox Title\nimage:...\nKey|Value\n::: ── */
function extractInfobox(md) {
  let infoboxHTML = '';
  const body = md.replace(/^:::infobox([^\n]*)\n([\s\S]*?)^:::/gm, (_, titleArg, inner) => {
    infoboxHTML = renderInfobox(titleArg.trim(), inner);
    return '';
  });
  return { infoboxHTML, body };
}

function renderInfobox(title, inner) {
  const lines = inner.split('\n').map(l => l.trim()).filter(Boolean);
  let image = '', caption = '', rows = [];

  lines.forEach(line => {
    if (line.startsWith('image:'))        image   = line.slice(6).trim();
    else if (line.startsWith('caption:')) caption = line.slice(8).trim();
    else if (/^==.+==/.test(line))        rows.push({ type: 'section', text: line.replace(/^==|==$/g,'').trim() });
    else if (line.includes('|')) {
      const [label, ...rest] = line.split('|');
      rows.push({ type: 'row', label: label.trim(), value: convertWikiLinks(rest.join('|').trim()) });
    }
  });

  let html = `<aside class="infobox">`;
  if (title) html += `<div class="infobox-title">${esc(title)}</div>`;
  if (image) {
    html += `<div class="infobox-img-wrap">
      <img src="${esc(image)}" alt="${esc(caption || title)}" data-caption="${esc(caption)}">
    </div>`;
    if (caption) html += `<div class="infobox-caption">${esc(caption)}</div>`;
  }
  if (rows.length) {
    html += `<table class="infobox-table">`;
    rows.forEach(r => {
      if (r.type === 'section') {
        html += `<tr><th class="infobox-section" colspan="2">${esc(r.text)}</th></tr>`;
      } else {
        html += `<tr><th>${esc(r.label)}</th><td>${r.value}</td></tr>`;
      }
    });
    html += `</table>`;
  }
  html += `</aside>`;
  return html;
}

/* ── Gallery: :::gallery\nurl | Caption\n::: ── */
function convertGalleries(md) {
  return md.replace(/^:::gallery\n([\s\S]*?)^:::/gm, (_, inner) => {
    const lines = inner.split('\n').map(l => l.trim()).filter(Boolean);
    let html = `<div class="gallery">`;
    lines.forEach(line => {
      const [url, ...rest] = line.split('|');
      const cap = rest.join('|').trim();
      html += `<figure class="gallery-item">
        <img src="${esc(url.trim())}" alt="${esc(cap)}" data-caption="${esc(cap)}">
        ${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}
      </figure>`;
    });
    html += `</div>`;
    return html;
  });
}

/* ── [[Wiki Links]] → anchors, red if missing ── */
function convertWikiLinks(text) {
  return text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
    const slug = slugify(target.trim());
    const text = (label || target).trim();
    const cls  = pageIndex[slug] ? 'wiki-link' : 'wiki-link wiki-link-missing';
    return `<a class="${cls}" href="#${slug}">${esc(text)}</a>`;
  });
}

/* ══════════════════════════════════════════════════
   TABLE OF CONTENTS
   Auto-generated from h2/h3 headings, shown if 3+
══════════════════════════════════════════════════ */
function buildTOC(container) {
  if (!container) return;
  const headings = [...container.querySelectorAll('h2, h3')];
  if (headings.length < 3) return;

  // Assign unique IDs + scroll offset for sticky header
  const usedIds = {};
  headings.forEach(h => {
    let base = slugify(h.textContent);
    if (!base) base = 'section';
    if (usedIds[base] !== undefined) { usedIds[base]++; base += `-${usedIds[base]}`; }
    else usedIds[base] = 0;
    h.id = base;
    h.style.scrollMarginTop = '72px';
  });

  // Build nested list
  let html = `<nav class="toc"><div class="toc-title">Contents</div><ol class="toc-list">`;
  let inSub = false;

  headings.forEach(h => {
    if (h.tagName === 'H2') {
      if (inSub) { html += `</ol></li>`; inSub = false; }
      html += `<li><a href="#${h.id}">${esc(h.textContent)}</a>`;
    } else {
      if (!inSub) { html += `<ol class="toc-sub">`; inSub = true; }
      html += `<li><a href="#${h.id}">${esc(h.textContent)}</a></li>`;
    }
  });
  if (inSub) html += `</ol>`;
  html += `</li></ol></nav>`;

  // Insert before first h2
  const firstH2 = container.querySelector('h2');
  if (firstH2) firstH2.insertAdjacentHTML('beforebegin', html);
  else container.insertAdjacentHTML('afterbegin', html);
}

/* ══════════════════════════════════════════════════
   LIGHTBOX
   Works for gallery images and standalone images
══════════════════════════════════════════════════ */
function createLightboxDOM() {
  const el = document.createElement('div');
  el.id = 'lightbox';
  el.className = 'lightbox';
  el.hidden = true;
  el.innerHTML = `
    <div class="lb-backdrop"></div>
    <div class="lb-frame">
      <button class="lb-close" aria-label="Close">×</button>
      <button class="lb-prev" aria-label="Previous">‹</button>
      <button class="lb-next" aria-label="Next">›</button>
      <div class="lb-img-wrap">
        <img class="lb-img" id="lbImg" src="" alt="">
      </div>
      <p class="lb-cap" id="lbCap"></p>
    </div>
  `;
  document.body.appendChild(el);

  lb.el    = el;
  lb.imgEl = el.querySelector('#lbImg');
  lb.capEl = el.querySelector('#lbCap');

  el.querySelector('.lb-backdrop').addEventListener('click', lbClose);
  el.querySelector('.lb-close').addEventListener('click', lbClose);
  el.querySelector('.lb-prev').addEventListener('click', () => lbMove(-1));
  el.querySelector('.lb-next').addEventListener('click', () => lbMove(1));

  document.addEventListener('keydown', e => {
    if (lb.el.hidden) return;
    if (e.key === 'Escape')     lbClose();
    if (e.key === 'ArrowLeft')  lbMove(-1);
    if (e.key === 'ArrowRight') lbMove(1);
  });
}

function activateLightboxImages(container) {
  // Group gallery images together, treat standalone images individually
  const galleries = [...container.querySelectorAll('.gallery')];
  const galleryImgs = new Set(galleries.flatMap(g => [...g.querySelectorAll('img')]));

  // Gallery groups: each gallery is its own set
  galleries.forEach(gallery => {
    const imgs = [...gallery.querySelectorAll('img')];
    const group = imgs.map(img => ({ src: img.src, caption: img.dataset.caption || img.alt }));
    imgs.forEach((img, i) => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => lbOpen(group, i));
    });
  });

  // Standalone images (not in gallery)
  const all = [...container.querySelectorAll('img')].filter(img => !galleryImgs.has(img));
  all.forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => lbOpen([{ src: img.src, caption: img.dataset.caption || img.alt }], 0));
  });
}

function lbOpen(images, idx) {
  lb.images = images;
  lb.idx    = idx;
  lb.el.hidden = false;
  document.body.style.overflow = 'hidden';
  lb.el.querySelector('.lb-prev').hidden = images.length <= 1;
  lb.el.querySelector('.lb-next').hidden = images.length <= 1;
  lbShow();
}

function lbShow() {
  const { src, caption } = lb.images[lb.idx];
  lb.imgEl.src = src;
  lb.imgEl.alt = caption;
  lb.capEl.textContent = caption || '';
  lb.capEl.hidden = !caption;
}

function lbMove(dir) {
  lb.idx = (lb.idx + dir + lb.images.length) % lb.images.length;
  lbShow();
}

function lbClose() {
  lb.el.hidden = true;
  document.body.style.overflow = '';
}

/* ══════════════════════════════════════════════════
   BACKLINKS — "what links here"
══════════════════════════════════════════════════ */
async function buildBacklinks(slug) {
  if (!searchCache)    await buildSearchCache();
  if (!backlinksIndex) buildBacklinksIndex();
  return backlinksIndex[slug] || [];
}

function buildBacklinksIndex() {
  backlinksIndex = {};
  const re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  searchCache.forEach(page => {
    let m;
    const r = new RegExp(re.source, re.flags);
    while ((m = r.exec(page.text)) !== null) {
      const target = slugify(m[1].trim());
      if (!backlinksIndex[target]) backlinksIndex[target] = [];
      if (!backlinksIndex[target].some(b => b.slug === page.slug)) {
        backlinksIndex[target].push({ slug: page.slug, title: page.title });
      }
    }
  });
}

function renderBacklinks(links, el) {
  if (!el || !links.length) { if (el) el.remove(); return; }
  el.innerHTML = `
    <div class="backlinks-inner">
      <span class="backlinks-label">Linked from</span>
      ${links.map(l => `<a href="#${l.slug}" class="backlink-pill">${esc(l.title)}</a>`).join('')}
    </div>
  `;
}

/* ══════════════════════════════════════════════════
   SEARCH
══════════════════════════════════════════════════ */
function bindSearch() {
  searchInput.addEventListener('input', async () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      searchResultsEl.innerHTML = '';
      searchResultsEl.classList.remove('open');
      return;
    }
    if (!searchCache) await buildSearchCache();
    const matches = searchCache
      .filter(p => p.title.toLowerCase().includes(q) || p.text.toLowerCase().includes(q))
      .slice(0, 8);
    renderSearchResults(matches, q);
  });

  document.addEventListener('click', e => {
    if (!searchResultsEl.contains(e.target) && e.target !== searchInput) {
      searchResultsEl.classList.remove('open');
    }
  });
}

async function buildSearchCache() {
  searchCache = await Promise.all(
    Object.entries(pageIndex).map(async ([slug, info]) => {
      let text = '';
      try {
        const res = await fetch(`pages/${slug}.md`);
        if (res.ok) text = await res.text();
      } catch {}
      return { slug, title: info.title, category: info.category, text };
    })
  );
}

function renderSearchResults(matches, q) {
  searchResultsEl.innerHTML = !matches.length
    ? `<div class="search-empty">No results for "${esc(q)}"</div>`
    : matches.map(m => `
        <a class="search-result" href="#${m.slug}">
          <span class="search-cat">${esc(m.category)}</span>
          <span class="search-title">${esc(m.title)}</span>
        </a>`).join('');
  searchResultsEl.classList.add('open');
}

/* ══════════════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════════════ */
function highlightActiveNav(slug) {
  document.querySelectorAll('#navCategories a')
    .forEach(a => a.classList.toggle('active', a.dataset.slug === slug));
}

function bindNavToggle() {
  document.getElementById('navToggle').addEventListener('click', () =>
    document.getElementById('sidebar').classList.toggle('open')
  );
}

function slugify(str) {
  return String(str).toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
