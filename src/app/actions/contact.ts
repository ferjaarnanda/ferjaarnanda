"use server";

import { Resend } from "resend";
import { headers } from "next/headers";
import { EMAIL, whatsappLink } from "@/data/contact";
import { contactSchema, ContactFormData } from "@/lib/contact-schema";

export type ContactState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  fallbackToWa?: boolean;
  waUrl?: string;
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
      error:
        "Terlalu banyak permintaan. Silakan coba lagi beberapa saat lagi atau hubungi via WhatsApp.",
      fallbackToWa: true,
      waUrl: whatsappLink(),
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
      error: firstError,
      fieldErrors,
    };
  }

  const { nama, email, jenis, customJenis, pesan } = parsed.data;
  const jenisWebsite = jenis === "Lainnya" && customJenis ? customJenis : jenis;

  // Prefilled WhatsApp URL as fallback
  const waMessage = `Halo Ferja Arnanda, perkenalkan saya ${nama} (${email}). Saya tertarik dengan: ${jenisWebsite}.\n\nPesan:\n${pesan}`;
  const waUrl = whatsappLink(waMessage);

  const resendApiKey = process.env.RESEND_API_KEY;

  // Graceful fallback if Resend API key is not configured
  if (!resendApiKey) {
    console.error("[contact] RESEND_API_KEY is not set");
    return {
      success: false,
      error:
        "Layanan email otomatis sedang tidak aktif. Silakan hubungi langsung melalui WhatsApp.",
      fallbackToWa: true,
      waUrl,
    };
  }

  try {
    const resend = new Resend(resendApiKey);
    const { error } = await resend.emails.send({
      from: "Ferja Arnanda <onboarding@resend.dev>",
      to: [EMAIL],
      replyTo: email,
      subject: `Pesan baru dari ${nama} - ${jenisWebsite}`,
      text: `Nama: ${nama}\nEmail: ${email}\nJenis Website: ${jenisWebsite}\n\nPesan:\n${pesan}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #111;">
          <h2>Pesan Baru dari Formulir Kontak</h2>
          <p><strong>Nama:</strong> ${nama}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Jenis Website:</strong> ${jenisWebsite}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
          <p><strong>Pesan:</strong></p>
          <p style="white-space: pre-wrap; background: #f9f9f9; padding: 12px; border-radius: 6px;">${pesan}</p>
        </div>
      `,
    });

    if (error) {
      console.error("[contact] Resend error:", error);
      return {
        success: false,
        error: "Pesan belum terkirim. Coba lagi atau hubungi lewat WhatsApp.",
        fallbackToWa: true,
        waUrl,
      };
    }

    return {
      success: true,
    };
  } catch (err) {
    console.error("[contact] Resend error:", err);
    return {
      success: false,
      error: "Pesan belum terkirim. Coba lagi atau hubungi lewat WhatsApp.",
      fallbackToWa: true,
      waUrl,
    };
  }
}
