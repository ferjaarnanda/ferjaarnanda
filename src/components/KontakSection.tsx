"use client";

import { useActionState, useEffect, useState } from "react";
import { siteConfig } from "@/data/site";
import { services } from "@/data/services";
import { sendContactMessage, ContactState } from "@/app/actions/contact";

interface KontakSectionProps {
  initialService?: string;
}

const WEBSITE_TYPES = [
  ...services.map((s) => s.title),
  "Lainnya",
];

export default function KontakSection({ initialService }: KontakSectionProps) {
  const [state, formAction, isPending] = useActionState<ContactState | null, FormData>(
    sendContactMessage,
    null
  );

  const [selectedService, setSelectedService] = useState(initialService || "");

  useEffect(() => {
    if (initialService) {
      // Find matching service title if initialService contains a tier name or description
      const matched = WEBSITE_TYPES.find((t) => initialService.includes(t));
      if (matched) {
        setSelectedService(matched);
      } else {
        setSelectedService(initialService);
      }
    }
  }, [initialService]);

  return (
    <section
      id="kontak"
      aria-labelledby="kontak-heading"
      className="w-full bg-white border-t border-rule py-16 md:py-24"
    >
      <div className="w-full max-w-[1200px] mx-auto px-5 lg:px-6">
        <h2
          id="kontak-heading"
          className="text-2xl sm:text-3xl font-bold tracking-tight text-obsidian mb-10 md:mb-14"
        >
          Hubungi Aku
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left Column: Direct Links & Info */}
          <div className="flex flex-col">
            <p className="text-base sm:text-lg text-muted mb-8 leading-relaxed">
              Ceritakan kebutuhan websitemu, kita diskusikan bersama.
            </p>

            {/* Red WhatsApp button & White Outlined Gmail button */}
            <div className="flex flex-wrap items-center gap-4 mb-10">
              {/* WhatsApp Button (solid red, white text, 10px radius) */}
              <a
                href={siteConfig.contacts.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary px-6 text-sm font-medium no-underline"
              >
                WhatsApp
              </a>

              {/* Gmail Button (white, 1px red border, red text, 10px radius) */}
              <a
                href={siteConfig.contacts.gmailUrl}
                className="btn-secondary px-6 text-sm font-medium no-underline"
              >
                Gmail
              </a>
            </div>

            {/* Small Text Links: GitHub, LinkedIn, Instagram */}
            <div className="flex flex-row items-center gap-6 text-sm text-muted">
              <a
                href={siteConfig.contacts.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-obsidian transition-colors underline-offset-4 hover:underline"
              >
                GitHub
              </a>

              <a
                href={siteConfig.contacts.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-obsidian transition-colors underline-offset-4 hover:underline"
              >
                LinkedIn
              </a>

              <a
                href={siteConfig.contacts.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-obsidian transition-colors underline-offset-4 hover:underline"
              >
                Instagram
              </a>
            </div>
          </div>

          {/* Right Column: Server Action Form */}
          <div className="flex flex-col">
            {state?.success ? (
              <div
                role="status"
                aria-live="polite"
                className="p-6 bg-emerald-50 border border-emerald-200 rounded-[10px] text-emerald-900 flex flex-col gap-3"
              >
                <div className="font-semibold text-base">Pesan Berhasil Terkirim!</div>
                <p className="text-sm leading-relaxed">
                  Terima kasih sudah menghubungi. Aku akan meninjau kebutuhan websitemu dan segera membalas ke emailmu.
                </p>
                <a
                  href={siteConfig.contacts.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-emerald-800 underline underline-offset-2 mt-2"
                >
                  Atau mau respons cepat via WhatsApp? Klik di sini &rarr;
                </a>
              </div>
            ) : (
              <form action={formAction} className="flex flex-col gap-5">
                {/* Error Banner with Graceful WhatsApp Fallback */}
                {state?.error && (
                  <div
                    role="alert"
                    className="p-4 bg-amber-50 border border-amber-300 rounded-[10px] text-amber-900 text-sm flex flex-col gap-2"
                  >
                    <span>{state.error}</span>
                    {state.fallbackToWa && state.waUrl && (
                      <a
                        href={state.waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary underline underline-offset-2"
                      >
                        Buka percakapan langsung via WhatsApp &rarr;
                      </a>
                    )}
                  </div>
                )}

                {/* Hidden Honeypot for Spam Protection */}
                <input
                  type="text"
                  name="_hp"
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                  aria-hidden="true"
                />

                {/* Nama */}
                <div className="flex flex-col">
                  <label
                    htmlFor="nama"
                    className="text-xs uppercase font-medium tracking-wider text-obsidian mb-1.5"
                  >
                    Nama
                  </label>
                  <input
                    id="nama"
                    name="nama"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Nama lengkap"
                    className="w-full bg-white border border-[#E5E7EB] rounded-[10px] p-3 text-sm text-obsidian placeholder-muted focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                {/* Email */}
                <div className="flex flex-col">
                  <label
                    htmlFor="email"
                    className="text-xs uppercase font-medium tracking-wider text-obsidian mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="nama@email.com"
                    className="w-full bg-white border border-[#E5E7EB] rounded-[10px] p-3 text-sm text-obsidian placeholder-muted focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                {/* Jenis Website (The six types + "Lainnya") */}
                <div className="flex flex-col">
                  <label
                    htmlFor="jenis"
                    className="text-xs uppercase font-medium tracking-wider text-obsidian mb-1.5"
                  >
                    Jenis Website
                  </label>
                  <div className="relative">
                    <select
                      id="jenis"
                      name="jenis"
                      required
                      value={selectedService}
                      onChange={(e) => setSelectedService(e.target.value)}
                      className="w-full bg-white border border-[#E5E7EB] rounded-[10px] p-3 text-sm text-obsidian focus:border-primary focus:outline-none transition-colors appearance-none cursor-pointer"
                    >
                      <option value="" disabled>
                        Pilih Jenis Website
                      </option>
                      {WEBSITE_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>

                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted">
                      <svg
                        className="w-4 h-4 fill-current"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Pesan */}
                <div className="flex flex-col">
                  <label
                    htmlFor="pesan"
                    className="text-xs uppercase font-medium tracking-wider text-obsidian mb-1.5"
                  >
                    Pesan
                  </label>
                  <textarea
                    id="pesan"
                    name="pesan"
                    rows={4}
                    required
                    placeholder="Tuliskan deskripsi atau kebutuhan websitemu..."
                    className="w-full bg-white border border-[#E5E7EB] rounded-[10px] p-3 text-sm text-obsidian placeholder-muted focus:border-primary focus:outline-none transition-colors resize-none"
                  />
                </div>

                {/* Red "Kirim" Button */}
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary w-full text-center text-sm font-medium mt-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isPending ? "Mengirim..." : "Kirim"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
