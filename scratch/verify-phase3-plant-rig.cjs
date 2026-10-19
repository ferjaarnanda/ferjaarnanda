const { spawn, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Hard 110s watchdog so this script can NEVER hang
setTimeout(() => {
  console.error("Watchdog timeout reached, exiting.");
  process.exit(1);
}, 110000).unref();

async function waitForUrl(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

(async () => {
  fs.mkdirSync("docs/verification", { recursive: true });

  const PORT = 3071;
  const CDP_PORT = 9311;
  const nextBin = require.resolve("next/dist/bin/next");

  console.log("[1/7] Running production build (next build)...");
  execFileSync(process.execPath, [nextBin, "build", process.cwd()], {
    stdio: "inherit",
  });

  console.log("[2/7] Starting Next.js production server...");
  const server = spawn(
    process.execPath,
    [nextBin, "start", process.cwd(), "-p", String(PORT)],
    { stdio: "ignore", windowsHide: true }
  );
  await waitForUrl(`http://localhost:${PORT}`);

  console.log("[3/7] Launching headless Chrome...");
  const prof = path.join(process.env.TEMP || ".", `chrome-cdp-p3-rig-${Date.now()}`);
  fs.mkdirSync(prof, { recursive: true });
  const chrome = spawn(
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
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));

  let id = 0;
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const msgId = ++id;
      const timer = setTimeout(() => {
        ws.removeEventListener("message", listener);
        reject(new Error(`CDP timeout on ${method}`));
      }, 10000);
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

  const results = {};

  const getConsoleState = async () => {
    const res = await send("Runtime.evaluate", {
      expression: `(() => {
        const frame = document.querySelector(".mario-console-frame");
        const canvas = frame?.querySelector("canvas");
        const handle = frame?.querySelector("[data-hero-handle='true']");
        const section = document.getElementById("jenis");
        if (!frame || !canvas || !handle || !section) return null;
        const cRect = canvas.getBoundingClientRect();
        const hRect = handle.getBoundingClientRect();
        const sRect = section.getBoundingClientRect();
        return {
          dataset: { ...frame.dataset },
          canvasRect: { left: cRect.left, top: cRect.top, width: cRect.width, height: cRect.height },
          handleCenter: { x: hRect.left + hRect.width / 2, y: hRect.top + hRect.height / 2 },
          sectionFitsViewport: sRect.height <= 900,
          sectionHeight: Math.round(sRect.height),
        };
      })()`,
      returnByValue: true,
    });
    return res.result.value;
  };

  // Convert world (wx, wy) to client (cx, cy)
  const worldToClient = (st, wx, wy) => {
    const viewLeft = Number(st.dataset.viewLeft);
    const scaleK = Number(st.dataset.scaleK);
    // Note: pointerTargetY uses wy + grabOffsetY (20), so to place hero feet at wy, send wy - 20
    return {
      x: Math.round(st.canvasRect.left + (wx - viewLeft) * scaleK),
      y: Math.round(st.canvasRect.top + wy * scaleK),
    };
  };

  const waitForCondition = async (pred, timeoutMs = 10000, pollMs = 35) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const st = await getConsoleState();
      if (st && pred(st)) return st;
      await new Promise((r) => setTimeout(r, pollMs));
    }
    return await getConsoleState();
  };

  // =========================================================================
  // 1. DESKTOP (1440x900) TESTS: OUCH TAP, AIMING, FULL DEVOUR SEQUENCE, SPIT
  // =========================================================================
  console.log("[4/7] Testing Desktop 1440x900 (OUCH tap, Aiming, Full Devour Sequence)...");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await send("Page.navigate", { url: `http://localhost:${PORT}/` });
  await send("Runtime.evaluate", {
    expression: `sessionStorage.setItem("ferja_intro_seen_v1", "1");`,
  });
  await send("Page.navigate", { url: `http://localhost:${PORT}/#jenis` });
  await new Promise((r) => setTimeout(r, 700));
  await send("Runtime.evaluate", {
    expression: `document.getElementById("jenis")?.scrollIntoView({ behavior: "instant", block: "start" });`,
  });
  await new Promise((r) => setTimeout(r, 300));

  // 1A. Wait for plant to rise into CHOMPING and test NORMAL TAP = "OUCH"
  let st = await waitForCondition((s) => s.dataset.plantPhase === "CHOMPING", 6000);
  results.desktopLayout = {
    sectionFitsViewport: st.sectionFitsViewport,
    sectionHeight: st.sectionHeight,
    wn: st.dataset.wn,
    scaleK: st.dataset.scaleK,
  };

  // Click the plant head (world x=423, y=94)
  const plantClickPt = worldToClient(st, 423, 94);
  await send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: plantClickPt.x,
    y: plantClickPt.y,
    button: "left",
    clickCount: 1,
  });
  await send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: plantClickPt.x,
    y: plantClickPt.y,
    button: "left",
    clickCount: 1,
  });

  // Wait ~150ms to observe OUCH_DIZZY (bump + 3 dizzy stars + wobble)
  await new Promise((r) => setTimeout(r, 150));
  const ouchDizzyState = await getConsoleState();
  let shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase3-plant-ouch-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

  // Wait for OUCH_DROOP -> HIDDEN and verify nextWait = 4s
  const ouchDoneState = await waitForCondition(
    (s) => s.dataset.plantPhase === "HIDDEN" && s.dataset.ouchCount === "1",
    3000
  );
  results.ouchTapReaction = {
    dizzyPhaseObserved: ouchDizzyState.dataset.plantPhase,
    ouchCount: ouchDoneState.dataset.ouchCount,
    nextWaitSec: ouchDoneState.dataset.plantNextWait,
  };

  // 1B. Grab hero with mouse and hold at TOP-LEFT of plant (wx=368, heroFeetY=82 -> pointer wy=62)
  st = await getConsoleState();
  await send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: Math.round(st.handleCenter.x),
    y: Math.round(st.handleCenter.y),
    button: "left",
    clickCount: 1,
  });

  // Hold near mouth (within 70px) for 0.65s to trigger ambush rise + aiming at top-left
  const aimTopLeftPt = worldToClient(st, 372, 65);
  for (let i = 0; i < 12; i++) {
    await send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: aimTopLeftPt.x,
      y: aimTopLeftPt.y,
      button: "left",
    });
    await new Promise((r) => setTimeout(r, 60));
  }

  const aimState = await waitForCondition(
    (s) => s.dataset.plantPhase === "AIMING" && Number(s.dataset.plantAngle) < 0,
    4000
  );
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase3-plant-aim-topleft-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

  // Move slightly closer to touch plant head at top-left (wx=396, wy=62 -> heroFeetY=82, heroCenterY=61)
  const touchTopLeftPt = worldToClient(st, 396, 62);
  await send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: touchTopLeftPt.x,
    y: touchTopLeftPt.y,
    button: "left",
  });

  // Observe Stage 1: DEVOUR_LUNGE
  const lungeState = await waitForCondition(
    (s) => s.dataset.plantPhase === "DEVOUR_LUNGE" && Number(s.dataset.plantHeadX) < 412,
    2000
  );
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase3-plant-lunge-topleft-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

  await send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: touchTopLeftPt.x,
    y: touchTopLeftPt.y,
    button: "left",
  });

  // Observe Stage 4: DEVOUR_CHEW (2.5s)
  const chewState = await waitForCondition(
    (s) => s.dataset.plantPhase === "DEVOUR_CHEW",
    2000
  );
  await new Promise((r) => setTimeout(r, 300));
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase3-plant-chew-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

  // Observe Stage 5: DEVOUR_METEOR (0.7s)
  const meteorState = await waitForCondition(
    (s) => s.dataset.plantPhase === "DEVOUR_METEOR",
    3500
  );
  await new Promise((r) => setTimeout(r, 300));
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase3-plant-meteor-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

  // Observe Stage 6: DEVOUR_EXPLODE
  const explodeState = await waitForCondition(
    (s) => s.dataset.plantPhase === "DEVOUR_EXPLODE",
    2000
  );
  await new Promise((r) => setTimeout(r, 80));
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase3-plant-explosion-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

  // Observe Stage 7 & 8: RESPAWN at far left with 1s BLINK + 8s plant cooldown
  const respawnState = await waitForCondition(
    (s) => s.dataset.heroHidden === "false" && s.dataset.rainbowState === "BLINK",
    2000
  );
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase3-plant-respawn-blink-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

  // Wait for 1s blink to complete and confirm hero is grabbable again
  const postBlinkState = await waitForCondition(
    (s) => s.dataset.rainbowState === "NONE" && s.dataset.grabbable === "true",
    2000
  );

  results.devourSequenceDesktop = {
    aimPhase: aimState.dataset.plantPhase,
    aimAngle: Number(aimState.dataset.plantAngle),
    aimMouthFrame: Number(aimState.dataset.plantMouthFrame),
    lungePhase: lungeState.dataset.plantPhase,
    lungeHeadX: Number(lungeState.dataset.plantHeadX),
    lungeHeadY: Number(lungeState.dataset.plantHeadY),
    chewPhase: chewState.dataset.plantPhase,
    heroHiddenDuringChew: chewState.dataset.heroHidden,
    meteorPhase: meteorState.dataset.plantPhase,
    explodePhase: explodeState.dataset.plantPhase,
    respawnX: Number(respawnState.dataset.heroX),
    respawnBlinkState: respawnState.dataset.rainbowState,
    grabbableDuringBlink: respawnState.dataset.grabbable,
    plantCooldownWaitSec: Number(respawnState.dataset.plantNextWait),
    grabbableAfter1sBlink: postBlinkState.dataset.grabbable,
  };

  // 1C. Test TAP DURING CHEW = "DEATH + SPIT"
  console.log("[5/7] Testing DEATH + SPIT tap reaction during chew...");
  st = await getConsoleState();
  await send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: Math.round(st.handleCenter.x),
    y: Math.round(st.handleCenter.y),
    button: "left",
    clickCount: 1,
  });

  // Linger near mouth to trigger ambush, then touch head to enter DEVOUR_CHEW
  for (let i = 0; i < 14; i++) {
    await send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: touchTopLeftPt.x,
      y: touchTopLeftPt.y,
      button: "left",
    });
    await new Promise((r) => setTimeout(r, 60));
  }
  await send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: touchTopLeftPt.x,
    y: touchTopLeftPt.y,
    button: "left",
  });

  await waitForCondition((s) => s.dataset.plantPhase === "DEVOUR_CHEW", 3000);
  await new Promise((r) => setTimeout(r, 250));

  // Tap plant during DEVOUR_CHEW!
  await send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: plantClickPt.x,
    y: plantClickPt.y,
    button: "left",
    clickCount: 1,
  });
  await send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: plantClickPt.x,
    y: plantClickPt.y,
    button: "left",
  });

  const spitArcState = await waitForCondition(
    (s) => s.dataset.heroPhase === "SPAT_OUT_ARC" && s.dataset.spitCount === "1",
    1500
  );
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase3-plant-spit-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

  const spitLandBlinkState = await waitForCondition(
    (s) => s.dataset.rainbowState === "BLINK" && s.dataset.heroPhase !== "SPAT_OUT_ARC",
    2000
  );

  results.deathAndSpitReaction = {
    plantPhaseDuringSpit: spitArcState.dataset.plantPhase,
    heroPhaseDuringSpit: spitArcState.dataset.heroPhase,
    heroFrameDuringSpit: Number(spitArcState.dataset.heroFrame),
    bubbleDuringSpit: spitArcState.dataset.bubble,
    landedHeroX: Number(spitLandBlinkState.dataset.heroX),
    blinkAfterLand: spitLandBlinkState.dataset.rainbowState,
    plantNextWaitSec: Number(spitLandBlinkState.dataset.plantNextWait),
  };

  // =========================================================================
  // 2. MOBILE (390x844) TOUCH EMULATION: HOLD AT BOTTOM-LEFT, TOP-LEFT, TOP-RIGHT
  // =========================================================================
  console.log("[6/7] Testing Mobile 390x844 Touch Emulation (bottom-left, top-left, top-right)...");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true });

  const testMobileDirection = async (label, aimWx, aimWy, touchWx, touchWy, screenshotName) => {
    await send("Page.navigate", { url: `http://localhost:${PORT}/#jenis` });
    await new Promise((r) => setTimeout(r, 600));
    await send("Runtime.evaluate", {
      expression: `document.getElementById("jenis")?.scrollIntoView({ behavior: "instant", block: "center" });`,
    });
    await new Promise((r) => setTimeout(r, 300));

    // Wait until plant rises to CHOMPING
    let s0 = await waitForCondition((s) => s.dataset.plantPhase === "CHOMPING", 5000);
    const startPt = {
      x: Math.round(s0.handleCenter.x),
      y: Math.round(s0.handleCenter.y),
    };

    await send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startPt.x, y: startPt.y, radiusX: 5, radiusY: 5, id: 1 }],
    });

    // Move hero to aiming position (aimWx, aimWy)
    const aimPt = worldToClient(s0, aimWx, aimWy);
    for (let step = 1; step <= 10; step++) {
      const ix = Math.round(startPt.x + ((aimPt.x - startPt.x) * step) / 10);
      const iy = Math.round(startPt.y + ((aimPt.y - startPt.y) * step) / 10);
      await send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: ix, y: iy, radiusX: 5, radiusY: 5, id: 1 }],
      });
      await new Promise((r) => setTimeout(r, 30));
    }
    await new Promise((r) => setTimeout(r, 180));
    const aimed = await getConsoleState();

    // Move hero to touch position (touchWx, touchWy) to trigger LUNGE to hero's current position
    const touchPt = worldToClient(s0, touchWx, touchWy);
    for (let step = 1; step <= 5; step++) {
      const ix = Math.round(aimPt.x + ((touchPt.x - aimPt.x) * step) / 5);
      const iy = Math.round(aimPt.y + ((touchPt.y - aimPt.y) * step) / 5);
      await send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: ix, y: iy, radiusX: 5, radiusY: 5, id: 1 }],
      });
      await new Promise((r) => setTimeout(r, 25));
    }

    const lunged = await waitForCondition(
      (s) =>
        s.dataset.plantPhase === "DEVOUR_LUNGE" ||
        s.dataset.plantPhase === "DEVOUR_BITE",
      2000,
      20
    );

    const shotMobile = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      path.join("docs/verification", screenshotName),
      Buffer.from(shotMobile.data, "base64")
    );

    await send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });

    return {
      label,
      aimPhase: aimed.dataset.plantPhase,
      aimAngle: Number(aimed.dataset.plantAngle),
      lungePhase: lunged.dataset.plantPhase,
      lungeHeadX: Number(lunged.dataset.plantHeadX),
      lungeHeadY: Number(lunged.dataset.plantHeadY),
      lungeAngle: Number(lunged.dataset.plantAngle),
      solidPenetrationCount: Number(lunged.dataset.solidPenetrationCount),
    };
  };

  // 2A. Bottom-left of plant (plant head is at 423, 94; hold hero on/near Pipe 1 at wx=368..395, wy=119 -> heroFeetY=139, heroCenterY=118 > 94)
  results.mobileBottomLeft = await testMobileDirection(
    "bottom-left",
    368,
    118,
    395,
    118,
    "phase3-mobile-bottomleft-390x844.png"
  );

  // 2B. Top-left of plant (hold hero at wx=368..395, wy=58 -> heroFeetY=78, heroCenterY=57 < 94)
  results.mobileTopLeft = await testMobileDirection(
    "top-left",
    368,
    58,
    395,
    58,
    "phase3-mobile-topleft-390x844.png"
  );

  // 2C. Top-right of plant (hold hero at wx=468..451, wy=58 -> heroFeetY=78, heroCenterY=57 < 94)
  results.mobileTopRight = await testMobileDirection(
    "top-right",
    468,
    58,
    451,
    58,
    "phase3-mobile-topright-390x844.png"
  );

  console.log("[7/7] Done!");
  console.log("=== PHASE 3 PLANT RIG VERIFICATION SUMMARY ===");
  console.log(JSON.stringify(results, null, 2));

  try {
    ws.close();
    chrome.kill("SIGKILL");
    server.kill("SIGKILL");
  } catch {}
  process.exit(0);
})();
