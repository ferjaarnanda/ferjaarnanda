import { z } from "zod";

export const contactSchema = z
  .object({
    nama: z.string().trim().min(1, "Belum diisi"),
    email: z
      .string()
      .trim()
      .min(1, "Belum diisi")
      .email("Format email tidak valid"),
    jenis: z.string().trim().min(1, "Belum diisi"),
    customJenis: z.string().trim().max(80, "Maksimal 80 karakter").optional(),
    pesan: z
      .string()
      .trim()
      .min(1, "Belum diisi")
      .min(10, "Pesan terlalu pendek"),
    _hp: z.string().max(0, "Spam detected").optional(),
  })
  .refine(
    (data) => {
      if (data.jenis === "Lainnya") {
        return !!data.customJenis && data.customJenis.trim().length > 0;
      }
      return true;
    },
    {
      message: "Belum diisi",
      path: ["customJenis"],
    }
  );

export type ContactFormData = {
  nama: string;
  email: string;
  jenis: string;
  customJenis?: string;
  pesan: string;
  _hp?: string;
};
