const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Strict 50-second hard watchdog (timeout <= 60s)
const watchdog = setTimeout(() => {
  console.error("\n[WATCHDOG ERROR] Hard 50s timeout reached in verify-console-smoothness! Terminating.");
  process.exit(1);
}, 50000);
watchdog.unref();

async function waitForUrl(url, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

(async () => {
  const PORT = 3000;
  const CDP_PORT = 9338;
  let chrome = null;
  let ws = null;

  try {
    const prof = path.join(process.env.TEMP || ".", `chrome-cdp-console-${Date.now()}`);
    fs.mkdirSync(prof, { recursive: true });

    chrome = spawn(
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      [
        "--headless=new",
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${prof}`,
        "--no-first-run",
        "--disable-gpu",
        "--hide-scrollbars",
        "about:blank",
      ],
      { stdio: "ignore", windowsHide: true }
    );

    const targetsRes = await waitForUrl(`http://127.0.0.1:${CDP_PORT}/json`);
    const targets = await targetsRes.json();
    const pageTarget = targets.find((t) => t.type === "page");
    ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener("open", r));

    let id = 0;
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const msgId = ++id;
        const timer = setTimeout(() => {
          ws.removeEventListener("message", listener);
          reject(new Error(`CDP timeout on ${method}`));
        }, 12000);
        const listener = (ev) => {
          const data = JSON.parse(ev.data);
          if (data.id === msgId) {
            clearTimeout(timer);
            ws.removeEventListener("message", listener);
            if (data.error) reject(data.error);
            else resolve(data.result);
          }
        };
        ws.addEventListener("message", listener);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });

    await send("Page.enable");
    await send("Runtime.enable");

    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await send("Page.navigate", { url: `http://localhost:${PORT}/` });
    await new Promise((r) => setTimeout(r, 600));

    // Skip loader immediately
    await send("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.querySelector("#loading-screen button[aria-label='Lewati intro']");
        if (btn) btn.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 1600));

    // Scroll to #jenis (Mario console)
    await send("Runtime.evaluate", {
      expression: `document.getElementById("jenis").scrollIntoView({ behavior: "instant" });`,
    });
    await new Promise((r) => setTimeout(r, 500));

    const getHeroState = async () => {
      const res = await send("Runtime.evaluate", {
        expression: `(() => {
          const frame = document.querySelector(".mario-console-frame");
          if (!frame) return null;
          return {
            phase: frame.dataset.heroPhase,
            x: Number(frame.dataset.heroX || 0),
            y: Number(frame.dataset.heroY || 0),
            frame: Number(frame.dataset.heroFrame || 0),
            solidPen: Number(frame.dataset.solidPenetration || 0),
            stepOffCount: Number(frame.dataset.stepOffCount || 0),
            landSquashCount: Number(frame.dataset.landSquashCount || 0)
          };
        })()`,
        returnByValue: true,
      });
      return res.result?.value;
    };

    // Diagnostic on single drop
    console.log("Initial hero state:", await getHeroState());

    const handleData = await send("Runtime.evaluate", {
      expression: `(() => {
        const handle = document.querySelector("[data-hero-handle='true']");
        const frame = document.querySelector(".mario-console-frame");
        const canvas = frame.querySelector("canvas");
        const hRect = handle.getBoundingClientRect();
        const cRect = canvas.getBoundingClientRect();
        return {
          hx: hRect.left + hRect.width / 2,
          hy: hRect.top + hRect.height / 2,
          cLeft: cRect.left,
          cTop: cRect.top,
          viewLeft: Number(frame.dataset.viewLeft || 0),
          scaleK: Number(frame.dataset.scaleK || 2)
        };
      })()`,
      returnByValue: true,
    });
    console.log("Handle data:", handleData.result.value);

  } catch (err) {
    console.error("[ERROR]:", err);
    process.exitCode = 1;
  } finally {
    clearTimeout(watchdog);
    if (ws) ws.close();
    if (chrome) chrome.kill();
  }
})();
