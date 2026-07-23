import { ArrowUpRight, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProjectMetaProps {
  /** Live deployment URL (e.g. https://policy.nysgpt.com). */
  live?: string;
  /** Text for the live button. Defaults to "Visit live". */
  liveLabel?: string;
  /** Source repository URL. */
  source?: string;
  /** Planned/active subdomain(s), or any "where to find it" string. */
  domain?: string;
  /** Caption above `domain`. Defaults to "Subdomain". */
  label?: string;
  className?: string;
}

/**
 * Per-post header block: a live-site button + a source button, plus an
 * optional domain label. Mirrors the "open template / live preview" pair
 * from portfolio-style case studies.
 */
export function ProjectMeta({
  live,
  liveLabel = "Visit live",
  source,
  domain,
  label = "Subdomain",
  className,
}: ProjectMetaProps) {
  return (
    <div
      className={cn(
        "not-prose my-6 flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      {domain && (
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span className="font-mono text-sm">{domain}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2 sm:ml-auto">
        {live && (
          <Button asChild size="sm">
            <a href={live} target="_blank" rel="noreferrer noopener">
              {liveLabel}
              <ArrowUpRight />
            </a>
          </Button>
        )}
        {source && (
          <Button asChild size="sm" variant="outline">
            <a href={source} target="_blank" rel="noreferrer noopener">
              <Github />
              Source
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
