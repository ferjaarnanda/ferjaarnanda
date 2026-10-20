const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Strict 50-second hard watchdog (timeout <= 60s)
const watchdog = setTimeout(() => {
  console.error("\n[WATCHDOG ERROR] Hard 50s timeout reached in verify-navbar-reloads! Terminating.");
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

const INSTAGRAM_WEBVIEW_UA =
  "Mozilla/5.0 (Linux; Android 13; SM-G998B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/115.0.5790.166 Mobile Safari/537.36 Instagram 294.0.0.33.111 Android";

(async () => {
  const PORT = 3000;
  const CDP_PORT = 9320;
  let chrome = null;
  let ws = null;

  try {
    console.log("[1/3] Connecting to Chrome via CDP on port " + CDP_PORT + "...");
    const prof = path.join(process.env.TEMP || ".", `chrome-cdp-nav-${Date.now()}`);
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

    console.log("[2/3] Testing Navbar Reliability over 20 consecutive reloads...");
    const verifDir = path.join(__dirname, "..", "docs", "verification");
    fs.mkdirSync(verifDir, { recursive: true });

    let passCount = 0;
    const totalRuns = 20;

    for (let i = 1; i <= totalRuns; i++) {
      const isMobileWebView = i % 2 === 0;
      if (isMobileWebView) {
        await send("Emulation.setDeviceMetricsOverride", {
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
          mobile: true,
        });
        await send("Network.setUserAgentOverride", {
          userAgent: INSTAGRAM_WEBVIEW_UA,
        });
      } else {
        await send("Emulation.setDeviceMetricsOverride", {
          width: 1440,
          height: 900,
          deviceScaleFactor: 1,
          mobile: false,
        });
        await send("Network.setUserAgentOverride", {
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        });
      }

      await send("Page.navigate", { url: `http://localhost:${PORT}/` });
      // Small pause to let DOM paint
      await new Promise((r) => setTimeout(r, 350));

      // Evaluate navbar visibility in STATE A
      const res = await send("Runtime.evaluate", {
        expression: `(() => {
          const header = document.querySelector("header.nav-header");
          if (!header) return { ok: false, reason: "No header.nav-header element" };

          const style = window.getComputedStyle(header);
          const navBg = header.querySelector(".nav-bg");
          const bgStyle = navBg ? window.getComputedStyle(navBg) : null;

          // Check red color in header or nav-bg (rgb(229, 37, 33))
          const headerHasRed = style.backgroundColor.includes("229, 37, 33") || style.backgroundImage.includes("229, 37, 33");
          const bgHasRed = bgStyle && bgStyle.backgroundColor.includes("229, 37, 33");
          const isRed = headerHasRed || bgHasRed;

          // Check links
          const links = Array.from(header.querySelectorAll("nav a")).map(a => ({
            text: a.textContent.trim(),
            color: window.getComputedStyle(a).color,
          }));

          const has4Links = links.length === 4 && links.some(l => l.text === "Home");
          const allWhite = links.every(l => l.color.includes("255, 255, 255"));

          return {
            ok: isRed && has4Links && allWhite,
            headerHasRed,
            bgHasRed,
            isRed,
            has4Links,
            allWhite,
            headerBg: style.backgroundColor,
            headerBgImg: style.backgroundImage,
            navBgColor: bgStyle?.backgroundColor,
            linkCount: links.length
          };
        })()`,
        returnByValue: true,
      });

      const check = res.result?.value;
      if (!check || !check.ok) {
        console.error(`[FAIL] Reload ${i}/${totalRuns} failed check:`, check);
        break;
      }

      if (i === 1) {
        const shot = await send("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(path.join(verifDir, "phase8-navbar-desktop.png"), Buffer.from(shot.data, "base64"));
        console.log("   - Reload 1/20 (Desktop 1440x900): STATE A red bar verified & saved to docs/verification/phase8-navbar-desktop.png");
      } else if (i === 2) {
        const shot = await send("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(path.join(verifDir, "phase8-navbar-webview.png"), Buffer.from(shot.data, "base64"));
        console.log("   - Reload 2/20 (Android Instagram WebView 390x844): STATE A red bar verified & saved to docs/verification/phase8-navbar-webview.png");
      }

      passCount++;
    }

    console.log(`[3/3] Navbar Reloads Result: ${passCount}/${totalRuns} reloads PASSED!`);
    if (passCount === totalRuns) {
      console.log("[VERIFICATION PASS] NAVBAR RELIABILITY: 20/20 reloads passed (no blank white band in desktop or Android WebView emulation).");
    } else {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("[ERROR] verify-navbar-reloads:", err);
    process.exitCode = 1;
  } finally {
    clearTimeout(watchdog);
    if (ws) ws.close();
    if (chrome) chrome.kill();
  }
})();
