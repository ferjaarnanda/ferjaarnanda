const { spawn } = require("child_process");

(async () => {
  const CDP_PORT = 9348;
  const chrome = spawn(
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    [
      "--headless=new",
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=C:\\Users\\LENOVO\\AppData\\Local\\Temp\\chrome-probe-lt`,
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
  await send("Emulation.setCPUThrottlingRate", { rate: 4 });

  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      window.__tasks = [];
      new PerformanceObserver(l => {
        for (const e of l.getEntries()) {
          const att = e.attribution && e.attribution[0];
          window.__tasks.push({
            start: Math.round(e.startTime),
            dur: Math.round(e.duration),
            name: e.name,
            src: att ? (att.containerSrc || att.containerName || att.containerType) : ''
          });
        }
      }).observe({ entryTypes: ['longtask'] });
    `,
  });

  await send("Page.navigate", { url: "http://localhost:3000/" });
  await new Promise((r) => setTimeout(r, 6000));

  const res = await send("Runtime.evaluate", {
    expression: `(() => {
      const heroX = document.querySelector("#loading-screen canvas")?.dataset?.heroX;
      return { heroX, tasks: window.__tasks };
    })()`,
    returnByValue: true,
  });

  console.log("HERO & TASKS:", JSON.stringify(res.result.value, null, 2));

  ws.close();
  chrome.kill();
})();
