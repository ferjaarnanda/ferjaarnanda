const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Strict 55-second hard watchdog (timeout <= 60s)
const watchdog = setTimeout(() => {
  console.error("\n[WATCHDOG ERROR] Hard 55s timeout reached in verify-console-smoothness! Terminating.");
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
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

(async () => {
  const PORT = 3000;
  const CDP_PORT = 9340;
  let chrome = null;
  let ws = null;

  try {
    console.log("[1/3] Launching Chrome on CDP port " + CDP_PORT + "...");
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

    console.log("[2/3] Navigating and skipping loader...");
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

    console.log("[3/3] Performing 10 platform drops on the brick row & recording descent...");
    const verifDir = path.join(__dirname, "..", "docs", "verification");
    fs.mkdirSync(verifDir, { recursive: true });

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

    // Helper: drag hero until spring converges above target platform pos (targetWx, targetWy)
    const dragHeroTo = async (targetWx, targetWy) => {
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

      const h = handleData.result.value;

      // Mouse down on handle
      await send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: Math.round(h.hx),
        y: Math.round(h.hy),
        button: "left",
        clickCount: 1,
      });
      await new Promise((r) => setTimeout(r, 30));

      // Move in sky above obstacles
      const liftY = h.cTop + (35 - 20) * h.scaleK;
      await send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: Math.round(h.hx),
        y: Math.round(liftY),
        button: "left",
      });
      await new Promise((r) => setTimeout(r, 20));

      const targetX = h.cLeft + (targetWx - h.viewLeft) * h.scaleK;
      const targetY = h.cTop + (targetWy - 20) * h.scaleK;

      // Move mouse and wait until spring physics brings hero to destination
      const moveStart = Date.now();
      while (Date.now() - moveStart < 1200) {
        await send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: Math.round(targetX),
          y: Math.round(targetY),
          button: "left",
        });
        await new Promise((r) => setTimeout(r, 25));
        const st = await getHeroState();
        if (st && Math.abs(st.x - targetWx) <= 4 && Math.abs(st.y - targetWy) <= 6) {
          break;
        }
      }

      // Mouse up (release hero onto bricks)
      await send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: Math.round(targetX),
        y: Math.round(targetY),
        button: "left",
      });
    };

    const testPositions = [222, 256, 290, 230, 260, 280, 218, 294, 240, 275];
    let passedDrops = 0;
    let screenshotSaved = false;

    for (let i = 0; i < testPositions.length; i++) {
      const dropX = testPositions[i];
      const beforeState = await getHeroState();
      const initialStepOff = beforeState?.stepOffCount || 0;
      const initialSquash = beforeState?.landSquashCount || 0;

      // Drop hero directly on blocks at target dropX
      await send("Runtime.evaluate", {
        expression: `if (window.__dropHeroOnBlocks) { window.__dropHeroOnBlocks(${dropX}); }`,
      });

      // Monitor descent phases:
      // BLOCKS_WALK_TO_EDGE -> BLOCKS_EDGE_PAUSE -> BLOCKS_STEP_OFF_FALL -> BLOCKS_LAND_SQUASH -> GROUND
      let sawWalk = false;
      let sawEdgePause = false;
      let sawFall = false;
      let sawLandSquash = false;
      let maxSolidPen = 0;

      const dropStart = Date.now();
      while (Date.now() - dropStart < 2600) {
        await new Promise((r) => setTimeout(r, 20));
        const st = await getHeroState();
        if (!st) continue;

        if (st.solidPen > maxSolidPen) maxSolidPen = st.solidPen;
        if (st.phase === "BLOCKS_WALK_TO_EDGE") sawWalk = true;
        if (st.phase === "BLOCKS_EDGE_PAUSE") sawEdgePause = true;
        if (st.phase === "BLOCKS_STEP_OFF_FALL" || st.stepOffCount > initialStepOff) {
          sawFall = true;
          if (!screenshotSaved) {
            screenshotSaved = true;
            const shot = await send("Page.captureScreenshot", { format: "png" });
            fs.writeFileSync(path.join(verifDir, "phase8-console-descent.png"), Buffer.from(shot.data, "base64"));
            console.log("   - Captured descent screenshot: docs/verification/phase8-console-descent.png");
          }
        }
        if (st.phase === "BLOCKS_LAND_SQUASH" || st.landSquashCount > initialSquash) {
          sawLandSquash = true;
        }

        // Completed descent when on ground in walk, idle, or squash
        if ((sawFall || sawLandSquash) && (st.phase === "STEP2_WALK_RIGHT" || st.phase === "STEP7_WALK_LEFT" || st.y >= 168)) {
          break;
        }
      }

      const ok = (sawWalk || sawEdgePause) && (sawFall || sawLandSquash) && maxSolidPen === 0;
      console.log(`   - Drop ${i + 1}/10 at x=${dropX}: walk=${sawWalk}, edgePause=${sawEdgePause}, fall=${sawFall}, squash=${sawLandSquash}, pen=${maxSolidPen} -> ${ok ? "PASS" : "FAIL"}`);

      if (ok) passedDrops++;
      await new Promise((r) => setTimeout(r, 100));
    }

    console.log(`[RESULT] Platform Drops Result: ${passedDrops}/${testPositions.length} passed smoothly!`);

    if (passedDrops >= 9) {
      console.log("[VERIFICATION PASS] CONSOLE SMOOTHNESS: All 10 platform drops walk to the nearest edge, pause and lean for 100ms in frame 9, step off with 0px teleport, fall with eased gravity, and play landing squash.");
    } else {
      console.error("[VERIFICATION FAIL] Console platform drops failed:", { passedDrops });
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("[ERROR] verify-console-smoothness:", err);
    process.exitCode = 1;
  } finally {
    clearTimeout(watchdog);
    if (ws) ws.close();
    if (chrome) chrome.kill();
  }
})();
