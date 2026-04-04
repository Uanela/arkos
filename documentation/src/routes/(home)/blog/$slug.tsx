import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { blog } from "@/lib/source";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { AuthorCard } from "@/components/blog/author-card";
import { TagBadge } from "@/components/blog/tag-badge";
import type { AuthorKey } from "@/lib/authors";
import type { TagKey } from "@/lib/tags";
import browserCollections from ".source/browser";

function extractText(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number" || typeof node === "bigint") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node?.props?.children) return extractText(node.props.children);
  return "";
}

const serverLoader = createServerFn({ method: "GET" }).handler(
  async ({ data: slug }) => {
    const page = blog.getPage([slug]);
    if (!page) throw notFound();
    const pages = blog.getPages();
    const index = pages.findIndex((p) => p.slugs[0] === slug);

    return {
      path: page.path,
      title: extractText(page.data.title),
      description: page.data.description,
      authors: page.data.authors,
      date: page.data.date,
      tags: page.data.tags || [],
      toc: page.data.toc.map((item) => ({
        title: extractText(item.title),
        url: item.url,
        depth: item.depth,
      })),
      url: page.url,
      prev: pages[index - 1]
        ? {
            title: pages[index - 1].data.title,
            slug: pages[index - 1].slugs[0],
          }
        : null,
      next: pages[index + 1]
        ? {
            title: pages[index + 1].data.title,
            slug: pages[index + 1].slugs[0],
          }
        : null,
    };
  }
);

const clientLoader = browserCollections.blogPosts.createClientLoader({
  component({ default: Mdx }) {
    const { title, description, authors, date, toc, tags, prev, next } =
      Route.useLoaderData();

    return (
      <div className="flex flex-row w-full max-w-[1500px] mx-auto px-4 py-8 gap-8">
        <div className="lg:block hidden w-[250px]" />

        <article className="flex flex-col flex-1 min-w-0">
          <h1 className="text-3xl font-semibold mb-4">{title}</h1>
          <p className="text-fd-muted-foreground mb-8">{description}</p>

          <div className="prose min-w-0 flex-1">
            <div className="flex flex-row gap-2 mb-8 not-prose">
              <Link to="/blog" className="text-sm underline">
                ← Back
              </Link>
            </div>

            <div className="not-prose flex flex-row my-8 gap-4 text-sm justify-between w-full">
              <div>
                <p className="mb-1 text-fd-muted-foreground">Written by</p>
                {authors.map((author: string) => (
                  <AuthorCard key={author} authorKey={author as AuthorKey} />
                ))}
              </div>
              <div>
                <p className="mb-1 text-sm text-fd-muted-foreground">At</p>
                <p className="font-medium">{new Date(date).toDateString()}</p>
              </div>
            </div>

            <Mdx components={defaultMdxComponents} />

            <div className="mt-8 flex gap-3 items-center not-prose">
              <p>Tags:</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((t: string) => (
                  <TagBadge key={t} tagKey={t as TagKey} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between mt-8 gap-4">
            {prev ? (
              <Link
                to="/blog/$slug"
                params={{ slug: prev.slug }}
                className="flex flex-col gap-0.5 border border-fd-border rounded-lg p-6 flex-1 hover:bg-fd-accent transition-colors"
              >
                <span className="text-xs text-fd-muted-foreground">
                  Previous Page
                </span>
                <span className="text-sm font-semibold">‹ {prev.title}</span>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
            {next ? (
              <Link
                to="/blog/$slug"
                params={{ slug: next.slug }}
                className="flex flex-col gap-0.5 border border-fd-border rounded-lg p-4 flex-1 hover:bg-fd-accent transition-colors items-end"
              >
                <span className="text-sm font-semibold">{next.title} ›</span>
                <span className="text-xs text-fd-muted-foreground">
                  Next Page
                </span>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        </article>

        <aside className="hidden xl:flex flex-col w-[300px] shrink-0">
          <div className="sticky top-20">
            <div className="flex flex-row items-center gap-2 mb-3">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-fd-muted-foreground"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="15" y2="18" />
              </svg>
              <p className="text-xs font-medium text-fd-muted-foreground">
                On this page
              </p>
            </div>
            <div className="flex flex-col border-l border-fd-border">
              {toc.map(
                (item: { url: string; title: string; depth: number }) => (
                  <a
                    key={item.url}
                    href={item.url}
                    style={{ paddingLeft: `${(item.depth - 1) * 14 + 12}px` }}
                    className="text-xs text-fd-muted-foreground hover:text-fd-foreground transition-colors py-1.5 border-l border-transparent hover:border-fd-foreground -ml-px"
                  >
                    {item.title}
                  </a>
                )
              )}
            </div>
          </div>
        </aside>
      </div>
    );
  },
});

function Page() {
  const { path } = Route.useLoaderData();
  const Component = clientLoader.getComponent(path);
  return <Component />;
}

export const Route = createFileRoute("/(home)/blog/$slug")({
  ssr: true,
  loader: async ({ params }) => {
    const data = await serverLoader({ data: params.slug });
    await clientLoader.preload(data.path);
    return data;
  },
  notFoundComponent: () => <p>Post not found.</p>,
  component: Page,
});
