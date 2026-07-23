import React from "react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

interface PromoContentProps {
  variant?: "desktop" | "mobile";
  className?: string;
}

export function PromoContent({
  variant = "desktop",
  className,
}: PromoContentProps) {
  if (variant === "mobile") {
    return (
      <div className={cn("border-t border-border bg-muted/20 p-3", className)}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-foreground text-xs font-bold text-background">
            N
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground/90 truncate">
              The NYSgpt family
            </p>
            <p className="text-xs text-muted-foreground truncate">
              One stack, many products
            </p>
          </div>
          <a
            href={siteConfig.url}
            className="text-xs text-primary hover:text-primary/80 font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            Explore
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("border border-border rounded-lg p-4 bg-card", className)}
    >
      <div className="flex flex-col gap-4">
        <div className="flex h-40 w-full items-center justify-center rounded-md bg-gradient-to-br from-muted to-muted/40 text-4xl font-semibold tracking-tighter text-foreground/80">
          NYSgpt
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold tracking-tighter">
            The NYSgpt family
          </h3>
          <p className="text-sm text-muted-foreground">
            A growing set of AI products built on one shared stack, design
            system, and set of components — each documented here.
          </p>
        </div>
      </div>
    </div>
  );
}
