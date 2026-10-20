"use server";

import { Resend } from "resend";
import { headers } from "next/headers";
import { siteConfig } from "@/data/site";
import { contactSchema, ContactFormData } from "@/lib/contact-schema";

export type ContactState = {
  success?: boolean;
  error?: string;
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
      waUrl: siteConfig.contacts.whatsappUrl,
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
    raw = payload;
  }

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "Data formulir tidak valid";
    return {
      success: false,
      error: firstError,
    };
  }

  const { nama, email, jenis, customJenis, pesan } = parsed.data;
  const jenisDisplay =
    jenis === "Lainnya" && customJenis
      ? `Lainnya (${customJenis})`
      : jenis;

  // Prefilled WhatsApp URL as fallback
  const waMessage = `Halo Ferja Arnanda, perkenalkan saya ${nama} (${email}). Saya tertarik dengan: ${jenisDisplay}.\n\nPesan:\n${pesan}`;
  const waUrl = `https://wa.me/${siteConfig.contacts.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(waMessage)}`;

  const resendApiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_EMAIL || siteConfig.contacts.gmail;

  // Graceful fallback if Resend API key is not configured
  if (!resendApiKey) {
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
      from: process.env.RESEND_FROM_EMAIL || "Ferja Portfolio <onboarding@resend.dev>",
      to: [toEmail],
      replyTo: email,
      subject: `Pesan Baru dari ${nama} - ${jenisDisplay}`,
      text: `Nama: ${nama}\nEmail: ${email}\nJenis Website: ${jenisDisplay}\n\nPesan:\n${pesan}`,
    });

    if (error) {
      console.error("Resend error:", error);
      return {
        success: false,
        error: "Gagal mengirim email. Silakan langsung hubungi melalui WhatsApp.",
        fallbackToWa: true,
        waUrl,
      };
    }

    return {
      success: true,
    };
  } catch (err) {
    console.error("Contact action error:", err);
    return {
      success: false,
      error: "Terjadi gangguan saat mengirim. Silakan hubungi langsung melalui WhatsApp.",
      fallbackToWa: true,
      waUrl,
    };
  }
}
