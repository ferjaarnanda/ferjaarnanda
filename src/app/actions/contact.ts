"use server";

import { Resend } from "resend";
import { headers } from "next/headers";
import { EMAIL, whatsappLink } from "@/data/contact";
import { contactSchema, ContactFormData } from "@/lib/contact-schema";

export type ContactState = {
  success: boolean;
  state?: "success" | "no-key" | "send-failed" | "validation-error";
  error?: string;
  fieldErrors?: Record<string, string>;
  waUrl?: string;
  mailtoUrl?: string;
};

// Simple rate limiter: IP -> timestamps
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 5;

  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= maxRequests) {
    return true;
  }

  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

export async function sendContactMessage(
  payload: FormData | ContactFormData
): Promise<ContactState> {
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "127.0.0.1";

  if (isRateLimited(ip)) {
    return {
      success: false,
      state: "send-failed",
      error:
        "Terlalu banyak permintaan. Silakan coba lagi beberapa saat lagi atau hubungi via WhatsApp.",
      waUrl: whatsappLink(),
      mailtoUrl: `mailto:${EMAIL}`,
    };
  }

  let raw: ContactFormData;
  if (payload instanceof FormData) {
    raw = {
      nama: payload.get("nama")?.toString() || "",
      email: payload.get("email")?.toString() || "",
      jenis: payload.get("jenis")?.toString() || "",
      customJenis: payload.get("customJenis")?.toString() || "",
      pesan: payload.get("pesan")?.toString() || "",
      _hp: payload.get("_hp")?.toString() || "",
    };
  } else {
    raw = {
      nama: payload.nama || "",
      email: payload.email || "",
      jenis: payload.jenis || "",
      customJenis: payload.customJenis || "",
      pesan: payload.pesan || "",
      _hp: payload._hp || "",
    };
  }

  // Honeypot check
  if (raw._hp && raw._hp.length > 0) {
    return {
      success: false,
      state: "validation-error",
      error: "Spam terdeteksi.",
    };
  }

  // Server-side Zod validation
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const fieldName = issue.path[0] as string;
      if (!fieldErrors[fieldName]) {
        fieldErrors[fieldName] = issue.message;
      }
    });
    const firstError = parsed.error.issues[0]?.message || "Data formulir tidak valid";
    return {
      success: false,
      state: "validation-error",
      error: firstError,
      fieldErrors,
    };
  }

  const { nama, email, jenis, customJenis, pesan } = parsed.data;
  const jenisWebsite = jenis === "Lainnya" && customJenis ? customJenis : jenis;
  const trimmedPesan = (pesan || "").trim();
  const pesanFormatted =
    !trimmedPesan || trimmedPesan === "-" ? "(tidak ada pesan)" : trimmedPesan;

  // Prefilled WhatsApp URL as fallback
  const waMessage = `Halo Ferja Arnanda, perkenalkan saya ${nama} (${email}). Saya tertarik dengan: ${jenisWebsite}.\n\nPesan:\n${pesanFormatted}`;
  const waUrl = whatsappLink(waMessage);

  // Prefilled Mailto URL as fallback
  const mailtoSubject = encodeURIComponent(jenisWebsite);
  const mailtoBody = encodeURIComponent(
    `Nama: ${nama}\nEmail: ${email}\nJenis Website: ${jenisWebsite}\n\nPesan:\n${pesanFormatted}`
  );
  const mailtoUrl = `mailto:${EMAIL}?subject=${mailtoSubject}&body=${mailtoBody}`;

  const resendApiKey = process.env.RESEND_API_KEY;

  // Missing or empty API key: log and return 'no-key'
  if (!resendApiKey || resendApiKey.trim().length === 0) {
    console.error("[contact] RESEND_API_KEY is not set");
    return {
      success: false,
      state: "no-key",
      error: "Layanan email otomatis sedang tidak aktif.",
      waUrl,
      mailtoUrl,
    };
  }

  try {
    const resend = new Resend(resendApiKey.trim());
    const safeName = nama.replace(/[<>"'\r\n]/g, "").trim() || "Pengunjung";
    const fromAddress = `${safeName} <onboarding@resend.dev>`;

    const textBody = `Nama: ${nama}\nEmail: ${email}\nJenis Website: ${jenisWebsite}\n\nPesan:\n${pesanFormatted}`;
    const htmlBody = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #111;">
        <p><strong>Nama:</strong> ${nama}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Jenis Website:</strong> ${jenisWebsite}</p>
        <br />
        <p><strong>Pesan:</strong></p>
        <p style="white-space: pre-wrap; background: #f9f9f9; padding: 12px; border-radius: 6px;">${pesanFormatted}</p>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: fromAddress,
      to: [EMAIL],
      replyTo: email,
      subject: jenisWebsite,
      text: textBody,
      html: htmlBody,
    });

    if (error) {
      console.error("[contact] Resend error:", error);
      return {
        success: false,
        state: "send-failed",
        error: "Pesan belum terkirim. Coba lagi sebentar.",
        waUrl,
        mailtoUrl,
      };
    }

    return {
      success: true,
      state: "success",
    };
  } catch (err) {
    console.error("[contact] Resend error:", err);
    return {
      success: false,
      state: "send-failed",
      error: "Pesan belum terkirim. Coba lagi sebentar.",
      waUrl,
      mailtoUrl,
    };
  }
}
