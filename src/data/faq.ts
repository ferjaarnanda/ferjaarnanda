export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export const faqs: FAQItem[] = [
  {
    id: "harga",
    question: "Berapa harga pembuatan website?",
    answer:
      "Harga mulai dari Rp 750K untuk Standard Class hingga Rp 3.500K untuk Exclusive Class, tergantung kebutuhan fitur dan kompleksitas sistem.",
  },
  {
    id: "revisi",
    question: "Berapa kali bisa revisi?",
    answer:
      "Standard Class 1x, Semi Pro Class 3x, Professional Class 5x, dan Exclusive Class revisi unlimited (dalam scope).",
  },
  {
    id: "domain-hosting",
    question: "Apakah sudah termasuk domain dan hosting?",
    answer:
      "Standard Class sudah termasuk hosting standar + domain .com. Semi Pro Class dan seterusnya sudah termasuk domain pilihan + HTTPS/SSL.",
  },
  {
    id: "waktu-pengerjaan",
    question: "Berapa lama pengerjaannya?",
    answer:
      "Waktu pengerjaan Standard Class 3-7 hari, Semi Pro Class 5-10 hari, Professional Class 7-14 hari, dan Exclusive Class 14-30 hari.",
  },
  {
    id: "biaya-perpanjangan",
    question: "Bagaimana biaya perpanjangan?",
    answer:
      "Biaya perpanjangan tahun berikutnya: Standard Class Rp 500K/tahun, Semi Pro Class Rp 700K/tahun, Professional Class Rp 1.350K/tahun, dan Exclusive Class Rp 1.650K/tahun.",
  },
];
