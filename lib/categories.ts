// The fixed category vocabulary for the case-study blog.
// Rendered as a stable 2×5 grid (numbered 01–10) in the homepage filter,
// à la the 01–10 card grid on 44b.nysgpt.com. Posts tag themselves with
// 1–3 of these values (see each post's frontmatter `tags`).
export const CATEGORIES = [
  "Panels",
  "Components",
  "Animations",
  "CSS",
  "Color Systems",
  "Charts",
  "Search",
  "PDF",
  "Ecommerce",
  "Parallel Routes",
] as const;

export type Category = (typeof CATEGORIES)[number];
