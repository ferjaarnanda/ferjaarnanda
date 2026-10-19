"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { packages, PackageItem } from "@/data/packages";
import { siteConfig } from "@/data/site";

interface PaketSectionProps {
  onSelectPackage?: (pkg: PackageItem) => void;
}

export default function PaketSection({ onSelectPackage }: PaketSectionProps) {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const whatsappPhone = siteConfig.contacts.whatsappNumber.replace(/[^0-9]/g, "");

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    let inViewport = true;
    let tabHidden = document.hidden;

    const updatePause = () => {
      setIsPaused(!inViewport || tabHidden);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          inViewport = entry.isIntersecting;
        }
        updatePause();
      },
      { threshold: 0.01 }
    );
    observer.observe(el);

    const handleVisibility = () => {
      tabHidden = document.hidden;
      updatePause();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Synchronize mobile snap-scroll dots using scrollsnapchange with IntersectionObserver fallback
  useEffect(() => {
    const scroller = carouselRef.current;
    if (!scroller) return;

    const cards = Array.from(
      scroller.querySelectorAll<HTMLElement>("[data-card-index]")
    );
    if (cards.length === 0) return;

    if ("onscrollsnapchange" in HTMLElement.prototype) {
      const onSnapChange = (e: Event) => {
        const snapEvent = e as Event & { snapTargetInline?: Element | null };
        const target = snapEvent.snapTargetInline as HTMLElement | null;
        if (target && target.dataset.cardIndex !== undefined) {
          setActiveCardIndex(Number(target.dataset.cardIndex));
        }
      };
      scroller.addEventListener("scrollsnapchange", onSnapChange);
      return () => scroller.removeEventListener("scrollsnapchange", onSnapChange);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idxAttr = (entry.target as HTMLElement).dataset.cardIndex;
            if (idxAttr !== undefined) {
              setActiveCardIndex(Number(idxAttr));
            }
          }
        }
      },
      { root: scroller, threshold: 0.6 }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  const getWhatsAppUrl = (pkg: PackageItem) => {
    let message = "";
    if (pkg.id === "custom-class") {
      message =
        "Halo, saya tertarik dengan paket Custom Class. Saya mau diskusi spesifikasi website.";
    } else {
      message = `Halo, saya tertarik dengan paket ${pkg.name} (${pkg.price}). Bisa konsultasi lebih lanjut?`;
    }
    return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
  };

  const scrollToCard = (index: number) => {
    const el = carouselRef.current;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLElement>("[data-card-index]");
    if (cards[index]) {
      cards[index].scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
      setActiveCardIndex(index);
    }
  };

  const handleCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const cardEl = el.querySelector<HTMLElement>("[data-card-index]");
    if (!cardEl) return;
    const cardWidth = cardEl.offsetWidth + 24;
    const index = Math.min(
      Math.max(Math.round(scrollLeft / cardWidth), 0),
      packages.length - 1
    );
    setActiveCardIndex(index);
  };

  return (
    <section
      ref={sectionRef}
      id="paket"
      data-paused={isPaused ? "true" : "false"}
      aria-labelledby="paket-heading"
      className="mario-zone w-full relative bg-[#5C94FC] select-none"
    >
      {/* Top Divider Row of tile-brick.png (integer scale 4 = 64px) */}
      <div
        className="w-full border-b-4 border-[#2B1B0E]"
        style={{
          height: "64px",
          backgroundImage: "url('/environment/tile-brick.png')",
          backgroundRepeat: "repeat-x",
          backgroundSize: "64px 64px",
          imageRendering: "pixelated",
        }}
        aria-hidden="true"
      />

      {/* Main Content Container */}
      <div className="w-full max-w-[1200px] mx-auto px-0 lg:px-6 py-14 md:py-20 flex flex-col items-center">
        {/* Section Title Box */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-10 md:mb-14 text-center px-5"
        >
          <h2
            id="paket-heading"
            className="text-lg sm:text-2xl md:text-3xl font-bold text-obsidian tracking-tight bg-white px-7 sm:px-10 py-3 sm:py-4 inline-block rounded-none border-4 border-[#2B1B0E] [box-shadow:6px_6px_0px_#2B1B0E]"
            style={{ fontFamily: "var(--font-press-start-2p)" }}
          >
            Kategori Jasa
          </h2>
        </motion.div>

        {/* Single 5-Card Container:
            - Desktop (>=1024px): 6-column CSS grid, grid-auto-rows: 1fr, span 2 per card, cards 4 & 5 at cols 2/span 2 and 4/span 2
            - Mobile (<1024px): Horizontal snap-scroll flex row with fixed 300px cards and align-items: stretch */}
        <div
          ref={carouselRef}
          onScroll={handleCarouselScroll}
          className="paket-cards-grid"
        >
          {packages.map((pkg, idx) => {
            const waUrl = getWhatsAppUrl(pkg);

            return (
              <div
                key={pkg.id}
                data-card-index={idx}
                className="coin-card group select-none"
              >
                {/* BEST Corner Ribbon for Semi Pro Class (does NOT raise or enlarge card) */}
                {pkg.badge && (
                  <div
                    className="absolute -top-3.5 -right-3.5 z-20 bg-primary text-white text-[11px] font-bold px-3 py-1 border-2 border-[#2B1B0E] [box-shadow:2px_2px_0px_#2B1B0E] rounded-none"
                    style={{ fontFamily: "var(--font-press-start-2p)" }}
                  >
                    {pkg.badge}
                  </div>
                )}

                {/* (1) Bordered COIN WINDOW (fixed 240px height, full card inner width) with real sky & drifting clouds */}
                <div className="coin-window mario-sky-bands overflow-hidden relative flex flex-col items-center justify-center pt-[4px] select-none">
                  {/* Drifting Clouds (integer scales of cloud-xs 34x26 and cloud-s 44x30, wrapping inside window) */}
                  <img
                    src="/environment/cloud-xs.png"
                    alt=""
                    width={68}
                    height={52}
                    className="cloud-drift-1 pixel-art absolute left-0 pointer-events-none opacity-95"
                    style={{
                      width: 68,
                      height: 52,
                      top: "10%",
                      animationDelay: `${-3.2 - idx * 2.5}s`,
                    }}
                    aria-hidden="true"
                  />
                  <img
                    src="/environment/cloud-s.png"
                    alt=""
                    width={44}
                    height={30}
                    className="cloud-drift-2 pixel-art absolute left-0 pointer-events-none opacity-90"
                    style={{
                      width: 44,
                      height: 30,
                      top: "46%",
                      animationDelay: `${-9.5 - idx * 3.8}s`,
                    }}
                    aria-hidden="true"
                  />
                  <img
                    src="/environment/cloud-xs.png"
                    alt=""
                    width={34}
                    height={26}
                    className="cloud-drift-3 pixel-art absolute left-0 pointer-events-none opacity-85"
                    style={{
                      width: 34,
                      height: 26,
                      top: "72%",
                      animationDelay: `${-6.1 - idx * 2.8}s`,
                    }}
                    aria-hidden="true"
                  />

                  {/* 24-Frame Rotating Coin (spin24-{coin}.png, 27x35 per frame, --s:6 desktop / 4 mobile, 1.2s steps(24)) */}
                  <div
                    className="coin relative z-10 cursor-pointer"
                    style={{
                      backgroundImage: `url(${pkg.coinSpinImage})`,
                      animationDelay: `${-idx * 0.24}s`,
                    }}
                    aria-label={`${pkg.name} coin`}
                  />

                  {/* Flat hard-edged oval shadow rgba(43,27,14,0.28) under the coin */}
                  <div
                    className="coin-shadow relative z-10 mt-[2px]"
                    aria-hidden="true"
                  />
                </div>

                {/* (2) Tier Name in Press Start 2P */}
                <h3
                  className="mt-5 min-h-[44px] flex items-center justify-center text-center text-[13px] sm:text-sm md:text-[15px] text-obsidian tracking-wider leading-relaxed"
                  style={{ fontFamily: "var(--font-press-start-2p)" }}
                >
                  {pkg.name}
                </h3>

                {/* (3) Price */}
                <div className="mt-3 text-center">
                  <span className="text-xl sm:text-2xl text-obsidian font-bold">
                    {pkg.price}
                  </span>
                </div>

                {/* (4) Renewal Price (muted) */}
                <div className="text-center mt-1 min-h-[20px]">
                  <p className="text-xs sm:text-sm text-muted">
                    {pkg.renewalPrice || "\u00A0"}
                  </p>
                </div>

                {/* Thin Divider */}
                <div className="w-full h-px bg-rule my-4 shrink-0" />

                {/* (5) Spec List with small pixel check marks (flex: 1) */}
                <ul className="flex flex-col gap-2.5 flex-1 text-xs sm:text-sm text-obsidian mb-6">
                  {pkg.features.map((feature, fIdx) => (
                    <li
                      key={fIdx}
                      className="flex items-start gap-2.5 leading-snug"
                    >
                      <span className="shrink-0 mt-0.5" aria-hidden="true">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          className="block"
                          style={{ imageRendering: "pixelated" }}
                        >
                          <rect x="9" y="2" width="2" height="2" fill="#059669" />
                          <rect x="7" y="4" width="2" height="2" fill="#059669" />
                          <rect x="5" y="6" width="2" height="2" fill="#059669" />
                          <rect x="3" y="8" width="2" height="2" fill="#059669" />
                          <rect x="1" y="6" width="2" height="2" fill="#059669" />
                        </svg>
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* (6) Red Button pinned to the bottom (margin-top: auto) */}
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onSelectPackage?.(pkg)}
                  className="btn-primary w-full text-center text-sm font-medium mt-auto shrink-0 no-underline"
                >
                  {pkg.ctaText}
                </a>
              </div>
            );
          })}
        </div>

        {/* Mobile Dots Indicator (5 dots) */}
        <div
          className="flex lg:hidden items-center justify-center gap-2.5 mt-4"
          role=" group"
          aria-label="Indikator kartu paket"
        >
          {packages.map((pkg, idx) => (
            <button
              key={pkg.id}
              type="button"
              onClick={() => scrollToCard(idx)}
              aria-label={`Lihat paket ${pkg.name}`}
              aria-current={activeCardIndex === idx ? "true" : undefined}
              className={`w-3 h-3 rounded-none border-2 border-[#2B1B0E] transition-all cursor-pointer ${
                activeCardIndex === idx
                  ? "bg-white [box-shadow:2px_2px_0px_#2B1B0E]"
                  : "bg-[#2B1B0E]/40"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Divider Row of tile-brick.png (integer scale 4 = 64px) */}
      <div
        className="w-full border-t-4 border-[#2B1B0E]"
        style={{
          height: "64px",
          backgroundImage: "url('/environment/tile-brick.png')",
          backgroundRepeat: "repeat-x",
          backgroundSize: "64px 64px",
          imageRendering: "pixelated",
        }}
        aria-hidden="true"
      />
    </section>
  );
}
