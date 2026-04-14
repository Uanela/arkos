export const authors = {
  uanela: {
    name: "Uanela Como",
    title: "Fullstack Developer@Mesquita Group & SuperM7.com Founder",
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
