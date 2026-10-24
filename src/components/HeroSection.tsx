"use client";

import { motion } from "framer-motion";
import { CV_PATH } from "@/data/site";

interface HeroSectionProps {
  onOpenCv: () => void;
}

export default function HeroSection({ onOpenCv }: HeroSectionProps) {
  return (
    <section
      id="home"
      className="w-full max-w-[1200px] mx-auto px-5 sm:px-6 pt-28 sm:pt-36 pb-20 sm:pb-28 scroll-mt-[96px] md:scroll-mt-[112px]"
    >
      <div className="max-w-3xl">
        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-[28px] sm:text-5xl font-bold tracking-tight text-obsidian leading-[1.25] sm:leading-[1.18] mb-4 sm:mb-6 max-w-[320px] sm:max-w-none"
        >
          Jasa Pembuatan Website untuk Segala Kebutuhan
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06, ease: "easeOut" }}
          className="text-[15px] sm:text-lg text-muted font-normal leading-[1.6] sm:leading-relaxed mb-7 sm:mb-10 max-w-[65ch]"
        >
          Dari toko online, company profile, blog, sistem reservasi, sampai sistem cashier dan sistem lainnya.
        </motion.p>

        {/* Two Buttons Row: side-by-side, left-aligned, content-sized on both mobile & desktop */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: "easeOut" }}
          className="flex flex-row items-center gap-3 sm:gap-4"
        >
          <button
            type="button"
            onClick={onOpenCv}
            className="btn-primary text-sm sm:text-base px-6 sm:px-7 whitespace-nowrap cursor-pointer"
          >
            View CV
          </button>
          <a
            href={CV_PATH}
            download="FerjaArnanda_CV.pdf"
            className="btn-secondary text-sm sm:text-base px-6 sm:px-7 whitespace-nowrap"
          >
            Download CV
          </a>
        </motion.div>
      </div>
    </section>
  );
}
