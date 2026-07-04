#!/usr/bin/env node
/**
 * build.js — converts everything in /content/*.md into static HTML pages
 * using template.html and directory-template.html.
 *
 * Usage:
 *   npm install
 *   node build.js
 *
 * Output goes to /pages/*.html, plus /directory.html at the project root.
 * Every generated file is plain static HTML — safe for GitHub Pages,
 * crawlable by search engines, and viewable offline with no server.
 */

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

marked.setOptions({ headerIds: false, mangle: false });

const ROOT = __dirname;
const CONTENT_DIR = path.join(ROOT, 'content');
const PAGES_DIR = path.join(ROOT, 'pages');
const TEMPLATE_PATH = path.join(ROOT, 'template.html');
const DIR_TEMPLATE_PATH = path.join(ROOT, 'directory-template.html');

// ---------- helpers ----------

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

function slugify(filename) {
  return filename.replace(/\.md$/i, '');
}

// pull out a [blockname]...[/blockname] section (case-insensitive), first match only.
// returns { content, rest } or null if not found.
function extractBlock(source, blockName) {
  const re = new RegExp(`\\[${blockName}\\]([\\s\\S]*?)\\[\\/${blockName}\\]`, 'i');
  const match = source.match(re);
  if (!match) return null;
  return {
    content: match[1].trim(),
    rest: source.slice(0, match.index) + source.slice(match.index + match[0].length),
  };
}

// pull out ALL [blockname]...[/blockname] sections, replacing each with a
// unique HTML-comment placeholder so marked leaves that spot alone.
function extractAllBlocks(source, blockName, placeholderPrefix) {
  const re = new RegExp(`\\[${blockName}\\]([\\s\\S]*?)\\[\\/${blockName}\\]`, 'gi');
  const blocks = [];
  let i = 0;
  const rest = source.replace(re, (m, inner) => {
    const token = `<!--${placeholderPrefix}_${i}-->`;
    blocks.push(inner.trim());
    i++;
    return token;
  });
  return { blocks, rest };
}

function parseKeyValueLines(raw) {
  const obj = {};
  raw.split('\n').forEach((line) => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key) obj[key] = value;
  });
  return obj;
}

// ---------- [meta] ----------

function parseMeta(raw) {
  return parseKeyValueLines(raw || '');
}

// ---------- [infobox] ----------

function renderInfoboxValue(value) {
  const spoilerMatch = value.match(/^\[spoiler\]([\s\S]*)\[\/spoiler\]$/i);
  if (spoilerMatch) {
    const items = spoilerMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
    const lis = items.map((i) => `<li>${marked.parseInline(i)}</li>`).join('');
    return `<details>\n<summary>SPOILERS</summary>\n<ul>${lis}</ul>\n</details>`;
  }
  let v = value;
  v = v.replace(/\^([^^]+)\^/g, '<sup>$1</sup>');
  v = v.replace(/~([^~]+)~/g, '<sub>$1</sub>');
  return marked.parseInline(v);
}

function parseInfobox(raw) {
  const lines = raw.split('\n').map((l) => l.trim()).filter((l) => l.length);
  let title = '';
  let image = '';
  let imagecaption = '';
  const rows = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      rows.push({ type: 'section', text: line.slice(3).trim() });
      continue;
    }
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    const keyLower = key.toLowerCase();
    if (keyLower === 'title') { title = value; continue; }
    if (keyLower === 'image') { image = value; continue; }
    if (keyLower === 'imagecaption') { imagecaption = value; continue; }
    rows.push({ type: 'row', key, value });
  }

  let html = '<table class="infotable">\n<tbody>\n';
  if (title) {
    html += `<tr><th colspan="2" id="centertext" style="text-align:center">${escapeHtml(title)}</th></tr>\n`;
  }
  if (image) {
    html += `<tr><th colspan="2" style="text-align:center"><img src="${escapeAttr(image)}" alt="${escapeAttr(title || 'infobox image')}"></th></tr>\n`;
  }
  if (imagecaption) {
    html += `<tr><td colspan="2" style="text-align:center"><i>${marked.parseInline(imagecaption)}</i></td></tr>\n`;
  }
  for (const r of rows) {
    if (r.type === 'section') {
      html += `<tr><th colspan="2" id="centertext">${escapeHtml(r.text)}</th></tr>\n`;
    } else {
      html += `<tr><th>${escapeHtml(r.key)}</th><td>${renderInfoboxValue(r.value)}</td></tr>\n`;
    }
  }
  html += '</tbody>\n</table>';
  return html;
}

// ---------- [apocrypha] ----------

function parseApocrypha(raw) {
  const inner = marked.parse(raw);
  return `<div class="apocrypha">\n<div class="apocrypha-title" data-tooltip="Text may or may not be lore accurate" tabindex="0">Apocrypha</div>\n${inner}\n</div>`;
}

// ---------- [sources] ----------

function parseSources(raw) {
  if (!raw) return { html: '<p><i>No sources listed for this page.</i></p>', count: 0 };
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const items = lines.map((l) => l.replace(/^\d+\.\s*/, ''));
  let html = '<ol class="sourceslist">\n';
  items.forEach((text, i) => {
    const n = i + 1;
    html += `<li id="source-${n}">${marked.parseInline(text)} <a href="#citeref-${n}" class="backref" title="Back to reference">\u21a9</a></li>\n`;
  });
  html += '</ol>';
  return { html, count: items.length };
}

// ---------- tooltip links & citations (post-process on rendered HTML) ----------

function applyTooltipLinks(html) {
  // marked turns [text](url "tip") into <a href="url" title="tip">text</a>
  // convert that into our styled hover tooltip instead of the native browser one,
  // merging into an existing class attribute if the tag already has one.
  return html.replace(/<a\s+([^>]*)>/g, (m, attrsStr) => {
    const titleMatch = attrsStr.match(/title="([^"]*)"/);
    if (!titleMatch) return m;
    const tooltipText = titleMatch[1];
    let attrs = attrsStr.replace(/\s*title="[^"]*"/, '');
    if (/class="/.test(attrs)) {
      attrs = attrs.replace(/class="([^"]*)"/, (cm, cls) => `class="${cls} tooltip-link"`);
    } else {
      attrs += ' class="tooltip-link"';
    }
    attrs += ` data-tooltip="${tooltipText}"`;
    return `<a ${attrs.trim()}>`;
  });
}

function applyCitations(html) {
  // [^1] -> superscript link to #source-1, with a matching id for the back-reference.
  return html.replace(/\[\^(\d+)\]/g, (m, n) => {
    return `<sup class="citation" id="citeref-${n}"><a href="#source-${n}">[${n}]</a></sup>`;
  });
}

// ---------- page build ----------

function buildPage(filename, template) {
  const slug = slugify(filename);
  const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), 'utf8');

  let source = raw;

  // meta
  const metaBlock = extractBlock(source, 'meta');
  let meta = {};
  if (metaBlock) {
    meta = parseMeta(metaBlock.content);
    source = metaBlock.rest;
  }

  // infobox (single)
  const infoboxBlock = extractBlock(source, 'infobox');
  let infoboxHtml = '';
  if (infoboxBlock) {
    infoboxHtml = parseInfobox(infoboxBlock.content);
    source = infoboxBlock.rest;
  }

  // apocrypha (0 or more)
  const apocrypha = extractAllBlocks(source, 'apocrypha', 'APOCRYPHA');
  source = apocrypha.rest;

  // sources (single)
  const sourcesBlock = extractBlock(source, 'sources');
  let sourcesResult = { html: '<p><i>No sources listed for this page.</i></p>', count: 0 };
  if (sourcesBlock) {
    sourcesResult = parseSources(sourcesBlock.content);
    source = sourcesBlock.rest;
  }

  // render remaining markdown
  let contentHtml = marked.parse(source);

  // re-insert apocrypha boxes at their original placeholder locations
  apocrypha.blocks.forEach((block, i) => {
    const rendered = parseApocrypha(block);
    contentHtml = contentHtml.replace(`<!--APOCRYPHA_${i}-->`, rendered);
  });

  // tooltip links + citations
  contentHtml = applyTooltipLinks(contentHtml);
  contentHtml = applyCitations(contentHtml);
  sourcesResult.html = applyTooltipLinks(sourcesResult.html);

  const title = meta.title || slug;
  const category = meta.category || 'Uncategorized';
  const description = meta.description || '';

  const page = template
    .replace(/{{PAGE_TITLE}}/g, escapeHtml(title))
    .replace(/{{DESCRIPTION}}/g, escapeAttr(description))
    .replace(/{{ASSET_PATH}}/g, '../')
    .replace(/{{BREADCRUMB}}/g, `...In <a href="../directory.html">All Pages</a> &gt; ${escapeHtml(title)}`)
    .replace(/{{H1}}/g, escapeHtml(title))
    .replace(/{{INFOBOX}}/g, infoboxHtml)
    .replace(/{{SLUG}}/g, slug)
    .replace(/{{SOURCE_COUNT}}/g, sourcesResult.count ? ` (${sourcesResult.count})` : '')
    .replace(/{{CONTENT}}/g, contentHtml)
    .replace(/{{SOURCES_HTML}}/g, sourcesResult.html)
    .replace(/{{CATEGORY_LINE}}/g, `Category: <a href="../directory.html?category=${encodeURIComponent(category)}">${escapeHtml(category)}</a>`);

  fs.writeFileSync(path.join(PAGES_DIR, `${slug}.html`), page, 'utf8');

  return { slug, title, category, description };
}

function buildDirectory(pagesMeta, dirTemplate) {
  const categories = Array.from(new Set(pagesMeta.map((p) => p.category))).sort();
  const categoryOptions = categories
    .map((c) => `   <option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`)
    .join('\n');

  const rows = pagesMeta
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((p) => {
      const searchBlob = `${p.title} ${p.category} ${p.description} ${p.slug}`.toLowerCase();
      return `   <tr data-search="${escapeAttr(searchBlob)}" data-category="${escapeAttr(p.category)}" data-title="${escapeAttr(p.title)}" data-slug="${escapeAttr(p.slug)}" data-description="${escapeAttr(p.description)}">
    <td><a href="pages/${p.slug}.html">${escapeHtml(p.title)}</a></td>
    <td>${escapeHtml(p.category)}</td>
    <td>${escapeHtml(p.description)}</td>
    <td>${escapeHtml(p.slug)}</td>
   </tr>`;
    })
    .join('\n');

  const html = dirTemplate
    .replace('{{CATEGORY_OPTIONS}}', categoryOptions)
    .replace('{{PAGE_ROWS}}', rows)
    .replace('{{PAGE_COUNT}}', String(pagesMeta.length));

  fs.writeFileSync(path.join(ROOT, 'directory.html'), html, 'utf8');
}

function main() {
  if (!fs.existsSync(PAGES_DIR)) fs.mkdirSync(PAGES_DIR, { recursive: true });

  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const dirTemplate = fs.readFileSync(DIR_TEMPLATE_PATH, 'utf8');

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'));
  if (files.length === 0) {
    console.log('No .md files found in /content. Nothing to build.');
    return;
  }

  const pagesMeta = files.map((f) => buildPage(f, template));
  buildDirectory(pagesMeta, dirTemplate);

  console.log(`Built ${pagesMeta.length} page(s):`);
  pagesMeta.forEach((p) => console.log(`  pages/${p.slug}.html  (${p.category})`));
  console.log('Built directory.html');
}

main();
