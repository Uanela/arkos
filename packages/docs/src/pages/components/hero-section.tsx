import { type ReactElement, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faBook } from "@fortawesome/free-solid-svg-icons";
import { Tooltip } from "react-tooltip";
import Link from "@docusaurus/Link";

export default function HeroSection(): ReactElement {
  const [tooltipText, setTooltip] = useState("Copy Code!");

  return (
    <header
      id="tailwind"
      className="bg-[#020d1f] text-white tailwind flex justify-center hero-section"
    >
      <div className="container mx-auto px-4 md:pt-6 pt-12">
        {/* Hero Content */}
        <div
          id="tailwind"
          className="max-w-6xl mx-auto text-center md:mb-20 lg:mt-24 md:mt-16 mt-10 relative h-[100%] md:max-h-[380px]"
        >
          {/* Bubbles */}
          <div className="absolute md:size-[500px] size-[200px] bg-sky-500 rounded-full opacity-10 blur-3xl z-0"></div>
          <div className="absolute bottom-full left-full md:size-[500px] size-[200px] bg-sky-500 rounded-full opacity-10 blur-3xl"></div>

          <div
            id="tailwind"
            className="bg-white  text-zinc-900 py-1 px-4 rounded-full w-fit mx-auto text-center mb-2 text-xs font-bold z-10"
          >
            BETA VERSION
          </div>
          <h2 className="lg:text-7xl md:text-5xl text-3xl font-bold z-10">
            The <span className="text-sky-400 ">Express</span> &{" "}
            <span className="text-[#36a394]">Prisma</span> RESTful
            Framework{" "}
          </h2>
          <p className="my-12 md:text-base text-sm text-gray-300 lg:text-lg capitalize z-10 max-w-4xl text-center mx-auto">
            Build{" "}
            <span className="font-bold text-white">secure and scalable</span>{" "}
            RESTful APIs with{" "}
            <span className="font-bold text-white">minimal configuration </span>
            , focusing on <br /> what really matters for the business logic
          </p>
          <div className="flex justify-center  z-10 flex-col items-center gap-2 md:flex-row">
            <Link
              to="/docs/intro"
              className="bg-sky-500 hover:bg-sky-600 text-white font-medium py-2 px-6 rounded-md w-[285px] md:w-[180px] flex items-center gap-2 justify-center z-10 hover:text-white"
            >
              <span>Learn More</span>
              <FontAwesomeIcon icon={faBook} className="size-[17px]" />
            </Link>
            <Link
              to="https://github.com/uanela/arkos"
              className="bg-gray-700 hover:bg-gray-800 text-white font-medium py-2 px-6 rounded-md w-[285px] md:w-[180px] flex items-center gap-2 justify-center"
            >
              <span>GitHub</span>
              <FontAwesomeIcon icon={faGithub} className="size-5" />
            </Link>
          </div>
          <div className="md:mt-4 mt-4 text-center cursor-pointer group w-fit mx-auto md:px-0 md:w-full">
            <div
              className="rounded-md bg-sky-500/5 outline-none outline outline-sky-500 py-2 max-w-[370px] mx-auto relative group cursor-pointer hover:[box-shadow:0px_0px_20px_0px_#0ea5e9aa] create-arkos-cmd md:px-3 px-8"
              onClick={() => {
                navigator.clipboard.writeText("npx create-arkos@latest");
                setTooltip("Copied!");
                setTimeout(() => setTooltip("Copy Code!"), 1500);
              }}
            >
              <p className="text-sky-100 py-0 my-0 font-mono text-base md:text-base cursor-pointer">
                npm create arkos@latest
              </p>
              <Tooltip
                style={{
                  backgroundColor: "#2c2f3e",
                  color: "#fff",
                  fontWeight: "bold",
                }}
                anchorSelect=".create-arkos-cmd"
                className="z-[10]"
              >
                {tooltipText}
              </Tooltip>{" "}
              <div className="absolute md:right-3 right-2 top-[55%] transform -translate-y-1/2  group-hover:opacity-100 transition-opacity text-sky-100 hover:text-white">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
