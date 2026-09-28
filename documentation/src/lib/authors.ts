export const authors = {
  uanela: {
    name: "Uanela Como",
    title: "Maintainer & Founder@SuperM7.com",
    url: "https://uanelacomo.com",
    image_url: "https://github.com/uanela.png",
    socials: {
      linkedin: "uanelacomo",
      github: "uanela",
      newsletter: "https://uanelacomo.com/blog",
    },
  },
} as const;

export type AuthorKey = keyof typeof authors;
