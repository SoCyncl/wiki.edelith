#!/usr/bin/env node
/**
 * build.js — Wikitable static site builder
 * -----------------------------------------
 * Walks a content folder for `*.html` templates, finds the markdown file
 * that lives in the SAME folder with the SAME base name (template.html
 * pairs with template.md, foo.html pairs with foo.md, etc.), renders the
 * markdown, and injects it into the html at a few marker comments.
 *
 * Requires:  npm install marked gray-matter
 * Usage:     node scripts/build.js [contentDir] [outputDir]
 *            defaults: contentDir = "content", outputDir = "dist"
 *
 * Markers expected inside each html template:
 *   <!--TITLE-->        page title (h1 text)
 *   <!--INFOBOX-->      rows injected into the infobox <tbody>
 *   <!--TOC-->          auto table of contents (only appears if the
 *                       page has 4+ headings, like MediaWiki does)
 *   <!--CONTENT-->      the rendered markdown body
 *   <!--CATEGORIES-->   category footer links
 *   <!--LASTEDITED-->   "last edited" stamp, from the .md file's mtime
 *
 * Any other frontmatter field can be dropped in anywhere in the html as
 * {{fieldname}}, e.g. {{image}} or {{imagecaption}} (case-insensitive).
 *
 * Markdown extras supported beyond plain CommonMark:
 *   [[Page Name]]            wiki-link -> resolves to a real page if one
 *   [[Page Name|Display]]    exists anywhere in the content tree, else
 *                            renders as a "redlink" (no href, just a class)
 *   [^1] ... [^1]: text      footnotes -> numbered references list with
 *                            back-links, MediaWiki <ref> style
 *
 * Frontmatter (YAML at the top of the .md file) drives the infobox and
 * categories, e.g.:
 *   ---
 *   title: Ixnael
 *   infobox:
 *     Sociology:
 *       Population: "3,012,000,000"
 *   categories: [Planets]
 *   ---
 */

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const matter = require('gray-matter');

const CONTENT_DIR = path.resolve(process.argv[2] || 'content');
const OUTPUT_DIR = path.resolve(process.argv[3] || 'dist');

const MARKERS = {
  title: '<!--TITLE-->',
  infobox: '<!--INFOBOX-->',
  toc: '<!--TOC-->',
  content: '<!--CONTENT-->',
  categories: '<!--CATEGORIES-->',
  lastedited: '<!--LASTEDITED-->',
};

// ---------------------------------------------------------------- helpers

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Every html template becomes one output page. We index them by a "slug"
// (folder name, since pages live in their own folder as template.html) so
// [[wiki links]] can resolve to real files.
function buildPageIndex(htmlFiles) {
  const index = new Map();
  for (const file of htmlFiles) {
    const dir = path.dirname(file);
    const base = path.basename(file, '.html');
    const relDir = path.relative(CONTENT_DIR, dir);
    const outName = base === 'template' ? 'index.html' : `${base}.html`;
    const outRel = path.join(relDir, outName).split(path.sep).join('/');
    const slugSource = base === 'template' ? path.basename(dir) : base;
    index.set(slugify(slugSource), outRel);
  }
  return index;
}

// -------------------------------------------------------- markdown extras

// [[Page]] / [[Page|Display]] -> real link if the page exists, else redlink
function processWikilinks(md, pageIndex, outDir) {
  return md.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, page, display) => {
    const label = (display || page).trim();
    const target = pageIndex.get(slugify(page.trim()));
    if (target) {
      const rel = path.relative(outDir, path.join(OUTPUT_DIR, target)).split(path.sep).join('/');
      return `<a href="${rel}">${label}</a>`;
    }
    return `<a href="#" class="redlink" title="This page does not exist yet">${label}</a>`;
  });
}

// [^1] refs + [^1]: definitions -> numbered <ol class="references"> with backlinks
function processFootnotes(md) {
  const defs = {};
  md = md.replace(/^\[\^([^\]]+)\]:\s*(.+)$/gm, (m, id, text) => {
    defs[id] = text.trim();
    return '';
  });

  const order = [];
  md = md.replace(/\[\^([^\]]+)\]/g, (m, id) => {
    if (!defs[id]) return m;
    let idx = order.indexOf(id);
    if (idx === -1) { order.push(id); idx = order.length - 1; }
    const num = idx + 1;
    return `<sup class="reference" id="cite_ref-${id}"><a href="#cite_note-${id}">[${num}]</a></sup>`;
  });

  let referencesHtml = '';
  if (order.length) {
    const items = order
      .map((id) => `<li id="cite_note-${id}">${defs[id]} <a href="#cite_ref-${id}" class="backlink">&#8593;</a></li>`)
      .join('\n');
    referencesHtml = `<h3>References</h3>\n<ol class="references">\n${items}\n</ol>`;
  }
  return { md, referencesHtml };
}

// Render markdown, tagging headings with ids, and build an auto TOC.
// MediaWiki only shows a TOC once a page has 4+ headings, so we match that.
function renderWithToc(md) {
  const seen = {};
  const headings = [];
  const renderer = new marked.Renderer();

  // marked v18 renderer methods receive a token object, not raw args
  renderer.heading = function heading(token) {
    const level = token.depth;
    const text = this.parser.parseInline(token.tokens);
    const plainText = token.text;
    if (level === 1) return `<h1>${text}</h1>\n`;
    let id = slugify(plainText);
    seen[id] = (seen[id] || 0) + 1;
    if (seen[id] > 1) id += `-${seen[id] - 1}`;
    headings.push({ level, text: plainText, id });
    return `<h${level} id="${id}">${text}</h${level}>\n`;
  };

  const html = marked.parse(md, { renderer });

  let toc = '';
  if (headings.length >= 4) {
    const items = headings
      .map((h) => `<li class="toc-level-${h.level}"><a href="#${h.id}">${h.text}</a></li>`)
      .join('\n');
    toc = `<div class="toc"><details class="contents" open><summary class="showcontent">Contents</summary>\n<ul>\n${items}\n</ul>\n</details></div>`;
  }
  return { html, toc };
}

function buildInfoboxRows(infobox, pageIndex, outDir) {
  if (!infobox) return '';
  let rows = '';
  for (const [section, fields] of Object.entries(infobox)) {
    rows += `<tr><th colspan="2" id="centertext">${section}</th></tr>\n`;
    for (const [label, value] of Object.entries(fields)) {
      const rendered = processWikilinks(String(value), pageIndex, outDir);
      rows += `<tr><th>${label}</th><td>${rendered}</td></tr>\n`;
    }
  }
  return rows;
}

// replace every occurrence of a literal (non-regex) marker string
function replaceAll(str, marker, value) {
  return str.split(marker).join(value);
}

function buildCategoriesHtml(categories) {
  if (!categories || !categories.length) return '';
  const links = categories.map((c) => `<a href="#">${c}</a>`).join(' | ');
  return `<div class="categories"><b>Categories:</b> ${links}</div>`;
}

function buildLastEdited(mdFilePath) {
  const stat = fs.statSync(mdFilePath);
  const date = stat.mtime.toISOString().slice(0, 10);
  return `<p class="lastedited">This page was last edited on ${date}.</p>`;
}

// ------------------------------------------------------------------ main

function main() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error(`Content directory not found: ${CONTENT_DIR}`);
    process.exit(1);
  }

  const allFiles = walk(CONTENT_DIR);
  const htmlFiles = allFiles.filter((f) => f.endsWith('.html'));
  const assetFiles = allFiles.filter((f) => !f.endsWith('.html') && !f.endsWith('.md'));
  const pageIndex = buildPageIndex(htmlFiles);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const htmlFile of htmlFiles) {
    const dir = path.dirname(htmlFile);
    const base = path.basename(htmlFile, '.html');
    const mdFile = path.join(dir, `${base}.md`);

    if (!fs.existsSync(mdFile)) {
      console.warn(`[skip] no matching markdown for ${htmlFile}`);
      continue;
    }

    const relDir = path.relative(CONTENT_DIR, dir);
    const outDir = path.join(OUTPUT_DIR, relDir);
    fs.mkdirSync(outDir, { recursive: true });
    const outName = base === 'template' ? 'index.html' : `${base}.html`;
    const outPath = path.join(outDir, outName);

    const { data: front, content: rawBody } = matter(fs.readFileSync(mdFile, 'utf8'));

    let body = processWikilinks(rawBody, pageIndex, outDir);
    const { md: bodyAfterNotes, referencesHtml } = processFootnotes(body);
    const { html: contentHtml, toc } = renderWithToc(bodyAfterNotes);

    let page = fs.readFileSync(htmlFile, 'utf8');
    page = replaceAll(page, MARKERS.title, front.title || '');
    page = replaceAll(page, MARKERS.infobox, buildInfoboxRows(front.infobox, pageIndex, outDir));
    page = replaceAll(page, MARKERS.toc, toc);
    page = replaceAll(page, MARKERS.content, referencesHtml ? `${contentHtml}\n${referencesHtml}` : contentHtml);
    page = replaceAll(page, MARKERS.categories, buildCategoriesHtml(front.categories));
    page = replaceAll(page, MARKERS.lastedited, buildLastEdited(mdFile));

    if (front.title) {
      page = page.replace(/<title>.*?<\/title>/, `<title>${front.title}</title>`);
    }

    // generic {{field}} substitution for any other frontmatter value
    // (e.g. {{IMAGE}}, {{IMAGECAPTION}}) — case-insensitive key match
    page = page.replace(/\{\{(\w+)\}\}/g, (m, key) => {
      const value = front[key.toLowerCase()];
      return value !== undefined ? String(value) : '';
    });

    fs.writeFileSync(outPath, page);
    console.log(`[built] ${outPath}`);
  }

  // copy everything else (css, images, etc.) keeping the same folder layout
  for (const file of assetFiles) {
    const relDir = path.relative(CONTENT_DIR, path.dirname(file));
    const outDir = path.join(OUTPUT_DIR, relDir);
    fs.mkdirSync(outDir, { recursive: true });
    fs.copyFileSync(file, path.join(outDir, path.basename(file)));
  }
}

main();
