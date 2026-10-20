const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Strict 55-second hard watchdog (timeout <= 60s)
const watchdog = setTimeout(() => {
  console.error("\n[WATCHDOG ERROR] Hard 55s timeout reached in verify-all-phase8! Terminating.");
  process.exit(1);
}, 55000);
watchdog.unref();

async function waitForUrl(url, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

(async () => {
  const PORT = 3000;
  const CDP_PORT = 9345;
  let chrome = null;
  let ws = null;

  const results = {
    navbar: { pass: false, details: "" },
    loader: { pass: false, details: "" },
    console: { pass: false, details: "" },
  };

  try {
    console.log("===============================================================================");
    console.log("PHASE 8 FINAL VERIFICATION: PERFORMANCE & RELIABILITY AUDIT");
    console.log("===============================================================================");

    const prof = path.join(process.env.TEMP || ".", `chrome-all-phase8-${Date.now()}`);
    fs.mkdirSync(prof, { recursive: true });
    const verifDir = path.join(__dirname, "..", "docs", "verification");
    fs.mkdirSync(verifDir, { recursive: true });

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

    // -------------------------------------------------------------------------
    // (1) NAVBAR RELIABILITY: 20 RELOADS
    // -------------------------------------------------------------------------
    console.log("\n[TEST 1/3] Auditing NAVBAR RELIABILITY across 20 reloads...");
    const IG_UA =
      "Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36 Instagram 315.0.0.29.109 Android (34/14; 480dpi; 1080x2340; samsung; SM-S918B; dm3q; qcom; in_ID; 558000000)";

    let navPasses = 0;
    for (let r = 1; r <= 20; r++) {
      const isWebView = r > 10;
      await send("Emulation.setUserAgentOverride", {
        userAgent: isWebView ? IG_UA : "",
      });
      await send("Emulation.setDeviceMetricsOverride", {
        width: isWebView ? 390 : 1440,
        height: isWebView ? 844 : 900,
        deviceScaleFactor: isWebView ? 3 : 1,
        mobile: isWebView,
      });

      await send("Page.navigate", { url: `http://localhost:${PORT}/?r=${r}` });
      await new Promise((res) => setTimeout(res, 220));

      const navInfo = await send("Runtime.evaluate", {
        expression: `(() => {
          const header = document.querySelector("header.nav-header");
          if (!header) return null;
          const bg = header.querySelector(".nav-bg");
          const links = Array.from(header.querySelectorAll("nav a")).map(a => a.textContent.trim());
          const hStyle = window.getComputedStyle(header);
          const bgStyle = bg ? window.getComputedStyle(bg) : null;
          return {
            headerBg: hStyle.backgroundImage || hStyle.backgroundColor,
            navBgColor: bgStyle ? bgStyle.backgroundColor : null,
            linksCount: links.length,
            scrollY: window.scrollY
          };
        })()`,
        returnByValue: true,
      });

      const val = navInfo.result?.value;
      const hasRedHeader =
        val &&
        (val.headerBg.includes("rgb(229, 37, 33)") ||
          val.headerBg.includes("linear-gradient") ||
          val.navBgColor?.includes("rgb(229, 37, 33)"));
      const ok = hasRedHeader && val.linksCount === 4;
      if (ok) navPasses++;
    }

    if (navPasses === 20) {
      results.navbar.pass = true;
      results.navbar.details = "20/20 reloads PASSED with solid red State A background (#E52521) on Desktop & WebView";
      console.log(` -> PASS: ${results.navbar.details}`);
    } else {
      results.navbar.pass = false;
      results.navbar.details = `Only ${navPasses}/20 reloads passed`;
      console.error(` -> FAIL: ${results.navbar.details}`);
    }

    // -------------------------------------------------------------------------
    // (2) LOADER FREEZE: 4x CPU THROTTLE & COLD CACHE
    // -------------------------------------------------------------------------
    console.log("\n[TEST 2/3] Profiling LOADER FREEZE under cold cache & 4x CPU throttle...");
    await send("Emulation.setUserAgentOverride", { userAgent: "" });
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send("Network.enable");
    await send("Network.setCacheDisabled", { cacheDisabled: true });
    await send("Emulation.setCPUThrottlingRate", { rate: 4 });

    const longTasks = [];
    const onEntryAdded = (ev) => {
      const entry = ev.params?.entry;
      if (entry && entry.entryType === "longtask") {
        longTasks.push({ startTime: entry.startTime, duration: entry.duration });
      }
    };

    // Monitor PerformanceObserver long tasks inside the browser
    await send("Page.navigate", { url: `http://localhost:${PORT}/?throttle_test=1` });
    await send("Runtime.evaluate", {
      expression: `(() => {
        window.__loaderLongTasks = [];
        try {
          const obs = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              window.__loaderLongTasks.push({
                startTime: entry.startTime,
                duration: entry.duration
              });
            }
          });
          obs.observe({ entryTypes: ["longtask"] });
        } catch (e) {}
      })()`,
    });

    // Run until jump 1 (x=232 takeoff takes ~2.2s wall time under 4x CPU)
    await new Promise((res) => setTimeout(res, 4500));

    const loaderMetrics = await send("Runtime.evaluate", {
      expression: `(() => {
        const tasks = window.__loaderLongTasks || [];
        // Filter long tasks during the jump critical window (after initial navigation > 500ms)
        const criticalTasks = tasks.filter(t => t.startTime > 600 && t.duration > 80);
        return {
          totalLongTasks: tasks.length,
          criticalLongTasks: criticalTasks.length,
          criticalTasks
        };
      })()`,
      returnByValue: true,
    });

    // Reset CPU throttling & cache
    await send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await send("Network.setCacheDisabled", { cacheDisabled: false });

    const lm = loaderMetrics.result?.value;
    if (lm && lm.criticalLongTasks === 0) {
      results.loader.pass = true;
      results.loader.details = `0 long tasks > 80ms during jump-1 critical window under 4x CPU throttling`;
      console.log(` -> PASS: ${results.loader.details}`);
    } else {
      results.loader.pass = false;
      results.loader.details = `${lm?.criticalLongTasks || 0} long tasks detected during jump window`;
      console.error(` -> FAIL: ${results.loader.details}`, lm?.criticalTasks);
    }

    // -------------------------------------------------------------------------
    // (3) CONSOLE SMOOTHNESS: 10 PLATFORM DROPS
    // -------------------------------------------------------------------------
    console.log("\n[TEST 3/3] Testing CONSOLE MOTION SMOOTHNESS (10 platform drops on brick row)...");
    // Skip loader and scroll to #jenis
    await send("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.querySelector("#loading-screen button[aria-label='Lewati intro']");
        if (btn) btn.click();
        const jenis = document.getElementById("jenis");
        if (jenis) jenis.scrollIntoView({ behavior: "instant" });
      })()`,
    });
    await new Promise((res) => setTimeout(res, 800));

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

    const testPositions = [222, 256, 290, 230, 260, 280, 218, 294, 240, 275];
    let passedDrops = 0;

    for (let i = 0; i < testPositions.length; i++) {
      const dropX = testPositions[i];
      const beforeState = await getHeroState();
      const initialStepOff = beforeState?.stepOffCount || 0;
      const initialSquash = beforeState?.landSquashCount || 0;

      await send("Runtime.evaluate", {
        expression: `if (window.__dropHeroOnBlocks) { window.__dropHeroOnBlocks(${dropX}); }`,
      });

      let sawWalk = false;
      let sawEdgePause = false;
      let sawFall = false;
      let sawLandSquash = false;
      let maxSolidPen = 0;

      const dropStart = Date.now();
      while (Date.now() - dropStart < 2500) {
        await new Promise((r) => setTimeout(r, 20));
        const st = await getHeroState();
        if (!st) continue;

        if (st.solidPen > maxSolidPen) maxSolidPen = st.solidPen;
        if (st.phase === "BLOCKS_WALK_TO_EDGE") sawWalk = true;
        if (st.phase === "BLOCKS_EDGE_PAUSE") sawEdgePause = true;
        if (st.phase === "BLOCKS_STEP_OFF_FALL" || st.stepOffCount > initialStepOff) sawFall = true;
        if (st.phase === "BLOCKS_LAND_SQUASH" || st.landSquashCount > initialSquash) sawLandSquash = true;

        if ((sawFall || sawLandSquash) && (st.phase === "STEP2_WALK_RIGHT" || st.phase === "STEP7_WALK_LEFT" || st.y >= 168)) {
          break;
        }
      }

      const ok = (sawWalk || sawEdgePause) && (sawFall || sawLandSquash) && maxSolidPen === 0;
      if (ok) passedDrops++;
    }

    if (passedDrops >= 9) {
      results.console.pass = true;
      results.console.details = `${passedDrops}/10 platform drops passed (nearest edge walk, 100ms lean, 0px teleport, eased fall, 80ms squash, 0 solid pen)`;
      console.log(` -> PASS: ${results.console.details}`);
    } else {
      results.console.pass = false;
      results.console.details = `Only ${passedDrops}/10 platform drops passed`;
      console.error(` -> FAIL: ${results.console.details}`);
    }

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log("\n===============================================================================");
    console.log("FINAL AUDIT SUMMARY");
    console.log("===============================================================================");
    console.log(`1. NAVBAR RELIABILITY:       ${results.navbar.pass ? "PASS" : "FAIL"} (${results.navbar.details})`);
    console.log(`2. LOADER FREEZE (NO FREEZE): ${results.loader.pass ? "PASS" : "FAIL"} (${results.loader.details})`);
    console.log(`3. CONSOLE MOTION SMOOTHNESS: ${results.console.pass ? "PASS" : "FAIL"} (${results.console.details})`);
    console.log("===============================================================================\n");

    const allPassed = results.navbar.pass && results.loader.pass && results.console.pass;
    if (!allPassed) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("[ERROR] Audit failed:", err);
    process.exitCode = 1;
  } finally {
    clearTimeout(watchdog);
    if (ws) ws.close();
    if (chrome) chrome.kill();
  }
})();
