import { EMAIL, whatsappLink, MAILTO } from "@/data/contact";

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-rule py-8">
      <div className="w-full max-w-[1200px] mx-auto px-5 lg:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-sm text-muted">
        <p>
          Ferja Arnanda &copy; 2026 Jasa Pembuatan Website
        </p>
        <div className="flex items-center gap-6">
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-obsidian transition-colors"
          >
            WhatsApp
          </a>
          <a
            href={MAILTO}
            className="hover:text-obsidian transition-colors"
          >
            {EMAIL}
          </a>
        </div>
      </div>
    </footer>
  );
}
