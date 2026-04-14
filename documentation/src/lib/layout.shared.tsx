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
            className="w-26 object-contain"
          />
        </div>
      ),
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
    themeSwitch: {
      enabled: false,
      mode: "light-dark",
    },
    links: [
      {
        text: "Learn",
        url: "/learn",
        on: "all",
      },
      {
        text: "Documentation",
        url: "/docs",
        on: "all",
      },
      {
        text: "Blog",
        url: "/blog",
        on: "all",
      },
      {
        text: "Showcase",
        url: "/showcase",
        on: "all",
      },
      {
        text: "Sponsors",
        url: "/sponsors",
        on: "all",
      },
    ],
  };
}
