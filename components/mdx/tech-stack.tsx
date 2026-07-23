import { cn } from "@/lib/utils";

interface TechStackProps {
  /** Human-readable stack labels, e.g. ["Next.js", "React", "Postgres"]. */
  technologies: string[];
  className?: string;
}

/**
 * A compact badge row for a project's tech stack. Kept intentionally simple
 * (text badges) so it renders identically in light and dark without external
 * icon assets.
 */
export function TechStack({ technologies, className }: TechStackProps) {
  return (
    <div className={cn("not-prose my-6 flex flex-wrap gap-2", className)}>
      {technologies.map((tech) => (
        <span
          key={tech}
          className="inline-flex h-7 items-center rounded-md border border-border bg-muted/40 px-3 text-xs font-medium text-foreground"
        >
          {tech}
        </span>
      ))}
    </div>
  );
}
