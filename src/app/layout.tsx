import type { Metadata } from "next";
import { Inter, Press_Start_2P } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start-2p",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ferja Arnanda - Jasa Buat Website",
  description:
    "Dari toko online, company profile, blog, sistem reservasi, sampai sistem cashier dan sistem lainnya.",
  openGraph: {
    title: "Ferja Arnanda - Jasa Buat Website",
    description:
      "Dari toko online, company profile, blog, sistem reservasi, sampai sistem cashier dan sistem lainnya.",
    type: "website",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ferja Arnanda - Jasa Buat Website",
    description:
      "Dari toko online, company profile, blog, sistem reservasi, sampai sistem cashier dan sistem lainnya.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${pressStart2P.variable} scroll-smooth`}>
      <head>
        {/* Preload critical loader assets to prevent any mid-animation decoding hitches */}
        <link rel="preload" href="/character/devj-sheet-nobubble.png" as="image" />
        <link rel="preload" href="/environment/level-loading-ground.png" as="image" />
        <link rel="preload" href="/environment/level-loading-decor.png" as="image" />
        <link rel="preload" href="/environment/minicoin-sheet.png" as="image" />
        <link rel="preload" href="/coins/spin24-rainbow.png" as="image" />
      </head>
      <body className="bg-white text-obsidian antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
