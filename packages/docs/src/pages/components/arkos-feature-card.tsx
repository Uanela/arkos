import { LucideProps } from "lucide-react";
import React from "react";
import { twMerge } from "tailwind-merge";

export default function ArkosFeatureCard({
  title,
  description,
  Icon,
  to,
  outline,
  titleHover,
  reverse,
  sideContent,
  iconColor,
}: {
  title: string;
  description: React.ReactNode;
  Icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
  >;
  to: string;
  outline: string;
  titleHover: string;
  reverse: boolean;
  sideContent?: any;
  iconColor?: string;
}) {
  return (
    <div
      data-is-reverse={reverse}
      className="flex items-center md:flex-row flex-col md:gap-2 w-full md:data-[is-reverse=true]:flex-row-reverse"
    >
      <div
        to={to}
        className={twMerge(`min-h-32 h-full text-white w-full`, `${outline}`)}
      >
        {sideContent}
      </div>
      <div>
        <Icon
          className="font-bold md:size-8 text-sky-500 drop-shadow-[0px_0px_12px_#0ea5e9ff]"
          strokeWidth={2.5}
          style={{
            ...(iconColor && {
              color: iconColor,
              filter: `drop-shadow(0px 0px 12px ${iconColor})`,
            }),
          }}
        />
      </div>
      <div
        data-is-reverse={reverse}
        className="data-[is-reverse=true]:col-start-1 w-full"
      >
        <div className="md:p-2 w-full">
          <h3
            className={twMerge(
              `md:text-4xl sm:text-2xl text-lg font-bold mb-2 text-white flex items-center gap-2 text-center md:text-left w-full`,
              titleHover
            )}
          >
            <span className="w-full">{title}</span>
          </h3>
          <p className="text-gray-400 md:text-base text-sm md:mt-2 text-justify md:text-left">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
