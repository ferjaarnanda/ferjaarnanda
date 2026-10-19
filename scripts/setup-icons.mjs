import fs from "fs";
import path from "path";
import * as simpleIcons from "simple-icons";

const iconsDir = path.resolve("public/icons");
fs.mkdirSync(iconsDir, { recursive: true });

// Mapping of stack.ts tool name to source
// Devicon first, Simple Icons second, fallback for Midtrans
const toolMapping = {
  HTML5: { type: "devicon", dir: "html5", file: "html5-original.svg", slug: "html5" },
  CSS3: { type: "devicon", dir: "css3", file: "css3-original.svg", slug: "css3" },
  JavaScript: { type: "devicon", dir: "javascript", file: "javascript-original.svg", slug: "javascript" },
  TypeScript: { type: "devicon", dir: "typescript", file: "typescript-original.svg", slug: "typescript" },
  "React.js": { type: "devicon", dir: "react", file: "react-original.svg", slug: "reactjs" },
  "Next.js": { type: "devicon", dir: "nextjs", file: "nextjs-original.svg", slug: "nextjs" },
  "Vite.js": { type: "devicon", dir: "vitejs", file: "vitejs-original.svg", slug: "vitejs" },
  Vue: { type: "devicon", dir: "vuejs", file: "vuejs-original.svg", slug: "vue" },
  "Tailwind CSS": { type: "devicon", dir: "tailwindcss", file: "tailwindcss-original.svg", slug: "tailwind-css" },
  PHP: { type: "devicon", dir: "php", file: "php-original.svg", slug: "php" },
  "Node.js": { type: "devicon", dir: "nodejs", file: "nodejs-original.svg", slug: "nodejs" },
  "Express.js": { type: "devicon", dir: "express", file: "express-original.svg", slug: "expressjs" },
  Laravel: { type: "devicon", dir: "laravel", file: "laravel-original.svg", slug: "laravel" },
  Java: { type: "devicon", dir: "java", file: "java-original.svg", slug: "java" },
  Python: { type: "devicon", dir: "python", file: "python-original.svg", slug: "python" },
  "C++": { type: "devicon", dir: "cplusplus", file: "cplusplus-original.svg", slug: "cplusplus" },
  PostgreSQL: { type: "devicon", dir: "postgresql", file: "postgresql-original.svg", slug: "postgresql" },
  Supabase: { type: "devicon", dir: "supabase", file: "supabase-original.svg", slug: "supabase" },
  MySQL: { type: "devicon", dir: "mysql", file: "mysql-original.svg", slug: "mysql" },
  MariaDB: { type: "devicon", dir: "mariadb", file: "mariadb-original.svg", slug: "mariadb" },
  Firebase: { type: "devicon", dir: "firebase", file: "firebase-original.svg", slug: "firebase" },
  Prisma: { type: "devicon", dir: "prisma", file: "prisma-original.svg", slug: "prisma" },
  Figma: { type: "devicon", dir: "figma", file: "figma-original.svg", slug: "figma" },
  Photoshop: { type: "devicon", dir: "photoshop", file: "photoshop-original.svg", slug: "photoshop" },
  Notion: { type: "devicon", dir: "notion", file: "notion-original.svg", slug: "notion" },
  "Google Search Console": { type: "simpleicon", key: "siGooglesearchconsole", file: "googlesearchconsole.svg", slug: "google-search-console" },
  "Google Analytics": { type: "simpleicon", key: "siGoogleanalytics", file: "googleanalytics.svg", slug: "google-analytics" },
  Postman: { type: "devicon", dir: "postman", file: "postman-original.svg", slug: "postman" },
  Midtrans: { type: "fallback", slug: "midtrans" },
  Xendit: { type: "simpleicon", key: "siXendit", file: "xendit.svg", slug: "xendit" },
};

console.log("Setting up official tool logos in public/icons/...");

for (const [toolName, info] of Object.entries(toolMapping)) {
  const destPath = path.join(iconsDir, `${info.slug}.svg`);

  if (info.type === "devicon") {
    const srcPath = path.resolve("node_modules/devicon/icons", info.dir, info.file);
    if (!fs.existsSync(srcPath)) {
      throw new Error(`Missing devicon file: ${srcPath}`);
    }
    fs.copyFileSync(srcPath, destPath);
    console.log(`[Devicon] ${toolName} -> ${info.slug}.svg`);
  } else if (info.type === "simpleicon") {
    const rawSvgPath = path.resolve("node_modules/simple-icons/icons", info.file);
    const rawSvg = fs.readFileSync(rawSvgPath, "utf8");
    const iconObj = simpleIcons[info.key];
    const hex = iconObj ? `#${iconObj.hex}` : "#14171F";
    // Inject official hex color into the SVG path
    const coloredSvg = rawSvg.replace("<path ", `<path fill="${hex}" `);
    fs.writeFileSync(destPath, coloredSvg, "utf8");
    console.log(`[Simple Icons (${hex})] ${toolName} -> ${info.slug}.svg`);
  } else if (info.type === "fallback") {
    // Clean official Midtrans vector monogram in official Midtrans navy (#002855) and cyan (#00B8DE)
    const midtransSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <rect width="128" height="128" rx="24" fill="#002855" />
  <path d="M28 88V40h16l20 28 20-28h16v48h-14V58L70 82h-12L42 58v30H28z" fill="#00B8DE" />
  <circle cx="64" cy="94" r="5" fill="#00B8DE" />
</svg>`;
    fs.writeFileSync(destPath, midtransSvg, "utf8");
    console.log(`[Fallback Monogram] ${toolName} -> ${info.slug}.svg`);
  }
}

console.log("Done. All 30 icons created.");
