import { LucideProps } from "lucide-react";
import React from "react";
import Link from "@docusaurus/Link";
import { twMerge } from "tailwind-merge";

export default function ArkosFeatureCard({
  title,
  description,
  icon,
  to,
  outline,
  titleHover,
}: {
  title: string;
  description: string;
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
  >;
  to: string;
  outline: string;
  titleHover: string;
}) {
  return (
    <Link
      to={to}
      className={twMerge(
        `tailwind rounded-lg bg-[#090e1f] overflow-hidden group border-2 border-white outline outline-offset-1 outline-gray-50/0 z-10 group`,
        `${outline}`
      )}
    >
      <div className="bg-[#090e1f] p-4 mt-4 md:aspect-[16/5]  flex items-center justify-center overflow-hidden">
        <span className="grayscale group-hover:grayscale-0 opacity-20 group-hover:opacity-50">
          {icon}
        </span>
      </div>
      <div className="p-4">
        <h3
          className={twMerge(
            `md:text-xl text-lg font-semibold mb-2 text-sky-500`,
            titleHover
          )}
        >
          {title}
        </h3>
        <p className="text-gray-400 text-base">{description}</p>
      </div>
    </Link>
  );
}
