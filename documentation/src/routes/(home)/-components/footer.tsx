import { Link } from "@tanstack/react-router";
import { Github, Linkedin, Globe } from "lucide-react";
import { Image } from "fumadocs-core/framework";

const footerLinks = {
  Resources: [
    { label: "Documentation", to: "/docs" },
    { label: "Quick Start", to: "/docs/quick-start" },
    { label: "Learn", to: "/learn" },
    { label: "Showcase", to: "/showcase" },
    { label: "Blog", to: "/blog" },
    { label: "Sponsors", to: "/sponsors" },
  ],
  Community: [
    { label: "GitHub", href: "https://github.com/uanela/arkos" },
    { label: "LinkedIn", href: "https://linkedin.com/in/uanelacomo" },
    { label: "SuperM7.com", href: "https://superm7.com" },
    { label: "uanelacomo.com", href: "https://uanelacomo.com" },
  ],
  Legal: [
    {
      label: "MIT License",
      href: "https://github.com/uanela/arkos/blob/main/LICENSE",
    },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-fd-border mt-auto">
      <div className="max-w-[1200px] mx-auto px-6 py-12 flex flex-col gap-10">
        <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-2">
              <Image
                src="/img/arkos-js-logo-dark.svg"
                alt="Arkos.js"
                className="h-12 w-auto"
              />
            </Link>
            <p className="text-fd-muted-foreground leading-relaxed max-w-[220px]">
              The Express & Prisma RESTful Framework for building secure and
              scalable Node.js APIs.
            </p>
            <div className="flex items-center gap-3 mt-1">
              <a
                href="https://github.com/uanela/arkos"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fd-muted-foreground hover:text-fd-foreground transition-colors"
              >
                <Github className="size-4" />
              </a>
              <a
                href="https://linkedin.com/in/uanelacomo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fd-muted-foreground hover:text-fd-foreground transition-colors"
              >
                <Linkedin className="size-4" />
              </a>
              <a
                href="https://uanelacomo.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fd-muted-foreground hover:text-fd-foreground transition-colors"
              >
                <Globe className="size-4" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group} className="flex flex-col gap-3">
              <p className="font-semibold">{group}</p>
              <div className="flex flex-col gap-2">
                {links.map((link) =>
                  "to" in link ? (
                    <Link
                      key={link.label}
                      to={link.to}
                      className="text-sm text-fd-muted-foreground hover:text-fd-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-fd-muted-foreground hover:text-fd-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-row items-center justify-between border-t border-fd-border pt-6 gap-4">
          <p className="text-sm text-fd-muted-foreground">
            © {new Date().getFullYear()} Arkos.js. Built by{" "}
            <a
              href="https://superm7.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fd-foreground transition-colors underline"
            >
              SuperM7.com
            </a>
            .
          </p>
          <p className="text-sm text-fd-muted-foreground">
            Released under the MIT License.
          </p>
        </div>
      </div>
    </footer>
  );
}
