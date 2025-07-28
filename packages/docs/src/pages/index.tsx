import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faBook } from "@fortawesome/free-solid-svg-icons";
import ArkosFeatureCard from "./components/arkos-feature-card";
import { arkosFeatures } from "../utils/arkos-features";

export default function Home() {
  return (
    <div className="tailwind overflow-hidden max-w-[100vw]">
      <Layout description="Node.js backend framework for simplifying API development with automatic route generation, authentication, and minimal configuration.">
        {/* Hero Section */}
        <header
          id="tailwind"
          className="bg-[#020d1f] text-white tailwind flex justify-center"
        >
          <div className="container mx-auto px-4 py-12">
            {/* Hero Content */}
            <div
              id="tailwind"
              className="max-w-6xl mx-auto text-center md:mb-24 lg:mt-24 md:mt-20 mt-10 relative h-[100%] md:max-h-[800px]"
            >
              <div className="absolute md:size-[500px] size-[200px] bg-sky-500 rounded-full opacity-30 blur-3xl z-0"></div>
              <div className="absolute bottom-full left-full md:size-[500px] size-[200px] bg-sky-500 rounded-full opacity-50 blur-3xl"></div>

              <div
                id="tailwind"
                className="bg-white  text-zinc-900 py-1 px-4 rounded-full w-fit mx-auto text-center mb-2 text-xs font-bold z-10"
              >
                BETA VERSION
              </div>
              <h1 className="lg:text-7xl md:text-5xl text-3xl font-bold mb-8 z-10">
                The Express & Prisma Framework For RESTful API
              </h1>
              <p className="mb-8 text-base text-gray-300 lg:text-lg capitalize z-10 max-w-5xl text-center mx-auto">
                Used to simplify the development of a{" "}
                <span className="font-bold text-white">
                  secure and scalable RESTful API with minimal configuration
                </span>
                , allowing developers to focus on what really matters for the
                business
              </p>
              <div className="flex justify-center md:mt-16 z-10 flex-col items-center gap-2 md:flex-row">
                <Link
                  to="/docs/intro"
                  className="bg-sky-500 hover:bg-sky-600 text-white font-medium py-2 px-6 rounded-md w-[200px] md:w-[180px] flex items-center gap-2 justify-center z-10"
                >
                  <span>Learn More</span>
                  <FontAwesomeIcon icon={faBook} className="size-[17px]" />
                </Link>
                <Link
                  to="https://github.com/uanela/arkos"
                  className="bg-gray-700 hover:bg-gray-800 text-white font-medium py-2 px-6 rounded-md w-[200px] md:w-[180px] flex items-center gap-2 justify-center"
                >
                  <span>GitHub</span>
                  <FontAwesomeIcon icon={faGithub} className="size-5" />
                </Link>
              </div>
              <div className="mt-3 text-center">
                <div
                  className="rounded-md bg-sky-500/10 px-3 py-2.5 max-w-[370px] mx-auto relative group cursor-pointer"
                  onClick={() =>
                    navigator.clipboard.writeText("npx create-arkos@latest")
                  }
                >
                  <p className="text-sky-100 py-0 my-0 font-mono text-sm">
                    npx create-arkos@latest
                  </p>
                  <div className="absolute right-3 top-[55%] transform -translate-y-1/2  group-hover:opacity-100 transition-opacity text-sky-100">
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

        {/* Features Section */}
        <section
          id="tailwind"
          className="bg-[#0f1732] text-white py-16 tailwind  flex justify-center"
        >
          <div className="container mx-auto relative max-w-6xl">
            <div className="absolute top-[25%] left-[70%] md:size-[700px] size-[200px] bg-sky-500 rounded-full opacity-20 blur-3xl z-[1]"></div>
            <h2 className="md:text-3xl text-xl font-bold mb-8">
              What Does Arkos Do?{" "}
              <span className="text-gray-400 text-base md:text-lg font-normal">
                Provides a Set Of Tools To Allow Developers To Skip Standardized
                RESTful API Development Tasks
              </span>
            </h2>

            <div
              id="tailwind"
              className="tailwind grid grid-cols-1 md:grid-cols-3 md:gap-4 p-2  mx-auto max-w-3xl md:max-w-6xl z-10 gap-3"
            >
              {arkosFeatures.map((feature) => (
                <ArkosFeatureCard {...feature} />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto flex items-center justify-center mt-8 bg-gray-90 flex-col p-4 py-8 max-w-3xl relative">
          <div className="absolute md:size-[400px] size-[200px] bg-sky-500 rounded-full opacity-20 blur-3xl z-0"></div>
          <p className="font-semibold text-lg md:text-4xl text-center capitalize text-gray-800 dark:text-zinc-400 z-10">
            {
              "< Every line of boilerplate code is a missed opportunity for innovation. Arkos exists to give developers back their time so they can build what truly matters />"
            }
          </p>
          <Link
            to="https://github.com/uanela"
            className=" text-white font-medium py-1 px-2 flex items-center gap-2 justify-center outline-[1px] outline-none outline-sky-500 rounded-full z-10 bg-gray-900"
          >
            <img
              className="rounded-full size-10"
              src="/img/uanela-como-profile.webp"
              alt="Uanela Como"
            />
            <div className="flex flex-col items-start mr-2 ">
              <span className="font-bold">Uanela Como</span>
              <span className="text-xs">The Creator</span>
            </div>
          </Link>
        </section>

        <div className="bg-[#090e1f] z-10 text-white py-20 px-6">
          <h1 className="md:text-4xl text-center text-2xl font-bold z-10 mx-auto md:mb-16 mb-8">
            Built On Top Of Well Estabilished And{" "}
            <span className="text-sky-500">Production Ready</span> Tools
          </h1>

          <div className="relative flex flex-col items-center space-y-12">
            {/* <div className="relative z-10 bg-[#0f1732] px-6 py-3 rounded-xl shadow-lg text-lg font-semibold">
              Powered By
            </div> */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-6xl">
              <div></div>
              <div className="flex items-center justify-center  rounded-lg flex-col p-2 md:p-4  outline-1 outline-none relative mx-auto w-full text-center">
                <div>
                  <img
                    src="/img/arkos-js-logo-dark.svg"
                    alt="NodeJs logo"
                    className="h-16 object-contain"
                  />
                </div>

                <div className="w-[65%] h-[2px] absolute bg-gradient-to-l  from-[#669c4f] top-[100%] left-[99%] rotate-[15deg]"></div>
                <div className="w-[65%] h-[2px] absolute bg- bg-gradient-to-r from-zinc-400  top-[100%] right-[99%] rotate-[-15deg]"></div>
              </div>
              <div></div>

              <div className="bg-[#0f1732] rounded-lg p-4 md:p-6 outline-zinc-400 outline-2 outline-offset-0 outline-none relative [box-shadow:0px_0px_15px_#a1a1aa]">
                <div>
                  <img
                    src="/img/express-logo.webp"
                    alt="ExpressJs logo"
                    className="size-12"
                  />
                </div>
                <div className="text-zinc-300 text-lg md:text-2xl mb-2">
                  Express ↗
                </div>
                <p className="text-zinc-400 text-sm">
                  The Fast, unopinionated, minimalist web framework for Node.js
                </p>
              </div>

              <div className="bg-[#0f1732] rounded-lg p-4 md:p-6 outline-[#307bb3] outline-2 outline-none relative [box-shadow:0px_0px_15px_#307bb3]">
                <div>
                  <img
                    src="/img/prisma-logo.webp"
                    alt="Prisma logo"
                    className="size-12"
                  />
                </div>
                <div className="text-[#307bb3] text-lg md:text-2xl mb-2">
                  Prisma ↗
                </div>
                <p className="text-zinc-400 text-sm">
                  An ORM that is shipping production apps at lightning speed,
                  and scale to a global audience effortlessly
                </p>
                <div className="w-[2px] h-[20px] absolute bg-gradient-to-t from-[#307bb3] bottom-[101%] right-1/2 hidden md:block"></div>
              </div>

              <div className="bg-[#0f1732] rounded-lg p-4 md:p-6 outline-[#669c4f] outline-2 outline-offset-0 outline-none relative [box-shadow:0px_0px_15px_#669c4f]">
                <div>
                  <img
                    src="/img/node-js-logo.webp"
                    alt="NodeJs logo"
                    className="size-12"
                  />
                </div>
                <div className="text-[#669c4f] text-lg md:text-2xl mb-2">
                  NodeJs ↗
                </div>
                <p className="text-zinc-400 text-sm">
                  JavaScript runtime environment that lets developers create
                  servers, web apps, command line tools and scripts{" "}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </div>
  );
}
