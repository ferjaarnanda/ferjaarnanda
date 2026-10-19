export type CoinType = "bronze" | "silver" | "gold" | "diamond" | "rainbow";

export interface PackageItem {
  id: string;
  name: string;
  coin: CoinType;
  badge?: string;
  coinImage: string;
  coinSpinImage: string;
  price: string;
  renewalPrice?: string;
  features: string[];
  ctaText: string;
}

export const packages: PackageItem[] = [
  {
    id: "standard-class",
    name: "Standard Class",
    coin: "bronze",
    coinImage: "/coins/coin-bronze-HD.png",
    coinSpinImage: "/coins/spin24-bronze.png",
    price: "Rp 750K",
    renewalPrice: "perpanjangan Rp 500K/tahun",
    features: [
      "Halaman 1-3",
      "Desain template dikustom",
      "SEO dasar",
      "Hosting standar + domain .com",
      "Revisi 1x",
      "Pengerjaan 3-7 hari",
      "Garansi 1 tahun",
    ],
    ctaText: "Pilih Koin Ini",
  },
  {
    id: "semi-pro-class",
    name: "Semi Pro Class",
    coin: "silver",
    badge: "BEST",
    coinImage: "/coins/coin-silver-HD.png",
    coinSpinImage: "/coins/spin24-silver.png",
    price: "Rp 1.250K",
    renewalPrice: "perpanjangan Rp 700K/tahun",
    features: [
      "Sampai 7 halaman",
      "Desain semi-custom",
      "SEO + Google Analytics & Search Console",
      "Hosting standar + domain pilihan + HTTPS/SSL",
      "Revisi 3x",
      "Pengerjaan 5-10 hari",
      "Bonus panduan penggunaan",
      "Garansi 1 tahun",
    ],
    ctaText: "Pilih Koin Ini",
  },
  {
    id: "professional-class",
    name: "Professional Class",
    coin: "gold",
    coinImage: "/coins/coin-gold-HD.png",
    coinSpinImage: "/coins/spin24-gold.png",
    price: "Rp 2.150K",
    renewalPrice: "perpanjangan Rp 1.350K/tahun",
    features: [
      "Sampai 15 halaman",
      "Desain custom",
      "On-page SEO + sitemap",
      "Hosting cloud + domain TLD pilihan + HTTPS/SSL",
      "Revisi 5x",
      "Pengerjaan 7-14 hari",
      "Bonus training 1 jam + support 1 bulan",
      "Garansi 1 tahun",
    ],
    ctaText: "Pilih Koin Ini",
  },
  {
    id: "exclusive-class",
    name: "Exclusive Class",
    coin: "diamond",
    coinImage: "/coins/coin-diamond-HD.png",
    coinSpinImage: "/coins/spin24-diamond.png",
    price: "Rp 3.500K",
    renewalPrice: "perpanjangan Rp 1.650K/tahun",
    features: [
      "Halaman sesuai scope",
      "Desain custom penuh + UI/UX research",
      "SEO teknis + optimasi kecepatan",
      "Cloud/VPS + domain TLD pilihan + HTTPS/SSL",
      "Revisi unlimited (dalam scope)",
      "Pengerjaan 14-30 hari",
      "Bonus dokumentasi + support 3 bulan + backup",
      "Garansi 1 tahun",
    ],
    ctaText: "Pilih Koin Ini",
  },
  {
    id: "custom-class",
    name: "Custom Class",
    coin: "rainbow",
    coinImage: "/coins/coin-rainbow-HD.png",
    coinSpinImage: "/coins/spin24-rainbow.png",
    price: "Harga didiskusikan",
    features: [
      "Spesifikasi dipilih sendiri",
      "Desain custom penuh + UI/UX research",
      "Estimasi waktu setelah diskusi",
    ],
    ctaText: "Diskusi Dulu",
  },
];
