"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

interface TagFilterProps {
  /** The fixed category vocabulary (10), rendered as a 2×5 grid. */
  categories: string[];
  /** "All" or one of `categories`. */
  selectedTag: string;
  /** Post count per category. */
  counts?: Record<string, number>;
  /** Total number of posts (the "All" count). */
  totalCount: number;
}

export function TagFilter({
  categories,
  selectedTag,
  counts,
  totalCount,
}: TagFilterProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleTagClick = (tag: string) => {
    const params = new URLSearchParams();
    if (tag !== "All") {
      params.set("tag", tag);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const DesktopTagFilter = () => (
    <div className="hidden md:flex md:flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Browse by category
        </span>
        <button
          onClick={() => handleTagClick("All")}
          className={cn(
            "h-7 flex items-center px-2 pl-3 rounded-lg cursor-pointer border text-sm transition-colors",
            selectedTag === "All"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border hover:bg-muted"
          )}
        >
          <span>All</span>
          <span
            className={cn(
              "ml-2 text-xs border rounded-md h-5 min-w-5 px-1 font-medium flex items-center justify-center",
              selectedTag === "All"
                ? "border-primary-foreground/40 bg-background text-primary"
                : "border-border"
            )}
          >
            {totalCount}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {categories.map((category, index) => {
          const active = selectedTag === category;
          const num = String(index + 1).padStart(2, "0");
          return (
            <button
              key={category}
              onClick={() => handleTagClick(category)}
              className={cn(
                "group flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors cursor-pointer",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted"
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className={cn(
                    "font-mono text-xs",
                    active
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  )}
                >
                  {num}
                </span>
                <span
                  className={cn(
                    "text-xs border rounded-md h-5 min-w-5 px-1 font-medium flex items-center justify-center",
                    active
                      ? "border-primary-foreground/40 bg-background text-primary"
                      : "border-border"
                  )}
                >
                  {counts?.[category] ?? 0}
                </span>
              </div>
              <span className="text-sm font-medium leading-tight">
                {category}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const MobileTagFilter = () => (
    <Drawer>
      <DrawerTrigger className="md:hidden w-full flex items-center justify-between px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
        <span className="capitalize text-sm font-medium">{selectedTag}</span>
        <ChevronDown className="h-4 w-4" />
      </DrawerTrigger>

      <DrawerContent className="md:hidden">
        <DrawerHeader>
          <h3 className="font-semibold text-sm">Select Category</h3>
        </DrawerHeader>

        <DrawerBody>
          <div className="space-y-2">
            {["All", ...categories].map((tag) => {
              const count = tag === "All" ? totalCount : counts?.[tag] ?? 0;
              return (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className="w-full flex items-center justify-between font-medium cursor-pointer text-sm transition-colors"
                >
                  <span
                    className={cn(
                      "w-full flex items-center justify-between font-medium cursor-pointer text-sm transition-colors",
                      selectedTag === tag
                        ? "underline underline-offset-4 text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {tag}
                  </span>
                  <span className="flex-shrink-0 ml-2 border border-border rounded-md h-6 min-w-6 flex items-center justify-center">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );

  return (
    <>
      <DesktopTagFilter />
      <MobileTagFilter />
    </>
  );
}
