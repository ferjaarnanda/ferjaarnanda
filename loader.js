(() => {
  "use strict";

  const DURATION = 2600;
  const MESSAGE_DURATION = 1250;
  const STAR_COUNT = 105;

  function initLoader() {
    if (document.getElementById("ferja-loader")) return;

    const loader = document.createElement("div");
    loader.id = "ferja-loader";
    loader.setAttribute("aria-label", "Loading portfolio");

    loader.innerHTML = `
      <canvas id="ferja-loader-canvas"></canvas>
      <div class="ferja-loader-content">
        <p class="ferja-loader-percent">0%</p>
        <div class="ferja-loader-progress">
          <div class="ferja-loader-progress-bar"></div>
        </div>
      </div>
      <p class="ferja-loader-message">From Idea to Production.</p>
    `;

    document.body.prepend(loader);

    const canvas = loader.querySelector("#ferja-loader-canvas");
    const ctx = canvas.getContext("2d");
    const percent = loader.querySelector(".ferja-loader-percent");
    const bar = loader.querySelector(".ferja-loader-progress-bar");

    let width = 0;
    let height = 0;
    let stars = [];
    let startTime = performance.now();
    let messageShown = false;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createStars();
    };

    const createStars = () => {
      stars = Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() < .72
          ? Math.random() * .75 + .35
          : Math.random() * 1.05 + .7,
        speed: Math.random() * .32 + .08,
        alpha: Math.random() * .42 + .25,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * .018 + .004
      }));
    };

    const drawStars = () => {
      ctx.clearRect(0, 0, width, height);

      for (const s of stars) {
        s.y -= s.speed;

        if (s.y < -3) {
          s.y = height + Math.random() * 8;
          s.x = Math.random() * width;
        }

        s.twinkle += s.twinkleSpeed;
        const pulse = .84 + Math.sin(s.twinkle) * .16;
        const a = Math.max(.12, s.alpha * pulse);

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fill();
      }

      requestAnimationFrame(drawStars);
    };

    const finish = () => {
      if (messageShown) return;
      messageShown = true;

      percent.textContent = "100%";
      bar.style.width = "100%";
      loader.classList.add("message-state");

      setTimeout(() => {
        loader.classList.add("is-hidden");
        setTimeout(() => loader.remove(), 800);
      }, MESSAGE_DURATION);
    };

    const animateLoading = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 2);

      const value = Math.round(eased * 100);
      percent.textContent = `${value}%`;
      bar.style.width = `${value}%`;

      if (progress < 1) {
        requestAnimationFrame(animateLoading);
      } else {
        finish();
      }
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    drawStars();
    requestAnimationFrame(animateLoading);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLoader, { once: true });
  } else {
    initLoader();
  }
})();
