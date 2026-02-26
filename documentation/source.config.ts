import { defineConfig, defineDocs } from "fumadocs-mdx/config";

export const docs = defineDocs({
  dir: "content/docs",
  
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});

export default defineConfig();

import { defineCollections } from "fumadocs-mdx/config";
import { pageSchema } from "fumadocs-core/source/schema";
// import { z } from 'zod';

export const blogPosts = defineCollections({
  type: "doc",
  dir: "content/blog",
  // add required frontmatter properties
  // schema: pageSchema.extend({
  //   author: z.string(),
  //   date: z.string().date().or(z.date()),
  // }),
});
