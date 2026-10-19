export interface ServiceItem {
  id: string;
  number: string;
  title: string;
  description: string;
}

export const services: ServiceItem[] = [
  {
    id: "web-app",
    number: "01",
    title: "Web Application / Sistem Informasi",
    description: "Aplikasi berbasis web untuk otomasi proses bisnis, manajemen data, dan alur kerja terpadu.",
  },
  {
    id: "ecommerce",
    number: "02",
    title: "Toko Online (E-commerce)",
    description: "Platform jual beli lengkap dengan keranjang belanja, integrasi pembayaran otomatis, dan inventaris.",
  },
  {
    id: "booking",
    number: "03",
    title: "Web Reservasi / Booking",
    description: "Sistem pemesanan jadwal, kamar, atau tiket secara online yang terhubung dengan kalender.",
  },
  {
    id: "company-profile",
    number: "04",
    title: "Company Profile & Landing Page",
    description: "Halaman pengenalan profil bisnis profesional untuk meningkatkan kredibilitas dan konversi calon klien.",
  },
  {
    id: "blog",
    number: "05",
    title: "Blog / Jurnal / Berita",
    description: "Portal publikasi artikel dan berita berkala dengan sistem manajemen konten yang cepat dan mudah.",
  },
  {
    id: "portfolio",
    number: "06",
    title: "Portofolio / CV Website",
    description: "Showcase karya personal, pencapaian profesional, dan riwayat karir untuk membangun personal branding.",
  },
];
