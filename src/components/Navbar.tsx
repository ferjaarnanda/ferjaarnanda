"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";

const NAV_LINKS = [
  { name: "Home", href: "#home" },
  { name: "Jenis", href: "#jenis" },
  { name: "Paket", href: "#paket" },
  { name: "Kontak", href: "#kontak" },
];

export default function Navbar() {
  const prefersReducedMotion = useReducedMotion();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const linkRowRef = useRef<HTMLDivElement>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --cap-inset calculation state in px
  const [capMetrics, setCapMetrics] = useState<{
    inset: number;
    width: number;
    padX: number;
  }>({
    inset: 480,
    width: 480,
    padX: 56,
  });

  // Calculate --cap-inset and --cap-width in px
  // capsuleWidth = linkRowWidth + 2 x padX (padX: 56px desktop / 20px phones)
  // capInset = (viewportWidth - capsuleWidth) / 2 in px
  const updateMetrics = useCallback(() => {
    if (!linkRowRef.current) return;
    const rowW = linkRowRef.current.offsetWidth;
    const vw = window.innerWidth;
    const padX = vw >= 1024 ? 56 : 20;
    const capW = rowW + 2 * padX;
    const inset = Math.max(0, Math.round((vw - capW) / 2));
    setCapMetrics({ inset, width: capW, padX });
  }, []);

  useEffect(() => {
    updateMetrics();

    // Recompute on window resize
    window.addEventListener("resize", updateMetrics);

    // Recompute on ResizeObserver of the link row
    let ro: ResizeObserver | null = null;
    if (linkRowRef.current && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        updateMetrics();
      });
      ro.observe(linkRowRef.current);
    }

    // Recompute when fonts are ready
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        updateMetrics();
      });
    }

    return () => {
      window.removeEventListener("resize", updateMetrics);
      if (ro) ro.disconnect();
    };
  }, [updateMetrics]);

  // Hysteresis scroll listener: enter State B above 48px, leave below 12px
  useEffect(() => {
    let ticking = false;
    let currentScrolled = false;

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          if (!currentScrolled && y > 48) {
            currentScrolled = true;
            setIsScrolled(true);
            setIsTransitioning(true);
            if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
            transitionTimerRef.current = setTimeout(() => {
              setIsTransitioning(false);
            }, 520);
          } else if (currentScrolled && y < 12) {
            currentScrolled = false;
            setIsScrolled(false);
            setIsTransitioning(true);
            if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
            transitionTimerRef.current = setTimeout(() => {
              setIsTransitioning(false);
            }, 520);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    // Initial check on mount
    const initialY = window.scrollY;
    if (initialY > 48) {
      currentScrolled = true;
      setIsScrolled(true);
    }

    // IntersectionObserver for active section tracking
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
      observer.disconnect();
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
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
    <header className="nav-header" style={cssVars}>
      {/* ONE background element that morphs with clip-path:
          - State A: clip-path: inset(0px 0px 24px 0px round 0px) (64px flat bar)
          - State B: clip-path: inset(16px var(--cap-inset) 16px var(--cap-inset) round 28px) (56px capsule)
          - Solid #E52521 in A, rgba(229, 37, 33, 0.78) in B
          - backdrop-filter ALWAYS active */}
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

      {/* Separate ring border & highlight at final capsule geometry:
          - 1px border rgba(255, 255, 255, 0.4)
          - Inset top highlight inset 0 1px 0 rgba(255, 255, 255, 0.35)
          - Opacity 0 in A, fades to 1 over 250ms with 180ms delay in B */}
      <div
        className={`nav-ring ${isScrolled ? "is-scrolled" : ""}`}
        aria-hidden="true"
      />

      {/* Link row: centered horizontally, never moves horizontally or changes gaps.
          translateY(0) in A, translateY(12px) in B so it stays centered inside the 56px capsule */}
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
  );
}
