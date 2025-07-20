import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import { configDotenv } from "dotenv";

configDotenv();

const config: Config = {
  title: "Arkos.js",
  tagline: "The Express And Prisma Framework For RESTful API",
  favicon: "img/favicon.ico",
  url: "https://www.arkosjs.com",
  baseUrl: "/",
  organizationName: "SuperM7.com", // Usually your GitHub org/user name.
  projectName: "Arkos.js", // Usually your repo name.
  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en", "pt"],
  },
  plugins: [
    async function myPlugin() {
      return {
        name: "docusaurus-tailwindcss",
        configurePostCss(postcssOptions) {
          postcssOptions.plugins.push(require("tailwindcss"));
          postcssOptions.plugins.push(require("autoprefixer"));
          return postcssOptions;
        },
      };
    },
  ],

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",

          // editUrl:
          //   "https://github.com/supmer7/docusaurus/tree/main/packages/create-docusaurus/templates/shared/",
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ["rss", "atom"],
            xslt: true,
          },

          editUrl: "https://github.com/supmer7-com/arkos-docs/blog",
          onInlineTags: "warn",
          onInlineAuthors: "warn",
          onUntruncatedBlogPosts: "warn",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    image: "img/arkos-social-card.webp",
    navbar: {
      logo: {
        alt: "Arkos js Logo",
        src: "img/arkos-js-logo.svg",
        srcDark: "img/arkos-js-logo-dark.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "tutorialSidebar",
          position: "right",
          label: "Docs",
        },
        { to: "/blog", label: "Blog", position: "right" },
        {
          href: "https://github.com/uanela/arkos",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Docs",
              to: "/docs/intro",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "WhatsApp",
              href: "https://chat.whatsapp.com/EJ8cjb9hxau0EcOnI4fdpD",
            },
            // {
            //   label: "Discord",
            //   href: "https://discordapp.com/invite/docusaurus",
            // },
            // {
            //   label: "X",
            //   href: "https://x.com/docusaurus",
            // },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "Blog",
              to: "/blog",
            },
            {
              label: "GitHub",
              href: "https://github.com/uanela/arkos",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} SuperM7.com, Lda.`,
    },
    algolia: {
      appId: process.env.ALGOLIA_APP_ID,
      apiKey: process.env.ALGOLIA_SEARCH_API_KEY,
      indexName: process.env.ALGOLIA_INDEX_NAME,
      contextualSearch: true,
      insights: true,
    },
    prism: {
      theme: prismThemes.oneDark,
      // darkTheme: prismThemes.oneDark,
    },
    onBrokenLinks: "ignore",
    onBrokenMarkdownLinks: "ignore",
  } satisfies Preset.ThemeConfig,
};

export default config;
