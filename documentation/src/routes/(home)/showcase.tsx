import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

const categories = [
  "All",
  "E-Commerce",
  "SaaS",
  "Corporate",
  "Portfolio",
] as const;

const showcaseItems = [
  {
    name: "SuperM7.com",
    description: "Mozambique's best e-commerce platform",
    category: "E-Commerce",
    url: "https://www.superm7.com",
    image: "/img/superm7-logo.webp",
  },
  // {
  //   name: "Cornelder",
  //   description: "Port logistics management system",
  //   category: "Corporate",
  //   url: "https://www.cornelder.co.mz",
  //   image: "/img/showcase/cornelder.png",
  // },
  // {
  //   name: "Dintell",
  //   description: "Tech solutions for Mozambique",
  //   category: "Corporate",
  //   url: "https://www.dintell.co.mz",
  //   image: "/img/showcase/dintell.png",
  // },
  // {
  //   name: "Mesquita Group",
  //   description: "Business group digital platform",
  //   category: "Corporate",
  //   url: "https://www.mesquitagroup.co.mz",
  //   image: "/img/showcase/mesquita.png",
  // },
  // {
  //   name: "SparkTech",
  //   description: "Tech startup platform",
  //   category: "SaaS",
  //   url: "https://sparktechh.com",
  //   image: "/img/showcase/sparktech.png",
  // },
];

export const Route = createFileRoute("/(home)/showcase")({
  loader: async () => {
    const [repoRes, commitsRes, releasesRes] = await Promise.all([
      fetch("https://api.github.com/repos/uanela/arkos"),
      fetch("https://api.github.com/repos/uanela/arkos/commits?per_page=1"),
      fetch("https://api.github.com/repos/uanela/arkos/releases/latest"),
    ]);

    const repo = await repoRes.json();
    const commitsLink = commitsRes.headers.get("link") ?? "";
    const releases = await releasesRes.json();

    const match = commitsLink.match(/page=(\d+)>; rel="last"/);
    const commits = match ? parseInt(match[1]) : "100+";

    return {
      stars: repo.stargazers_count as number,
      forks: repo.forks_count as number,
      version: releases.tag_name as string,
      commits,
    };
  },
  component: ShowcasePage,
});

function ShowcasePage() {
  const { stars, version, commits } = Route.useLoaderData();
  const [active, setActive] = useState<string>("All");

  const filtered =
    active === "All"
      ? showcaseItems
      : showcaseItems.filter((s) => s.category === active);

  return (
    <main className="flex flex-col w-full">
      <section className="flex flex-col items-center text-center px-4 py-20 gap-6 border-b border-fd-border">
        <h1 className="text-4xl md:text-5xl font-bold max-w-2xl leading-tight">
          Built with Arkos.js by great developers
        </h1>
        <p className="text-fd-muted-foreground max-w-lg">
          Discover real-world applications built with Arkos.js — from e-commerce
          platforms to enterprise systems.
        </p>
        <div className="flex items-center gap-3 mt-2">
          <a
            href="https://github.com/uanela/arkos/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-fd-primary text-fd-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-fd-primary/90 transition-colors"
          >
            Submit yours →
          </a>
          <Link
            to="/docs"
            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg border border-fd-border hover:bg-fd-accent transition-colors"
          >
            Get started
          </Link>
        </div>
      </section>

      <section className="grid md:grid-cols-3 border-b border-fd-border">
        {[
          { value: version, label: "Latest Version" },
          { value: stars.toLocaleString(), label: "GitHub Stars" },
          {
            value:
              typeof commits === "number" ? commits.toLocaleString() : commits,
            label: "Commits",
          },
          ,
        ].map((stat) => (
          <div
            key={stat?.label}
            className="flex flex-col items-center justify-center py-12 gap-1 border-r border-fd-border last:border-r-0"
          >
            <span className="text-4xl font-bold">{stat?.value}</span>
            <span className="text-sm text-fd-muted-foreground">
              {stat?.label}
            </span>
          </div>
        ))}
      </section>

      <section className="flex flex-col items-center px-4 py-16 gap-8 max-w-[1200px] mx-auto w-full">
        <h2 className="text-2xl font-bold text-center">
          Meet projects built with Arkos.js
        </h2>

        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                active === cat
                  ? "bg-fd-primary text-fd-primary-foreground border-fd-primary"
                  : "border-fd-border text-fd-muted-foreground hover:text-fd-foreground hover:border-fd-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {filtered.map((item) => (
            <a
              key={item.name}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col border border-fd-border rounded-xl overflow-hidden hover:border-fd-primary transition-colors bg-fd-card"
            >
              <div className="relative w-full aspect-video bg-fd-muted overflow-hidden">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-fd-muted-foreground text-sm">
                    No preview
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{item.name} ↗</span>
                  <span className="text-xs text-fd-muted-foreground border border-fd-border rounded-full px-2 py-0.5">
                    {item.category}
                  </span>
                </div>
                <p className="text-xs text-fd-muted-foreground">
                  {item.description}
                </p>
              </div>
            </a>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-fd-muted-foreground text-sm">
            No projects in this category yet.
          </p>
        )}
      </section>

      <section className="flex flex-col items-center text-center px-4 py-16 gap-4 border-t border-fd-border">
        <h2 className="text-2xl font-bold">Using Arkos.js?</h2>
        <p className="text-fd-muted-foreground max-w-md text-sm">
          Submit your project and get featured in the Arkos.js showcase.
        </p>
        <a
          href="https://github.com/uanela/arkos/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-fd-primary text-fd-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-fd-primary/90 transition-colors"
        >
          Submit your project →
        </a>
      </section>
    </main>
  );
}
