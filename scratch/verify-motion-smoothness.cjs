const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const CDP_PORT = 9345;
const HARD_TIMEOUT_MS = 44000; // Hard watchdog failsafe <= 45s

const watchdog = setTimeout(() => {
  console.error(`\n[WATCHDOG ERROR] Hard timeout of ${HARD_TIMEOUT_MS}ms exceeded in verify-motion-smoothness! Terminating.`);
  process.exit(1);
}, HARD_TIMEOUT_MS);
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
  const startTime = Date.now();
  console.log(`[TEST] Starting 45-second verification test at ${new Date().toISOString()}`);

  let chrome = null;
  let ws = null;

  try {
    const prof = path.join(process.env.TEMP || ".", `chrome-cdp-motion-${Date.now()}`);
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
      deviceScaleFactor: 2,
      mobile: false,
    });

    console.log("[1/5] Navigating to http://localhost:3000/ and skipping loader...");
    await send("Page.navigate", { url: `http://localhost:${PORT}/` });
    await new Promise((r) => setTimeout(r, 600));

    // Skip loader immediately
    await send("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.querySelector("#loading-screen button[aria-label='Lewati intro']");
        if (btn) btn.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Scroll to #jenis (Mario console)
    await send("Runtime.evaluate", {
      expression: `document.getElementById("jenis").scrollIntoView({ behavior: "instant" });`,
    });
    await new Promise((r) => setTimeout(r, 400));

    const verifDir = path.join(__dirname, "..", "docs", "verification");
    fs.mkdirSync(verifDir, { recursive: true });

    // 2. Test SCORE HUD
    console.log("[2/5] Testing SCORE HUD...");
    const getScoreData = async () => {
      const res = await send("Runtime.evaluate", {
        expression: `(() => {
          const frame = document.querySelector(".mario-console-frame");
          const ariaEl = document.querySelector(".mario-zone [aria-live='polite']") || document.querySelector("[aria-live='polite']");
          return {
            coinScore: frame?.dataset?.coinScore || "0",
            ariaText: ariaEl ? ariaEl.textContent.trim() : null
          };
        })()`,
        returnByValue: true,
      });
      return res.result?.value;
    };

    const initial = await getScoreData();
    console.log(`   - Initial Score: ${initial?.coinScore}, aria-live: "${initial?.ariaText}"`);

    // Collect coin 1
    await send("Runtime.evaluate", {
      expression: `if (typeof window.__triggerCollectCoin === "function") window.__triggerCollectCoin();`,
    });
    await new Promise((r) => setTimeout(r, 200));
    const afterCoin1 = await getScoreData();
    console.log(`   - After Coin 1: Score=${afterCoin1?.coinScore}, aria-live: "${afterCoin1?.ariaText}"`);

    // Collect coin 2
    await send("Runtime.evaluate", {
      expression: `if (typeof window.__triggerCollectCoin === "function") window.__triggerCollectCoin();`,
    });
    await new Promise((r) => setTimeout(r, 200));
    const afterCoin2 = await getScoreData();
    console.log(`   - After Coin 2: Score=${afterCoin2?.coinScore}, aria-live: "${afterCoin2?.ariaText}"`);

    // Screenshot of Score HUD
    const hudShot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(verifDir, "phase3-score-hud.png"), Buffer.from(hudShot.data, "base64"));
    console.log("   - Saved screenshot: docs/verification/phase3-score-hud.png");

    // Bite reset to 00
    await send("Runtime.evaluate", {
      expression: `if (typeof window.__triggerPlantBite === "function") window.__triggerPlantBite();`,
    });
    await new Promise((r) => setTimeout(r, 300));
    const afterBite = await getScoreData();
    console.log(`   - After Plant Bite: Score=${afterBite?.coinScore}, aria-live: "${afterBite?.ariaText}"`);

    // Allow devour sequence (2.5s chew + 0.8s meteor/explosion) and 1s respawn blink to complete
    console.log("   - Waiting for devour sequence and 1s respawn blink to complete...");
    await new Promise((r) => setTimeout(r, 4500));

    // 3. Motion Smoothness 45s Test: Start recording 60Hz ticks
    console.log("[3/5] Starting 60Hz tick recording for motion smoothness...");
    await send("Runtime.evaluate", {
      expression: `if (typeof window.__startRecordingTicks === "function") window.__startRecordingTicks();`,
    });

    // 10 drops on brick row at various points (x = 216..296, y = 88)
    const dropPositions = [218, 230, 245, 256, 268, 275, 285, 294, 222, 280];
    let stepOffCaptured = false;

    console.log("[4/5] Executing 10 drops onto brick row (x=216..296, y=88)...");
    for (let i = 0; i < dropPositions.length; i++) {
      const dropX = dropPositions[i];
      await send("Runtime.evaluate", {
        expression: `if (typeof window.__dropHeroAt === "function") window.__dropHeroAt(${dropX}, 88);`,
      });
      // Wait for hero to walk to nearest edge, step off, fall, land squash, and continue walking
      await new Promise((r) => setTimeout(r, 1500));

      if (!stepOffCaptured && i === 2) {
        stepOffCaptured = true;
        const stepShot = await send("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(path.join(verifDir, "phase3-stepoff.png"), Buffer.from(stepShot.data, "base64"));
        console.log("   - Saved screenshot: docs/verification/phase3-stepoff.png");
      }
    }

    // Drops on each pipe top: pipe 1, pipe 2, pipe 3
    const pipeDrops = [
      { name: "Pipe 1", x: 383, y: 138 },
      { name: "Pipe 2", x: 423, y: 122 },
      { name: "Pipe 3", x: 463, y: 106 },
    ];
    console.log("[5/5] Executing drops from each pipe top...");
    for (let i = 0; i < pipeDrops.length; i++) {
      const p = pipeDrops[i];
      await send("Runtime.evaluate", {
        expression: `if (typeof window.__dropHeroAt === "function") window.__dropHeroAt(${p.x}, ${p.y});`,
      });
      await new Promise((r) => setTimeout(r, 1200));
    }

    // Let autonomous route run for remaining time until ~32s total elapsed
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(1000, 32000 - elapsed);
    console.log(`[TEST] Running autonomous route for remaining ${Math.round(remainingTime / 1000)}s...`);
    await new Promise((r) => setTimeout(r, remainingTime));

    // Stop recording and retrieve telemetry data
    const stopRes = await send("Runtime.evaluate", {
      expression: `if (typeof window.__stopRecordingTicks === "function") {
        window.__stopRecordingTicks();
      } else { null; }`,
      returnByValue: true,
    });
    const results = stopRes.result?.value;

    const finalShot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(verifDir, "phase3-motion-smoothness.png"), Buffer.from(finalShot.data, "base64"));
    console.log("   - Saved screenshot: docs/verification/phase3-motion-smoothness.png");

    if (!results) {
      throw new Error("window.__stopRecordingTicks() returned null");
    }

    // Evaluate against thresholds:
    // 1. |dy| <= 8 native px per tick
    // 2. |dx| <= 3 native px per tick (except during chomper devour lunge)
    // 3. Frame change duration >= 3 ticks (except takeoff/landing 9->7/1)
    // 4. Hitbox solid penetration === 0
    const passDy = results.worstDy <= 8.0;
    const passDx = results.worstDx <= 3.0;
    const passFrameTicks = results.minFrameTicks >= 3;
    const passSolid = results.solidOverlapCount === 0;
    const passAll = passDy && passDx && passFrameTicks && passSolid;

    console.log("\n=======================================================");
    console.log("            MOTION SMOOTHNESS TEST RESULTS             ");
    console.log("=======================================================");
    console.log(`Total Simulation Ticks Recorded : ${results.totalTicks}`);
    console.log(`Worst |dx| (native px/tick)     : ${results.worstDx.toFixed(3)} (Threshold <= 3.0) -> ${passDx ? "PASS" : "FAIL"}`);
    console.log(`Worst |dy| (native px/tick)     : ${results.worstDy.toFixed(3)} (Threshold <= 8.0) -> ${passDy ? "PASS" : "FAIL"}`);
    console.log(`Min Ticks Between Frame Changes : ${results.minFrameTicks} (Threshold >= 3) -> ${passFrameTicks ? "PASS" : "FAIL"}`);
    console.log(`Hitbox Solid Penetrations       : ${results.solidOverlapCount} (Threshold === 0) -> ${passSolid ? "PASS" : "FAIL"}`);
    console.log("-------------------------------------------------------");
    console.log(`OVERALL RESULT                  : ${passAll ? "PASS" : "FAIL"}`);
    console.log("=======================================================\n");

    const summaryReport = {
      timestamp: new Date().toISOString(),
      durationSeconds: ((Date.now() - startTime) / 1000).toFixed(2),
      totalTicks: results.totalTicks,
      metrics: {
        worstDx: results.worstDx,
        passDx,
        worstDy: results.worstDy,
        passDy,
        minFrameTicks: results.minFrameTicks,
        passFrameTicks,
        solidOverlapCount: results.solidOverlapCount,
        passSolid,
      },
      scoreHud: {
        initialScore: initial?.coinScore,
        scoreAfterCoin1: afterCoin1?.coinScore,
        ariaAfterCoin1: afterCoin1?.ariaText,
        scoreAfterCoin2: afterCoin2?.coinScore,
        scoreAfterBite: afterBite?.coinScore,
      },
      overallPass: passAll,
    };

    fs.writeFileSync(
      path.join(verifDir, "phase3-motion-results.json"),
      JSON.stringify(summaryReport, null, 2),
      "utf-8"
    );

    clearTimeout(watchdog);
    if (ws) ws.close();
    if (chrome) chrome.kill();

    if (!passAll) {
      process.exit(1);
    }
  } catch (err) {
    clearTimeout(watchdog);
    if (ws) ws.close();
    if (chrome) chrome.kill();
    console.error("[TEST ERROR]", err);
    process.exit(1);
  }
})();
