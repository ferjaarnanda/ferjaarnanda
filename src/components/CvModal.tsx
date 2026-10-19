"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CV_PATH } from "@/data/site";

interface CvModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CvModal({ isOpen, onClose }: CvModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus close button initially
    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    // Focus trap & Escape listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cv-modal-title"
        >
          {/* Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40"
            aria-hidden="true"
          />

          {/* Centered Modal Card */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2 }}
            className="relative bg-white rounded-lg shadow-2xl p-4 sm:p-6 flex flex-col items-center w-full max-w-[360px] sm:max-w-[560px] max-h-[92vh] z-10 border border-rule"
          >
            {/* Small close "X" in top right corner of modal */}
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 text-obsidian hover:text-primary p-1.5 rounded transition-colors focus-visible:outline-2 focus-visible:outline-primary cursor-pointer"
              aria-label="Tutup modal CV"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {/* Modal Title (visually accessible) */}
            <h2 id="cv-modal-title" className="text-base font-bold text-obsidian mb-3 self-start pr-8">
              Hayoo penasaran yaaa 
            </h2>

            {/* Document Page inside modal with <object> and fallback */}
            <div className="w-full flex-1 min-h-[380px] sm:min-h-[580px] bg-white border border-rule shadow-sm rounded-sm overflow-hidden flex flex-col">
              <object
                data={`${CV_PATH}#toolbar=0`}
                type="application/pdf"
                className="w-full h-full min-h-[380px] sm:min-h-[580px] flex-1"
                aria-label="Pratinjau CV Ferja Arnanda"
              >
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <p className="text-sm text-muted mb-4">
                    Pratinjau PDF tidak didukung di peramban ini. Anda dapat mengunduh dokumen secara langsung:
                  </p>
                  <a
                    href={CV_PATH}
                    download="FerjaArnanda_CV.pdf"
                    className="btn-primary text-sm px-5"
                  >
                    Download FerjaArnanda_CV.pdf
                  </a>
                </div>
              </object>
            </div>

            {/* Direct download toolbar button */}
            <div className="mt-3 flex items-center justify-end w-full gap-3 pt-2">
              <a
                href={CV_PATH}
                download="FerjaArnanda_CV.pdf"
                className="btn-primary text-xs sm:text-sm px-5 h-[38px] min-h-[38px]"
              >
                Download PDF
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
