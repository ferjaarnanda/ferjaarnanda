export interface StackItem {
  name: string;
  category: string;
}

export interface StackCategory {
  title: string;
  items: string[];
}

export const stackCategories: StackCategory[] = [
  {
    title: "Frontend",
    items: [
      "HTML5",
      "CSS3",
      "JavaScript",
      "TypeScript",
      "React.js",
      "Next.js",
      "Vite.js",
      "Vue",
      "Tailwind CSS",
    ],
  },
  {
    title: "Backend",
    items: ["PHP", "Node.js", "Express.js", "Laravel", "Java"],
  },
  {
    title: "Bahasa",
    items: ["Python", "C++"],
  },
  {
    title: "Database",
    items: [
      "PostgreSQL",
      "Supabase",
      "MySQL",
      "MariaDB",
      "Firebase",
      "Prisma",
    ],
  },
  {
    title: "Desain & Kolaborasi",
    items: ["Figma", "Photoshop", "Notion"],
  },
  {
    title: "SEO",
    items: ["Google Search Console", "Google Analytics"],
  },
  {
    title: "Tools lain",
    items: ["Postman", "Midtrans", "Xendit"],
  },
];

export const toolSlugMap: Record<string, string> = {
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

export function getToolIconPath(name: string): string {
  const slug = toolSlugMap[name] || name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `/icons/${slug}.svg`;
}

