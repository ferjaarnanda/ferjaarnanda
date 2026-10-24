"use client";

import { useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import MarioConsoleSection from "@/components/MarioConsoleSection";
import PaketSection from "@/components/PaketSection";
import TechStackSection from "@/components/TechStackSection";
import AlurFaqSection from "@/components/AlurFaqSection";
import KontakSection from "@/components/KontakSection";
import Footer from "@/components/Footer";
import CvModal from "@/components/CvModal";
import { PackageItem } from "@/data/packages";

export default function Home() {
  const [isCvOpen, setIsCvOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>("");

  const handleSelectPackage = (pkg: PackageItem) => {
    setSelectedPackage(`${pkg.name} (${pkg.price})`);
  };

  return (
    <>
      {/* Navbar as direct child of body */}
      <Navbar />

      {/* 0. Intro Cutscene Loading Screen (first visit per session, Mario Zone #1) */}
      <LoadingScreen />

      {/* Main Page Content */}
      <div className="min-h-screen bg-white text-obsidian flex flex-col">
        {/* 1. Hero Section (#home) */}
        <HeroSection onOpenCv={() => setIsCvOpen(true)} />

        {/* 2. Jenis Website Section (#jenis, Interactive Mario Console) */}
        <MarioConsoleSection />

        {/* 3. Paket / Kategori Jasa Section (#paket, Mario Zone #3) */}
        <PaketSection onSelectPackage={handleSelectPackage} />

        {/* 4. Tech Stack Section */}
        <TechStackSection />

        {/* 5. Alur Kerja + FAQ Section */}
        <AlurFaqSection />

        {/* 6. Kontak Section (#kontak) */}
        <KontakSection initialService={selectedPackage} />

        {/* 7. Footer */}
        <Footer />
      </div>

      {/* CV Modal Dialog */}
      <CvModal isOpen={isCvOpen} onClose={() => setIsCvOpen(false)} />
    </>
  );
}
