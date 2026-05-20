import { createFileRoute, notFound } from "@tanstack/react-router";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { createServerFn } from "@tanstack/react-start";
import { source } from "@/lib/source";
import browserCollections from ".source/browser";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { baseOptions, gitConfig } from "@/lib/layout.shared";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { Suspense } from "react";
import { LLMCopyButton, ViewOptions } from "@/components/ai/page-actions";

export const Route = createFileRoute("/docs/$")({
  component: Page,
  ssr: true,
  loader: async ({ params }) => {
    const slugs = params._splat?.split("/") ?? [];
    const data = await serverLoader({ data: slugs });
    await clientLoader.preload(data.path);
    return data;
  },
  head: async ({ loaderData }) => {
    return {
      meta: [
        { title: loaderData.title },
        { name: "description", content: loaderData.description },
        { property: "og:title", content: loaderData.title },
        { property: "og:description", content: loaderData.description },
      ],
    };
  },
});

const serverLoader = createServerFn({
  method: "GET",
})
  .inputValidator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }) => {
    const page = source.getPage(slugs);
    if (!page) throw notFound();

    const contents = page?.data.structuredData.contents;

    const title = page?.data.title
      ? `${page.data.title} - Arkos.js Documentation`
      : "Arkos.js Documentation";

    const description =
      page?.data.description ||
      contents
        ?.slice(
          0,
          contents?.[0].content.toLowerCase().startsWith("> available from")
            ? 3
            : 2
        )
        .map((c) =>
          c.content.toLowerCase().startsWith("> available from")
            ? undefined
            : c.content
        )
        .filter(Boolean)
        .join(". ") ||
      "Arkos.js — The Express and Prisma RESTful Framework. Build secure and scalable RESTful APIs with minimal configuration.";

    return {
      url: page.url,
      path: page.path,
      pageTree: await source.serializePageTree(source.getPageTree()),
      title,
      description,
    };
  });

const clientLoader = browserCollections.docs.createClientLoader({
  component(
    { toc, frontmatter, default: MDX },
    // you can define props for the component
    {
      url,
      path,
    }: {
      url: string;
      path: string;
    }
  ) {
    return (
      <DocsPage toc={toc} className="pb-24">
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <div className="flex flex-row gap-2 items-center border-b -mt-4 pb-8">
          <LLMCopyButton markdownUrl={`${url}.mdx`} />
          <ViewOptions
            markdownUrl={`${url}.mdx`}
            githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${path}`}
          />
        </div>
        <DocsBody>
          <MDX
            components={{
              ...defaultMdxComponents,
            }}
          />
        </DocsBody>
      </DocsPage>
    );
  },
});

function Page() {
  const data = useFumadocsLoader(Route.useLoaderData());

  return (
    <DocsLayout
      {...baseOptions()}
      nav={{ title: undefined }}
      sidebar={{
        collapsible: false,
        footer: false,
        tabs: false,
      }}
      searchToggle={{ enabled: false }}
      links={[]}
      tree={data.pageTree}
      githubUrl={undefined}
      containerProps={{
        className:
          "h-[calc(100vh-60px)] w-full  top-[56px] fixed overflow-auto",
      }}
    >
      <Suspense>{clientLoader.useContent(data.path, data)}</Suspense>
    </DocsLayout>
  );
}
