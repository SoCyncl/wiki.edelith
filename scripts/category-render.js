/* ============================================================
   EDELITH WIKI — category-render.js
   Reads /data/<category>.json and builds the entire category
   page (letter sections, entry cards, counts, alpha-bar links,
   filter pills, recently-updated sidebar) from data.

   Drop this on any category page that has the matching empty
   shell markup (see categories/_template.html) and set:
     <body data-category="locations">
   ============================================================ */

(function () {
  "use strict";

  // Set true if you want "The Gilded Tankard" to file under G, not T.
  var IGNORE_LEADING_THE = false;

  var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  function sortKey(name) {
    var n = name.trim();
    if (IGNORE_LEADING_THE) {
      n = n.replace(/^(the|a|an)\s+/i, "");
    }
    return n.toUpperCase();
  }

  function firstLetter(name) {
    var key = sortKey(name);
    var ch = key.charAt(0);
    return /[A-Z]/.test(ch) ? ch : "#"; // non-letter names bucket under #, not shown in A-Z bar
  }

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function buildEntryCard(entry) {
    var a = el("a", "cat-entry");
    a.href = entry.link || "#";
    var name = el("span", "cat-entry-name", escapeHtml(entry.name));
    var tag = el("span", "cat-entry-tag", escapeHtml(entry.tag || ""));
    a.appendChild(name);
    if (entry.tag) a.appendChild(tag);
    a.dataset.subcategory = entry.subcategory || "";
    return a;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function buildLetterSection(letter, entries) {
    var section = el("div", "cat-letter-section");
    section.id = "cat-" + letter;

    var head = el("div", "cat-letter-head");
    head.appendChild(el("div", "cat-letter-glyph", letter));
    var count = entries.length;
    head.appendChild(
      el(
        "div",
        "cat-letter-count",
        count === 0 ? "no entries" : count + " " + (count === 1 ? "entry" : "entries")
      )
    );
    head.appendChild(el("div", "cat-letter-rule"));
    section.appendChild(head);

    if (entries.length === 0) {
      section.appendChild(
        el(
          "div",
          "cat-entry-none",
          "No entries beginning with " + letter + " have been documented yet."
        )
      );
    } else {
      var grid = el("div", "cat-entry-grid");
      entries
        .sort(function (a, b) {
          return sortKey(a.name).localeCompare(sortKey(b.name));
        })
        .forEach(function (entry) {
          grid.appendChild(buildEntryCard(entry));
        });
      section.appendChild(grid);
    }

    return section;
  }

  function matchesSubcategory(entryId, filterId) {
    if (filterId === "all") return true;
    // Dotted convention: filtering by "npc" should also catch "npc.allies" etc.
    return entryId === filterId || entryId.indexOf(filterId + ".") === 0;
  }

  function render(data) {
    var main = document.querySelector(".cat-main");
    var alphaBar = document.querySelector(".cat-alpha-links");
    var pillsWrap = document.querySelector(".cat-subcat-pills");
    var sidebar = document.querySelector(".cat-sidebar-body[data-role='recent']");
    var statArticles = document.querySelector("[data-stat='articles']");
    var statSubcats = document.querySelector("[data-stat='subcategories']");
    var statSessions = document.querySelector("[data-stat='sessions']");
    var titleEl = document.querySelector(".cat-header-title");
    var descEl = document.querySelector(".cat-header-desc");
    var eyebrowEl = document.querySelector(".cat-header-eyebrow");

    if (titleEl) titleEl.textContent = data.label;
    if (descEl) descEl.textContent = data.description;
    if (eyebrowEl) eyebrowEl.lastChild.textContent = " " + data.eyebrow.replace(/^category\s*·\s*/i, "");

    // ---- Filter pills ----
    if (pillsWrap) {
      pillsWrap.innerHTML = "";
      data.subcategories.forEach(function (sub, i) {
        var pill = el("a", "cat-subcat-pill" + (i === 0 ? " is-active" : ""), escapeHtml(sub.label));
        pill.href = "#";
        pill.dataset.subcategory = sub.id;
        pillsWrap.appendChild(pill);
      });
    }

    function applyFilter(filterId) {
      // Recompute everything filtered, including letter sections
      var filtered = data.entries.filter(function (e) {
        return matchesSubcategory(e.subcategory, filterId);
      });
      renderLetters(filtered);
      renderAlphaBar(filtered);
    }

    function renderLetters(entries) {
      main.innerHTML = "";
      var buckets = {};
      LETTERS.forEach(function (l) {
        buckets[l] = [];
      });
      entries.forEach(function (entry) {
        var l = firstLetter(entry.name);
        if (buckets[l]) buckets[l].push(entry);
      });
      LETTERS.forEach(function (letter) {
        main.appendChild(buildLetterSection(letter, buckets[letter]));
      });
    }

    function renderAlphaBar(entries) {
      if (!alphaBar) return;
      var present = {};
      entries.forEach(function (e) {
        present[firstLetter(e.name)] = true;
      });
      Array.prototype.forEach.call(alphaBar.children, function (a) {
        var letter = a.textContent.trim();
        a.classList.toggle("has-entries", !!present[letter]);
        a.classList.toggle("is-empty", !present[letter]);
      });
    }

    // Pill click handling
    if (pillsWrap) {
      pillsWrap.addEventListener("click", function (ev) {
        var pill = ev.target.closest(".cat-subcat-pill");
        if (!pill) return;
        ev.preventDefault();
        Array.prototype.forEach.call(pillsWrap.children, function (p) {
          p.classList.remove("is-active");
        });
        pill.classList.add("is-active");
        applyFilter(pill.dataset.subcategory);
      });
    }

    // ---- Header stats ----
    if (statArticles) statArticles.textContent = data.entries.length;
    if (statSubcats) statSubcats.textContent = Math.max(data.subcategories.length - 1, 0);
    if (statSessions) {
      var sessions = {};
      data.entries.forEach(function (e) {
        if (e.session != null) sessions[e.session] = true;
      });
      statSessions.textContent = Object.keys(sessions).length;
    }

    // ---- Recently updated sidebar (top 5 by dateUpdated desc) ----
    if (sidebar) {
      sidebar.innerHTML = "";
      var dated = data.entries.filter(function (e) {
        return !!e.dateUpdated;
      });
      dated.sort(function (a, b) {
        return new Date(b.dateUpdated) - new Date(a.dateUpdated);
      });
      dated.slice(0, 5).forEach(function (entry) {
        var a = el("a", "cat-sidebar-item");
        a.href = entry.link || "#";
        a.appendChild(el("span", "cat-sidebar-item-name", escapeHtml(entry.name)));
        a.appendChild(
          el(
            "span",
            "cat-sidebar-item-sub",
            entry.session != null ? "session " + entry.session : ""
          )
        );
        sidebar.appendChild(a);
      });
      if (dated.length === 0) {
        sidebar.appendChild(el("div", "cat-entry-none", "No updates logged yet."));
      }
    }

    // Initial full render (all)
    renderLetters(data.entries);
    renderAlphaBar(data.entries);
  }

  function init() {
    var category = document.body.dataset.category;
    if (!category) {
      console.error("category-render.js: <body data-category=\"...\"> is required.");
      return;
    }
    fetch("/data/" + category + ".json")
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load /data/" + category + ".json (" + res.status + ")");
        return res.json();
      })
      .then(render)
      .catch(function (err) {
        console.error(err);
        var main = document.querySelector(".cat-main");
        if (main) {
          main.innerHTML =
            '<div class="cat-entry-none">Could not load this category\u2019s data. Check the console for details.</div>';
        }
      });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
