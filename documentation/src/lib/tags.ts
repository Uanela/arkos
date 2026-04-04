export const tags = {
  superm7: {
    label: "SuperM7.com",
    permalink: "https://www.superm7.com",
    description: "Mozambique Best Ecommerce",
  },
  arkosjs: {
    label: "Arkos.js",
    permalink: "/",
    description: "The Express And Prisma Framework For RESTful API",
  },
} as const;

export type TagKey = keyof typeof tags;
