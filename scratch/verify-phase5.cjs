const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

(async () => {
  fs.mkdirSync("docs/verification", { recursive: true });

  const PORT = 3065;
  const server = spawn("npx.cmd", ["next", "start", "-p", String(PORT)], {
    stdio: "ignore",
    shell: true,
  });
  await new Promise((r) => setTimeout(r, 3000));

  const prof = path.join(process.env.TEMP, "chrome-cdp-p5");
  fs.mkdirSync(prof, { recursive: true });
  const chrome = spawn(
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    [
      "--headless=new",
      "--remote-debugging-port=9305",
      `--user-data-dir=${prof}`,
      "--no-first-run",
      "--disable-gpu",
      "--hide-scrollbars",
    ],
    { stdio: "ignore" }
  );
  await new Promise((r) => setTimeout(r, 2000));

  const targets = await fetch("http://127.0.0.1:9305/json").then((r) => r.json());
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
  // 1. DESKTOP (1440x900)
  // =========================================================
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: `http://localhost:${PORT}/` });
  await new Promise((r) => setTimeout(r, 1500));

  // Inspect Tech Stack Desktop
  await send("Runtime.evaluate", {
    expression: `(() => {
      const el = document.getElementById("tech-stack");
      if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    })()`,
  });
  await new Promise((r) => setTimeout(r, 600));

  let shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase5-techstack-desktop-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

  const desktopAudit = await send("Runtime.evaluate", {
    awaitPromise: true,
    expression: `(async () => {
      // 1. Tech Stack
      const tsSec = document.getElementById("tech-stack");
      const rows = Array.from(tsSec.querySelectorAll(".flex.items-start"));
      const firstRowLabel = rows[0]?.querySelector("span")?.innerText.trim();
      const firstTile = rows[0]?.querySelector(".group");
      const tileStyle = firstTile ? window.getComputedStyle(firstTile) : null;
      const firstLogo = firstTile?.querySelector("img");
      const logoStyle = firstLogo ? window.getComputedStyle(firstLogo) : null;
      const firstText = firstTile?.querySelector("span");
      const textStyle = firstText ? window.getComputedStyle(firstText) : null;

      // 2. Alur Kerja
      const alurDesktop = document.querySelector("#alur-faq .hidden.md\\\\:grid");
      const desktopSteps = Array.from(alurDesktop ? alurDesktop.children : []);
      const firstCircle = desktopSteps[0]?.querySelector(".rounded-full");
      const circleStyle = firstCircle ? window.getComputedStyle(firstCircle) : null;
      const circleText = firstCircle?.innerText.trim();

      // 3. FAQ
      const faqButtons = Array.from(document.querySelectorAll("#alur-faq button"));
      const firstFaqExpanded = faqButtons[0]?.getAttribute("aria-expanded");
      const secondFaqExpandedBefore = faqButtons[1]?.getAttribute("aria-expanded");

      // Click second FAQ to test accordion interaction
      faqButtons[1]?.click();
      await new Promise(r => setTimeout(r, 350));
      const secondFaqExpandedAfter = faqButtons[1]?.getAttribute("aria-expanded");

      // 4. Kontak
      const kontakSec = document.getElementById("kontak");
      const waBtn = kontakSec.querySelector("a.btn-primary");
      const gmailBtn = kontakSec.querySelector("a.btn-secondary");
      const socialLinks = Array.from(kontakSec.querySelectorAll(".flex.flex-row a")).map(a => a.innerText.trim());
      const select = kontakSec.querySelector("select#jenis");
      const options = Array.from(select ? select.querySelectorAll("option") : []).map(o => o.innerText.trim());
      const forbiddenWordsInForm = ["Bronze", "Silver", "Gold", "Diamond"].filter(w =>
        new RegExp("\\\\b" + w + "\\\\b", "i").test(kontakSec.innerText)
      );

      // 5. Footer
      const footer = document.querySelector("footer");
      const footerText = footer ? footer.innerText.trim() : "";
      const footerLinks = Array.from(footer ? footer.querySelectorAll("a") : []);

      return {
        techStack: {
          categoriesCount: rows.length,
          firstRowLabel,
          tileWidth: Math.round(parseFloat(tileStyle?.width || 0)),
          tileHeight: Math.round(parseFloat(tileStyle?.height || 0)),
          tileRadius: tileStyle?.borderRadius,
          tileBorder: tileStyle?.borderWidth + " " + tileStyle?.borderColor,
          logoWidth: Math.round(parseFloat(logoStyle?.width || 0)),
          logoHeight: Math.round(parseFloat(logoStyle?.height || 0)),
          fontSize: textStyle?.fontSize,
        },
        alurKerja: {
          desktopStepsCount: desktopSteps.length,
          circleWidth: Math.round(parseFloat(circleStyle?.width || 0)),
          circleHeight: Math.round(parseFloat(circleStyle?.height || 0)),
          circleBorderColor: circleStyle?.borderColor,
          circleColor: circleStyle?.color,
          firstCircleText: circleText,
        },
        faq: {
          count: faqButtons.length,
          firstFaqExpanded,
          secondFaqExpandedBefore,
          secondFaqExpandedAfter,
        },
        kontak: {
          hasWaBtn: !!waBtn && waBtn.getAttribute("href")?.includes("wa.me"),
          hasGmailBtn: !!gmailBtn && gmailBtn.getAttribute("href")?.includes("mailto:"),
          socialLinks,
          dropdownOptions: options,
          forbiddenWordsInForm,
        },
        footer: {
          text: footerText,
          linksCount: footerLinks.length,
        }
      };
    })()`,
    returnByValue: true,
  });

  results.desktop = desktopAudit.result.value;

  // Screenshot Alur + FAQ Desktop
  await send("Runtime.evaluate", {
    expression: `(() => {
      const el = document.getElementById("alur-faq");
      if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    })()`,
  });
  await new Promise((r) => setTimeout(r, 600));
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase5-alur-faq-desktop-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

  // Screenshot Kontak + Footer Desktop
  await send("Runtime.evaluate", {
    expression: `(() => {
      const el = document.getElementById("kontak");
      if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    })()`,
  });
  await new Promise((r) => setTimeout(r, 600));
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase5-kontak-footer-desktop-1440x900.png"),
    Buffer.from(shot.data, "base64")
  );

  // =========================================================
  // 2. MOBILE (390x844)
  // =========================================================
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send("Page.navigate", { url: `http://localhost:${PORT}/` });
  await new Promise((r) => setTimeout(r, 1500));

  // Screenshot Tech Stack Mobile
  await send("Runtime.evaluate", {
    expression: `(() => {
      const el = document.getElementById("tech-stack");
      if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    })()`,
  });
  await new Promise((r) => setTimeout(r, 600));
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase5-techstack-mobile-390x844.png"),
    Buffer.from(shot.data, "base64")
  );

  // Screenshot Alur + FAQ Mobile
  await send("Runtime.evaluate", {
    expression: `(() => {
      const el = document.getElementById("alur-faq");
      if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    })()`,
  });
  await new Promise((r) => setTimeout(r, 600));
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase5-alur-faq-mobile-390x844.png"),
    Buffer.from(shot.data, "base64")
  );

  // Screenshot Kontak Mobile
  await send("Runtime.evaluate", {
    expression: `(() => {
      const el = document.getElementById("kontak");
      if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    })()`,
  });
  await new Promise((r) => setTimeout(r, 600));
  shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join("docs/verification", "phase5-kontak-footer-mobile-390x844.png"),
    Buffer.from(shot.data, "base64")
  );

  const mobileAudit = await send("Runtime.evaluate", {
    expression: `(() => {
      // Tech Stack Mobile
      const tsSec = document.getElementById("tech-stack");
      const firstRow = tsSec.querySelector(".flex.items-start");
      const labelCol = firstRow?.querySelector(".w-\\\\[72px\\\\]");
      const firstTile = tsSec.querySelector(".group");
      const tileStyle = firstTile ? window.getComputedStyle(firstTile) : null;
      const logo = firstTile?.querySelector("img");
      const logoStyle = logo ? window.getComputedStyle(logo) : null;
      const text = firstTile?.querySelector("span");
      const textStyle = text ? window.getComputedStyle(text) : null;

      // Alur Kerja Mobile
      const alurMobile = document.querySelector("#alur-faq .flex.md\\\\:hidden");
      const mobileSteps = Array.from(alurMobile ? alurMobile.querySelectorAll(".relative.flex.items-start") : []);
      const connectingLines = alurMobile ? alurMobile.querySelectorAll(".w-px.bg-\\\\[\\\\#E5E7EB\\\\]") : [];
      const firstMobileCircle = mobileSteps[0]?.querySelector(".rounded-full");
      const mCircleStyle = firstMobileCircle ? window.getComputedStyle(firstMobileCircle) : null;

      // Horizontal overflow check
      const noHorizontalDocOverflow = document.documentElement.scrollWidth <= 390;

      return {
        techStack: {
          labelColWidth: labelCol ? labelCol.offsetWidth : 0,
          tileWidth: Math.round(parseFloat(tileStyle?.width || 0)),
          tileHeight: Math.round(parseFloat(tileStyle?.height || 0)),
          logoWidth: Math.round(parseFloat(logoStyle?.width || 0)),
          logoHeight: Math.round(parseFloat(logoStyle?.height || 0)),
          fontSize: textStyle?.fontSize,
        },
        alurKerja: {
          mobileStepsCount: mobileSteps.length,
          connectingLinesCount: connectingLines.length,
          circleWidth: Math.round(parseFloat(mCircleStyle?.width || 0)),
          circleHeight: Math.round(parseFloat(mCircleStyle?.height || 0)),
        },
        noHorizontalDocOverflow,
      };
    })()`,
    returnByValue: true,
  });

  results.mobile = mobileAudit.result.value;

  console.log("=== PHASE 5 VERIFICATION SUMMARY ===");
  console.log(JSON.stringify(results, null, 2));

  ws.close();
  try {
    chrome.kill();
    server.kill();
    execSync(
      `powershell -Command "Get-NetTCPConnection -LocalPort ${PORT},9305 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`
    );
  } catch {}
  process.exit(0);
})();
