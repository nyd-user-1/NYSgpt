import { ImageResponse } from "next/og";
import { docs, meta } from "@/.source";
import { loader } from "fumadocs-core/source";
import { createMDXSource } from "fumadocs-mdx";
import { getAuthor, isValidAuthor, type AuthorKey } from "@/lib/authors";
import { siteConfig } from "@/lib/site";

export const runtime = "nodejs";
export const alt = "Blog Post";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const blogSource = loader({
  baseUrl: "/blog",
  source: createMDXSource(docs, meta),
});

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default async function Image({ params }: { params: { slug: string } }) {
  try {
    const page = await blogSource.getPage([params.slug]);

    if (!page) {
      return new Response("Blog post not found", { status: 404 });
    }

    const authorKey = page.data.author as string;
    const authorDetails =
      authorKey && isValidAuthor(authorKey)
        ? getAuthor(authorKey as AuthorKey)
        : null;

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#ffffff",
            padding: "40px",
            fontFamily: "system-ui",
          }}
        >
          <div
            style={{
              display: "flex",
              height: "100%",
              width: "100%",
              border: "4px solid #111827",
              borderRadius: "24px",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "60px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: "28px",
                  letterSpacing: "-0.5px",
                }}
              >
                {siteConfig.name}
              </span>
              <h1
                style={{
                  fontSize: "56px",
                  fontWeight: 700,
                  color: "#111827",
                  lineHeight: 1.1,
                  marginBottom: "18px",
                  letterSpacing: "-1.5px",
                }}
              >
                {page.data.title}
              </h1>
              {page.data.description && (
                <p
                  style={{
                    fontSize: "26px",
                    fontWeight: 400,
                    color: "#4b5563",
                    lineHeight: 1.4,
                  }}
                >
                  {page.data.description}
                </p>
              )}
            </div>
            <div
              style={{
                display: "flex",
                gap: "14px",
                alignItems: "center",
                fontSize: "22px",
                color: "#111827",
                fontWeight: 500,
              }}
            >
              {authorDetails && <span>{authorDetails.name}</span>}
              {authorDetails && page.data.date && <span>•</span>}
              {page.data.date && <span>{formatDate(page.data.date)}</span>}
            </div>
          </div>
        </div>
      ),
      { width: size.width, height: size.height }
    );
  } catch (error) {
    return new Response(
      `Failed to generate image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      { status: 500 }
    );
  }
}
