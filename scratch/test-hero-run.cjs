const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

(async () => {
  const CDP_PORT = 9349;
  const chrome = spawn(
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    [
      "--headless=new",
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=C:\\Users\\LENOVO\\AppData\\Local\\Temp\\chrome-anim-test`,
      "--no-first-run",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  await new Promise((r) => setTimeout(r, 1200));
  const tRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
  const [target] = await tRes.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));

  let id = 0;
  const send = (m, p = {}) =>
    new Promise((res, rej) => {
      const msgId = ++id;
      const l = (e) => {
        const d = JSON.parse(e.data);
        if (d.id === msgId) {
          ws.removeEventListener("message", l);
          res(d.result);
        }
      };
      ws.addEventListener("message", l);
      ws.send(JSON.stringify({ id: msgId, method: m, params: p }));
    });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Emulation.setCPUThrottlingRate", { rate: 4 });

  await send("Page.navigate", { url: "http://localhost:3000/" });

  // Wait for loader canvas to mount and timeline to start
  const startWait = Date.now();
  let canvasReady = false;
  while (Date.now() - startWait < 8000) {
    await new Promise((r) => setTimeout(r, 200));
    const check = await send("Runtime.evaluate", {
      expression: `Boolean(document.querySelector("#loading-screen canvas"))`,
      returnByValue: true,
    });
    if (check.result?.value) {
      canvasReady = true;
      break;
    }
  }

  console.log("Canvas ready:", canvasReady);

  // Monitor frame delta and heroX during run-up and jump 1
  const startTrack = Date.now();
  const samples = [];
  while (Date.now() - startTrack < 6000) {
    await new Promise((r) => setTimeout(r, 100));
    const state = await send("Runtime.evaluate", {
      expression: `(() => {
        const canvas = document.querySelector("#loading-screen canvas");
        if (!canvas) return null;
        return {
          heroX: Number(canvas.dataset.heroX || 0),
          collected: Number(canvas.dataset.collectedMiniCoins || 0),
        };
      })()`,
      returnByValue: true,
    });
    const val = state.result?.value;
    if (val) {
      samples.push({ t: Date.now() - startTrack, ...val });
      if (val.heroX >= 350) break;
    }
  }

  console.log("Hero movement samples:");
  samples.forEach((s) => console.log(`t=${s.t}ms: heroX=${s.heroX}, coins=${s.collected}`));

  ws.close();
  chrome.kill();
})();
