const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const watchdog = setTimeout(() => {
  console.error("Watchdog 25s");
  process.exit(1);
}, 25000);
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
  const CDP_PORT = 9348;
  let chrome = null;
  let ws = null;

  try {
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
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: `http://localhost:${PORT}/` });
    await new Promise((r) => setTimeout(r, 600));

    await send("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.querySelector("#loading-screen button[aria-label='Lewati intro']");
        if (btn) btn.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 1600));

    await send("Runtime.evaluate", {
      expression: `document.getElementById("jenis").scrollIntoView({ behavior: "instant" });`,
    });
    await new Promise((r) => setTimeout(r, 500));

    const dragRes = await send("Runtime.evaluate", {
      expression: `(() => {
        const handle = document.querySelector("[data-hero-handle='true']");
        const frame = document.querySelector(".mario-console-frame");
        const canvas = frame.querySelector("canvas");
        const hRect = handle.getBoundingClientRect();
        const cRect = canvas.getBoundingClientRect();
        const scaleK = Number(frame.dataset.scaleK || 2);
        const viewLeft = Number(frame.dataset.viewLeft || 0);

        const startX = hRect.left + hRect.width / 2;
        const startY = hRect.top + hRect.height / 2;

        // Pointerdown
        handle.dispatchEvent(new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: "mouse",
          button: 0,
          clientX: startX,
          clientY: startY,
        }));

        const targetWx = 230;
        const targetWy = 70;
        const targetX = cRect.left + (targetWx - viewLeft) * scaleK;
        const targetY = cRect.top + (targetWy - 20) * scaleK;

        // Move to target
        window.dispatchEvent(new PointerEvent("pointermove", {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: "mouse",
          clientX: targetX,
          clientY: targetY,
        }));

        return {
          phaseAfterDown: frame.dataset.heroPhase,
          isDragging: frame.dataset.heroPhase === "DRAGGING"
        };
      })()`,
      returnByValue: true,
    });

    console.log("Dispatch result:", dragRes.result.value);

  } catch (err) {
    console.error(err);
  } finally {
    clearTimeout(watchdog);
    if (ws) ws.close();
    if (chrome) chrome.kill();
  }
})();
