"use client";

import { useEffect, useRef, useState } from "react";
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
  const [activeSection, setActiveSection] = useState("home");
  const linkRowRef = useRef<HTMLDivElement>(null);
  const [linkRowWidth, setLinkRowWidth] = useState<number>(0);

  // Measure link row width to set capsule width = linkRowWidth + 2 * var(--cap-pad)
  useEffect(() => {
    const el = linkRowRef.current;
    if (!el) return;

    const measure = () => {
      setLinkRowWidth(el.offsetWidth);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // rAF-throttled scroll listener with hysteresis:
  // enter the capsule above 48px, leave below 12px
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
          } else if (currentScrolled && y < 12) {
            currentScrolled = false;
            setIsScrolled(false);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // Initial check
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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none select-none h-16">
      {/* (a) .nav-bar-bg: full-width solid red #E52521, 64px high */}
      <div
        className="nav-bar-bg absolute top-0 left-0 right-0 h-16 bg-[#E52521] pointer-events-auto"
        style={{
          contain: "layout paint",
          willChange: "opacity",
          transition: prefersReducedMotion
            ? "none"
            : "opacity 300ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          opacity: isScrolled ? 0 : 1,
        }}
        aria-hidden="true"
      />

      {/* (b) .nav-capsule-bg: separate capsule layer */}
      <div
        className="nav-capsule-bg absolute top-4 left-1/2 rounded-full pointer-events-auto border border-[rgba(255,255,255,0.4)]"
        style={{
          height: 56,
          width: linkRowWidth
            ? `calc(${linkRowWidth}px + 2 * var(--cap-pad, 56px))`
            : "max-content",
          backgroundColor: "rgba(229, 37, 33, 0.72)",
          backdropFilter: "blur(16px) saturate(140%)",
          WebkitBackdropFilter: "blur(16px) saturate(140%)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.35)",
          contain: "layout paint",
          willChange: "opacity, transform",
          transition: prefersReducedMotion
            ? "none"
            : "opacity 300ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          opacity: isScrolled ? 1 : 0,
          transform: isScrolled
            ? "translateX(-50%) translateY(0px) scale(1)"
            : "translateX(-50%) translateY(-8px) scale(0.98)",
        }}
        aria-hidden="true"
      />

      {/* (c) The link row (centered; it NEVER changes its horizontal position or its gaps) */}
      <nav
        aria-label="Navigasi Utama"
        className="nav-link-row absolute top-0 left-1/2 pointer-events-auto flex items-center justify-center h-16"
        style={{
          contain: "layout paint",
          willChange: "transform",
          transition: prefersReducedMotion
            ? "none"
            : "transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          transform: isScrolled
            ? "translateX(-50%) translateY(12px)"
            : "translateX(-50%) translateY(0px)",
        }}
      >
        <div
          ref={linkRowRef}
          className="flex items-center gap-[12px] sm:gap-[20px] lg:gap-[28px]"
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
                {/* (d) The sliding translucent pill for the active link (36px high, rgba(255,255,255,0.22)) */}
                {isActive && (
                  <motion.div
                    layoutId="nav-active-pill"
                    data-active-pill="true"
                    className="nav-active-pill absolute inset-0 rounded-full pointer-events-none"
                    style={{ backgroundColor: "rgba(255, 255, 255, 0.22)" }}
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 32,
                    }}
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
