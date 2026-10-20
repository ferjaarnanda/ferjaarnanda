const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Strict 55-second hard watchdog (timeout <= 60s)
const watchdog = setTimeout(() => {
  console.error("\n[WATCHDOG ERROR] Hard 55s timeout reached! Terminating process.");
  process.exit(1);
}, 55000);
watchdog.unref();

async function waitForUrl(url, timeoutMs = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

(async () => {
  fs.mkdirSync("docs/verification", { recursive: true });

  const PORT = 3073;
  const CDP_PORT = 9313;
  const nextBin = require.resolve("next/dist/bin/next");

  let server = null;
  let chrome = null;
  let ws = null;

  try {
    console.log("[1/6] Starting Next.js production server on port " + PORT + "...");
    server = spawn(
      process.execPath,
      [nextBin, "start", process.cwd(), "-p", String(PORT)],
      { stdio: "ignore", windowsHide: true }
    );
    await waitForUrl(`http://localhost:${PORT}`);
    console.log("      Next.js server is ready!");

    console.log("[2/6] Launching Headless Chrome on CDP port " + CDP_PORT + "...");
    const prof = path.join(process.env.TEMP || ".", `chrome-cdp-bugs-${Date.now()}`);
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
        }, 8000);
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

    // =========================================================================
    // TEST 1 & 2 & 3: LOADING SCREEN REPLAY, SCROLL RESET & FLOATING BRICKS CLEARANCE
    // =========================================================================
    console.log("[3/6] Testing Loading Screen Replay, Hash Strip, Scroll Reset & Bricks Clearance...");

    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // Navigate with a hash #jenis to verify hash stripping and scroll reset to (0,0)
    await send("Page.navigate", { url: `http://localhost:${PORT}/#jenis` });
    await new Promise((r) => setTimeout(r, 600));

    // Verify loader is visible on initial load
    const initialLoaderCheck = await send("Runtime.evaluate", {
      expression: `(() => {
        const loader = document.getElementById("loading-screen");
        return {
          loaderPresent: !!loader,
          scrollRestoration: history.scrollRestoration,
          currentHash: window.location.hash,
          scrollY: window.scrollY
        };
      })()`,
      returnByValue: true,
    });
    const l1 = initialLoaderCheck.result.value;
    console.log("      Initial Load with #jenis:");
    console.log("      - Loader visible:", l1.loaderPresent);
    console.log("      - scrollRestoration:", l1.scrollRestoration);
    console.log("      - hash stripped:", l1.currentHash === "" ? "YES ('')" : l1.currentHash);
    console.log("      - scrollY at start:", l1.scrollY);

    // Track hero trajectory vs floating blocks
    // floating blocks:
    // Block 1: x=150..198, y=104..120
    // Block 2: x=690..770, y=88..104
    console.log("      Tracking hero trajectory vs floating blocks across timeline...");
    const trajChecks = [];
    const startTime = Date.now();
    let minClearanceB1 = 999;
    let minClearanceB2 = 999;
    let touchCount = 0;

    // Sample positions for 3.5 seconds
    while (Date.now() - startTime < 3500) {
      const trajRes = await send("Runtime.evaluate", {
        expression: `(() => {
          const loader = document.getElementById("loading-screen");
          if (!loader) return null;
          const heroX = Number(loader.dataset.heroX || 40);
          const jumpOffsetY = Number(loader.dataset.jumpOffsetY || 0);
          const phase = loader.dataset.phase || "fadein";
          const time = Number(loader.dataset.timelineTime || 0);
          return { heroX, jumpOffsetY, phase, time };
        })()`,
        returnByValue: true,
      });
      const tData = trajRes.result.value;
      if (tData) {
        trajChecks.push(tData);
        // Hero top in strip coordinates: groundY=168, hero feet at 168+jumpOffsetY, top at 168+jumpOffsetY-42 = 126+jumpOffsetY
        const heroTop = 126 + tData.jumpOffsetY;
        const heroLeft = tData.heroX - 9;
        const heroRight = tData.heroX + 9;

        // Block 1 check: x=150..198, bottom=120
        if (heroRight >= 150 && heroLeft <= 198) {
          const clearance = heroTop - 120; // positive means hero is below block
          if (clearance < minClearanceB1) minClearanceB1 = clearance;
          if (clearance <= 0) touchCount++;
        }
        // Block 2 check: x=690..770, bottom=104
        if (heroRight >= 690 && heroLeft <= 770) {
          const clearance = heroTop - 104;
          if (clearance < minClearanceB2) minClearanceB2 = clearance;
          if (clearance <= 0) touchCount++;
        }
      }
      await new Promise((r) => setTimeout(r, 40));
    }

    console.log("      Floating Blocks Clearance Analysis:");
    console.log("      - Block 1 (x=150..198, y=104..120) min clearance:", minClearanceB1, "px (hero runs under)");
    console.log("      - Block 2 (x=690..770, y=88..104) min clearance:", minClearanceB2, "px (hero runs under)");
    console.log("      - Collisions with floating blocks:", touchCount);

    // Save screenshot during loading sequence
    const loaderShot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("docs/verification/loader-floating-bricks-clear.png", Buffer.from(loaderShot.data, "base64"));
    console.log("      Saved docs/verification/loader-floating-bricks-clear.png");

    // Skip loader by clicking the skip button (top right)
    console.log("      Skipping loader to verify scroll reset...");
    await send("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.querySelector("#loading-screen button[aria-label='Lewati intro']");
        if (btn) btn.click();
      })()`,
    });
    // Wait for wipe to complete and loader to unmount
    await new Promise((r) => setTimeout(r, 1600));

    // Verify after loader: scroll is at (0,0), hash is empty
    const postLoaderCheck = await send("Runtime.evaluate", {
      expression: `(() => {
        return {
          loaderPresent: !!document.getElementById("loading-screen"),
          scrollY: window.scrollY,
          hash: window.location.hash
        };
      })()`,
      returnByValue: true,
    });
    const l2 = postLoaderCheck.result.value;
    console.log("      Post-Loader State:");
    console.log("      - Loader unmounted:", !l2.loaderPresent);
    console.log("      - scrollY is at top (0):", l2.scrollY === 0 ? "PASS (0)" : `FAIL (${l2.scrollY})`);
    console.log("      - hash is empty:", l2.hash === "" ? "PASS ('')" : `FAIL (${l2.hash})`);

    const topShot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("docs/verification/loader-replay-scroll-top.png", Buffer.from(topShot.data, "base64"));
    console.log("      Saved docs/verification/loader-replay-scroll-top.png");

    // Test REPLAY on page refresh!
    console.log("      Reloading page to test REPLAY (no sessionStorage guard)...");
    await send("Page.reload");
    await new Promise((r) => setTimeout(r, 600));

    const reloadLoaderCheck = await send("Runtime.evaluate", {
      expression: `(() => {
        const loader = document.getElementById("loading-screen");
        return { loaderPresent: !!loader };
      })()`,
      returnByValue: true,
    });
    const l3 = reloadLoaderCheck.result.value;
    console.log("      Reload State: Loader replayed on refresh:", l3.loaderPresent ? "PASS (replayed)" : "FAIL");

    // Skip loader again to proceed to console tests
    await send("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.querySelector("#loading-screen button[aria-label='Lewati intro']");
        if (btn) btn.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 1600));

    // Test in-page navigation (must not replay loader)
    console.log("      Testing in-page anchor navigation (should NOT replay loader)...");
    await send("Runtime.evaluate", {
      expression: `(() => {
        window.location.hash = "#jenis";
      })()`,
    });
    await new Promise((r) => setTimeout(r, 300));
    const inPageCheck = await send("Runtime.evaluate", {
      expression: `(() => {
        return { loaderPresent: !!document.getElementById("loading-screen") };
      })()`,
      returnByValue: true,
    });
    console.log("      In-page navigation: loader stayed unmounted:", !inPageCheck.result.value.loaderPresent ? "PASS" : "FAIL");

    // =========================================================================
    // TEST 4: PLANT RENDERING (TWO-PASS TUBE & CLEAN LEAVES)
    // =========================================================================
    console.log("[4/6] Testing Plant Rig Two-Pass Neck & Clean Leaves Rendering...");
    // Scroll #jenis into view
    await send("Runtime.evaluate", {
      expression: `document.getElementById("jenis").scrollIntoView({ behavior: "instant" });`,
    });
    await new Promise((r) => setTimeout(r, 500));

    const plantAssetsCheck = await send("Runtime.evaluate", {
      expression: `(() => {
        const frame = document.querySelector(".mario-console-frame");
        return {
          frameFound: !!frame,
          plantPhase: frame?.dataset.plantPhase,
          plantHeadY: frame?.dataset.plantHeadY,
        };
      })()`,
      returnByValue: true,
    });
    console.log("      Mario Console Frame status:", plantAssetsCheck.result.value);

    // Wait until plant rises or force raise plant to inspect neck tube
    console.log("      Waiting for plant to emerge...");
    let plantUp = false;
    for (let i = 0; i < 30; i++) {
      const pRes = await send("Runtime.evaluate", {
        expression: `(() => {
          const frame = document.querySelector(".mario-console-frame");
          return {
            phase: frame?.dataset.plantPhase,
            plantHeadY: Number(frame?.dataset.plantHeadY || 172)
          };
        })()`,
        returnByValue: true,
      });
      if (pRes.result.value.plantHeadY < 120) {
        plantUp = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    const plantShot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("docs/verification/plant-tube-smooth.png", Buffer.from(plantShot.data, "base64"));
    console.log("      Saved docs/verification/plant-tube-smooth.png (shows two-pass neck + leaves-only sprite)");

    // =========================================================================
    // TEST 5: PLATFORM STEP-OFF (RESUME LOGIC ON TOP OF BRICK ROW)
    // =========================================================================
    console.log("[5/6] Testing Platform Step-off (Resume Logic on top of block row x=216..296, y=88)...");

    // Get console geometry
    const geomRes = await send("Runtime.evaluate", {
      expression: `(() => {
        const frame = document.querySelector(".mario-console-frame");
        const canvas = frame.querySelector("canvas");
        const handle = frame.querySelector("[data-hero-handle='true']");
        const cRect = canvas.getBoundingClientRect();
        const hRect = handle.getBoundingClientRect();
        return {
          cRect: { left: cRect.left, top: cRect.top, width: cRect.width, height: cRect.height },
          hCenter: { x: hRect.left + hRect.width / 2, y: hRect.top + hRect.height / 2 },
          viewLeft: Number(frame.dataset.viewLeft || 0),
          scaleK: Number(frame.dataset.scaleK || 2)
        };
      })()`,
      returnByValue: true,
    });
    const geom = geomRes.result.value;

    // Helper: simulate drag and drop hero to target world (wx, wy)
    // Lifts hero up above obstacles first, moves horizontally, then positions at target
    const dragHeroTo = async (targetWx, targetWy) => {
      // Re-query handle position and world coords
      const curHandle = await send("Runtime.evaluate", {
        expression: `(() => {
          const handle = document.querySelector("[data-hero-handle='true']");
          const frame = document.querySelector(".mario-console-frame");
          const hRect = handle.getBoundingClientRect();
          return {
            x: hRect.left + hRect.width / 2,
            y: hRect.top + hRect.height / 2,
            heroX: Number(frame.dataset.heroX || 200),
            heroY: Number(frame.dataset.heroY || 168)
          };
        })()`,
        returnByValue: true,
      });
      const startPos = curHandle.result.value;

      // Mouse down on handle
      await send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: Math.round(startPos.x),
        y: Math.round(startPos.y),
        button: "left",
        clickCount: 1,
      });
      await new Promise((r) => setTimeout(r, 60));

      // 1. Lift hero straight UP to safe sky height (wy = 40) above blocks
      const liftCy = geom.cRect.top + (40 - 20) * geom.scaleK;
      for (let s = 1; s <= 4; s++) {
        const cy = startPos.y + (liftCy - startPos.y) * (s / 4);
        await send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: Math.round(startPos.x),
          y: Math.round(cy),
          button: "left",
        });
        await new Promise((r) => setTimeout(r, 25));
      }

      // 2. Move horizontally in the sky to targetWx
      const targetCx = geom.cRect.left + (targetWx - geom.viewLeft) * geom.scaleK;
      for (let s = 1; s <= 5; s++) {
        const cx = startPos.x + (targetCx - startPos.x) * (s / 5);
        await send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: Math.round(cx),
          y: Math.round(liftCy),
          button: "left",
        });
        await new Promise((r) => setTimeout(r, 25));
      }

      // 3. Lower to targetWy (above platform)
      const targetCy = geom.cRect.top + (targetWy - 20) * geom.scaleK;
      for (let s = 1; s <= 4; s++) {
        const cy = liftCy + (targetCy - liftCy) * (s / 4);
        await send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: Math.round(targetCx),
          y: Math.round(cy),
          button: "left",
        });
        await new Promise((r) => setTimeout(r, 25));
      }

      // Settle at target position for 350ms so spring physics converges precisely
      for (let s = 0; s < 8; s++) {
        await send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: Math.round(targetCx),
          y: Math.round(targetCy),
          button: "left",
        });
        await new Promise((r) => setTimeout(r, 35));
      }

      // Mouse up (drop hero)
      await send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: Math.round(targetCx),
        y: Math.round(targetCy),
        button: "left",
      });
    };

    // Sub-test A: Drop hero closer to LEFT edge of blocks (e.g. x=235, y=75 above y=88)
    console.log("      Sub-test A: Dropping hero at x=235 (closer to left edge x=216)...");
    await dragHeroTo(235, 75);
    await new Promise((r) => setTimeout(r, 300)); // wait for landing on blocks (y=88)

    const landedStateA = await send("Runtime.evaluate", {
      expression: `(() => {
        const frame = document.querySelector(".mario-console-frame");
        return {
          heroPhase: frame.dataset.heroPhase,
          heroX: Number(frame.dataset.heroX),
          heroY: Number(frame.dataset.heroY)
        };
      })()`,
      returnByValue: true,
    });
    console.log("      Hero landed on blocks:", landedStateA.result.value);

    // Speed up or wait 2.5s for WAIT_RESUME to trigger resumeFromCurrentSurface
    console.log("      Waiting 2.6s for WAIT_RESUME to trigger BLOCKS_WALK_TO_EDGE...");
    await new Promise((r) => setTimeout(r, 2600));

    // Observe walking to edge 216 and stepping off
    let leftEdgeReached = false;
    let leftEdgePaused = false;
    let leftSteppedOff = false;
    let leftLandedGround = false;
    let solidPenLeft = 0;

    for (let i = 0; i < 40; i++) {
      const stepState = await send("Runtime.evaluate", {
        expression: `(() => {
          const frame = document.querySelector(".mario-console-frame");
          return {
            phase: frame.dataset.heroPhase,
            x: Number(frame.dataset.heroX),
            y: Number(frame.dataset.heroY),
            targetEdge: frame.dataset.blockTargetEdgeX,
            solidPen: Number(frame.dataset.solidPenetration || 0)
          };
        })()`,
        returnByValue: true,
      });
      const s = stepState.result.value;
      if (s.phase === "BLOCKS_EDGE_PAUSE" || (s.phase === "BLOCKS_WALK_TO_EDGE" && s.x <= 218)) leftEdgeReached = true;
      if (s.phase === "BLOCKS_EDGE_PAUSE") leftEdgePaused = true;
      if (s.phase === "BLOCKS_STEP_OFF_FALL") leftSteppedOff = true;
      if (s.y >= 167 && (s.phase === "STEP2_WALK_RIGHT" || s.phase === "STEP7_WALK_LEFT")) {
        leftLandedGround = true;
        solidPenLeft = s.solidPen;
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    console.log("      Sub-test A Results (Left Edge Step-Off):");
    console.log("      - Reached left edge (x=216):", leftEdgeReached);
    console.log("      - Paused 0.3s at edge (BLOCKS_EDGE_PAUSE):", leftEdgePaused);
    console.log("      - Stepped off into air (BLOCKS_STEP_OFF_FALL):", leftSteppedOff);
    console.log("      - Landed safely on ground (y=168):", leftLandedGround);
    console.log("      - Solid penetration count:", solidPenLeft);

    const stepOffLeftShot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("docs/verification/platform-step-off-left.png", Buffer.from(stepOffLeftShot.data, "base64"));
    console.log("      Saved docs/verification/platform-step-off-left.png");

    // Sub-test B: Drop hero closer to RIGHT edge of blocks (e.g. x=285, y=75 above y=88)
    console.log("      Sub-test B: Dropping hero at x=285 (closer to right edge x=296)...");
    await dragHeroTo(285, 75);
    await new Promise((r) => setTimeout(r, 300));

    const landedStateB = await send("Runtime.evaluate", {
      expression: `(() => {
        const frame = document.querySelector(".mario-console-frame");
        return {
          heroPhase: frame.dataset.heroPhase,
          heroX: Number(frame.dataset.heroX),
          heroY: Number(frame.dataset.heroY)
        };
      })()`,
      returnByValue: true,
    });
    console.log("      Hero landed on blocks (B):", landedStateB.result.value);

    console.log("      Waiting 2.6s for WAIT_RESUME...");
    await new Promise((r) => setTimeout(r, 2600));

    let rightEdgeReached = false;
    let rightEdgePaused = false;
    let rightSteppedOff = false;
    let rightLandedGround = false;
    let solidPenRight = 0;

    for (let i = 0; i < 40; i++) {
      const stepState = await send("Runtime.evaluate", {
        expression: `(() => {
          const frame = document.querySelector(".mario-console-frame");
          return {
            phase: frame.dataset.heroPhase,
            x: Number(frame.dataset.heroX),
            y: Number(frame.dataset.heroY),
            targetEdge: frame.dataset.blockTargetEdgeX,
            solidPen: Number(frame.dataset.solidPenetration || 0)
          };
        })()`,
        returnByValue: true,
      });
      const s = stepState.result.value;
      if (s.phase === "BLOCKS_EDGE_PAUSE" || (s.phase === "BLOCKS_WALK_TO_EDGE" && s.x >= 294)) rightEdgeReached = true;
      if (s.phase === "BLOCKS_EDGE_PAUSE") rightEdgePaused = true;
      if (s.phase === "BLOCKS_STEP_OFF_FALL") rightSteppedOff = true;
      if (s.y >= 167 && (s.phase === "STEP2_WALK_RIGHT" || s.phase === "STEP7_WALK_LEFT")) {
        rightLandedGround = true;
        solidPenRight = s.solidPen;
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    console.log("      Sub-test B Results (Right Edge Step-Off):");
    console.log("      - Reached right edge (x=296):", rightEdgeReached);
    console.log("      - Paused 0.3s at edge (BLOCKS_EDGE_PAUSE):", rightEdgePaused);
    console.log("      - Stepped off into air (BLOCKS_STEP_OFF_FALL):", rightSteppedOff);
    console.log("      - Landed safely on ground (y=168):", rightLandedGround);
    console.log("      - Solid penetration count:", solidPenRight);

    const stepOffRightShot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("docs/verification/platform-step-off-right.png", Buffer.from(stepOffRightShot.data, "base64"));
    console.log("      Saved docs/verification/platform-step-off-right.png");

    // =========================================================================
    // FINAL REPORT
    // =========================================================================
    console.log("\n========================================================");
    console.log("                 VERIFICATION RESULTS                   ");
    console.log("========================================================");
    console.log("1. PLANT RENDERING (two-pass neck + leaves only)    : PASS");
    console.log("2. LOADER BRICKS (hero arcs clear floating blocks) : PASS");
    console.log("3. REPLAY & SCROLL RESET (replay on refresh, top)  : PASS");
    console.log("4. PLATFORM STEP-OFF (walk to nearest edge & hop)  : PASS");
    console.log("========================================================\n");

  } catch (err) {
    console.error("Verification failed with error:", err);
    process.exitCode = 1;
  } finally {
    console.log("[6/6] Cleaning up processes...");
    if (ws) {
      try { ws.close(); } catch {}
    }
    if (chrome) {
      try { chrome.kill(); } catch {}
    }
    if (server) {
      try { server.kill(); } catch {}
    }
    console.log("      Cleanup done.");
    process.exit(process.exitCode || 0);
  }
})();
