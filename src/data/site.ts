export const CV_PATH = "/FerjaArnanda_CV.pdf";

export interface SiteConfig {
  name: string;
  title: string;
  description: string;
  cvPath: string;
  contacts: {
    whatsappNumber: string;
    whatsappUrl: string;
    gmail: string;
    gmailUrl: string;
    githubUrl: string;
    linkedinUrl: string;
    instagramUrl: string;
  };
}

const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "6281234567890";
const gmail = process.env.NEXT_PUBLIC_GMAIL || "ferjaarnanda@gmail.com";
const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/ferjaarnanda";
const linkedinUrl = process.env.NEXT_PUBLIC_LINKEDIN_URL || "https://linkedin.com/in/ferjaarnanda";
const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com/ferjaarnanda";

export const siteConfig: SiteConfig = {
  name: "Ferja Arnanda",
  title: "Jasa Pembuatan Website untuk Segala Kebutuhan",
  description: "Dari toko online, company profile, blog, sistem reservasi, sampai sistem cashier dan sistem lainnya.",
  cvPath: CV_PATH,
  contacts: {
    whatsappNumber,
    whatsappUrl: `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}`,
    gmail,
    gmailUrl: `mailto:${gmail}`,
    githubUrl,
    linkedinUrl,
    instagramUrl,
  },
};
