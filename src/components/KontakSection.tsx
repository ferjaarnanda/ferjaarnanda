"use client";

import { useEffect, useState, useRef } from "react";
import { siteConfig } from "@/data/site";
import { EMAIL, whatsappLink, MAILTO } from "@/data/contact";
import { services } from "@/data/services";
import { sendContactMessage } from "@/app/actions/contact";
import { contactSchema, ContactFormData } from "@/lib/contact-schema";

interface KontakSectionProps {
  initialService?: string;
}

const WEBSITE_TYPES = [
  ...services.map((s) => s.title),
  "Lainnya",
];

// Official brand icons (simple-icons, currentColor, inline SVG)
function WhatsappIcon({ className = "w-[18px] h-[18px]" }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function GmailIcon({ className = "w-[18px] h-[18px]" }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
    </svg>
  );
}

function GithubIcon({ className = "w-[18px] h-[18px]" }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function LinkedinIcon({ className = "w-[18px] h-[18px]" }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}

function InstagramIcon({ className = "w-[18px] h-[18px]" }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077" />
    </svg>
  );
}

// Filter out placeholder or empty social URLs (hide until real URLs provided)
function isValidSocialUrl(url?: string): boolean {
  if (!url) return false;
  const u = url.trim().toLowerCase();
  if (u === "" || u === "#") return false;
  if (u.includes("placeholder") || u.includes("yourusername") || u.includes("username")) {
    return false;
  }
  return true;
}

export default function KontakSection({ initialService }: KontakSectionProps) {
  // Controlled form state (typed text is NEVER cleared on error)
  const [formData, setFormData] = useState<ContactFormData>({
    nama: "",
    email: "",
    jenis: "",
    customJenis: "",
    pesan: "",
    _hp: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverWaUrl, setServerWaUrl] = useState<string | null>(null);
  const [serverMailtoUrl, setServerMailtoUrl] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Focus refs for the first invalid field
  const namaRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const jenisRef = useRef<HTMLSelectElement>(null);
  const customJenisRef = useRef<HTMLInputElement>(null);
  const pesanRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (initialService) {
      const matched = WEBSITE_TYPES.find((t) => initialService.includes(t));
      const val = matched || initialService;
      setFormData((prev) => ({ ...prev, jenis: val }));
    }
  }, [initialService]);

  // Validate a single field on blur or change
  const validateSingleField = (name: keyof ContactFormData, value: string): string => {
    const trimmed = value.trim();
    if (name === "nama") {
      if (!trimmed) return "Belum diisi";
    }
    if (name === "email") {
      if (!trimmed) return "Belum diisi";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) return "Format email tidak valid";
    }
    if (name === "jenis") {
      if (!trimmed) return "Belum diisi";
    }
    if (name === "customJenis") {
      if (formData.jenis === "Lainnya" && !trimmed) return "Belum diisi";
      if (trimmed.length > 80) return "Maksimal 80 karakter";
    }
    if (name === "pesan") {
      // Optional field: no validation error
      return "";
    }
    return "";
  };

  const handleBlur = (field: keyof ContactFormData) => {
    const errorMsg = validateSingleField(field, formData[field] || "");
    setFieldErrors((prev) => {
      const updated = { ...prev };
      if (errorMsg) {
        updated[field] = errorMsg;
      } else {
        delete updated[field];
      }
      return updated;
    });
  };

  const handleChange = (field: keyof ContactFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // If the field had an error, clear or re-validate as user types
    if (fieldErrors[field]) {
      const errorMsg = validateSingleField(field, value);
      setFieldErrors((prev) => {
        const updated = { ...prev };
        if (errorMsg) {
          updated[field] = errorMsg;
        } else {
          delete updated[field];
        }
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessNotice(false);

    // Client-side Zod validation
    const parsed = contactSchema.safeParse(formData);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as string;
        if (!errors[fieldName]) {
          errors[fieldName] = issue.message;
        }
      });
      setFieldErrors(errors);

      // Focus the first invalid field
      if (errors.nama) {
        namaRef.current?.focus();
      } else if (errors.email) {
        emailRef.current?.focus();
      } else if (errors.jenis) {
        jenisRef.current?.focus();
      } else if (errors.customJenis) {
        customJenisRef.current?.focus();
      }
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const res = await sendContactMessage(formData);
      if (res.success) {
        setSuccessNotice(true);
        if (successTimerRef.current) clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(() => {
          setSuccessNotice(false);
        }, 5000);

        // Clear form only on success so it is ready for another message
        setFormData({
          nama: "",
          email: "",
          jenis: "",
          customJenis: "",
          pesan: "",
          _hp: "",
        });
      } else {
        // Keep all typed values intact on error!
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
        }
        setServerError(res.error || "Pesan belum terkirim. Coba lagi sebentar.");
        setServerWaUrl(res.waUrl || whatsappLink());
        setServerMailtoUrl(res.mailtoUrl || `mailto:${EMAIL}`);
      }
    } catch {
      setServerError("Pesan belum terkirim. Coba lagi sebentar.");
      setServerWaUrl(whatsappLink());
      setServerMailtoUrl(`mailto:${EMAIL}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Social links (hide any with empty or placeholder URLs)
  const socialItems = [
    { name: "GitHub", url: siteConfig.contacts.githubUrl, icon: GithubIcon },
    { name: "LinkedIn", url: siteConfig.contacts.linkedinUrl, icon: LinkedinIcon },
    { name: "Instagram", url: siteConfig.contacts.instagramUrl, icon: InstagramIcon },
  ].filter((item) => isValidSocialUrl(item.url));

  return (
    <section
      id="kontak"
      aria-labelledby="kontak-heading"
      className="w-full bg-white border-t border-rule py-16 md:py-24 scroll-mt-[96px] md:scroll-mt-[112px]"
    >
      <div className="w-full max-w-[1200px] mx-auto px-5 lg:px-6">
        <h2
          id="kontak-heading"
          className="text-2xl sm:text-3xl font-bold tracking-tight text-obsidian mb-10 md:mb-14 scroll-mt-[96px] md:scroll-mt-[112px]"
        >
          Hubungi Aku
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left Column: Info & Action Buttons */}
          <div className="flex flex-col">
            <p className="text-base sm:text-lg text-muted mb-8 leading-relaxed">
              Ceritakan kebutuhan websitemu, kita diskusikan bersama.
            </p>

            {/* Action Buttons: WhatsApp & Gmail with official brand icons */}
            <div className="flex flex-wrap items-center gap-4 mb-10">
              {/* WhatsApp Button (solid red, white text, 10px radius, official brand icon) */}
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-2.5 px-6 py-3 text-sm font-medium no-underline"
              >
                <WhatsappIcon className="w-[18px] h-[18px] fill-current shrink-0" />
                <span>WhatsApp</span>
              </a>

              {/* Gmail Button (white, 1px red border, red text, 10px radius, official brand icon) */}
              <a
                href={MAILTO}
                className="btn-secondary inline-flex items-center gap-2.5 px-6 py-3 text-sm font-medium no-underline"
              >
                <GmailIcon className="w-[18px] h-[18px] fill-current shrink-0" />
                <span>Gmail</span>
              </a>
            </div>

            {/* Social Links: GitHub, LinkedIn, Instagram (only rendered if URL is valid and non-placeholder) */}
            {socialItems.length > 0 && (
              <div className="flex flex-row flex-wrap items-center gap-6 text-sm text-muted">
                {socialItems.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.name}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 hover:text-obsidian transition-colors underline-offset-4 hover:underline"
                    >
                      <Icon className="w-[18px] h-[18px] fill-current shrink-0" />
                      <span>{social.name}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Controlled Contact Form */}
          <div className="flex flex-col">
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                {/* Hidden Honeypot for Spam Protection */}
                <input
                  type="text"
                  name="_hp"
                  value={formData._hp}
                  onChange={(e) => handleChange("_hp", e.target.value)}
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
                    ref={namaRef}
                    id="nama"
                    name="nama"
                    type="text"
                    value={formData.nama}
                    onChange={(e) => handleChange("nama", e.target.value)}
                    onBlur={() => handleBlur("nama")}
                    autoComplete="name"
                    placeholder="Nama lengkap"
                    className={`w-full bg-white rounded-[10px] p-3 text-sm text-obsidian placeholder-muted focus:outline-none transition-colors border ${
                      fieldErrors.nama
                        ? "border-[#E52521] focus:border-[#E52521]"
                        : "border-[#E5E7EB] focus:border-primary"
                    }`}
                  />
                  {fieldErrors.nama && (
                    <p className="text-xs text-[#E52521] mt-1.5 font-medium">
                      {fieldErrors.nama}
                    </p>
                  )}
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
                    ref={emailRef}
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    onBlur={() => handleBlur("email")}
                    autoComplete="email"
                    placeholder="nama@email.com"
                    className={`w-full bg-white rounded-[10px] p-3 text-sm text-obsidian placeholder-muted focus:outline-none transition-colors border ${
                      fieldErrors.email
                        ? "border-[#E52521] focus:border-[#E52521]"
                        : "border-[#E5E7EB] focus:border-primary"
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="text-xs text-[#E52521] mt-1.5 font-medium">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                {/* Jenis Website (The six types + "Lainnya") */}
                <div className="flex flex-col">
                  <label
                    htmlFor="jenis-website"
                    className="text-xs uppercase font-medium tracking-wider text-obsidian mb-1.5"
                  >
                    Jenis Website
                  </label>
                  <div className="relative">
                    <select
                      ref={jenisRef}
                      id="jenis-website"
                      name="jenis"
                      value={formData.jenis}
                      onChange={(e) => handleChange("jenis", e.target.value)}
                      onBlur={() => handleBlur("jenis")}
                      className={`w-full bg-white rounded-[10px] p-3 text-sm text-obsidian focus:outline-none transition-colors appearance-none cursor-pointer border ${
                        fieldErrors.jenis
                          ? "border-[#E52521] focus:border-[#E52521]"
                          : "border-[#E5E7EB] focus:border-primary"
                      }`}
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
                  {fieldErrors.jenis && (
                    <p className="text-xs text-[#E52521] mt-1.5 font-medium">
                      {fieldErrors.jenis}
                    </p>
                  )}

                  {/* Extra Required Text Input when "Lainnya" is selected */}
                  {formData.jenis === "Lainnya" && (
                    <div className="flex flex-col mt-3">
                      <input
                        ref={customJenisRef}
                        id="customJenis"
                        name="customJenis"
                        type="text"
                        maxLength={80}
                        value={formData.customJenis || ""}
                        onChange={(e) => handleChange("customJenis", e.target.value)}
                        onBlur={() => handleBlur("customJenis")}
                        placeholder="Tulis jenis website yang kamu mau"
                        className={`w-full bg-white rounded-[10px] p-3 text-sm text-obsidian placeholder-muted focus:outline-none transition-colors border ${
                          fieldErrors.customJenis
                            ? "border-[#E52521] focus:border-[#E52521]"
                            : "border-[#E5E7EB] focus:border-primary"
                        }`}
                      />
                      {fieldErrors.customJenis && (
                        <p className="text-xs text-[#E52521] mt-1.5 font-medium">
                          {fieldErrors.customJenis}
                        </p>
                      )}
                    </div>
                  )}
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
                    ref={pesanRef}
                    id="pesan"
                    name="pesan"
                    rows={4}
                    value={formData.pesan}
                    onChange={(e) => handleChange("pesan", e.target.value)}
                    onBlur={() => handleBlur("pesan")}
                    placeholder="Tuliskan deskripsi atau kebutuhan websitemu..."
                    className={`w-full bg-white rounded-[10px] p-3 text-sm text-obsidian placeholder-muted focus:outline-none transition-colors resize-none border ${
                      fieldErrors.pesan
                        ? "border-[#E52521] focus:border-[#E52521]"
                        : "border-[#E5E7EB] focus:border-primary"
                    }`}
                  />
                  {fieldErrors.pesan && (
                    <p className="text-xs text-[#E52521] mt-1.5 font-medium">
                      {fieldErrors.pesan}
                    </p>
                  )}
                </div>

                {/* Red "Kirim" Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full text-center text-sm font-medium mt-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Mengirim..." : "Kirim"}
                </button>

                {/* Short green success notice directly under Kirim button */}
                {successNotice && (
                  <p
                    role="status"
                    aria-live="polite"
                    className="text-sm font-medium text-emerald-600 py-1 transition-opacity duration-300"
                  >
                    Pesan berhasil dikirim
                  </p>
                )}

                {/* Red Error Message UNDER button (no top banner) with WhatsApp and Email fallback buttons */}
                {serverError && (
                  <div
                    role="alert"
                    className="p-3.5 bg-red-50 border border-[#E52521]/30 rounded-[10px] text-xs text-[#E52521] flex flex-col gap-2.5"
                  >
                    <span className="font-medium text-[13px]">{serverError}</span>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {serverWaUrl && (
                        <a
                          href={serverWaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E52521] text-white rounded-[6px] font-medium hover:bg-[#c91e1a] transition-colors"
                        >
                          <WhatsappIcon className="w-3.5 h-3.5 fill-current" />
                          <span>WhatsApp &rarr;</span>
                        </a>
                      )}
                      {serverMailtoUrl && (
                        <a
                          href={serverMailtoUrl}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E52521] text-[#E52521] rounded-[6px] font-medium hover:bg-red-50 transition-colors"
                        >
                          <GmailIcon className="w-3.5 h-3.5 fill-current" />
                          <span>Kirim lewat email &rarr;</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </form>
          </div>
        </div>
      </div>
    </section>
  );
}
