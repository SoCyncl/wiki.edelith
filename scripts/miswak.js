(() => {
  // ==========================================
  // SPRITES — replace TEMPLATE with your URLs
  // ==========================================
  const SPRITES = {
    normal:    "https://file.garden/aE4BmvQeoiKwc59V/miswak's%20mask%20shop/neutral-miswak.png",
    happy:     "https://file.garden/aE4BmvQeoiKwc59V/miswak's%20mask%20shop/neutral-miswak.png",
    blink:     "https://file.garden/aE4BmvQeoiKwc59V/miswak's%20mask%20shop/blink-miswak.png",
    drag:      "https://file.garden/aE4BmvQeoiKwc59V/miswak's%20mask%20shop/drag-miswak.png",
    scroll_up: "https://file.garden/aE4BmvQeoiKwc59V/miswak's%20mask%20shop/up-miswak.png",
    sad:       "https://files.catbox.moe/d9mqhg.png",
    surprised: "https://files.catbox.moe/d9mqhg.png",
    shocked:   "https://files.catbox.moe/d9mqhg.png",
    angry:     "https://files.catbox.moe/d9mqhg.png",
    // ↓ Add a unique blink sprite for scroll-up state if you have one,
    //   otherwise it falls back to the regular blink sprite.
    scroll_blink: "https://file.garden/aE4BmvQeoiKwc59V/miswak's%20mask%20shop/blink-miswak.png",
  };

  // NOTE: fill these in with your actual mask image URLs.
  // They were left as placeholder strings in the original, causing broken images when minimized.
  const MASK_NORMAL  = "TEMPLATE_MASK_NORMAL";
  const MASK_HOVER   = "TEMPLATE_MASK_HOVER";

  // ==========================================
  // DEFAULT FLAVOR TEXT
  // ==========================================
  const DEFAULT_FLAVOR = [
    "Double click to rid of me.",
    "My stories, read read read!",
    "Through aggregation of lies, a truth will form!",
    "Do not take me for fact, i am also a liar like you.",
    "Thank you, gracious Herb for your wonderful memories!",
    "parouse through my studies, studies!",
  ];

  // ==========================================
  // SCROLL THRESHOLD (% of page height)
  // ==========================================
  const SCROLL_THRESHOLD = 0.20;

  // ==========================================
  // STORAGE KEY
  // ==========================================
  const STORAGE_KEY = "miswak_widget_state";

  // ==========================================
  // STATE
  // ==========================================
  let flavorPool     = [];
  let flavorIndex    = 0;
  let bubbleOpen     = false;
  let typingTimer    = null;
  let isDragging     = false;
  let hasDragged     = false;
  let dragOffX       = 0;
  let dragOffY       = 0;
  let isMinimized    = false;
  let isFastFinish   = false;
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
    .miswak-widget {
      position: fixed;
      bottom: 10px;
      left: 5%;
      z-index: 9999;
      user-select: none;
      touch-action: none;
    }
    .miswak-widget img.miswak-icon {
      width: 150px;
      height: 150px;
      display: block;
      cursor: grab;
      transition: filter 0.4s ease;
    }
    .miswak-widget img.miswak-icon:active {
      cursor: grabbing;
    }
    .miswak-widget.miswak-glow img.miswak-icon {
      filter: drop-shadow(0 0 6px rgba(255,220,80,0.35))
              drop-shadow(0 0 12px rgba(255,180,0,0.2));
      animation: miswak-pulse 2s ease-in-out infinite;
    }
    @keyframes miswak-pulse {
      0%,100% { filter: drop-shadow(0 0 6px rgba(255,220,80,0.45)) drop-shadow(0 0 12px rgba(255,180,0,0.2)); }
      50%      { filter: drop-shadow(0 0 10px rgba(255,220,80,0.75)) drop-shadow(0 0 20px rgba(255,180,0,0.35)); }
    }

    /* Speech bubble */
    .miswak-bubble {
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
      max-width: 540px;
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
    .miswak-bubble.visible {
      opacity: 1;
      pointer-events: auto;
    }
    .miswak-bubble::after {
      content: '';
      position: absolute;
      bottom: -7px;
      left: 22px;
      width: 0; height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 7px solid #1a1a1a;
    }
    .miswak-bubble-cursor {
      display: inline-block;
      width: 2px;
      height: 1em;
      background: #e8e0cc;
      vertical-align: text-bottom;
      margin-left: 2px;
      animation: miswak-blink-cursor 0.7s step-end infinite;
    }
    @keyframes miswak-blink-cursor {
      0%,100% { opacity: 1; }
      50%      { opacity: 0; }
    }

    /* Mask (minimized) */
    .miswak-mask {
      position: fixed;
      bottom: 10px;
      left: 5%;
      z-index: 9999;
      cursor: pointer;
      user-select: none;
      display: none;
    }
    .miswak-mask img {
      width: 52px;
      height: 52px;
      image-rendering: pixelated;
      transition: transform 0.15s ease;
    }
    .miswak-mask img:hover {
      transform: scale(1.2);
    }

    /* Restore tab */
    .miswak-restore-tab {
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
    .miswak-restore-tab:hover {
      width: 12px;
      background: rgba(200,180,120,0.75);
    }
  `;
  document.head.appendChild(style);

  // ==========================================
  // BUILD DOM
  // ==========================================
  const miswak = document.createElement("div");
  miswak.className = "miswak-widget";
  miswak.innerHTML = `
    <div class="miswak-bubble"></div>
    <img class="miswak-icon" src="${SPRITES.normal}" alt="miswak">
  `;
  document.body.appendChild(miswak);

  const miswakImg = miswak.querySelector(".miswak-icon");
  const bubble    = miswak.querySelector(".miswak-bubble");

  const mask = document.createElement("div");
  mask.className = "miswak-mask";
  mask.innerHTML = `<img src="${MASK_NORMAL}" alt="miswak mask">`;
  document.body.appendChild(mask);
  const maskImg = mask.querySelector("img");

  const restoreTab = document.createElement("div");
  restoreTab.className = "miswak-restore-tab";
  restoreTab.title = "Bring miswak back";
  document.body.appendChild(restoreTab);

  // ==========================================
  // FLAVOR TEXT INIT
  // ==========================================
  function initFlavor() {
    if (window.MISWAK_PAGE_FLAVOR && Array.isArray(window.MISWAK_PAGE_FLAVOR) && window.MISWAK_PAGE_FLAVOR.length) {
      flavorPool = [...window.MISWAK_PAGE_FLAVOR];
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
    if (miswakImg.src !== src) miswakImg.src = src;
    currentEmotion = name;
  }

  // Priority order:
  // dragging > scroll_up > data-miswak hover emotion > widget hover > normal
  function resolveSprite() {
    if (isDragging)  return "drag";
    if (canScrollUp()) return "scroll_up";
    if (hoverEmotion) return hoverEmotion;
    if (miswak.matches(":hover")) return "happy";
    return "normal";
  }

  function refreshSprite() {
    if (!isBlinking) setSprite(resolveSprite());
  }

  // ==========================================
  // POSITION
  // ==========================================
  function applyPosition(x, y) {
    miswak.style.left   = x + "px";
    miswak.style.bottom = "auto";
    miswak.style.top    = y + "px";
    mask.style.left     = x + "px";
    mask.style.top      = y + "px";
    mask.style.bottom   = "auto";
  }

  function initPosition() {
    const s = loadState();
    if (s.x !== undefined && s.y !== undefined) {
      applyPosition(s.x, s.y);
    } else {
      applyPosition(Math.round(miswak.offsetLeft), Math.round(window.innerHeight - 160));
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

    const span   = document.createElement("span");
    const cursor = document.createElement("span");
    cursor.className = "miswak-bubble-cursor";
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
    bubbleOpen    = false;
    isFastFinish  = false;
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
      miswak.classList.add("miswak-glow");
    } else {
      miswak.classList.remove("miswak-glow");
    }
  }

  window.addEventListener("scroll", () => {
    updateGlow();
    refreshSprite(); // re-evaluate scroll_up sprite on every scroll event
    if (canScrollUp() && bubbleOpen) {
      fastFinishBubble();
    }
  }, { passive: true });

  // ==========================================
  // CLICK BEHAVIOR
  // ==========================================
  miswakImg.addEventListener("click", (e) => {
    if (isDragging || hasDragged) return;

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
    if (!miswak.contains(e.target) && bubbleOpen) {
      closeBubble();
    }
  });

  // ==========================================
  // DOUBLE-CLICK → MINIMIZE
  // ==========================================
  miswakImg.addEventListener("dblclick", (e) => {
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
      miswak.style.display      = "none";
      mask.style.display        = "block";
      restoreTab.style.display  = "block";
    } else {
      miswak.style.display      = "";
      mask.style.display        = "none";
      restoreTab.style.display  = "none";
    }
    if (persist) saveState({ minimized: val });
  }

  // ==========================================
  // DRAG
  // ==========================================
  function startDrag(clientX, clientY) {
    isDragging = true;
    hasDragged = false;
    const rect = miswak.getBoundingClientRect();
    dragOffX = clientX - rect.left;
    dragOffY = clientY - rect.top;
    miswak.style.bottom = "auto";
    miswak.style.top    = rect.top + "px";
    setSprite("drag");
  }

  function moveDrag(clientX, clientY) {
    if (!isDragging) return;
    hasDragged = true;
    const x = clientX - dragOffX;
    const y = clientY - dragOffY;
    miswak.style.left = x + "px";
    miswak.style.top  = y + "px";
    mask.style.left   = x + "px";
    mask.style.top    = y + "px";
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    refreshSprite();
    const x = parseInt(miswak.style.left);
    const y = parseInt(miswak.style.top);
    saveState({ x, y });
    setTimeout(() => { hasDragged = false; }, 0);
  }

  miswakImg.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  });

  document.addEventListener("mousemove", (e) => { moveDrag(e.clientX, e.clientY); });
  document.addEventListener("mouseup",   endDrag);

  // Touch drag
  miswakImg.addEventListener("touchstart", (e) => {
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
  // DATA-MISWAK EMOTION HOVER
  // ==========================================
  function attachEmotionListeners() {
    // supports both old data-crow and new data-miswak attributes
    document.querySelectorAll("[data-miswak], [data-crow]").forEach(el => {
      const emotion = el.getAttribute("data-miswak") || el.getAttribute("data-crow");
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
  // MISWAK HOVER → HAPPY
  // ==========================================
  miswakImg.addEventListener("mouseenter", () => {
    if (!isDragging && !hoverEmotion && !canScrollUp()) setSprite("happy");
  });
  miswakImg.addEventListener("mouseleave", () => {
    if (!isDragging) refreshSprite();
  });

  // ==========================================
  // FLOATING ANIMATION (GSAP)
  // Paused during drag to prevent fighting with left/top positioning.
  // ==========================================
  let floatTween = null;
  function startFloatAnimation() {
    if (typeof gsap === "undefined") return;
    const tl = gsap.timeline({ repeat: -1, yoyo: true, repeatRefresh: true });
    tl.to(miswak, { duration: 0.6, x: 0, y: 0, ease: "elastic.out(1,0.3)" });
    for (let i = 0; i < 4; i++) {
      tl.to(miswak, {
        duration: () => gsap.utils.random(0.8, 4),
        ease: "sine.inOut",
        x: () => gsap.utils.random(-12, 12),
        y: () => gsap.utils.random(-8, 4),
      });
    }
    floatTween = tl;
  }

  // Pause/resume float during drag so GSAP doesn't fight left/top
  miswakImg.addEventListener("mousedown", () => { if (floatTween) floatTween.pause(); });
  document.addEventListener("mouseup",   () => { if (floatTween && !isDragging) floatTween.resume(); });

  // ==========================================
  // BLINKING
  // Two modes: normal blink and scroll-up blink (uses scroll_blink sprite).
  // While past the scroll threshold, the blink interval is faster and uses
  // the scroll_blink sprite so it feels distinct.
  // ==========================================
  function startBlinking() {
    function blink() {
      const scrolling = canScrollUp();
      const interval  = scrolling
        ? Math.random() * 2000 + 800   // faster, eager blink when scroll_up active
        : Math.random() * 6000 + 2000; // normal relaxed blink

      // Skip blinking if hovering or dragging (scroll_up state ignores hover check
      // intentionally — it should still blink even when hovered, to look excited).
      const shouldSkip = isDragging || (!scrolling && miswak.matches(":hover"));

      if (!shouldSkip) {
        isBlinking = true;
        const blinkSprite = scrolling ? "scroll_blink" : "blink";
        setSprite(blinkSprite);
        setTimeout(() => {
          isBlinking = false;
          refreshSprite();
        }, 120);
      }

      setTimeout(blink, interval);
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
