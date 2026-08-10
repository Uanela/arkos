import { pageSchema } from 'fumadocs-core/source/schema';
import {
  defineCollections,
  defineConfig,
  defineDocs,
} from "fumadocs-mdx/config";
import z from "zod";

function rehypeFixInvalidStyles() {
  return (tree: any) => {
    function walk(node: any) {
      if (node.type === "element" && typeof node.properties?.style === "string") {
        const cleaned = node.properties.style
          .split(";")
          .filter((decl: string) => {
            const prop = decl.split(":")[0]?.trim();
            return prop && !prop.startsWith("--");
          })
          .join(";");

        if (cleaned.trim()) {
          node.properties.style = cleaned;
        } else {
          delete node.properties.style;
        }
      }
      if (Array.isArray(node.children)) {
        node.children.forEach(walk);
      }
    }
    walk(tree);
  };
}

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});

export default defineConfig({
  mdxOptions: {
    rehypePlugins: (v) => [...v, rehypeFixInvalidStyles],
  },
});

export const blogPosts = defineCollections({
  dir: "content/blog",
  type: "doc",
  schema: () =>
    pageSchema.extend({
      title: z.string(),
      description: z.string().optional(),
      date: z.coerce.date(),
      authors: z.array(z.string()),
      tags: z.array(z.string()).optional(),
    }),
});

export const tutorialColletions = defineCollections({
  dir: "content/tutorials",
  type: "doc",
  schema: () =>
    pageSchema.extend({
      title: z.string(),
      description: z.string().optional(),
    }),
});
