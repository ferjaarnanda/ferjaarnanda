"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { workflowSteps } from "@/data/workflow";
import { faqs } from "@/data/faq";

export default function AlurFaqSection() {
  const [openFaq, setOpenFaq] = useState<string>("harga");

  const toggleFaq = (id: string) => {
    setOpenFaq((prev) => (prev === id ? "" : id));
  };

  return (
    <section
      id="alur-faq"
      className="w-full bg-white border-t border-rule py-16 md:py-24"
    >
      <div className="w-full max-w-[1200px] mx-auto px-5 lg:px-6">
        {/* =========================================================
            SECTION 1: Alur Kerja
            ========================================================= */}
        <div className="mb-20 md:mb-24">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-obsidian mb-10 md:mb-12">
            Alur Kerja
          </h2>

          {/* Desktop: five steps in a horizontal row */}
          <div className="hidden md:grid grid-cols-5 gap-8">
            {workflowSteps.map((step) => (
              <div key={step.step} className="flex flex-col">
                {/* 28px small circle, 1px light gray border, dark number, NO red */}
                <div className="w-[28px] h-[28px] rounded-full border border-[#E5E7EB] text-obsidian flex items-center justify-center text-xs font-semibold mb-3.5 bg-white">
                  {step.step}
                </div>
                <h3 className="font-bold text-obsidian text-base mb-1.5">
                  {step.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          {/* Mobile: vertical list, circle left, title 16px bold & desc 14px muted (lh 1.5) right,
              joined by a thin 1px vertical gray line, 24px between steps */}
          <div className="flex md:hidden flex-col relative">
            {workflowSteps.map((step, idx) => {
              const isLast = idx === workflowSteps.length - 1;
              return (
                <div key={step.step} className="relative flex items-start gap-4">
                  {/* Connecting 1px vertical line */}
                  {!isLast && (
                    <div
                      className="absolute left-[13px] top-[28px] w-px bg-[#E5E7EB]"
                      style={{ bottom: "-24px" }}
                      aria-hidden="true"
                    />
                  )}

                  {/* 28px Circle on Left */}
                  <div className="w-[28px] h-[28px] rounded-full border border-[#E5E7EB] text-obsidian flex items-center justify-center text-xs font-semibold bg-white shrink-0 z-10">
                    {step.step}
                  </div>

                  {/* Title & Description on Right (24px bottom margin between steps) */}
                  <div className={`flex flex-col ${isLast ? "pb-0" : "pb-6"}`}>
                    <h3 className="text-base font-bold text-obsidian">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted leading-[1.5] mt-1">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* =========================================================
            SECTION 2: FAQ Accessible Accordion
            Cards white with 1px border, radius 10px, padding 16px, gap 12px,
            question 15px medium, small gray chevron that rotates,
            smooth height animation, first item open, thin divider above answer.
            ========================================================= */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-obsidian mb-8 md:mb-10">
            FAQ
          </h2>

          <div className="max-w-3xl flex flex-col gap-3">
            {faqs.map((faq) => {
              const isOpen = openFaq === faq.id;
              const contentId = `faq-answer-${faq.id}`;

              return (
                <div
                  key={faq.id}
                  className="bg-white border border-[#E5E7EB] rounded-[10px] p-4 transition-colors"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={contentId}
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full flex justify-between items-center text-left cursor-pointer group focus-visible:outline-2 focus-visible:outline-primary rounded-[6px]"
                  >
                    <span className="text-[15px] font-medium text-obsidian pr-4">
                      {faq.question}
                    </span>

                    {/* Small gray chevron that rotates */}
                    <svg
                      className={`w-4 h-4 text-muted shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={contentId}
                        role="region"
                        aria-labelledby={`faq-header-${faq.id}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        {/* Thin divider above the answer */}
                        <div className="pt-3 border-t border-rule mt-3">
                          <p className="text-sm text-muted leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
