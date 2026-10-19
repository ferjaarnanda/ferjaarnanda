const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

(async () => {
  fs.mkdirSync("docs/verification", { recursive: true });

  const PORT = 3066;
  const server = spawn("npx.cmd", ["next", "start", "-p", String(PORT)], {
    stdio: "ignore",
    shell: true,
  });
  await new Promise((r) => setTimeout(r, 3000));

  const prof = path.join(process.env.TEMP, "chrome-cdp-p6");
  fs.mkdirSync(prof, { recursive: true });
  const chrome = spawn(
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    [
      "--headless=new",
      "--remote-debugging-port=9306",
      `--user-data-dir=${prof}`,
      "--no-first-run",
      "--disable-gpu",
      "--hide-scrollbars",
    ],
    { stdio: "ignore" }
  );
  await new Promise((r) => setTimeout(r, 2000));

  const targets = await fetch("http://127.0.0.1:9306/json").then((r) => r.json());
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

  // =========================================================
  // 1. DESKTOP (1440x900) FULL 13s CUTSCENE WATCH
  // =========================================================
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Clear sessionStorage before navigating
  await send("Page.navigate", { url: `http://localhost:${PORT}/?intro=1` });
  await send("Runtime.evaluate", {
    expression: `sessionStorage.clear();`,
  });
  const navStart = Date.now();
  await send("Page.navigate", { url: `http://localhost:${PORT}/` });

  // Wait 900ms (running towards pit 1)
  await new Promise((r) => setTimeout(r, 900));
  const hudCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const loader = document.getElementById("loading-screen");
      if (!loader) return { loaderVisible: false };
      const skipBtn = loader.querySelector("button[aria-label='Lewati intro']");
      const skipRect = skipBtn ? skipBtn.getBoundingClientRect() : null;
      const skipText = skipBtn ? skipBtn.innerText.trim() : "";
      const hasSvg = !!skipBtn?.querySelector("svg");
      const progressBar = loader.querySelector("[role='progressbar']");
      const progRect = progressBar ? progressBar.getBoundingClientRect() : null;
      const canvas = loader.querySelector("canvas");
      const bodyOverflow = document.body.style.overflow;
      return {
        loaderVisible: true,
        bodyOverflow,
        canvasW: canvas?.width,
        canvasH: canvas?.height,
        skipBtn: {
          exists: !!skipBtn,
          width: Math.round(skipRect?.width || 0),
          height: Math.round(skipRect?.height || 0),
          top: Math.round(skipRect?.top || 0),
          rightDist: Math.round(1440 - (skipRect?.right || 0)),
          text: skipText,
          hasSvg,
        },
        progressBar: {
          exists: !!progressBar,
          height: Math.round(progRect?.height || 0),
          bottomDist: Math.round(900 - (progRect?.bottom || 0)),
        },
        hasLoadingLabel: loader.innerText.includes("LOADING..."),
      };
    })()`,
    returnByValue: true,
  });
  results.desktopHud = hudCheck.result.value;

  // Capture at ~2.1s (jumping pit 1)
  await new Promise((r) => setTimeout(r, 1200));
  let shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase6-desktop-jump-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

  // Capture at ~7.2s (leaping to grab rainbow coin)
  await new Promise((r) => setTimeout(r, 5100));
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase6-desktop-coin-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

  // Capture at ~9.5s (meteor streaking in from top-right)
  await new Promise((r) => setTimeout(r, 2300));
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase6-desktop-meteor-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

  // Capture at ~10.65s (impact explosion + squash)
  await new Promise((r) => setTimeout(r, 1150));
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase6-desktop-impact-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

  // Capture at ~12.3s (pixel-block wipe dissolving)
  await new Promise((r) => setTimeout(r, 1650));
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase6-desktop-wipe-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

  // Wait until loader unmounts and measure total duration
  let unmountedAt = null;
  for (let i = 0; i < 40; i++) {
    const check = await send("Runtime.evaluate", {
      expression: `!document.getElementById("loading-screen")`,
      returnByValue: true,
    });
    if (check.result.value) {
      unmountedAt = (Date.now() - navStart) / 1000;
      break;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  results.desktopDurationSec = unmountedAt;

  // Check once-per-session behavior: reload without clearing sessionStorage
  await send("Page.navigate", { url: `http://localhost:${PORT}/` });
  await new Promise((r) => setTimeout(r, 600));
  const secondVisitCheck = await send("Runtime.evaluate", {
    expression: `({
      loaderPresentOnSecondVisit: !!document.getElementById("loading-screen"),
      sessionFlag: sessionStorage.getItem("ferja_intro_seen_v1"),
      bodyOverflow: document.body.style.overflow,
    })`,
    returnByValue: true,
  });
  results.oncePerSession = secondVisitCheck.result.value;

  // =========================================================
  // 2. MOBILE (390x844) + SKIP BUTTON TEST
  // =========================================================
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send("Runtime.evaluate", {
    expression: `sessionStorage.clear();`,
  });
  await send("Page.navigate", { url: `http://localhost:${PORT}/` });

  // Wait ~2.1s on mobile and capture screenshot
  await new Promise((r) => setTimeout(r, 2100));
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase6-mobile-cutscene-390x844.png"),
    Buffer.from(shot.data, "base64")
  );

  // Click the top-right skip button and verify it jumps to wipe and unmounts within ~1.5s
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

  console.log("=== PHASE 6 VERIFICATION SUMMARY ===");
  console.log(JSON.stringify(results, null, 2));

  ws.close();
  try {
    chrome.kill();
    server.kill();
    execSync(
      `powershell -Command "Get-NetTCPConnection -LocalPort ${PORT},9306 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`
    );
  } catch {}
  process.exit(0);
})();
