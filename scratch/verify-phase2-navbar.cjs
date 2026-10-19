const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

(async () => {
  const outDir = path.join(process.cwd(), "docs", "verification");
  fs.mkdirSync(outDir, { recursive: true });

  const PORT = 3088;
  const server = spawn("npx.cmd", ["next", "start", "-p", String(PORT)], {
    stdio: "ignore",
    shell: true,
  });
  await new Promise((r) => setTimeout(r, 3000));

  const prof = path.join(process.env.TEMP, "chrome-cdp-phase2");
  fs.mkdirSync(prof, { recursive: true });
  const chrome = spawn(
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    [
      "--headless=new",
      "--remote-debugging-port=9388",
      `--user-data-dir=${prof}`,
      "--no-first-run",
      "--disable-gpu",
      "--hide-scrollbars",
    ],
    { stdio: "ignore" }
  );
  await new Promise((r) => setTimeout(r, 2000));

  try {
    const targets = await fetch("http://127.0.0.1:9388/json").then((r) =>
      r.json()
    );
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

    const evalJS = async (expr) => {
      const res = await send("Runtime.evaluate", {
        expression: expr,
        returnByValue: true,
        awaitPromise: true,
      });
      return res.result ? res.result.value : undefined;
    };

    const captureScreenshot = async (filename) => {
      const shot = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(
        path.join(outDir, filename),
        Buffer.from(shot.data, "base64")
      );
    };

    await send("Page.enable");
    await send("Runtime.enable");
    // Bypass loader cutscene so we can test navbar directly
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `sessionStorage.setItem("ferja_intro_seen_v1", "1");`,
    });

    // -------------------------------------------------------------
    // 1. DESKTOP 1440x900
    // -------------------------------------------------------------
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await send("Page.navigate", { url: `http://localhost:${PORT}/` });
    await new Promise((r) => setTimeout(r, 2500));

    // Measure State A (Top of page, scrollY = 0)
    const stateA_desktop = await evalJS(`(() => {
      const header = document.querySelector(".nav-header");
      const navBg = document.querySelector(".nav-bg");
      const navRing = document.querySelector(".nav-ring");
      const linkRow = document.querySelector(".nav-link-row");
      const links = Array.from(document.querySelectorAll(".nav-link-row a"));
      const pill = document.querySelector(".nav-active-pill");

      const bgStyle = getComputedStyle(navBg);
      const ringStyle = getComputedStyle(navRing);
      const rowStyle = getComputedStyle(linkRow);
      const headerStyle = getComputedStyle(header);

      const linkRects = links.map(a => a.getBoundingClientRect());
      const rowRect = linkRow.getBoundingClientRect();

      // Check underline
      const hasUnderline = links.some(a => {
        const cs = getComputedStyle(a);
        return cs.textDecorationLine !== "none" && cs.textDecorationLine !== "";
      });

      return {
        headerHeight: header.offsetHeight,
        headerContain: headerStyle.contain,
        bgClipPath: bgStyle.clipPath,
        bgColor: bgStyle.backgroundColor,
        bgHeight: navBg.offsetHeight,
        ringOpacity: ringStyle.opacity,
        rowTransform: rowStyle.transform,
        rowCenterX: rowRect.left + rowRect.width / 2,
        wordGaps: [
          Math.round(linkRects[1].left - linkRects[0].right),
          Math.round(linkRects[2].left - linkRects[1].right),
          Math.round(linkRects[3].left - linkRects[2].right),
        ],
        pillPresent: !!pill,
        pillBg: pill ? getComputedStyle(pill).backgroundColor : null,
        pillHeight: pill ? pill.offsetHeight : null,
        hasUnderline,
        capInsetVar: headerStyle.getPropertyValue("--cap-inset").trim(),
        capWidthVar: headerStyle.getPropertyValue("--cap-width").trim(),
      };
    })()`);

    await captureScreenshot("phase2-desktop-navbar-stateA.png");

    // Install Performance / Frame Tracker and scroll down to trigger MORPH
    await evalJS(`(() => {
      window._frameDurations = [];
      window._longTasks = [];
      window._perfStart = performance.now();
      let lastTime = performance.now();
      window._tracking = true;

      function trackFrame() {
        if (!window._tracking) return;
        const now = performance.now();
        window._frameDurations.push(now - lastTime);
        lastTime = now;
        requestAnimationFrame(trackFrame);
      }
      requestAnimationFrame(trackFrame);

      if (window.PerformanceObserver) {
        try {
          const po = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              window._longTasks.push({
                duration: entry.duration,
                startTime: entry.startTime
              });
            }
          });
          po.observe({ entryTypes: ["longtask"] });
          window._po = po;
        } catch(e) {}
      }
    })()`);

    // Trigger scroll to 150px
    await evalJS(`window.scrollTo({ top: 150, behavior: "instant" })`);

    // Sample mid-morph clip-path at ~200ms
    await new Promise((r) => setTimeout(r, 200));
    const midMorph_desktop = await evalJS(`(() => {
      const navBg = document.querySelector(".nav-bg");
      const row = document.querySelector(".nav-link-row");
      const cs = getComputedStyle(navBg);
      return {
        clipPath: cs.clipPath,
        bgColor: cs.backgroundColor,
        willChange: cs.willChange,
        rowTransform: getComputedStyle(row).transform
      };
    })()`);

    // Wait for morph animation to settle (~550ms total)
    await new Promise((r) => setTimeout(r, 450));

    // Measure State B (Scrolled, scrollY = 150)
    const stateB_desktop = await evalJS(`(() => {
      window._tracking = false;
      const navBg = document.querySelector(".nav-bg");
      const navRing = document.querySelector(".nav-ring");
      const linkRow = document.querySelector(".nav-link-row");
      const pill = document.querySelector(".nav-active-pill");

      const bgStyle = getComputedStyle(navBg);
      const ringStyle = getComputedStyle(navRing);
      const rowStyle = getComputedStyle(linkRow);
      const rowRect = linkRow.getBoundingClientRect();

      return {
        bgClipPath: bgStyle.clipPath,
        bgColor: bgStyle.backgroundColor,
        backdropFilter: bgStyle.backdropFilter || bgStyle.webkitBackdropFilter,
        ringOpacity: ringStyle.opacity,
        rowTransform: rowStyle.transform,
        rowCenterX: rowRect.left + rowRect.width / 2,
        willChangeAfter: bgStyle.willChange,
        pillPresent: !!pill,
        perfMetrics: {
          totalFramesRecorded: window._frameDurations.length,
          avgFrameMs: window._frameDurations.length
            ? (window._frameDurations.reduce((a, b) => a + b, 0) / window._frameDurations.length).toFixed(2)
            : 0,
          maxFrameMs: window._frameDurations.length
            ? Math.max(...window._frameDurations).toFixed(2)
            : 0,
          longTasksCount: window._longTasks.length,
          longTasks: window._longTasks,
        }
      };
    })()`);

    await captureScreenshot("phase2-desktop-navbar-stateB.png");

    // Test reverse morph back to top (scrollY = 0)
    await evalJS(`window.scrollTo({ top: 0, behavior: "instant" })`);
    await new Promise((r) => setTimeout(r, 200));
    const midReverse_desktop = await evalJS(`(() => {
      const navBg = document.querySelector(".nav-bg");
      return {
        clipPath: getComputedStyle(navBg).clipPath,
      };
    })()`);

    await new Promise((r) => setTimeout(r, 450));
    const reverseFinal_desktop = await evalJS(`(() => {
      const navBg = document.querySelector(".nav-bg");
      const navRing = document.querySelector(".nav-ring");
      const row = document.querySelector(".nav-link-row");
      return {
        bgClipPath: getComputedStyle(navBg).clipPath,
        bgColor: getComputedStyle(navBg).backgroundColor,
        ringOpacity: getComputedStyle(navRing).opacity,
        rowTransform: getComputedStyle(row).transform
      };
    })()`);

    await captureScreenshot("phase2-desktop-navbar-reverse-top.png");

    // -------------------------------------------------------------
    // Test CV Modal and Download functionality (PHASE 2)
    // -------------------------------------------------------------
    const cvDetails = await evalJS(`(() => {
      const viewBtn = document.querySelector("button:has-text('View CV'), [data-btn='view-cv']") ||
        Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("View CV"));
      const downloadBtn = Array.from(document.querySelectorAll("a, button")).find(b => b.textContent.includes("Download CV"));

      let modalOpened = false;
      let modalHasPdf = false;
      let modalHasEsc = false;

      if (viewBtn) {
        viewBtn.click();
      }

      const modal = document.querySelector("[role='dialog'], [data-modal='cv'], .fixed.inset-0");
      if (modal) {
        modalOpened = true;
        const objectEl = modal.querySelector("object");
        if (objectEl && objectEl.getAttribute("data")?.includes("FerjaArnanda_CV.pdf")) {
          modalHasPdf = true;
        }
      }

      return {
        hasViewBtn: !!viewBtn,
        hasDownloadBtn: !!downloadBtn,
        downloadHref: downloadBtn ? downloadBtn.getAttribute("href") : null,
        downloadAttr: downloadBtn ? downloadBtn.getAttribute("download") : null,
        modalOpened,
        modalHasPdf,
      };
    })()`);

    // Close CV modal if opened
    await evalJS(`(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    })()`);
    await new Promise((r) => setTimeout(r, 300));

    // -------------------------------------------------------------
    // 2. MOBILE 390x844
    // -------------------------------------------------------------
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await new Promise((r) => setTimeout(r, 600));

    // Scroll to top
    await evalJS(`window.scrollTo({ top: 0, behavior: "instant" })`);
    await new Promise((r) => setTimeout(r, 400));

    const stateA_mobile = await evalJS(`(() => {
      const navBg = document.querySelector(".nav-bg");
      const navRing = document.querySelector(".nav-ring");
      const linkRow = document.querySelector(".nav-link-row");
      const links = Array.from(document.querySelectorAll(".nav-link-row a"));
      const header = document.querySelector(".nav-header");

      const linkRects = links.map(a => a.getBoundingClientRect());
      const rowRect = linkRow.getBoundingClientRect();

      // Check if all 4 links are in one row (same top approx)
      const allInOneRow = linkRects.every(r => Math.abs(r.top - linkRects[0].top) < 4);

      return {
        linkCount: links.length,
        allInOneRow,
        bgClipPath: getComputedStyle(navBg).clipPath,
        bgColor: getComputedStyle(navBg).backgroundColor,
        ringOpacity: getComputedStyle(navRing).opacity,
        rowTransform: getComputedStyle(linkRow).transform,
        rowWidth: rowRect.width,
        capInsetVar: getComputedStyle(header).getPropertyValue("--cap-inset").trim(),
        capWidthVar: getComputedStyle(header).getPropertyValue("--cap-width").trim(),
        wordGaps: [
          Math.round(linkRects[1].left - linkRects[0].right),
          Math.round(linkRects[2].left - linkRects[1].right),
          Math.round(linkRects[3].left - linkRects[2].right),
        ],
      };
    })()`);

    await captureScreenshot("phase2-mobile-navbar-stateA.png");

    // Scroll mobile to trigger State B
    await evalJS(`window.scrollTo({ top: 120, behavior: "instant" })`);
    await new Promise((r) => setTimeout(r, 600));

    const stateB_mobile = await evalJS(`(() => {
      const navBg = document.querySelector(".nav-bg");
      const navRing = document.querySelector(".nav-ring");
      const linkRow = document.querySelector(".nav-link-row");
      const rowRect = linkRow.getBoundingClientRect();

      return {
        bgClipPath: getComputedStyle(navBg).clipPath,
        bgColor: getComputedStyle(navBg).backgroundColor,
        ringOpacity: getComputedStyle(navRing).opacity,
        rowTransform: getComputedStyle(linkRow).transform,
        rowCenterX: rowRect.left + rowRect.width / 2,
      };
    })()`);

    await captureScreenshot("phase2-mobile-navbar-stateB.png");

    ws.close();

    console.log(
      JSON.stringify(
        {
          stateA_desktop,
          midMorph_desktop,
          stateB_desktop,
          midReverse_desktop,
          reverseFinal_desktop,
          cvDetails,
          stateA_mobile,
          stateB_mobile,
        },
        null,
        2
      )
    );
  } finally {
    try {
      chrome.kill();
    } catch {}
    try {
      server.kill();
    } catch {}
    try {
      execSync("taskkill /F /IM chrome.exe /T", { stdio: "ignore" });
    } catch {}
  }
})();
