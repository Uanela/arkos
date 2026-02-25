import { Image } from "fumadocs-core/framework";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export const gitConfig = {
  user: "uanela",
  repo: "arkos",
  branch: "main",
};

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <div>
          <Image
            src="/img/arkos-js-logo-dark.svg"
            className="w-26 aspect-auto"
          />
        </div>
      ),
    },

    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,

    // footer: {
    //   copyright: `Copyright © ${new Date().getFullYear()} SuperM7.com, Lda.`,
    // },

    // theme: {
    //   defaultTheme: "dark",
    //   enableSystem: false,
    // },

    themeSwitch: {
      enabled: false,
      mode: "light-dark",
    },
    links: [
      {
        text: "Documentation",
        url: "/docs/intro",
        secondary: false,
      },
      {
        text: "Blog",
        url: "/blog",
        secondary: false,
      },
      {
        text: "Showcase",
        url: "/showcase",
        secondary: false,
      },
      {
        text: "Sponsors",
        url: "/sponsors",
        secondary: false,
      },
    ],
  };
}
