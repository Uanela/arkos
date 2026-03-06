import { Link } from "@tanstack/react-router";
import { type ReactElement } from "react";

export default function AnnoucementBanner(): ReactElement {
  return (
    <div className="bg-gradient-to-r from-sky-500 to-emerald-400 p-1 text-center text-slate-800 font-bold md:text-lg text-base">
      <Link
        to="/blog/1.5-beta"
        className="text-slate-900 hover:text-slate-800 underline"
      >
        Arkos.js v1.5-beta
      </Link>{" "}
      is out 🥳
    </div>
  );
}
