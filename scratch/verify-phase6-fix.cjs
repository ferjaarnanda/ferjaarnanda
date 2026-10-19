const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

(async () => {
  fs.mkdirSync("docs/verification", { recursive: true });

  const PORT = 3068;
  const server = spawn("npx.cmd", ["next", "start", "-p", String(PORT)], {
    stdio: "ignore",
    shell: true,
  });
  await new Promise((r) => setTimeout(r, 3000));

  const prof = path.join(process.env.TEMP, "chrome-cdp-p6-fix");
  fs.mkdirSync(prof, { recursive: true });
  const chrome = spawn(
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    [
      "--headless=new",
      "--remote-debugging-port=9308",
      `--user-data-dir=${prof}`,
      "--no-first-run",
      "--disable-gpu",
      "--hide-scrollbars",
    ],
    { stdio: "ignore" }
  );
  await new Promise((r) => setTimeout(r, 2000));

  const targets = await fetch("http://127.0.0.1:9308/json").then((r) => r.json());
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

  // Verify rainbow sheet asset dimensions via Image in browser
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: `http://localhost:${PORT}/?intro=1` });
  await new Promise((r) => setTimeout(r, 500));

  const assetDimensions = await send("Runtime.evaluate", {
    expression: `new Promise((resolve) => {
      const imgRainbow = new Image();
      const imgCoin = new Image();
      const imgDecor = new Image();
      let loaded = 0;
      const done = () => {
        loaded++;
        if (loaded === 3) {
          resolve({
            spin24Rainbow: { w: imgRainbow.naturalWidth, h: imgRainbow.naturalHeight },
            coinGoldMini: { w: imgCoin.naturalWidth, h: imgCoin.naturalHeight },
            levelLoadingDecor: { w: imgDecor.naturalWidth, h: imgDecor.naturalHeight },
          });
        }
      };
      imgRainbow.onload = done;
      imgCoin.onload = done;
      imgDecor.onload = done;
      imgRainbow.src = "/coins/spin24-rainbow.png";
      imgCoin.src = "/environment/coin-gold-mini.png";
      imgDecor.src = "/environment/level-loading-decor.png";
    })`,
    awaitPromise: true,
    returnByValue: true,
  });
  results.assets = assetDimensions.result.value;

  // =========================================================
  // 1. DESKTOP (1440x900) FULL CUTSCENE WATCH
  // =========================================================
  await send("Runtime.evaluate", { expression: `sessionStorage.clear();` });
  const desktopStart = Date.now();
  await send("Page.navigate", { url: `http://localhost:${PORT}/` });

  // t ~ 0.9s: before pit 1 (0 mini coins collected)
  await new Promise((r) => setTimeout(r, 900));
  results.desktopT0_9s = await readTelemetry();
  let shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase6-desktop-before-pit1-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

  // t ~ 1.75s: mid-jump over pit 1 (collecting coins 1..4 with pop + twinkle)
  await new Promise((r) => setTimeout(r, 850));
  results.desktopT1_75s_midPit1 = await readTelemetry();
  shot = await send("Page.captureScreenshot", { format: "png" });
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
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase6-desktop-rainbow-ahead-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

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
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send("Runtime.evaluate", { expression: `sessionStorage.clear();` });
  await send("Page.navigate", { url: `http://localhost:${PORT}/` });

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
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase6-mobile-rainbow-390x844.png"),
    Buffer.from(shot.data, "base64")
  );

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

  console.log("=== PHASE 6 FIX VERIFICATION SUMMARY ===");
  console.log(JSON.stringify(results, null, 2));

  ws.close();
  try {
    chrome.kill();
    server.kill();
    execSync(
      `powershell -Command "Get-NetTCPConnection -LocalPort ${PORT},9308 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`
    );
  } catch {}
  process.exit(0);
})();
