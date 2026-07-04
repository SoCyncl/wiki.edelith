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
 *   <!--TOC-->          auto table of contents. On desktop this renders as
 *                       a sticky sidebar that sits alongside the article
 *                       (like modern Wikipedia), not a popup. Below the
 *                       mobile breakpoint it becomes a slide-out drawer.
 *                       Only appears if the page has 4+ headings, like
 *                       MediaWiki does.
 *   <!--CONTENT-->      the rendered markdown body
 *   <!--CATEGORIES-->   category footer links
 *   <!--LASTEDITED-->   "last edited" stamp, from the .md file's mtime
 *
 * Any other frontmatter field can be dropped in anywhere in the html as
 * {{fieldname}}, e.g. {{image}} or {{imagecaption}} (case-insensitive).
 *
 * Markdown extras supported beyond plain CommonMark:
 *
 *   [[Page Name]]              wiki-link -> resolves to a real page if one
 *   [[Page Name|Display]]      exists anywhere in the content tree, else
 *                              renders as a "redlink" (no href, just a class)
 *
 *   [[File:name.jpg]]          image with wraparound text, MediaWiki style.
 *   [[File:name.jpg|left]]     Params after the filename can appear in any
 *   [[File:name.jpg|thumb|     order, separated by "|":
 *      right|A caption here]]    - left / right / center   float + alignment
 *                                  (default: right)
 *                                - thumb / thumbnail / frameless
 *                                  (accepted for MediaWiki-authoring muscle
 *                                  memory; currently cosmetic no-ops)
 *                                - anything else is treated as the caption
 *
 *   [^1] ... [^1]: text        footnotes -> numbered references list with
 *                              back-links, MediaWiki <ref> style
 *
 *   :::source[Attribution]     source block -> for quoting a story/book
 *   excerpt text here          excerpt verbatim into the page, indented
 *   :::                        and set off like a MediaWiki blockquote.
 *                              The [Attribution] part is optional.
 *
 *   :::quote[Attribution]      pull-quote -> a short, emphasized excerpt
 *   A pulled-out line.         that floats beside the body text, the way
 *   :::                        magazine/wiki layouts highlight a key line.
 *                              The [Attribution] part is optional.
 *
 *   :::hatnote                 hatnote -> the small italic disambiguation-
 *   For other uses, see [[X]]. style note MediaWiki puts directly under
 *   :::                        the page title (e.g. "For other uses...").
 *
 * Frontmatter (YAML at the top of the .md file) drives the infobox and
 * categories, e.g.:
 *   ---
 *   title: Ixnael
 *   infobox:
 *     Sociology:
 *       Population: "3,012,000,000"
 *   categories: [Planets, Apocrypha]
 *   ---
 *
 * The "Apocrypha" category (case-insensitive) is treated specially: it
 * renders with its own styling and a hover tooltip reading "Info that may
 * or may not be correct", for in-universe content of dubious reliability.
 */

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const matter = require('gray-matter');

const CONTENT_DIR = path.resolve(process.argv[2] || '.');
const OUTPUT_DIR = path.resolve(process.argv[3] || 'dist');

// folders to never walk into when scanning from the repo root
const EXCLUDE_DIRS = new Set(['.git', '.github', 'node_modules', 'scripts', 'dist', '.vscode']);

const MARKERS = {
  title: '<!--TITLE-->',
  infobox: '<!--INFOBOX-->',
  toc: '<!--TOC-->',
  content: '<!--CONTENT-->',
  categories: '<!--CATEGORIES-->',
  lastedited: '<!--LASTEDITED-->',
};

const APOCRYPHA_TOOLTIP = 'Info that may or may not be correct';
const IMAGE_ALIGN_KEYWORDS = new Set(['left', 'right', 'center']);
const IMAGE_STYLE_KEYWORDS = new Set(['thumb', 'thumbnail', 'frameless', 'frame']);

// ---------------------------------------------------------------- helpers

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
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

function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
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

// [[File:name.jpg|left|thumb|Caption]] -> a <figure> that floats and wraps
// text around it, MediaWiki style. Params after the filename can appear in
// any order; unrecognized params are joined together as the caption. Must
// run BEFORE processWikilinks so "File:" targets never get mistaken for a
// page link.
function processImages(md) {
  return md.replace(/\[\[File:([^\]|]+)((?:\|[^\]]*)*)\]\]/gi, (match, filename, paramStr) => {
    const parts = paramStr ? paramStr.split('|').filter((p) => p.length) : [];
    let align = 'right';
    let caption = '';
    for (const raw of parts) {
      const part = raw.trim();
      const lower = part.toLowerCase();
      if (IMAGE_ALIGN_KEYWORDS.has(lower)) {
        align = lower;
      } else if (IMAGE_STYLE_KEYWORDS.has(lower)) {
        // cosmetic only for now, accepted for MediaWiki muscle memory
      } else if (part) {
        caption = caption ? `${caption} ${part}` : part;
      }
    }
    const src = filename.trim();
    const alignClass = `align-${align}`;
    const altText = escapeAttr(caption || src);
    const captionHtml = caption ? `<figcaption>${caption}</figcaption>` : '';
    return (
      `<figure class="wiki-figure ${alignClass}">` +
      `<img src="${escapeAttr(src)}" alt="${altText}" loading="lazy">` +
      `${captionHtml}</figure>`
    );
  });
}

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

// :::source[Attribution]\n text \n::: -> a set-off "source-block" for
// quoting a story/book excerpt verbatim into the page. Attribution is
// optional. Inner content is rendered as its own little markdown doc so
// multi-paragraph excerpts still get <p> tags, then dropped in as a raw
// HTML block (marked passes block-level HTML through untouched).
function processSourceBlocks(md) {
  return md.replace(/^:::source(?:\[(.*?)\])?[ \t]*\n([\s\S]*?)\n:::[ \t]*$/gm, (match, attribution, inner) => {
    const innerHtml = marked.parse(inner.trim());
    const attrHtml = attribution
      ? `<cite class="source-attribution">&mdash; ${attribution.trim()}</cite>`
      : '';
    return `<div class="source-block">\n<p class="source-block-label">Source</p>\n${innerHtml}\n${attrHtml}\n</div>`;
  });
}

// :::quote[Attribution]\n line \n::: -> a floated pull-quote, the way a
// magazine or modern wiki layout pulls a key line out beside the body text.
function processPullquotes(md) {
  return md.replace(/^:::quote(?:\[(.*?)\])?[ \t]*\n([\s\S]*?)\n:::[ \t]*$/gm, (match, attribution, inner) => {
    const innerHtml = marked.parseInline(inner.trim());
    const attrHtml = attribution
      ? `<cite class="pullquote-attribution">&mdash; ${attribution.trim()}</cite>`
      : '';
    return `<aside class="pullquote">\n<p>${innerHtml}</p>\n${attrHtml}\n</aside>`;
  });
}

// :::hatnote\n text \n::: -> the small italic disambiguation note MediaWiki
// puts directly beneath the page title (e.g. "For other uses, see X").
function processHatnotes(md) {
  return md.replace(/^:::hatnote[ \t]*\n([\s\S]*?)\n:::[ \t]*$/gm, (match, inner) => {
    const innerHtml = marked.parseInline(inner.trim());
    return `<div class="hatnote">${innerHtml}</div>`;
  });
}

// Render markdown, tagging headings with ids, and build an auto TOC.
// MediaWiki only shows a TOC once a page has 4+ headings, so we match that.
// Numbering follows the real Wikipedia convention: h2 headings are "1",
// "2", "3"...; a h3 under the second h2 is "2.1"; a h4 under that is
// "2.1.1", and so on. The markup returned here is a plain <nav>+<ul> that
// the stylesheet turns into a sticky sidebar on desktop and a slide-out
// drawer (via the accompanying checkbox/labels) below the mobile breakpoint.
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
    // counters[0] tracks h2, counters[1] tracks h3, etc. Deeper counters
    // reset to zero whenever a shallower heading advances, matching how
    // MediaWiki numbers nested sections (1, 1.1, 1.2, 2, 2.1...).
    const counters = [0, 0, 0, 0, 0];
    const items = headings
      .map((h) => {
        const depth = h.level - 2;
        counters[depth] += 1;
        for (let i = depth + 1; i < counters.length; i++) counters[i] = 0;
        const number = counters.slice(0, depth + 1).join('.');
        return (
          `<li class="toc-level-${h.level}">` +
          `<a href="#${h.id}"><span class="toc-number">${number}</span>${h.text}</a></li>`
        );
      })
      .join('\n');
    toc = [
      // checkbox + labels drive the mobile slide-out drawer only; on
      // desktop the stylesheet keeps <nav class="toc-sidebar"> pinned in
      // place as a sticky column beside the article, so nothing needs to
      // be "opened" to see it.
      '<input type="checkbox" id="toc-toggle" class="toc-toggle-input">',
      '<label for="toc-toggle" class="toc-toggle-btn">Contents</label>',
      '<label for="toc-toggle" class="toc-overlay"></label>',
      '<nav class="toc-sidebar" aria-label="Table of contents">',
      '<label for="toc-toggle" class="toc-sidebar-close">&times;</label>',
      '<p class="toc-sidebar-title">Contents</p>',
      '<ul>',
      items,
      '</ul>',
      '</nav>',
    ].join('\n');
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

// Category footer links. "Apocrypha" (any case) gets special styling and
// a hover tooltip, since it marks in-universe info of dubious reliability.
function buildCategoriesHtml(categories) {
  if (!categories || !categories.length) return '';
  const links = categories
    .map((c) => {
      if (String(c).trim().toLowerCase() === 'apocrypha') {
        return `<a href="#" class="category-apocrypha tooltip" data-tooltip="${APOCRYPHA_TOOLTIP}">${c}</a>`;
      }
      return `<a href="#">${c}</a>`;
    })
    .join(' | ');
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
      // no matching markdown — this is a plain static html page (like a
      // hand-written homepage). copy it through untouched.
      const relDir = path.relative(CONTENT_DIR, dir);
      const outDir = path.join(OUTPUT_DIR, relDir);
      fs.mkdirSync(outDir, { recursive: true });
      fs.copyFileSync(htmlFile, path.join(outDir, path.basename(htmlFile)));
      console.log(`[copied] ${htmlFile} (no matching markdown, passed through as-is)`);
      continue;
    }

    const relDir = path.relative(CONTENT_DIR, dir);
    const outDir = path.join(OUTPUT_DIR, relDir);
    fs.mkdirSync(outDir, { recursive: true });
    const outName = base === 'template' ? 'index.html' : `${base}.html`;
    const outPath = path.join(outDir, outName);

    const { data: front, content: rawBody } = matter(fs.readFileSync(mdFile, 'utf8'));

    let body = processImages(rawBody);
    body = processWikilinks(body, pageIndex, outDir);
    body = processHatnotes(body);
    body = processPullquotes(body);
    const { md: bodyAfterNotes, referencesHtml } = processFootnotes(body);
    const bodyAfterSource = processSourceBlocks(bodyAfterNotes);
    const { html: contentHtml, toc } = renderWithToc(bodyAfterSource);

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
