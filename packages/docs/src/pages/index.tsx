import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import ArkosFeatureCard from "./components/arkos-feature-card";
import { arkosFeatures } from "../utils/arkos-features";
import HeroSection from "./components/hero-section";
import CompaniesLogos from "./components/companies-logos";

export default function Home() {
  return (
    <div className="tailwind overflow-hidden max-w-[100vw]">
      <Layout description="Node.js backend framework for simplifying API development with automatic route generation, authentication, and minimal configuration.">
        <HeroSection />
        <CompaniesLogos />

        {/* Features Section */}
        <section
          id="tailwind"
          className="text-white md:py-24 pt-11 pb-8 tailwind  flex justify-center"
        >
          <div className="container mx-auto relative max-w-6xl">
            <div className="absolute top-[25%] left-[70%] md:size-[700px] size-[200px] bg-sky-500 rounded-full opacity-20 blur-3xl z-[1]"></div>
            <h2 className="md:text-3xl text-xl font-bold  text-center">
              Build Fast And With Confidence From Day One
            </h2>
            <p className="text-gray-400 md:text-base text-sm text-justify font-normal sm:text-center max-w-2xl mx-auto mb-8 md:mt-6 mt-4">
              With our Express-based architecture and seamless integrations, we
              created a REST framework that lets you ship features that scale as
              fast as your application grows without worrying about standard
              patterns.
            </p>

            <div
              id="tailwind"
              className="tailwind grid md:gap-12 gap-8 p-2  mx-auto max-w-3xl md:max-w-6xl z-10 items-start md:mt-32 mt-16"
            >
              {arkosFeatures.map((feature, i) => (
                <ArkosFeatureCard {...feature} reverse={!!(i % 2 == 0)} />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto flex items-center justify-center md:mt-8 bg-gray-90 flex-col p-4 md:py-8 max-w-3xl relative">
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

        <div className="bg-[#090e1f] z-10 text-white md:py-20 py-12 px-6">
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

              <div className="bg-[#0f1732] rounded-lg p-4 md:p-6 outline-[#36a394] outline-2 outline-none relative [box-shadow:0px_0px_15px_#307bb3]">
                <div>
                  <img
                    src="/img/prisma-logo.webp"
                    alt="Prisma logo"
                    className="size-12"
                  />
                </div>
                <div className="text-[#36a394] text-lg md:text-2xl mb-2">
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
