import {
  defineCollections,
  defineConfig,
  defineDocs,
  frontmatterSchema,
} from "fumadocs-mdx/config";
import z from "zod";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});

export default defineConfig({});

export const blogPosts = defineCollections({
  dir: "content/blog",
  type: "doc",
  // includeProcessedMarkdown: true,
  // async: true,
  schema: () =>
    frontmatterSchema.extend({
      title: z.string(),
      description: z.string().optional(),
      date: z.date(),
      authors: z.array(z.string()),
      tags: z.array(z.string()).optional(),
    }),
});
