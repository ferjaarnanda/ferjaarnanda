"use server";

import { z } from "zod";
import { Resend } from "resend";
import { headers } from "next/headers";
import { siteConfig } from "@/data/site";

const contactSchema = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter"),
  email: z.string().trim().email("Format email tidak valid"),
  jenis: z.string().trim().min(1, "Pilih jenis website"),
  pesan: z.string().trim().min(5, "Pesan minimal 5 karakter"),
  _hp: z.string().max(0, "Spam detected"),
});

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
  _prevState: ContactState | null,
  formData: FormData
): Promise<ContactState> {
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "127.0.0.1";

  if (isRateLimited(ip)) {
    return {
      success: false,
      error: "Terlalu banyak permintaan. Silakan coba lagi beberapa saat lagi atau hubungi via WhatsApp.",
      fallbackToWa: true,
      waUrl: siteConfig.contacts.whatsappUrl,
    };
  }

  const raw = {
    nama: formData.get("nama")?.toString() || "",
    email: formData.get("email")?.toString() || "",
    jenis: formData.get("jenis")?.toString() || "",
    pesan: formData.get("pesan")?.toString() || "",
    _hp: formData.get("_hp")?.toString() || "",
  };

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "Data formulir tidak valid";
    return {
      success: false,
      error: firstError,
    };
  }

  const { nama, email, jenis, pesan } = parsed.data;

  // Prefilled WhatsApp URL as fallback
  const waMessage = `Halo Ferja Arnanda, perkenalkan saya ${nama} (${email}). Saya tertarik dengan: ${jenis}.\n\nPesan:\n${pesan}`;
  const waUrl = `https://wa.me/${siteConfig.contacts.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(waMessage)}`;

  const resendApiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_EMAIL || siteConfig.contacts.gmail;

  // Graceful fallback if Resend API key is not configured
  if (!resendApiKey) {
    return {
      success: false,
      error: "Layanan email otomatis sedang tidak aktif. Silakan hubungi langsung melalui WhatsApp.",
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
      subject: `Pesan Baru dari ${nama} - ${jenis}`,
      text: `Nama: ${nama}\nEmail: ${email}\nJenis Website: ${jenis}\n\nPesan:\n${pesan}`,
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
