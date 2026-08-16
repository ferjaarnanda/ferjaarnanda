/* Ferja Arnanda — Standalone Loading Screen
   Add only this line to your existing index.html:
   <script src="loader.js"></script>
*/

(() => {
  const loader = document.createElement("div");
  loader.id = "fa-loader";
  loader.innerHTML = `
    <div class="fa-stars"></div>
    <div class="fa-loader-content">
      <div class="fa-loader-percent">0%</div>
      <div class="fa-loader-bar">
        <div class="fa-loader-progress"></div>
      </div>
    </div>
  `;

  document.documentElement.classList.add("fa-loading");
  document.body.prepend(loader);

  const stars = loader.querySelector(".fa-stars");

  // Small random stars
  for (let i = 0; i < 90; i++) {
    const star = document.createElement("span");
    star.className = "fa-star";
    star.style.left = Math.random() * 100 + "%";
    star.style.top = Math.random() * 100 + "%";
    star.style.animationDelay = Math.random() * 2.5 + "s";
    star.style.animationDuration = (1.5 + Math.random() * 2.5) + "s";
    star.style.opacity = (0.25 + Math.random() * 0.75).toFixed(2);
    const size = (1 + Math.random() * 2.2).toFixed(1);
    star.style.width = size + "px";
    star.style.height = size + "px";
    stars.appendChild(star);
  }

  const percent = loader.querySelector(".fa-loader-percent");
  const progress = loader.querySelector(".fa-loader-progress");

  const duration = 2600;
  const start = performance.now();

  function animate(now) {
    const value = Math.min((now - start) / duration, 1);
    const number = Math.floor(value * 100);

    percent.textContent = number + "%";
    progress.style.width = number + "%";

    if (value < 1) {
      requestAnimationFrame(animate);
    } else {
      setTimeout(() => {
        loader.classList.add("fa-loader-hide");
        document.documentElement.classList.remove("fa-loading");

        setTimeout(() => loader.remove(), 700);
      }, 180);
    }
  }

  requestAnimationFrame(animate);
})();
