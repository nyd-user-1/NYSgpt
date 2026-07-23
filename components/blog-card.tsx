import Link from "next/link";
import Image from "next/image";

interface BlogCardProps {
  url: string;
  title: string;
  date: string;
  thumbnail?: string;
  /** Muted background tint complementing the illustration (a hex string). */
  tint?: string;
}

export function BlogCard({ url, title, date, thumbnail, tint }: BlogCardProps) {
  return (
    <Link
      href={url}
      style={tint ? ({ "--card-tint": tint } as React.CSSProperties) : undefined}
      className="blog-card group flex flex-col overflow-hidden rounded-lg border border-border transition duration-200 hover:shadow-md"
    >
      {thumbnail && (
        <div className="relative w-full h-48 overflow-hidden">
          <Image
            src={thumbnail}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-lg font-semibold text-card-foreground text-balance group-hover:underline underline-offset-4">
          {title}
        </h3>
        <time className="mt-auto block text-sm font-medium text-muted-foreground">
          {date}
        </time>
      </div>
    </Link>
  );
}
