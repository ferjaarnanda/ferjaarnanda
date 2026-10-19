const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

(async () => {
  const outDir = path.join(process.cwd(), "docs", "verification");
  fs.mkdirSync(outDir, { recursive: true });

  const PORT = 3099;
  const server = spawn("npx.cmd", ["next", "start", "-p", String(PORT)], {
    stdio: "ignore",
    shell: true,
  });
  await new Promise((r) => setTimeout(r, 3000));

  const prof = path.join(process.env.TEMP, "chrome-cdp-p4-35");
  fs.mkdirSync(prof, { recursive: true });
  const chrome = spawn(
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    [
      "--headless=new",
      "--remote-debugging-port=9399",
      `--user-data-dir=${prof}`,
      "--no-first-run",
      "--disable-gpu",
      "--hide-scrollbars",
    ],
    { stdio: "ignore" }
  );
  await new Promise((r) => setTimeout(r, 2000));

  try {
    const targets = await fetch("http://127.0.0.1:9399/json").then((r) =>
      r.json()
    );
    const pageTarget = targets.find((t) => t.type === "page");
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener("open", r));

    let id = 0;
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const msgId = ++id;
        const listener = (ev) => {
          const data = JSON.parse(ev.data);
          if (data.id === msgId) {
            ws.removeEventListener("message", listener);
            if (data.error) reject(data.error);
            else resolve(data.result);
          }
        };
        ws.addEventListener("message", listener);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });

    const evalJS = async (expr) => {
      const res = await send("Runtime.evaluate", {
        expression: expr,
        returnByValue: true,
        awaitPromise: true,
      });
      return res.result ? res.result.value : undefined;
    };

    const captureScreenshot = async (filename) => {
      const shot = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(
        path.join(outDir, filename),
        Buffer.from(shot.data, "base64")
      );
    };

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `sessionStorage.setItem("ferja_intro_seen_v1", "1");`,
    });

    // 1. DESKTOP 1440x900
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await send("Page.navigate", { url: `http://localhost:${PORT}/` });
    await new Promise((r) => setTimeout(r, 2500));

    // Scroll to #paket
    await evalJS(`(() => {
      const el = document.querySelector("#paket");
      if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    })()`);
    await new Promise((r) => setTimeout(r, 800));

    // Measure cards and coin properties on desktop
    const desktopMetrics = await evalJS(`(() => {
      const section = document.querySelector("#paket");
      const grid = section.querySelector(".paket-cards-grid");
      const cards = Array.from(grid.querySelectorAll(".coin-card"));

      const cardDetails = cards.map((card, i) => {
        const rect = card.getBoundingClientRect();
        const cs = getComputedStyle(card);
        const win = card.querySelector(".coin-window");
        const winRect = win.getBoundingClientRect();
        const coin = card.querySelector(".coin");
        const coinRect = coin.getBoundingClientRect();
        const coinCs = getComputedStyle(coin);
        const shadow = card.querySelector(".coin-shadow");
        const shadowRect = shadow.getBoundingClientRect();
        const shadowCs = getComputedStyle(shadow);
        const h3 = card.querySelector("h3");

        return {
          index: i,
          tierName: h3 ? h3.textContent.trim() : "",
          cardWidth: Math.round(rect.width * 100) / 100,
          cardHeight: Math.round(rect.height * 100) / 100,
          borderWidth: cs.borderTopWidth,
          boxShadow: cs.boxShadow,
          padding: cs.paddingTop + " " + cs.paddingRight + " " + cs.paddingBottom + " " + cs.paddingLeft,
          coinWindow: {
            width: Math.round(winRect.width * 100) / 100,
            height: Math.round(winRect.height * 100) / 100,
          },
          coin: {
            width: Math.round(coinRect.width * 100) / 100,
            height: Math.round(coinRect.height * 100) / 100,
            backgroundSize: coinCs.backgroundSize,
            animationName: coinCs.animationName,
            animationDuration: coinCs.animationDuration,
            animationTimingFunction: coinCs.animationTimingFunction,
            animationDirection: coinCs.animationDirection,
            animationIterationCount: coinCs.animationIterationCount,
          },
          shadow: {
            width: Math.round(shadowRect.width * 100) / 100,
            height: Math.round(shadowRect.height * 100) / 100,
            backgroundColor: shadowCs.backgroundColor,
            borderRadius: shadowCs.borderRadius,
          }
        };
      });

      return {
        cardCount: cards.length,
        cardDetails,
      };
    })()`);

    // Sample background-position-x 8 times over 1.2s to verify unidirectional rotation
    const samples = [];
    for (let i = 0; i < 8; i++) {
      const pos = await evalJS(`(() => {
        const coin = document.querySelector("#paket .coin");
        return getComputedStyle(coin).backgroundPositionX;
      })()`);
      samples.push({ t: i * 150, pos });
      await new Promise((r) => setTimeout(r, 150));
    }

    await captureScreenshot("phase4-desktop-cards-35x35.png");

    // 2. MOBILE 390x844
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await new Promise((r) => setTimeout(r, 600));

    await evalJS(`(() => {
      const el = document.querySelector("#paket");
      if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    const mobileMetrics = await evalJS(`(() => {
      const section = document.querySelector("#paket");
      const grid = section.querySelector(".paket-cards-grid");
      const cards = Array.from(grid.querySelectorAll(".coin-card"));

      return cards.map((card, i) => {
        const rect = card.getBoundingClientRect();
        const cs = getComputedStyle(card);
        const win = card.querySelector(".coin-window");
        const winRect = win.getBoundingClientRect();
        const coin = card.querySelector(".coin");
        const coinRect = coin.getBoundingClientRect();
        const coinCs = getComputedStyle(coin);
        const shadow = card.querySelector(".coin-shadow");
        const shadowRect = shadow.getBoundingClientRect();

        return {
          index: i,
          cardWidth: Math.round(rect.width * 100) / 100,
          cardHeight: Math.round(rect.height * 100) / 100,
          borderWidth: cs.borderTopWidth,
          boxShadow: cs.boxShadow,
          coinWindow: {
            width: Math.round(winRect.width * 100) / 100,
            height: Math.round(winRect.height * 100) / 100,
          },
          coin: {
            width: Math.round(coinRect.width * 100) / 100,
            height: Math.round(coinRect.height * 100) / 100,
            backgroundSize: coinCs.backgroundSize,
            animationDuration: coinCs.animationDuration,
          },
          shadow: {
            width: Math.round(shadowRect.width * 100) / 100,
            height: Math.round(shadowRect.height * 100) / 100,
          }
        };
      });
    })()`);

    await captureScreenshot("phase4-mobile-cards-35x35.png");

    ws.close();

    console.log(
      JSON.stringify(
        {
          desktopMetrics,
          samples,
          mobileMetrics,
        },
        null,
        2
      )
    );
  } finally {
    try {
      chrome.kill();
    } catch {}
    try {
      server.kill();
    } catch {}
    try {
      execSync("taskkill /F /IM chrome.exe /T", { stdio: "ignore" });
    } catch {}
  }
})();
