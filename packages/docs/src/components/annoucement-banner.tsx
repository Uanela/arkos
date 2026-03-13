import { type ReactElement } from "react";
import Link from "@docusaurus/Link";

export default function AnnoucementBanner(): ReactElement {
  return (
    <div className="bg-gradient-to-r from-sky-500 to-emerald-400 p-1 text-center text-slate-800 font-bold md:text-lg text-base">
      <Link
        href="/blog/one-year-of-arkos"
        className="text-slate-900 hover:text-slate-800 underline"
      >
        One Year Of Arkos.js
      </Link>{" "}
      🥳
    </div>
  );
}
