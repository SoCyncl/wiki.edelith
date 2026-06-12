(() => {
  // ==========================================
  // SPRITES — replace TEMPLATE with your URLs
  // ==========================================
  const SPRITES = {
    normal:    "https://file.garden/aE4BmvQeoiKwc59V/miswak's%20mask%20shop/neutral-miswak.png",
    happy:     "https://files.catbox.moe/7c7s1m.png",
    blink:     "https://file.garden/aE4BmvQeoiKwc59V/miswak's%20mask%20shop/blink-miswak.png",
    drag:      "https://file.garden/aE4BmvQeoiKwc59V/miswak's%20mask%20shop/drag-miswak.png",
    scroll_up: "https://file.garden/aE4BmvQeoiKwc59V/miswak's%20mask%20shop/up-miswak.png",
    sad:       "https://files.catbox.moe/d9mqhg.png",
    surprised: "https://files.catbox.moe/d9mqhg.png",
    shocked:   "https://files.catbox.moe/d9mqhg.png",
    angry:     "https://files.catbox.moe/d9mqhg.png",
  };

  const MASK_NORMAL  = "TEMPLATE_MASK_NORMAL";
  const MASK_HOVER   = "TEMPLATE_MASK_HOVER";

  // ==========================================
  // DEFAULT FLAVOR TEXT
  // ==========================================
  const DEFAULT_FLAVOR = [
    "Double click to rid of me.",
    "Welcome to the wiki.",
    "Don't believe everything you read here.",
    "Someone had to write all of this down.",
    "These records are as accurate as memory allows.",
    "The archivist is watching.",
  ];

  // ==========================================
  // SCROLL THRESHOLD (% of page height)
  // ==========================================
  const SCROLL_THRESHOLD = 0.20;

  // ==========================================
  // STORAGE KEY
  // ==========================================
  const STORAGE_KEY = "crow_widget_state";

  // ==========================================
  // STATE
  // ==========================================
  let flavorPool    = [];
  let flavorIndex   = 0;
  let bubbleOpen    = false;
  let typingTimer   = null;
  let isDragging    = false;
  let hasDragged    = false;   // NEW: tracks if a drag actually moved
  let dragOffX      = 0;
  let dragOffY      = 0;
  let isMinimized   = false;
  let isFastFinish  = false;
  let currentEmotion = "normal";
  let hoverEmotion   = null;
  let isBlinking     = false;

  // ==========================================
  // LOAD PERSISTED POSITION + MINIMIZED STATE
  // ==========================================
  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch { return {}; }
  }
  function saveState(patch) {
    try {
      const s = loadState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, ...patch }));
    } catch {}
  }

  // ==========================================
  // CSS
  // ==========================================
  const style = document.createElement("style");
  style.textContent = `
    .crow-widget {
      position: fixed;
      bottom: 10px;
      left: 5%;
      z-index: 9999;
      user-select: none;
      touch-action: none;
    }
    .crow-widget img.crow-icon {
      width: 150px;
      height: 150px;
      image-rendering: pixelated;
      display: block;
      cursor: grab;
      transition: filter 0.4s ease;
    }
    .crow-widget img.crow-icon:active {
      cursor: grabbing;
    }
    .crow-widget.crow-glow img.crow-icon {
      filter: drop-shadow(0 0 6px rgba(255,220,80,0.55))
              drop-shadow(0 0 12px rgba(255,180,0,0.3));
      animation: crow-pulse 2s ease-in-out infinite;
    }
    @keyframes crow-pulse {
      0%,100% { filter: drop-shadow(0 0 6px rgba(255,220,80,0.45)) drop-shadow(0 0 12px rgba(255,180,0,0.2)); }
      50%      { filter: drop-shadow(0 0 10px rgba(255,220,80,0.75)) drop-shadow(0 0 20px rgba(255,180,0,0.45)); }
    }

    /* Speech bubble */
    .crow-bubble {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: #1a1a1a;
      color: #e8e0cc;
      border: 1px solid #444;
      border-radius: 10px 10px 10px 2px;
      padding: 10px 14px;
      min-width: 60px;
      max-width: 240px;
      font-size: 13px;
      line-height: 1.5;
      font-family: inherit;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease, max-height 0.2s ease;
      overflow: hidden;
      white-space: normal;
      word-break: break-word;
    }
    .crow-bubble.visible {
      opacity: 1;
      pointer-events: auto;
    }
    .crow-bubble::after {
      content: '';
      position: absolute;
      bottom: -7px;
      left: 22px;
      width: 0; height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 7px solid #1a1a1a;
    }
    .crow-bubble-cursor {
      display: inline-block;
      width: 2px;
      height: 1em;
      background: #e8e0cc;
      vertical-align: text-bottom;
      margin-left: 2px;
      animation: crow-blink-cursor 0.7s step-end infinite;
    }
    @keyframes crow-blink-cursor {
      0%,100% { opacity: 1; }
      50%      { opacity: 0; }
    }

    /* Mask (minimized) */
    .crow-mask {
      position: fixed;
      bottom: 10px;
      left: 5%;
      z-index: 9999;
      cursor: pointer;
      user-select: none;
      display: none;
    }
    .crow-mask img {
      width: 52px;
      height: 52px;
      image-rendering: pixelated;
      transition: transform 0.15s ease;
    }
    .crow-mask img:hover {
      transform: scale(1.2);
    }

    /* Restore tab */
    .crow-restore-tab {
      position: fixed;
      bottom: 60px;
      left: 0;
      z-index: 9998;
      width: 6px;
      height: 30px;
      background: rgba(200,180,120,0.4);
      border-radius: 0 4px 4px 0;
      cursor: pointer;
      transition: width 0.2s ease, background 0.2s ease;
      display: none;
    }
    .crow-restore-tab:hover {
      width: 12px;
      background: rgba(200,180,120,0.75);
    }
  `;
  document.head.appendChild(style);

  // ==========================================
  // BUILD DOM
  // ==========================================
  const crow = document.createElement("div");
  crow.className = "crow-widget";
  crow.innerHTML = `
    <div class="crow-bubble"></div>
    <img class="crow-icon" src="${SPRITES.normal}" alt="crow">
  `;
  document.body.appendChild(crow);

  const crowImg   = crow.querySelector(".crow-icon");
  const bubble    = crow.querySelector(".crow-bubble");

  const mask = document.createElement("div");
  mask.className = "crow-mask";
  mask.innerHTML = `<img src="${MASK_NORMAL}" alt="crow mask">`;
  document.body.appendChild(mask);
  const maskImg = mask.querySelector("img");

  const restoreTab = document.createElement("div");
  restoreTab.className = "crow-restore-tab";
  restoreTab.title = "Bring crow back";
  document.body.appendChild(restoreTab);

  // ==========================================
  // FLAVOR TEXT INIT
  // ==========================================
  function initFlavor() {
    if (window.CROW_PAGE_FLAVOR && Array.isArray(window.CROW_PAGE_FLAVOR) && window.CROW_PAGE_FLAVOR.length) {
      flavorPool = [...window.CROW_PAGE_FLAVOR];
    } else {
      flavorPool = [...DEFAULT_FLAVOR];
    }
    flavorIndex = 0;
  }

  // ==========================================
  // SPRITE HELPERS
  // ==========================================
  function setSprite(name) {
    const src = SPRITES[name] || SPRITES.normal;
    if (crowImg.src !== src) crowImg.src = src;
    currentEmotion = name;
  }

  function resolveSprite() {
    if (isDragging)          return "drag";
    if (hoverEmotion)        return hoverEmotion;
    if (crow.matches(":hover") && !isDragging) return "happy";
    return "normal";
  }

  function refreshSprite() {
    if (!isBlinking) setSprite(resolveSprite());
  }

  // ==========================================
  // POSITION
  // ==========================================
  function applyPosition(x, y) {
    crow.style.left   = x + "px";
    crow.style.bottom = "auto";
    crow.style.top    = y + "px";
    mask.style.left   = x + "px";
    mask.style.top    = y + "px";
    mask.style.bottom = "auto";
  }

  function initPosition() {
    const s = loadState();
    if (s.x !== undefined && s.y !== undefined) {
      applyPosition(s.x, s.y);
    } else {
      applyPosition(Math.round(crow.offsetLeft), Math.round(window.innerHeight - 160));
    }
    if (s.minimized) {
      setMinimized(true, false);
    }
  }

  // ==========================================
  // BUBBLE / TYPEWRITER
  // ==========================================
  function openBubble(text, onDone) {
    bubbleOpen = true;
    isFastFinish = false;
    bubble.classList.add("visible");
    bubble.innerHTML = "";

    const span = document.createElement("span");
    const cursor = document.createElement("span");
    cursor.className = "crow-bubble-cursor";
    bubble.appendChild(span);
    bubble.appendChild(cursor);

    let i = 0;
    const speed = 38;
    const fast  = 8;

    function tick() {
      if (i >= text.length) {
        cursor.remove();
        if (onDone) onDone();
        return;
      }
      span.textContent += text[i++];
      typingTimer = setTimeout(tick, isFastFinish ? fast : speed);
    }
    tick();
  }

  function closeBubble() {
    if (typingTimer) { clearTimeout(typingTimer); typingTimer = null; }
    bubble.classList.remove("visible");
    bubbleOpen = false;
    isFastFinish = false;
    bubble.innerHTML = "";
  }

  function fastFinishBubble() {
    isFastFinish = true;
  }

  // ==========================================
  // SCROLL DETECTION
  // ==========================================
  function scrollPercent() {
    const el  = document.documentElement;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) return 0;
    return window.scrollY / max;
  }

  function canScrollUp() {
    return scrollPercent() >= SCROLL_THRESHOLD;
  }

  function updateGlow() {
    if (canScrollUp()) {
      crow.classList.add("crow-glow");
    } else {
      crow.classList.remove("crow-glow");
    }
  }

  window.addEventListener("scroll", () => {
    updateGlow();
    if (canScrollUp() && bubbleOpen) {
      fastFinishBubble();
    }
  }, { passive: true });

  // ==========================================
  // CLICK BEHAVIOR
  // ==========================================
  crowImg.addEventListener("click", (e) => {
    if (isDragging || hasDragged) return;   // CHANGED: ignore clicks after dragging

    if (canScrollUp()) {
      closeBubble();
      window.scrollTo({ top: 0, behavior: "smooth" });
      setSprite("happy");
      setTimeout(() => refreshSprite(), 800);
      return;
    }

    if (bubbleOpen) {
      closeBubble();
      flavorIndex++;
      if (flavorIndex >= flavorPool.length) flavorIndex = 0;
      openBubble(flavorPool[flavorIndex]);
    } else {
      openBubble(flavorPool[flavorIndex]);
    }
  });

  document.addEventListener("click", (e) => {
    if (!crow.contains(e.target) && bubbleOpen) {
      closeBubble();
    }
  });

  // ==========================================
  // DOUBLE-CLICK → MINIMIZE
  // ==========================================
  crowImg.addEventListener("dblclick", (e) => {
    e.preventDefault();
    setMinimized(true);
  });

  mask.addEventListener("dblclick", (e) => {
    e.preventDefault();
    setMinimized(false);
  });

  restoreTab.addEventListener("click", () => {
    setMinimized(false);
  });

  mask.addEventListener("click", (e) => {
    if (canScrollUp()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  maskImg.addEventListener("mouseenter", () => { maskImg.src = MASK_HOVER; });
  maskImg.addEventListener("mouseleave", () => { maskImg.src = MASK_NORMAL; });

  function setMinimized(val, persist = true) {
    isMinimized = val;
    if (val) {
      crow.style.display  = "none";
      mask.style.display  = "block";
      restoreTab.style.display = "block";
    } else {
      crow.style.display  = "";
      mask.style.display  = "none";
      restoreTab.style.display = "none";
    }
    if (persist) saveState({ minimized: val });
  }

  // ==========================================
  // DRAG
  // ==========================================
  function startDrag(clientX, clientY) {
    isDragging = true;
    hasDragged = false;   // CHANGED: reset at drag start
    const rect = crow.getBoundingClientRect();
    dragOffX = clientX - rect.left;
    dragOffY = clientY - rect.top;
    crow.style.bottom = "auto";
    crow.style.top    = rect.top + "px";
    setSprite("drag");
  }

  function moveDrag(clientX, clientY) {
    if (!isDragging) return;
    hasDragged = true;   // CHANGED: mark that we actually moved
    const x = clientX - dragOffX;
    const y = clientY - dragOffY;
    crow.style.left = x + "px";
    crow.style.top  = y + "px";
    mask.style.left = x + "px";
    mask.style.top  = y + "px";
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    refreshSprite();
    const x = parseInt(crow.style.left);
    const y = parseInt(crow.style.top);
    saveState({ x, y });
    setTimeout(() => { hasDragged = false; }, 0);   // CHANGED: reset after click event fires
  }

  crowImg.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  });

  document.addEventListener("mousemove", (e) => { moveDrag(e.clientX, e.clientY); });
  document.addEventListener("mouseup",   endDrag);

  // Touch drag
  crowImg.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY);
  }, { passive: true });
  document.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    const t = e.touches[0];
    moveDrag(t.clientX, t.clientY);
  }, { passive: true });
  document.addEventListener("touchend", endDrag);

  // ==========================================
  // DATA-CROW EMOTION HOVER
  // ==========================================
  function attachEmotionListeners() {
    document.querySelectorAll("[data-crow]").forEach(el => {
      const emotion = el.getAttribute("data-crow");
      el.addEventListener("mouseenter", () => {
        hoverEmotion = emotion;
        refreshSprite();
      });
      el.addEventListener("mouseleave", () => {
        hoverEmotion = null;
        refreshSprite();
      });
    });
  }

  const emotionObserver = new MutationObserver(attachEmotionListeners);
  emotionObserver.observe(document.body, { childList: true, subtree: true });
  attachEmotionListeners();

  // ==========================================
  // CROW HOVER → HAPPY
  // ==========================================
  crowImg.addEventListener("mouseenter", () => {
    if (!isDragging && !hoverEmotion) setSprite("happy");
  });
  crowImg.addEventListener("mouseleave", () => {
    if (!isDragging) refreshSprite();
  });

  // ==========================================
  // FLOATING ANIMATION (GSAP)
  // ==========================================
  function startFloatAnimation() {
    if (typeof gsap === "undefined") return;
    const tl = gsap.timeline({ repeat: -1, yoyo: true, repeatRefresh: true });
    tl.to(crow, { duration: 0.6, x: 0, y: 0, ease: "elastic.out(1,0.3)" });
    for (let i = 0; i < 4; i++) {
      tl.to(crow, {
        duration: () => gsap.utils.random(0.8, 4),
        ease: "sine.inOut",
        x: () => gsap.utils.random(-12, 12),
        y: () => gsap.utils.random(-8, 4),
      });
    }
  }

  // ==========================================
  // BLINKING
  // ==========================================
  function startBlinking() {
    function blink() {
      if (!crow.matches(":hover") && !isDragging && !hoverEmotion) {
        isBlinking = true;
        setSprite("blink");
        setTimeout(() => {
          isBlinking = false;
          refreshSprite();
        }, 120);
      }
      setTimeout(blink, Math.random() * 6000 + 2000);
    }
    setTimeout(blink, 3000);
  }

  // ==========================================
  // PRELOAD
  // ==========================================
  function preloadSprites() {
    const allSrcs = [
      ...Object.values(SPRITES),
      MASK_NORMAL,
      MASK_HOVER,
    ].filter(s => s && !s.startsWith("TEMPLATE"));
    allSrcs.forEach(src => { const i = new Image(); i.src = src; });
  }

  // ==========================================
  // BOOT
  // ==========================================
  initFlavor();
  initPosition();
  updateGlow();
  preloadSprites();
  startFloatAnimation();
  startBlinking();

})();
