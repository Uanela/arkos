import { type ReactElement } from "react";
import { twMerge } from "tailwind-merge";

export default function CompaniesLogos(): ReactElement {
  const logos = [
    { url: "uanela-logo.webp", className: "h-12" },
    { url: "simplicity-logo.webp", className: "h-12" },
    { url: "superm7-logo.webp", className: "h-12" },
    { url: "formula-web-pro-max-logo.webp", className: "h-16" },
    { url: "grupo-vergui-logo.webp", className: "h-14" },
  ];

  return (
    <div className="mx-auto md:mt-24 sm:mt-16 mt-10 px-4">
      <div className="flex md:gap-24 sm:gap-20 gap-6 items-center">
        {logos.map((logo) => (
          <div>
            <img
              src={`/img/${logo.url}`}
              alt={logo.url}
              className={twMerge(
                "h-14 object-contain grayscale hover:filter-none brightness-150 opacity-70 transition-all",
                logo.className
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
