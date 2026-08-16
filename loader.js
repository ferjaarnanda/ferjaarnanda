
(() => {
    const loader = document.createElement("div");
    loader.id = "ferja-loader";

    const stars = document.createElement("div");
    stars.className = "loader-stars";

    const starCount = Math.min(
        78,
        Math.max(44, Math.floor(window.innerWidth / 6))
    );

    for (let i = 0; i < starCount; i++) {
        const star = document.createElement("span");
        star.className = "star";

        const size = (Math.random() * 1.9 + 0.45).toFixed(2);
        const opacity = (Math.random() * 0.42 + 0.14).toFixed(2);
        const duration = (Math.random() * 17 + 12).toFixed(2);
        const delay = (-Math.random() * duration).toFixed(2);
        const drift = ((Math.random() - 0.5) * 80).toFixed(0) + "px";

        star.style.left = (Math.random() * 100).toFixed(2) + "%";
        star.style.setProperty("--size", size + "px");
        star.style.setProperty("--opacity", opacity);
        star.style.setProperty("--duration", duration + "s");
        star.style.setProperty("--delay", delay + "s");
        star.style.setProperty("--drift", drift);

        stars.appendChild(star);
    }

    const content = document.createElement("div");
    content.className = "loader-content";

    const percent = document.createElement("div");
    percent.className = "loader-percent";
    percent.textContent = "0%";

    const bar = document.createElement("div");
    bar.className = "loader-bar";

    const progress = document.createElement("div");
    progress.className = "loader-progress";
    bar.appendChild(progress);

    const messageWrap = document.createElement("div");
    messageWrap.className = "loader-message-wrap";

    const message = document.createElement("div");
    message.className = "loader-message";
    message.innerHTML =
        "TURNING YOUR IDEAS INTO<br><strong>WORKING WEBSITES, FROM CODE TO PRODUCTION.</strong>";

    const action = document.createElement("button");
    action.className = "loader-action";
    action.type = "button";
    action.textContent = "Explore My Portfolio →";

    messageWrap.append(message, action);
    content.append(percent, bar, messageWrap);
    loader.append(stars, content);
    document.documentElement.prepend(loader);

    let value = 0;
    const start = performance.now();
    const duration = 2200;
    let closed = false;

    function closeLoader() {
        if (closed) return;
        closed = true;

        loader.classList.add("is-hidden");

        setTimeout(() => {
            loader.remove();
        }, 850);
    }

    action.addEventListener("click", closeLoader);

    function animate(now) {
        const elapsed = now - start;
        value = Math.min(100, Math.round((elapsed / duration) * 100));

        percent.textContent = value + "%";
        progress.style.width = value + "%";

        if (value < 100) {
            requestAnimationFrame(animate);
        } else {
            setTimeout(() => {
                loader.classList.add("show-message");

                // The button is available immediately, but the portfolio
                // also continues automatically so the loader never blocks the site.
                setTimeout(closeLoader, 4200);
            }, 220);
        }
    }

    requestAnimationFrame(animate);
})();
