"use client";

// Maps common tech names to their Devicon slug
// Full list: https://devicon.dev/
const DEVICON_MAP: Record<string, string> = {
  // Languages
  "javascript": "javascript",
  "typescript": "typescript",
  "python": "python",
  "rust": "rust",
  "go": "go",
  "golang": "go",
  "java": "java",
  "c++": "cplusplus",
  "c#": "csharp",
  "ruby": "ruby",
  "php": "php",
  "swift": "swift",
  "kotlin": "kotlin",
  "dart": "dart",
  "lua": "lua",
  "r": "r",
  "scala": "scala",
  "elixir": "elixir",
  "haskell": "haskell",
  "c": "c",
  "sql": "mysql",
  "shell": "bash",
  "bash": "bash",
  "html": "html5",
  "css": "css3",
  "sass": "sass",
  // Frameworks / Libraries
  "react": "react",
  "react.js": "react",
  "reactjs": "react",
  "next.js": "nextjs",
  "nextjs": "nextjs",
  "next": "nextjs",
  "vue": "vuejs",
  "vue.js": "vuejs",
  "angular": "angularjs",
  "svelte": "svelte",
  "express": "express",
  "express.js": "express",
  "django": "django",
  "flask": "flask",
  "fastapi": "fastapi",
  "rails": "rails",
  "spring": "spring",
  "flutter": "flutter",
  "tailwind": "tailwindcss",
  "tailwindcss": "tailwindcss",
  "bootstrap": "bootstrap",
  "jquery": "jquery",
  // Runtime / Platforms
  "node": "nodejs",
  "node.js": "nodejs",
  "nodejs": "nodejs",
  "deno": "denojs",
  "bun": "bun",
  // Databases
  "mongodb": "mongodb",
  "postgres": "postgresql",
  "postgresql": "postgresql",
  "mysql": "mysql",
  "redis": "redis",
  "firebase": "firebase",
  "supabase": "supabase",
  // DevOps / Cloud
  "docker": "docker",
  "kubernetes": "kubernetes",
  "aws": "amazonwebservices",
  "gcp": "googlecloud",
  "azure": "azure",
  "linux": "linux",
  "git": "git",
  "github": "github",
  // Web3
  "solana": "solidity", // No official devicon for Solana — we'll use a custom fallback
  "ethereum": "solidity",
  "solidity": "solidity",
  // Tools
  "figma": "figma",
  "vscode": "vscode",
  "graphql": "graphql",
  "webpack": "webpack",
  "vite": "vitejs",
};

// Custom SVG for techs not in Devicon (like Solana)
const CUSTOM_ICONS: Record<string, string> = {
  "solana": `<svg viewBox="0 0 397.7 311.7" xmlns="http://www.w3.org/2000/svg"><linearGradient id="a" x1="360.879" x2="141.213" y1="351.455" y2="-69.294" gradientTransform="matrix(1 0 0 -1 0 314)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#00ffa3"/><stop offset="1" stop-color="#dc1fff"/></linearGradient><path d="m64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8h-317.4c-5.8 0-8.7-7-4.6-11.1z" fill="url(#a)"/><linearGradient id="b" x1="264.829" x2="45.163" y1="401.601" y2="-19.148" gradientTransform="matrix(1 0 0 -1 0 314)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#00ffa3"/><stop offset="1" stop-color="#dc1fff"/></linearGradient><path d="m64.6 3.8c2.5-2.4 5.8-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8h-317.4c-5.8 0-8.7-7-4.6-11.1z" fill="url(#b)"/><linearGradient id="c" x1="312.548" x2="92.882" y1="376.688" y2="-44.061" gradientTransform="matrix(1 0 0 -1 0 314)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#00ffa3"/><stop offset="1" stop-color="#dc1fff"/></linearGradient><path d="m333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8h-317.4c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1z" fill="url(#c)"/></svg>`,
  "anchor": `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a3 3 0 0 0-3 3c0 1.3.84 2.4 2 2.82V9H9.5a.5.5 0 0 0 0 1H11v7.18A5.002 5.002 0 0 1 7 12h2l-3-4-3 4h2a7.002 7.002 0 0 0 6 6.93V10h1.5a.5.5 0 0 0 0-1H13V7.82A3.001 3.001 0 0 0 12 2zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>`,
};

function getDeviconUrl(slug: string): string {
  return `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${slug}/${slug}-original.svg`;
}

interface TechStackBadgesProps {
  stack: string; // e.g. "React | TypeScript | Node.js"
  size?: "sm" | "md" | "lg";
}

export function TechStackBadges({ stack, size = "md" }: TechStackBadgesProps) {
  const techs = stack.split("|").map(t => t.trim()).filter(Boolean);

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const containerClasses = {
    sm: "gap-1.5",
    md: "gap-2",
    lg: "gap-3",
  };

  return (
    <div className={`flex flex-wrap items-center ${containerClasses[size]}`}>
      {techs.map((tech, i) => {
        const key = tech.toLowerCase();
        const deviconSlug = DEVICON_MAP[key];
        const customSvg = CUSTOM_ICONS[key];

        return (
          <div
            key={i}
            className={`${sizeClasses[size]} border-2 border-black bg-white p-1 flex items-center justify-center relative group transition-transform hover:scale-110 hover:-rotate-3`}
            style={{ boxShadow: "2px 2px 0px 0px rgba(0,0,0,1)" }}
            title={tech}
          >
            {customSvg ? (
              <div
                className="w-full h-full"
                dangerouslySetInnerHTML={{ __html: customSvg }}
              />
            ) : deviconSlug ? (
              <img
                src={getDeviconUrl(deviconSlug)}
                alt={tech}
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback: try the -plain variant
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes("-plain")) {
                    target.src = `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${deviconSlug}/${deviconSlug}-plain.svg`;
                  }
                }}
              />
            ) : (
              // Fallback: show first 2 chars
              <span className="font-black text-[10px] uppercase leading-none text-center">
                {tech.slice(0, 2)}
              </span>
            )}

            {/* Tooltip */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] font-black uppercase px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-black z-10">
              {tech}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Inline display for profile cards — shows icons + label */
export function TechStackInline({ stack }: { stack: string }) {
  return (
    <div className="border-t-2 border-black/10 pt-4 mt-4">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-3">
        Verified Tech Stack
      </h4>
      <TechStackBadges stack={stack} size="md" />
      <p className="text-[9px] font-bold text-black/30 mt-2 uppercase tracking-wider">
        AI-verified via GitHub
      </p>
    </div>
  );
}
