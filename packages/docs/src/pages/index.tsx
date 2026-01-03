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
      {/* <AnnoucementBanner /> */}
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
        <section className="mx-auto grid lg:grid-cols-3 md:grid-cols-2 items-center justify-center  bg-gray-90 flex-col p-4 max-w-7xl relative md:gap-6 gap-4 ">
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
            name="Keven Gonçalves"
            role="Software Developer"
            projectName={
              <a href="https://www.cornelder.co.mz" target="_blank">
                Corneleder
              </a>
            }
            avatar={
              "https://media.licdn.com/dms/image/v2/D4D03AQFkoxRVxZa2Rg/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1702849883698?e=1766016000&v=beta&t=JYCX2xh3bNBoCrsvy-_fJz7DltD_YJduJMnnIKrfUZs"
            }
          >
            Arkos.js is a game-changer! It drastically simplifies API
            development, letting you build backend routes quickly and
            efficiently. Less time on boilerplate, more time on business logic.
            An incredible tool for productivity and scalability.
          </TestimonialCard>
          <TestimonialCard
            name="Arnaldo Tomo"
            role="Tech Lead"
            projectName={
              <a href="https://www.dintell.co.mz" target="_blank">
                Dintell
              </a>
            }
            avatar={"https://github.com/arnaldo-tomo.png"}
          >
            Arkos keeps my code clean and scalable, which is fundamental for the
            systems I build. For any developer who values productivity and best
            practices, Arkos.js deserves your attention.
          </TestimonialCard>
          <TestimonialCard
            name="Augusto Domingos"
            role="Tech Lead"
            projectName={
              <a
                href="https://www.linkedin.com/company/dsai-for-moz"
                target="_blank"
              >
                DSAI For Moz
              </a>
            }
            avatar={
              "https://media.licdn.com/dms/image/v2/D4D03AQG5__NOnlZ7jQ/profile-displayphoto-crop_800_800/B4DZqkXy1hIkAI-/0/1763694296337?e=1766016000&v=beta&t=tmY8QctNJWhI8O-HIXw-9o3KCMbUI_fpSXlIrd-8_0Q"
            }
          >
            It removes boilerplate and provides a clean structure to build
            products. Built-in auth is powerful and ready. Automatic CRUD and
            docs save time, while interceptors allow flexible business logic.
            ArkosJS is worth adopting.
          </TestimonialCard>
          <TestimonialCard
            name="Joél Fombe"
            role="Frontend Developer"
            projectName={
              <a href="https://www.mesquitagroup.co.mz" target="_blank">
                Mesquita Group
              </a>
            }
            avatar={
              "https://media.licdn.com/dms/image/v2/D4D03AQEpcfSwGxCp3A/profile-displayphoto-shrink_800_800/B4DZTbIoyjG4Ac-/0/1738843263511?e=1766016000&v=beta&t=bgfLVMudsASeHnfBlaGyEH94TLZx73IZKN-5Sge5YFo"
            }
          >
            Arkos has transformed my development workflow. It's simple,
            lightweight, and incredibly efficient. I can set up routes,
            permissions, and schemas in a flash. It has become an indispensable
            part of my daily toolkit.
          </TestimonialCard>
          <TestimonialCard
            name="Baptista Joaquim"
            role="Tech Lead"
            projectName={
              <a href="https://www.mesquitagroup.co.mz" target="_blank">
                Mesquita Group
              </a>
            }
            avatar={
              "https://media.licdn.com/dms/image/v2/D4D03AQELei2qn4pbbQ/profile-displayphoto-shrink_800_800/B4DZZfTJ71GgAg-/0/1745355581433?e=1766016000&v=beta&t=omsLpc0PBNltURoTqww1TcZRPYaEBKIe59Q9QVbUhKg"
            }
          >
            From a Prisma models to auto generating CRUDs and routes. It
            integrates validations and auth, organizing everything into
            services. The result is a faster, simpler workflow with far less
            effort—a tool that truly accelerates development.
          </TestimonialCard>
          <TestimonialCard
            name="Braimo Selimane"
            role="Software Developer"
            projectName={
              <a href="https://www.cornelder.co.mz" target="_blank">
                Corneleder
              </a>
            }
            avatar={"https://github.com/thuggerhacks.png"}
          >
            Arkos provides a clear structure and intuitive tools that remove
            backend complexity. My workflow is now faster and more organized,
            allowing me to stay focused on building features. A truly satisfying
            experience.
          </TestimonialCard>
          <TestimonialCard
            name="Niuro Langa"
            role="Software Developer"
            projectName={
              <a href="https://sparktechh.com" target="_blank">
                SparkTech
              </a>
            }
            avatar={"https://github.com/blaze380.png"}
          >
           With Arkos.js, I can build backends  in just a few minutes. It removes the boilerplate and lets me focus entirely on the core logic. Fast, simple, and incredibly productive.
          </TestimonialCard>
          <TestimonialCard
            name="Uanela Como"
            role="Founder"
            projectName={
              <a href="https://www.superm7.com" target="_blank">
                SuperM7.com
              </a>
            }
            avatar={"/img/uanela-como-profile.webp"}
          >
            Every line of boilerplate code is a missed opportunity for
            innovation. Arkos.js exists to give developers back their time so
            they can build what truly matters focusing on the core business
            logic.
          </TestimonialCard>
        </section>

        <PoweredBySection />
      </Layout>
    </div>
  );
}
