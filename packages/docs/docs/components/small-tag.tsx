import { type ReactElement } from "react";
import { twMerge } from "tailwind-merge";

export default function SmallTag({
  children,
  className,
  style,
  wrapperClassName,
  wrapperStyle,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  wrapperStyle?: React.CSSProperties;
  wrapperClassName?: string;
}): ReactElement {
  return (
    <span
      className={twMerge(
        "bg-red-500 inline-flex items-center",
        wrapperClassName
      )}
      style={wrapperStyle}
    >
      <span
        className={twMerge(
          "text-sm text-zinc-900 bg-sky-500 rounded-sm inline-block",
          className
        )}
        style={{
          paddingBlock: "1px",
          paddingInline: "4px",
          display: "inline-block",
          ...style,
        }}
      >
        {children}
      </span>
    </span>
  );
}
