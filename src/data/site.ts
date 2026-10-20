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

const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "6289513062106";
const gmail = process.env.NEXT_PUBLIC_GMAIL || "arn.techdev@gmail.com";
const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL || "";
const linkedinUrl = process.env.NEXT_PUBLIC_LINKEDIN_URL || "";
const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "";

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
