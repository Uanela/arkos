import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { authors } from "@/lib/authors";
import type { AuthorKey } from "@/lib/authors";
import { blog } from "@/lib/source";

const getPosts = createServerFn({ method: "GET" }).handler(async () => {
  const posts = blog
    .getPages()
    .sort(
      (a, b) =>
        new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
    );

  return Promise.all(
    posts.map(async (post) => {
      // const raw = await post.data.getText("raw");
      // const readTime = Math.max(1, Math.ceil(raw.split(" ").length / 200));
      return {
        title: post.data.title,
        description: post.data.description,
        url: post.url,
        date: post.data.date,
        authors: (post.data.authors ?? []) as AuthorKey[],
        tags: post.data.tags ?? [],
        // readTime,
      };
    })
  );
});

export const Route = createFileRoute("/(home)/blog/")({
  ssr: true,
  loader: async () => {
    const postsWithMeta = await getPosts();
    return { postsWithMeta };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { postsWithMeta } = Route.useLoaderData();

  return (
    <main className="w-full max-w-[1200px] mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-10">Our Latest News</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {postsWithMeta.map((post) => (
          <div
            key={post.url}
            className="flex flex-col border border-fd-border rounded-xl bg-fd-card overflow-hidden"
          >
            <div className="flex flex-col flex-1 p-5 gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-fd-muted-foreground">
                  {new Date(post.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {/* {" · "} */}
                  {/* {post.readTime} min read */}
                </span>
                <div className="flex -space-x-2">
                  {post.authors.map((a) => {
                    const author = authors[a];
                    return author ? (
                      <img
                        key={a}
                        src={author.image_url}
                        alt={author.name}
                        title={author.name}
                        className="size-7 rounded-full border-2 border-fd-card object-cover"
                      />
                    ) : null;
                  })}
                </div>
              </div>

              <h2 className="text-base font-bold leading-snug">{post.title}</h2>

              {post.description && (
                <p className="text-sm text-fd-muted-foreground line-clamp-3 flex-1">
                  {post.description}
                </p>
              )}
            </div>

            <Link
              to={post.url}
              className="mx-4 mb-4 py-2 text-sm text-center rounded-lg font-medium bg-fd-primary text-fd-primary-foreground hover:bg-fd-primary/90 transition-colors"
            >
              Read More
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
