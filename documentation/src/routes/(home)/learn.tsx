import { createFileRoute, Link } from "@tanstack/react-router";
import { Rocket, ShieldCheck, Wrench, BookOpen } from "lucide-react";

const foundations = [
  {
    title: "Node.js and Express.js - Full Course",
    description: "Learn the fundamentals of Node.js and Express from scratch.",
    category: "Express & Node.js",
    url: "https://youtu.be/Oe421EPjeBE?si=QRPJxuNRWrMo0BN9",
    source: "freeCodeCamp.org",
  },
  {
    title: "NodeJS ExpressJS PostgreSQL Prisma Course",
    description:
      "Build real apps with Node.js, Express, PostgreSQL and Prisma ORM.",
    category: "Prisma ORM",
    url: "https://youtu.be/9BD9eK9VqXA?si=HqVVRj11iYBET_Ow",
    source: "Smoljames",
  },
  {
    title: "JavaScript Tutorial Full Course",
    description: "Master JavaScript from beginner to advanced concepts.",
    category: "JavaScript",
    url: "https://youtu.be/EerdGm-ehJQ?si=k5LmjF8nSDQ-jUtc",
    source: "SuperSimpleDev",
  },
];

const chapters = [
  {
    number: 0,
    title: "Introduction",
    description:
      "Understand what Arkos.js is, its philosophy, and how it compares to other frameworks.",
    href: "/docs",
  },
  {
    number: 1,
    title: "Getting Started",
    description:
      "Install Arkos.js and scaffold your first project using create-arkos.",
    href: "/docs/getting-started/installation",
  },
  {
    number: 2,
    title: "Project Structure",
    description:
      "Explore the Arkos.js project structure and understand how modules are organized.",
    href: "/docs/getting-started/project-structure",
  },
  {
    number: 3,
    title: "Automatic CRUD Generation",
    description:
      "Generate complete RESTful endpoints from your Prisma models with zero boilerplate.",
    href: "/docs/core-concepts/routing/setup",
  },
  {
    number: 4,
    title: "Authentication System",
    description:
      "Set up JWT-based auth with user management, password hashing and role-based access control.",
    href: "/docs/core-concepts/authentication/setup",
  },
  {
    number: 5,
    title: "Interceptor Middlewares",
    description:
      "Control request and response flows with before and after interceptor middlewares.",
    href: "/docs/core-concepts/components/interceptors",
  },
  {
    number: 6,
    title: "Prisma Query Options",
    description:
      "Customize database queries per operation using Prisma query options.",
    href: "/docs/core-concepts/prisma-orm/custom-queries",
  },
  {
    number: 7,
    title: "Data Validation",
    description:
      "Validate request body, query params and path params using Zod or Class-Validator.",
    href: "/docs/guides/validation/setup",
  },
  {
    number: 8,
    title: "File Uploads",
    description:
      "Handle single, multiple and nested file uploads with declarative configuration.",
    href: "/docs/guides/file-uploads/setup",
  },
  {
    number: 9,
    title: "ArkosRouter",
    description:
      "Build declarative, type-safe routes with authentication, validation and uploads in one config.",
    href: "/docs/core-concepts/routing/setup",
  },
  {
    number: 10,
    title: "OpenAPI & Swagger",
    description:
      "Auto-generate API documentation from your Zod schemas and route configurations.",
    href: "/docs/reference/arkos-configuration",
  },
  {
    number: 11,
    title: "CLI Tools",
    description:
      "Use the built-in CLI to scaffold controllers, services, routers, middlewares and more.",
    href: "/docs/tooling/cli/overview",
  },
];

const highlights = [
  {
    icon: Rocket,
    title: "Go from zero to production",
    description:
      "Each chapter builds on the previous one — ship a real API by the end.",
  },
  {
    icon: ShieldCheck,
    title: "Auth included from day one",
    description:
      "Learn JWT auth, RBAC and user management without third-party libraries.",
  },
  {
    icon: Wrench,
    title: "Real-world patterns",
    description:
      "Follow the same patterns used in production apps built with Arkos.js.",
  },
  {
    icon: BookOpen,
    title: "Backed by the docs",
    description:
      "Every chapter links directly to the full reference documentation.",
  },
];

function LearnPage() {
  return (
    <main className="flex flex-col w-full">
      <div className="flex flex-col items-center text-center px-4 py-20 gap-6 border-b border-fd-border max-w-[900px] mx-auto w-full">
        <h1 className="text-4xl md:text-5xl font-bold leading-tight">
          Learn Arkos.js from scratch
        </h1>
        <p className="text-fd-muted-foreground max-w-xl text-lg">
          Go from beginner to confident backend developer by learning the
          foundations of Arkos.js and building real production-ready RESTful
          APIs.
        </p>
        <Link
          to="/docs/quick-start"
          className="inline-flex items-center gap-2 bg-fd-primary text-fd-primary-foreground text-sm font-semibold px-6 py-3 rounded-lg hover:bg-fd-primary/90 transition-colors"
        >
          Start Learning →
        </Link>
      </div>

      <div className="w-full ">
        <div className="grid grid-cols-1 md:grid-cols-2 max-w-[1000px] mx-auto">
          {highlights.map((h, i) => (
            <div
              key={h.title}
              className={`flex flex-row gap-4 items-start p-8 border-b border-fd-border ${
                i % 2 === 0 ? "md:border-r" : ""
              } ${i >= highlights.length - 2 ? "md:border-b-0" : ""} ${
                i === highlights.length - 1 ? "border-b-0" : ""
              }`}
            >
              <div className="flex items-center justify-center size-10 rounded-lg border border-fd-border bg-fd-card shrink-0">
                <h.icon className="size-5 text-fd-primary" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-sm">{h.title}</p>
                <p className="text-xs text-fd-muted-foreground leading-relaxed">
                  {h.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col px-4 pt-16 pb-4 gap-8 max-w-[1000px] mx-auto border-t border-fd-border w-full">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">Pre-requisite Knowledge</h2>
          <p className="text-fd-muted-foreground text-sm">
            Before getting started, it helps to be comfortable with these
            topics. Here are some free resources to get you up to speed.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {foundations.map((f) => (
            <a
              key={f.title}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-row items-center justify-between gap-4 border border-fd-border rounded-xl p-5 hover:bg-fd-accent transition-colors bg-fd-card group"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-fd-primary border border-fd-primary/30 rounded-full px-2 py-0.5">
                    {f.category}
                  </span>
                  <span className="text-xs text-fd-muted-foreground">
                    {f.source}
                  </span>
                </div>
                <p className="font-semibold text-sm">{f.title}</p>
                <p className="text-xs text-fd-muted-foreground">
                  {f.description}
                </p>
              </div>
              <span className="text-fd-muted-foreground group-hover:text-fd-foreground transition-colors shrink-0">
                ↗
              </span>
            </a>
          ))}
        </div>
      </div>

      <div className="flex flex-col px-4 py-16 gap-8 max-w-[1000px] mx-auto w-full">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">
            What will I learn?{" "}
            <span className="text-fd-muted-foreground font-normal text-lg">
              Here's everything that's covered.
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chapters.map((chapter) => (
            <Link
              key={chapter.number}
              to={chapter.href}
              className="flex flex-col gap-2 border border-fd-border rounded-xl p-5 hover:bg-fd-accent hover:border-fd-primary transition-colors bg-fd-card"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center size-7 rounded-full bg-fd-primary text-fd-primary-foreground text-xs font-bold shrink-0">
                  {chapter.number}
                </span>
                <span className="font-semibold text-sm">{chapter.title}</span>
              </div>
              <p className="text-xs text-fd-muted-foreground leading-relaxed">
                {chapter.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-row items-center justify-between px-8 py-8 border-t border-fd-border max-w-[1000px] mx-auto w-full gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-semibold">Arkos.js Documentation</p>
          <p className="text-sm text-fd-muted-foreground">
            The complete reference for installing, configuring and building with
            Arkos.js.
          </p>
        </div>
        <Link
          to="/docs"
          className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border border-fd-border hover:bg-fd-accent transition-colors shrink-0"
        >
          View the Docs →
        </Link>
      </div>
    </main>
  );
}

export const Route = createFileRoute("/(home)/learn")({
  component: LearnPage,
});
