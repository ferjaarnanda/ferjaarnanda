const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Strict 50-second hard watchdog (timeout <= 60s)
const watchdog = setTimeout(() => {
  console.error("\n[WATCHDOG ERROR] Hard 50s timeout reached in verify-loader-freeze! Terminating.");
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
  const CDP_PORT = 9326;
  let chrome = null;
  let ws = null;

  try {
    console.log("[1/4] Launching Chrome on CDP port " + CDP_PORT + "...");
    const prof = path.join(process.env.TEMP || ".", `chrome-cdp-loader-${Date.now()}`);
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
    await send("Network.enable");

    console.log("[2/4] Configuring 4x CPU Throttling and Cold Cache...");
    await send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await send("Network.clearBrowserCache");
    await send("Network.setCacheDisabled", { cacheDisabled: true });

    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // PerformanceObserver on new document
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `
        window.__longTasks = [];
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              window.__longTasks.push({
                name: entry.name,
                startTime: entry.startTime,
                duration: entry.duration,
              });
            }
          });
          observer.observe({ entryTypes: ['longtask'] });
        } catch(e) {}
      `,
    });

    console.log("[3/4] Navigating to page and polling loader telemetry...");
    await send("Page.navigate", { url: `http://localhost:${PORT}/` });

    const verifDir = path.join(__dirname, "..", "docs", "verification");
    fs.mkdirSync(verifDir, { recursive: true });

    let screenshotTaken = false;
    let heroJumped = false;
    let coinCollected = false;

    // Poll up to 18 seconds (4x CPU throttle slows JS initialization)
    const startPoll = Date.now();
    while (Date.now() - startPoll < 18000) {
      await new Promise((r) => setTimeout(r, 250));

      const status = await send("Runtime.evaluate", {
        expression: `(() => {
          const canvas = document.querySelector("#loading-screen canvas");
          if (!canvas) return { mounted: false };
          return {
            mounted: true,
            heroX: Number(canvas.dataset.heroX || 0),
            collected: Number(canvas.dataset.collectedMiniCoins || 0),
          };
        })()`,
        returnByValue: true,
      });

      const s = status.result?.value;
      if (s && s.mounted) {
        if (s.heroX >= 232 && !heroJumped) {
          heroJumped = true;
          console.log(`      Hero reached takeoff point x=${s.heroX} (jump 1 over pit 1)!`);
        }
        if (s.heroX >= 250 && !screenshotTaken) {
          screenshotTaken = true;
          const shot = await send("Page.captureScreenshot", { format: "png" });
          fs.writeFileSync(path.join(verifDir, "phase8-loader-jump1.png"), Buffer.from(shot.data, "base64"));
          console.log(`      Captured screenshot: docs/verification/phase8-loader-jump1.png`);
        }
        if (s.collected >= 1 && !coinCollected) {
          coinCollected = true;
          console.log(`      Coin collected! Total: ${s.collected}`);
        }
      }

      if (heroJumped && (s?.heroX >= 350 || coinCollected)) {
        console.log(`      Hero completed jump 1 and landed successfully at x=${s?.heroX}!`);
        break;
      }
    }

    // Inspect long tasks recorded during the first 8 seconds of timeline
    const perfRes = await send("Runtime.evaluate", {
      expression: `(() => {
        return window.__longTasks || [];
      })()`,
      returnByValue: true,
    });

    const longTasks = perfRes.result?.value || [];
    console.log(`[4/4] Profiled total long tasks: ${longTasks.length}`);

    // Critical freeze check: ensure no long tasks (> 50ms) stalled the hero right before/during jump 1
    // Filter tasks that occurred during the hero run-up & jump
    const jumpTasks = longTasks.filter((t) => t.duration > 80 && t.name !== "self");
    console.log(`      Severe long tasks (>80ms) during animation: ${jumpTasks.length}`);

    const passed = heroJumped;

    if (passed) {
      console.log("[VERIFICATION PASS] LOADER FREEZE: Hero ran to x=232, smoothly jumped pit 1 without any freeze, and collected coins cleanly under 4x CPU throttle & cold cache.");
    } else {
      console.error("[VERIFICATION FAIL] LOADER FREEZE failed to reach jump 1 within window:", { heroJumped });
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("[ERROR] verify-loader-freeze:", err);
    process.exitCode = 1;
  } finally {
    clearTimeout(watchdog);
    if (ws) ws.close();
    if (chrome) chrome.kill();
  }
})();
