const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Hard watchdog so this script can NEVER hang
setTimeout(() => {
  console.error("Watchdog timeout reached, exiting.");
  process.exit(1);
}, 90000).unref();

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

  let PORT = 3069;
  const CDP_PORT = 9309;
  let server = null;

  let existing3000 = false;
  try {
    const r = await fetch("http://localhost:3000");
    if (r.ok) existing3000 = true;
  } catch {}

  if (existing3000) {
    console.log("[1/6] Using existing server on http://localhost:3000...");
    PORT = 3000;
  } else {
    const nextBin = require.resolve("next/dist/bin/next");
    if (!fs.existsSync(path.join(process.cwd(), ".next", "BUILD_ID"))) {
      console.log("[1a/6] .next/BUILD_ID missing, running next build first...");
      const { execFileSync } = require("child_process");
      execFileSync(process.execPath, [nextBin, "build", process.cwd()], { stdio: "inherit" });
    }
    console.log("[1b/6] Starting Next.js production server...");
    server = spawn(
      process.execPath,
      [nextBin, "start", process.cwd(), "-p", String(PORT)],
      { stdio: "inherit", windowsHide: true }
    );
    await waitForUrl(`http://localhost:${PORT}`);
  }

  console.log("[2/6] Launching headless Chrome...");
  const prof = path.join(process.env.TEMP || ".", `chrome-cdp-p6-${Date.now()}`);
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

  const readTelemetry = async () => {
    const res = await send("Runtime.evaluate", {
      expression: `(() => {
        const loader = document.getElementById("loading-screen");
        if (!loader) return { loaderVisible: false };
        const canvas = loader.querySelector("canvas");
        const skipBtn = loader.querySelector("button[aria-label='Lewati intro']");
        const skipRect = skipBtn ? skipBtn.getBoundingClientRect() : null;
        const progressBar = loader.querySelector("[role='progressbar']");
        const progRect = progressBar ? progressBar.getBoundingClientRect() : null;
        return {
          loaderVisible: true,
          bodyOverflow: document.body.style.overflow,
          dataset: canvas ? { ...canvas.dataset } : null,
          skipBtn: skipBtn ? {
            width: Math.round(skipRect.width),
            height: Math.round(skipRect.height),
            top: Math.round(skipRect.top),
            rightDist: Math.round(window.innerWidth - skipRect.right),
            text: skipBtn.innerText.trim(),
            hasSvg: !!skipBtn.querySelector("svg"),
          } : null,
          progressBar: progressBar ? {
            height: Math.round(progRect.height),
            bottomDist: Math.round(window.innerHeight - progRect.bottom),
            valueNow: progressBar.getAttribute("aria-valuenow"),
          } : null,
        };
      })()`,
      returnByValue: true,
    });
    return res.result.value;
  };

  // =========================================================
  // 1. DESKTOP (1440x900) FULL CUTSCENE WATCH
  // =========================================================
  console.log("[3/6] Watching Desktop 1440x900 cutscene...");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const desktopStart = Date.now();
  await send("Page.navigate", { url: `http://localhost:${PORT}/?intro=1` });

  // t ~ 0.9s: before pit 1 (0 mini coins collected)
  await new Promise((r) => setTimeout(r, 900));
  results.desktopT0_9s = await readTelemetry();

  // Check natural dimensions of assets
  const assetCheck = await send("Runtime.evaluate", {
    expression: `new Promise((resolve) => {
      const r = new Image();
      const c = new Image();
      let n = 0;
      const done = () => {
        if (++n === 2) resolve({
          spin24Rainbow: { w: r.naturalWidth, h: r.naturalHeight },
          coinGoldMini: { w: c.naturalWidth, h: c.naturalHeight },
        });
      };
      r.onload = done; r.onerror = done;
      c.onload = done; c.onerror = done;
      r.src = "/coins/spin24-rainbow.png";
      c.src = "/environment/coin-gold-mini.png";
    })`,
    awaitPromise: true,
    returnByValue: true,
  });
  results.assets = assetCheck.result.value;

  // t ~ 1.75s: mid-jump over pit 1 (collecting coins 1..4 with pop + twinkle)
  await new Promise((r) => setTimeout(r, 850));
  results.desktopT1_75s_midPit1 = await readTelemetry();
  let shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase6-desktop-jump-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

  // t ~ 2.4s: after pit 1 (4 mini coins collected)
  await new Promise((r) => setTimeout(r, 650));
  results.desktopT2_4s_afterPit1 = await readTelemetry();

  // t ~ 4.4s: after pit 2 (8 mini coins collected)
  await new Promise((r) => setTimeout(r, 2000));
  results.desktopT4_4s_afterPit2 = await readTelemetry();

  // t ~ 6.4s: after pit 3 (all 12 mini coins collected, spinning rainbow coin visible ahead)
  await new Promise((r) => setTimeout(r, 2000));
  results.desktopT6_4s_afterPit3 = await readTelemetry();

  // t ~ 7.35s: rainbow coin collected
  await new Promise((r) => setTimeout(r, 950));
  results.desktopT7_35s_rainbowGrab = await readTelemetry();
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase6-desktop-coin-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

  // t ~ 9.5s: meteor streaking in
  await new Promise((r) => setTimeout(r, 2150));
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase6-desktop-meteor-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

  // t ~ 10.65s: impact boom + squash
  await new Promise((r) => setTimeout(r, 1150));
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase6-desktop-impact-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

  // t ~ 12.3s: pixel-block wipe
  await new Promise((r) => setTimeout(r, 1650));
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase6-desktop-wipe-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

  // Wait until unmounted
  let desktopDurationSec = null;
  for (let i = 0; i < 40; i++) {
    const check = await send("Runtime.evaluate", {
      expression: `!document.getElementById("loading-screen")`,
      returnByValue: true,
    });
    if (check.result.value) {
      desktopDurationSec = Number(((Date.now() - desktopStart) / 1000).toFixed(2));
      break;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  results.desktopDurationSec = desktopDurationSec;

  // Verify once-per-session behavior
  console.log("[4/6] Checking once-per-session behavior...");
  await send("Page.navigate", { url: `http://localhost:${PORT}/` });
  await new Promise((r) => setTimeout(r, 600));
  const secondVisit = await send("Runtime.evaluate", {
    expression: `({
      loaderPresentOnSecondVisit: !!document.getElementById("loading-screen"),
      sessionFlag: sessionStorage.getItem("ferja_intro_seen_v1"),
      bodyOverflow: document.body.style.overflow,
    })`,
    returnByValue: true,
  });
  results.oncePerSession = secondVisit.result.value;

  // =========================================================
  // 2. MOBILE PORTRAIT (390x844) FULL CUTSCENE + LETTERBOX CHECK
  // =========================================================
  console.log("[5/6] Watching Mobile 390x844 portrait letterbox cutscene...");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send("Runtime.evaluate", { expression: `sessionStorage.clear();` });
  await send("Page.navigate", { url: `http://127.0.0.1:${PORT}/` });

  // t ~ 1.75s: mid-jump over pit 1 on 390x844 portrait letterbox
  await new Promise((r) => setTimeout(r, 1750));
  results.mobileT1_75s_midPit1 = await readTelemetry();
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase6-mobile-cutscene-390x844.png"),
    Buffer.from(shot.data, "base64")
  );

  // t ~ 6.4s: after pit 3 on 390x844 (all 12 mini coins collected, rainbow coin visible)
  await new Promise((r) => setTimeout(r, 4650));
  results.mobileT6_4s_afterPit3 = await readTelemetry();

  // Test skip button on mobile
  await send("Runtime.evaluate", {
    expression: `document.querySelector("#loading-screen button[aria-label='Lewati intro']")?.click();`,
  });
  await new Promise((r) => setTimeout(r, 400));
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase6-mobile-skip-wipe-390x844.png"),
    Buffer.from(shot.data, "base64")
  );

  await new Promise((r) => setTimeout(r, 1200));
  const afterSkipCheck = await send("Runtime.evaluate", {
    expression: `({
      loaderGoneAfterSkip: !document.getElementById("loading-screen"),
      bodyOverflowRestored: document.body.style.overflow === "",
    })`,
    returnByValue: true,
  });
  results.mobileSkip = afterSkipCheck.result.value;

  console.log("[6/6] Done!");
  console.log("=== PHASE 6 FIX VERIFICATION SUMMARY ===");
  console.log(JSON.stringify(results, null, 2));

  try {
    ws.close();
    chrome.kill("SIGKILL");
    server.kill("SIGKILL");
  } catch {}
  process.exit(0);
})();
