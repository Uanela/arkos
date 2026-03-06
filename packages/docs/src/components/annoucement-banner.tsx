import { type ReactElement } from "react";
import Link from "@docusaurus/Link";

export default function AnnoucementBanner(): ReactElement {
  return (
    <div className="bg-gradient-to-r from-sky-500 to-emerald-400 p-1 text-center text-slate-800 font-bold md:text-lg text-base">
      <Link
        href="/blog/1.5-beta"
        className="text-slate-900 hover:text-slate-800 underline"
      >
        Arkos.js v1.5-beta
      </Link>{" "}
      is out 🥳
    </div>
  );
}
