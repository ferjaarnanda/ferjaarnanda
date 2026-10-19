import React from "react";
import Image from "next/image";
import { stackCategories, getToolIconPath } from "@/data/stack";

export default function TechStackSection() {
  return (
    <section
      id="tech-stack"
      aria-labelledby="tech-stack-heading"
      className="w-full bg-white border-t border-rule py-16 md:py-24"
    >
      <div className="w-full max-w-[1200px] mx-auto px-5 lg:px-6">
        <h2
          id="tech-stack-heading"
          className="text-2xl sm:text-3xl font-bold tracking-tight text-obsidian mb-10 md:mb-14"
        >
          Tech Stack
        </h2>

        {/* Categories: One row per category, 20px gap between rows */}
        <div className="flex flex-col gap-5">
          {stackCategories.map((category) => (
            <div
              key={category.title}
              className="flex items-start gap-4 sm:gap-8"
            >
              {/* Category Label: Fixed column (72px on mobile, 140px on desktop) */}
              <div className="w-[72px] sm:w-[140px] shrink-0 pt-2.5 sm:pt-3">
                <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted block leading-tight">
                  {category.title}
                </span>
              </div>

              {/* Tools on the right as small square tiles with 8px gaps */}
              <div className="flex flex-wrap gap-2 items-center flex-grow">
                {category.items.map((tool) => {
                  const iconSrc = getToolIconPath(tool);
                  return (
                    <div
                      key={tool}
                      title={tool}
                      className="w-[44px] h-[44px] sm:w-[52px] sm:h-[52px] shrink-0 bg-white border border-[#E5E7EB] rounded-[8px] shadow-none flex flex-col items-center justify-center p-1 cursor-default transition-all duration-150 hover:-translate-y-0.5 hover:border-primary select-none group"
                    >
                      {/* Logo: 18px mobile, 22px desktop */}
                      <div className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px] relative flex items-center justify-center shrink-0">
                        <img
                          src={iconSrc}
                          alt=""
                          width={22}
                          height={22}
                          className="w-full h-full object-contain pointer-events-none"
                          loading="lazy"
                          aria-hidden="true"
                        />
                      </div>

                      {/* Tool name: 8px mobile, 9px desktop */}
                      <span className="text-[8px] sm:text-[9px] font-medium text-obsidian leading-none mt-1 truncate max-w-full text-center px-0.5">
                        {tool}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
