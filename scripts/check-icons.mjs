import fs from "fs";
import path from "path";

// Read src/data/stack.ts directly
const stackFilePath = path.resolve("src/data/stack.ts");
const stackContent = fs.readFileSync(stackFilePath, "utf8");

// Tool slug mapping (must match getToolIconPath)
const toolSlugMap = {
  HTML5: "html5",
  CSS3: "css3",
  JavaScript: "javascript",
  TypeScript: "typescript",
  "React.js": "reactjs",
  "Next.js": "nextjs",
  "Vite.js": "vitejs",
  Vue: "vue",
  "Tailwind CSS": "tailwind-css",
  PHP: "php",
  "Node.js": "nodejs",
  "Express.js": "expressjs",
  Laravel: "laravel",
  Java: "java",
  Python: "python",
  "C++": "cplusplus",
  PostgreSQL: "postgresql",
  Supabase: "supabase",
  MySQL: "mysql",
  MariaDB: "mariadb",
  Firebase: "firebase",
  Prisma: "prisma",
  Figma: "figma",
  Photoshop: "photoshop",
  Notion: "notion",
  "Google Search Console": "google-search-console",
  "Google Analytics": "google-analytics",
  Postman: "postman",
  Midtrans: "midtrans",
  Xendit: "xendit",
};

// Extract all tools from items: [...] in stack.ts
const itemsMatches = stackContent.match(/items:\s*\[([\s\S]*?)\]/g) || [];
const allTools = [];

for (const match of itemsMatches) {
  const cleaned = match.replace(/items:\s*\[/, "").replace(/\]/, "");
  const toolNames = cleaned
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
  allTools.push(...toolNames);
}

if (allTools.length === 0) {
  console.error("FAIL: Could not parse tools from src/data/stack.ts");
  process.exit(1);
}

console.log(`Checking icons for ${allTools.length} tools from src/data/stack.ts...`);

const missingIcons = [];
const iconsDir = path.resolve("public/icons");

for (const tool of allTools) {
  const slug = toolSlugMap[tool] || tool.toLowerCase().replace(/[^a-z0-9]/g, "");
  const iconFile = path.join(iconsDir, `${slug}.svg`);

  if (!fs.existsSync(iconFile)) {
    missingIcons.push({ tool, expectedPath: iconFile });
  }
}

if (missingIcons.length > 0) {
  console.error(`FAIL: Missing ${missingIcons.length} icon files:`);
  for (const m of missingIcons) {
    console.error(`  - ${m.tool}: ${m.expectedPath}`);
  }
  process.exit(1);
}

console.log(`PASS: All ${allTools.length} tools in stack.ts have an icon file in public/icons/!`);
process.exit(0);
