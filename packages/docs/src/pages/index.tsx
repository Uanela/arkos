import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import ArkosFeatureCard from "./components/arkos-feature-card";
import { arkosFeatures } from "../utils/arkos-features";
import HeroSection from "./components/hero-section";
import CompaniesLogos from "./components/companies-logos";
import PoweredBySection from "./components/powered-by-section";
import TestimonialCard from "./components/testimonial-card";
import AnnoucementBanner from "../components/annoucement-banner";

export default function Home() {
  return (
    <div className="tailwind overflow-hidden max-w-[100vw]">
      <AnnoucementBanner />
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
            <h2 className="md:text-3xl text-xl font-bold  text-center px-4">
              Build Fast And With Confidence From Day One
            </h2>
            <p className="text-gray-400 md:text-base text-sm  font-normal sm:text-center max-w-2xl mx-auto mb-8 md:mt-4 mt-3 text-center">
              With our modern architecture and seamless integrations, we created
              a RESTful framework that lets you ship features that scale as fast
              as your application grows without worrying about standard
              patterns.
            </p>
            <Link
              to="https://github.com/uanela"
              className="text-white font-medium py-1 px-2 flex items-center gap-2 justify-center outline-[1px] outline-none outline-sky-500 rounded-full z-10 bg-gray-900 w-fit mx-auto"
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

            <div
              id="tailwind"
              className="tailwind grid md:gap-12 gap-8 p-2  mx-auto max-w-3xl md:max-w-6xl z-10 items-start md:mt-24 mt-16"
            >
              {arkosFeatures.map((feature, i) => (
                <ArkosFeatureCard
                  key={i}
                  {...feature}
                  reverse={!!(i % 2 == 0)}
                />
              ))}
            </div>
          </div>
        </section>

        <h2 className="md:text-2xl uppercase text-center text-lg font-bold z-10 mx-auto md:mb-8 px-4">
          Already Trusted By{" "}
          <span className="text-emerald-400">Great Developers</span> Building
          Daily
        </h2>
        <section className="mx-auto grid lg:grid-cols-3 md:grid-cols-2 items-center justify-center  bg-gray-90 flex-col p-4 max-w-7xl relative md:gap-6 gap-4">
          <TestimonialCard
            name="Gelson Matavela"
            role="Founder"
            projectName={"Grupo Vergui"}
            avatar={"https://github.com/gelsonmatavela.png"}
          >
            Arkos.js changed how I work on the backend: with a Prisma model I
            already get CRUD routes, auth, and validation out-of-the-box — I
            saved a lot of time and could focus on business logic.{" "}
          </TestimonialCard>
          <TestimonialCard
            name="Uanela Como"
            role="Full Stack Developer"
            projectName={
              <a href="https://www.mesquitagroup.com" target="_blank">
                Mesquita Group
              </a>
            }
            avatar={"/img/uanela-como-profile.webp"}
          >
            Every line of boilerplate code is a missed opportunity for
            innovation. Arkos exists to give developers back their time so they
            can build what truly matters.
          </TestimonialCard>
        </section>

        <PoweredBySection />
      </Layout>
    </div>
  );
}
