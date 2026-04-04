import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import * as React from "react";
import appCss from "@/styles/app.css?url";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "@/lib/layout.shared";

export const Route = createRootRoute({
  head: () => ({
    title: "Arkos.js - The Express And Prisma RESTful Framework",
    meta: [
      {
        charSet: "utf-8",
      },
      { title: "Arkos.js - The Express And Prisma RESTful Framework" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        name: "description",
        content:
          "A tool for backend developers and teams who ship softwares with complex business logic under tight deadlines",
      },
      {
        name: "theme-color",
        content: "#000000",
      },
      {
        name: "og:title",
        content: "Arkos.js - The Express And Prisma RESTful Framework",
      },
      {
        name: "og:image",
        content: "/img/arkos-social-card.webp",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/img/favicon.ico",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  component: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex flex-col min-h-screen">
        <RootProvider>
          {/* <AnnoucementBanner /> */}

          <HomeLayout {...baseOptions()}>{children}</HomeLayout>
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
