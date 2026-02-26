import { type ReactElement } from "react";

export default function PoweredBySection(): ReactElement {
  return (
    <div className="bg-[#090e1f] z-10 text-white md:py-20 py-12 px-6">
      <div className="relative flex flex-col items-center space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-6xl">
          <div></div>
          <div className="flex items-center justify-center  rounded-lg flex-col p-2 md:p-4  outline-1   relative mx-auto w-full text-center">
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

          <div className="bg-[#0f1732] rounded-lg p-4 md:p-6 outline-zinc-400 outline-2 outline-offset-0   relative [box-shadow:0px_0px_15px_#a1a1aa]">
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

          <div className="bg-[#0f1732] rounded-lg p-4 md:p-6 outline-[#36a394] outline-2   relative [box-shadow:0px_0px_15px_#307bb3]">
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
              An ORM that is shipping production apps at lightning speed, and
              scale to a global audience effortlessly
            </p>
            <div className="w-[2px] h-[20px] absolute bg-gradient-to-t from-[#307bb3] bottom-[101%] right-1/2 hidden md:block"></div>
          </div>

          <div className="bg-[#0f1732] rounded-lg p-4 md:p-6 outline-[#669c4f] outline-2 outline-offset-0   relative [box-shadow:0px_0px_15px_#669c4f]">
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
  );
}
