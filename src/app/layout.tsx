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
  title: "Ferja Arnanda — Jasa Pembuatan Website untuk Segala Kebutuhan",
  description:
    "Dari toko online, company profile, blog, sistem reservasi, sampai sistem cashier dan sistem lainnya.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${pressStart2P.variable} scroll-smooth`}>
      <body className="bg-white text-obsidian antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
