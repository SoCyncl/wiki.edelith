(() => {

  // ==========================================
  // CONFIG
  // ==========================================

  const CROW_NORMAL = "https://files.catbox.moe/7un9dk.png";
  const CROW_HAPPY  = "https://files.catbox.moe/7c7s1m.png";
  const CROW_BLINK  = "https://files.catbox.moe/d9mqhg.png";

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
    }

    .crow-widget img {
      width: 150px;
      height: 150px;
      image-rendering: pixelated;
      transition: transform .2s ease;
    }

    .crow-widget img:hover {
      transform: scale(1.3);
      cursor: pointer;
    }

    .crow-tooltip {
      position: absolute;
      bottom: 110%;
      left: 50%;
      transform: translateX(-50%);

      background: #333;
      color: white;

      padding: 8px 12px;
      border-radius: 4px;
      white-space: nowrap;

      opacity: 0;
      pointer-events: none;

      transition: opacity .15s ease;
    }

    .crow-widget:hover .crow-tooltip {
      opacity: 1;
    }
  `;
  document.head.appendChild(style);

  // ==========================================
  // HTML
  // ==========================================

  const crow = document.createElement("div");
  crow.className = "crow-widget";

  crow.innerHTML = `
    <div class="crow-tooltip fade-block">
      Click me to go to the top
    </div>

    <img
      class="crow-icon"
      src="${CROW_NORMAL}"
      alt="crow"
    >
  `;

  document.body.appendChild(crow);

  const crowImg = crow.querySelector(".crow-icon");

  // ==========================================
  // SCROLL TO TOP
  // ==========================================

  crowImg.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });

  // ==========================================
  // HAPPY HOVER
  // ==========================================

  crowImg.addEventListener("mouseenter", () => {
    crowImg.src = CROW_HAPPY;
  });

  crowImg.addEventListener("mouseleave", () => {
    crowImg.src = CROW_NORMAL;
  });

  // ==========================================
  // FLOATING ANIMATION
  // ==========================================

  function startFloatAnimation() {

    const tl = gsap.timeline({
      repeat: -1,
      yoyo: true,
      repeatRefresh: true
    });

    tl.to(crow, {
      duration: 0.6,
      x: 0,
      y: 0,
      ease: "elastic.out(1,0.3)"
    });

    for (let i = 0; i < 4; i++) {
      tl.to(crow, {
        duration: () => gsap.utils.random(0.6, 4),
        ease: "elastic.out(1,1)",
        x: () => gsap.utils.random(-15, 15),
        y: () => gsap.utils.random(-10, 5)
      });
    }
  }

  // ==========================================
  // BLINKING
  // ==========================================

  function startBlinking() {

    function blink() {

      if (!crow.matches(":hover")) {
        crowImg.src = CROW_BLINK;

        setTimeout(() => {
          if (!crow.matches(":hover")) {
            crowImg.src = CROW_NORMAL;
          }
        }, 120);
      }

      const nextBlink =
        Math.random() * 6000 + 2000;

      setTimeout(blink, nextBlink);
    }

    setTimeout(blink, 3000);
  }

  // ==========================================
  // PRELOAD
  // ==========================================

  [CROW_NORMAL, CROW_HAPPY, CROW_BLINK].forEach(src => {
    const img = new Image();
    img.src = src;
  });

  // ==========================================
  // START
  // ==========================================

  startFloatAnimation();
  startBlinking();

})();
