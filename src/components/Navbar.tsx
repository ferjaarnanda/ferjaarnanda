"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";

const NAV_LINKS = [
  { name: "Home", href: "#home" },
  { name: "Jenis", href: "#jenis" },
  { name: "Paket", href: "#paket" },
  { name: "Kontak", href: "#kontak" },
];

function checkIsMobileOrInApp(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIAB = /Instagram|FBAV|FB_IAB|Line|;\s*wv\)/i.test(ua);
  const isTouch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  const isNarrow = window.innerWidth <= 767;
  return isNarrow || isTouch || isIAB;
}

export default function Navbar() {
  const prefersReducedMotion = useReducedMotion();
  const headerRef = useRef<HTMLElement>(null);
  const linkRowRef = useRef<HTMLDivElement>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isScrolled, setIsScrolled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.scrollY > 40;
    }
    return false;
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [isMobileNav, setIsMobileNav] = useState(false);

  // Debug overlay state (?navdebug=1)
  const [isDebug, setIsDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    scrollY: number;
    state: "A" | "B";
    top: number;
    height: number;
    opacity: string;
    visibility: string;
    display: string;
    viewport: string;
    scale: string;
    ua: string;
  } | null>(null);

  // --cap-inset calculation state in px for desktop
  const [capMetrics, setCapMetrics] = useState<{
    inset: number;
    width: number;
    padX: number;
  }>(() => {
    if (typeof window !== "undefined") {
      const vw = window.innerWidth;
      const padX = vw >= 1024 ? 56 : 20;
      const approxWidth = vw >= 1024 ? 480 : Math.min(300, Math.max(260, vw - 40));
      const inset = Math.max(0, Math.round((vw - approxWidth) / 2));
      return { inset, width: approxWidth, padX };
    }
    return { inset: 480, width: 480, padX: 56 };
  });

  const updateMetrics = useCallback(() => {
    if (!linkRowRef.current) return;
    const rowW = linkRowRef.current.offsetWidth;
    const vw = window.innerWidth;
    const padX = vw >= 1024 ? 56 : 20;
    const capW = rowW + 2 * padX;
    const inset = Math.max(0, Math.round((vw - capW) / 2));
    setCapMetrics({ inset, width: capW, padX });
  }, []);

  // Re-sync nav state
  const syncNav = useCallback(() => {
    if (typeof window === "undefined") return;
    const y = window.scrollY || window.pageYOffset || 0;
    const mobile = checkIsMobileOrInApp();
    const isStateB = y > 40;

    const header = headerRef.current || document.getElementById("main-nav");
    if (header) {
      header.setAttribute("data-nav", isStateB ? "B" : "A");
      if (mobile) {
        header.setAttribute("data-mobile-nav", "true");
        document.documentElement.setAttribute("data-mobile-device", "true");
      } else {
        header.removeAttribute("data-mobile-nav");
        document.documentElement.removeAttribute("data-mobile-device");
      }
      if (isStateB) {
        header.classList.add("is-scrolled");
      } else {
        header.classList.remove("is-scrolled");
      }
    }

    setIsMobileNav(mobile);
    setIsScrolled((prev) => {
      if (prev !== isStateB) {
        setIsTransitioning(true);
        if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = setTimeout(() => {
          setIsTransitioning(false);
        }, 520);
      }
      return isStateB;
    });
  }, []);

  // Structure: ensure header is a direct child of body
  useEffect(() => {
    if (headerRef.current && headerRef.current.parentElement !== document.body) {
      document.body.appendChild(headerRef.current);
    }
  }, []);

  // Sync and Event Listeners
  useEffect(() => {
    syncNav();
    updateMetrics();

    const onScroll = () => syncNav();
    const onResize = () => {
      syncNav();
      updateMetrics();
    };
    const onOrientationChange = () => {
      syncNav();
      updateMetrics();
    };
    const onPageShow = () => syncNav();
    const onVisibilityChange = () => {
      if (!document.hidden) syncNav();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onOrientationChange, { passive: true });
    window.addEventListener("pageshow", onPageShow, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange, { passive: true });

    let vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (vv) {
      vv.addEventListener("resize", onResize, { passive: true });
      vv.addEventListener("scroll", onScroll, { passive: true });
    }

    // 500ms Guard: verify header computed opacity, visibility, display, and height
    const guardInterval = setInterval(() => {
      const header = headerRef.current || document.getElementById("main-nav");
      if (!header) return;
      const cs = window.getComputedStyle(header);
      const rect = header.getBoundingClientRect();
      const op = parseFloat(cs.opacity || "1");
      const isBad =
        cs.display === "none" ||
        cs.visibility === "hidden" ||
        op < 0.1 ||
        rect.height <= 0;

      if (isBad) {
        header.style.setProperty("display", "flex", "important");
        header.style.setProperty("visibility", "visible", "important");
        header.style.setProperty("opacity", "1", "important");
        syncNav();
      }
    }, 500);

    // ResizeObserver for link row
    let ro: ResizeObserver | null = null;
    if (linkRowRef.current && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => updateMetrics());
      ro.observe(linkRowRef.current);
    }

    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => updateMetrics());
    }

    // Active section intersection observer
    const sections = ["home", "jenis", "paket", "kontak"];
    const sectionElements = sections
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: 0,
      }
    );
    sectionElements.forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrientationChange);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (vv) {
        vv.removeEventListener("resize", onResize);
        vv.removeEventListener("scroll", onScroll);
      }
      clearInterval(guardInterval);
      if (ro) ro.disconnect();
      observer.disconnect();
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, [syncNav, updateMetrics]);

  // Debug overlay (?navdebug=1)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasDebug = new URLSearchParams(window.location.search).get("navdebug") === "1";
    setIsDebug(hasDebug);
    if (!hasDebug) return;

    let ticking = false;
    const updateDebug = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const header = headerRef.current || document.getElementById("main-nav");
        const y = Math.round(window.scrollY || window.pageYOffset || 0);
        const rect = header ? header.getBoundingClientRect() : { top: 0, height: 0 };
        const cs = header
          ? window.getComputedStyle(header)
          : { opacity: "1", visibility: "visible", display: "flex" };
        const scale = window.visualViewport ? window.visualViewport.scale.toFixed(2) : "1.00";
        const ua = (navigator.userAgent || "").slice(-60);

        setDebugInfo({
          scrollY: y,
          state: y > 40 ? "B" : "A",
          top: Math.round(rect.top * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
          opacity: cs.opacity || "1",
          visibility: cs.visibility || "visible",
          display: cs.display || "flex",
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          scale,
          ua,
        });
        ticking = false;
      });
    };

    updateDebug();
    window.addEventListener("scroll", updateDebug, { passive: true });
    window.addEventListener("resize", updateDebug, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateDebug);
      window.removeEventListener("resize", updateDebug);
    };
  }, []);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const id = href.replace("#", "");
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
      setActiveSection(id);
      window.history.pushState(null, "", href);
    }
  };

  const cssVars = {
    "--cap-inset": `${capMetrics.inset}px`,
    "--cap-width": `${capMetrics.width}px`,
    "--cap-pad": `${capMetrics.padX}px`,
  } as React.CSSProperties;

  return (
    <>
      {/* Inline script to set data-nav from window.scrollY before hydration */}
      <script
        id="nav-pre-hydrate"
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var y=window.scrollY||window.pageYOffset||0;var el=document.getElementById('main-nav');if(el){el.setAttribute('data-nav',y>40?'B':'A');if(y>40){el.classList.add('is-scrolled');}else{el.classList.remove('is-scrolled');}}var ua=navigator.userAgent||'';var isIAB=/Instagram|FBAV|FB_IAB|Line|;\\s*wv\\)/i.test(ua);var isTouch=window.matchMedia&&window.matchMedia('(pointer: coarse)').matches;var isNarrow=(window.innerWidth||0)<=767;if(isNarrow||isTouch||isIAB){if(el)el.setAttribute('data-mobile-nav','true');document.documentElement.setAttribute('data-mobile-device','true');}}catch(e){}})();`,
        }}
      />

      <header
        id="main-nav"
        ref={headerRef}
        data-nav="A"
        className={`nav-header ${isScrolled ? "is-scrolled" : ""} ${
          isTransitioning ? "is-transitioning" : ""
        }`}
        style={isMobileNav ? undefined : cssVars}
      >
        {/* ONE background element that morphs with clip-path on desktop (hidden on mobile) */}
        <div
          className={`nav-bg ${isScrolled ? "is-scrolled" : ""} ${
            isTransitioning ? "is-transitioning" : ""
          }`}
          onTransitionEnd={(e) => {
            if (e.propertyName === "clip-path") {
              setIsTransitioning(false);
            }
          }}
          aria-hidden="true"
        />

        {/* Separate ring border & highlight at final capsule geometry on desktop (hidden on mobile) */}
        <div
          className={`nav-ring ${isScrolled ? "is-scrolled" : ""}`}
          aria-hidden="true"
        />

        {/* Link row: centered horizontally */}
        <nav
          aria-label="Navigasi Utama"
          className={`nav-link-row ${isScrolled ? "is-scrolled" : ""}`}
        >
          <div
            ref={linkRowRef}
            className="flex items-center gap-[8px] sm:gap-[16px] lg:gap-[28px]"
          >
            {NAV_LINKS.map((link) => {
              const id = link.href.replace("#", "");
              const isActive = activeSection === id;

              return (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => handleLinkClick(e, link.href)}
                  className="group relative inline-flex items-center justify-center h-[36px] px-2.5 sm:px-3.5 lg:px-4 text-[14px] sm:text-[15px] font-medium text-white select-none focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-4"
                >
                  {/* Sliding translucent white pill for active link */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-pill"
                      data-active-pill="true"
                      className="nav-active-pill absolute inset-0 rounded-full pointer-events-none"
                      style={{ backgroundColor: "rgba(255, 255, 255, 0.22)" }}
                      transition={
                        prefersReducedMotion
                          ? { duration: 0 }
                          : {
                              type: "spring",
                              stiffness: 380,
                              damping: 32,
                            }
                      }
                    />
                  )}

                  {/* Hover pill when not active */}
                  {!isActive && (
                    <div
                      className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                      style={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }}
                    />
                  )}

                  <span className="relative z-10 text-white font-medium">
                    {link.name}
                  </span>
                </a>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Debug overlay (?navdebug=1) */}
      {isDebug && debugInfo && (
        <aside
          id="nav-debug-overlay"
          aria-hidden="true"
          style={{
            position: "fixed",
            bottom: "8px",
            left: "8px",
            zIndex: 999999,
            backgroundColor: "rgba(0, 0, 0, 0.90)",
            color: "#ffffff",
            fontFamily: "monospace",
            fontSize: "10px",
            lineHeight: "1.35",
            padding: "6px 8px",
            borderRadius: "4px",
            pointerEvents: "none",
            maxWidth: "320px",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            whiteSpace: "pre-wrap",
          }}
        >
          <div>scrollY: {debugInfo.scrollY} | state: {debugInfo.state}</div>
          <div>rect: top={debugInfo.top} height={debugInfo.height}</div>
          <div>computed: {debugInfo.display} / {debugInfo.visibility} / op={debugInfo.opacity}</div>
          <div>viewport: {debugInfo.viewport} scale={debugInfo.scale}</div>
          <div style={{ wordBreak: "break-all" }}>ua: ...{debugInfo.ua}</div>
        </aside>
      )}
    </>
  );
}
