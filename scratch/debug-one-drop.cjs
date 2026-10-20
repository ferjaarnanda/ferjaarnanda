const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const watchdog = setTimeout(() => {
  console.error("Watchdog 30s");
  process.exit(1);
}, 30000);
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
  const CDP_PORT = 9345;
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
            solidPen: Number(frame.dataset.solidPenetration || 0)
          };
        })()`,
        returnByValue: true,
      });
      return res.result?.value;
    };

    console.log("State before drag:", await getHeroState());

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

    console.log("Handle info:", h);

    // Mouse down on handle
    await send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: Math.round(h.hx),
      y: Math.round(h.hy),
      button: "left",
      clickCount: 1,
    });
    await new Promise((r) => setTimeout(r, 40));

    console.log("State after mousePressed:", await getHeroState());

    const targetWx = 230;
    const targetWy = 70;
    const targetX = h.cLeft + (targetWx - h.viewLeft) * h.scaleK;
    const targetY = h.cTop + (targetWy - 20) * h.scaleK;

    const moveStart = Date.now();
    while (Date.now() - moveStart < 800) {
      await send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: Math.round(targetX),
        y: Math.round(targetY),
        button: "left",
      });
      await new Promise((r) => setTimeout(r, 40));
    }

    console.log("State before release:", await getHeroState());

    await send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: Math.round(targetX),
      y: Math.round(targetY),
      button: "left",
    });

    console.log("State right after release:", await getHeroState());

    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 100));
      console.log(`Poll ${i * 100}ms:`, await getHeroState());
    }

  } catch (err) {
    console.error(err);
  } finally {
    clearTimeout(watchdog);
    if (ws) ws.close();
    if (chrome) chrome.kill();
  }
})();
