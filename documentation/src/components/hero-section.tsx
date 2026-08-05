import { type ReactElement, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons/faGithub";
import { faBook } from "@fortawesome/free-solid-svg-icons/faBook";
import { Tooltip } from "react-tooltip";
import { Link } from "@tanstack/react-router";

const CODE_SNIPPETS: Record<string, string> = {
  App: `import arkos from "arkos"

const app = arkos()

app.get({ path: "/" }, (req, res) => {
  res.send("Hello World!")
})

app.listen()`,

  Router: `import { ArkosRouter } from "arkos"
import CreatePostSchema from "./schemas/create-post.schema"
import postController from "./post.controller"

const postRouter = ArkosRouter({ prefix: "/posts" })

postRouter.post(
  {
    path: "/",
    validation: { body: CreatePostSchema }
  },
  postController.createOne
)

export default postRouter`,

  Policy: `import { ArkosPolicy } from "arkos"

const postPolicy = ArkosPolicy("post")
  .rule("Create", { roles: ["Admin", "Editor"] })
  .rule("Update", { roles: ["Admin", "Editor"] })
  .rule("View", { roles: ["Admin", "Editor", "Reader"] })
  .rule("Delete", { roles: ["Admin"] })

export default postPolicy`,

  Gateway: `import { ArkosGateway } from "arkos/websockets"

const chatGateway = ArkosGateway({
  name: "chat",
  authentication: true
})

chatGateway.on(
  { event: "send_message" },
  (socket, data) => {
    socket.emit("receive_message", data)
  }
)

export default chatGateway`,
};

function highlightCode(code: string): string {
  let escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // strings
  escaped = escaped.replace(
    /(".*?")/g,
    '<span class="text-sky-300">$1</span>'
  );

  // keywords
  escaped = escaped.replace(
    /\b(import|from|const|export|default|new)\b/g,
    '<span class="text-red-400">$1</span>'
  );

  // function/method names before "("
  escaped = escaped.replace(
    /\b([a-zA-Z_]\w*)(?=\()/g,
    '<span class="text-fuchsia-300">$1</span>'
  );

  // arrow function params, e.g. (socket, data) =>
  escaped = escaped.replace(
    /\(([a-zA-Z_][\w, ]*)\)(\s*=&gt;)/g,
    (_match, params, arrow) =>
      `(<span class="text-orange-300">${params}</span>)${arrow}`
  );

  return escaped;
}

type HeroStats = {
  stars?: string;
  latestRelease?: string;
  monthlyDownloads?: string;
};

export default function HeroSection({ stats }: { stats: HeroStats; }): ReactElement {
  const [activeTab, setActiveTab] = useState<keyof typeof CODE_SNIPPETS>("App");
  const [codeTooltipText, setCodeTooltip] = useState("Copy Code!");

  return (
    <header
      id="tailwind"
      className="bg-[#020d1f] text-white tailwind relative overflow-hidden hero-section"
    >
      {/* Grid background */ }
      <div
        className="absolute inset-0 pointer-events-none"
        style={ {
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 90%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 90%)",
        } }
      />

      {/* Diagonal beams */ }
      <div className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] bg-sky-500 rounded-full opacity-10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 -left-1/4 w-[500px] h-[500px] bg-emerald-500 rounded-full opacity-10 blur-[120px] pointer-events-none" />


      <div className="container mx-auto px-4 relative py-16 md:py-24 lg:py-28 max-w-7xl">
        <div
          id="tailwind"
          className="bg-white text-zinc-900 py-1 px-3 rounded-lg w-fit mx-auto md:mx-0 text-center text-xs font-bold z-10 animate-bounce"
        >
          RC VERSION
        </div>
        <div className="grid md:grid-cols-2 gap-14 md:gap-10 items-start mx-auto">
          {/* Left: copy */ }
          <div className="text-center md:text-left">
            <h2 className="lg:text-6xl md:text-5xl text-4xl font-semibold z-10 mt-5 leading-tight">
              Build <span className="">fast</span> and <span className="">scalable</span> softwares under <span className="underline decoration-sky-500">tight deadlines</span>
            </h2>
            <div className="md:mt-8 mt-16 md:w-92 mx-auto md:mx-0">
              <CreateArkosToolTip />
              <div className="flex justify-center md:justify-start z-10 flex-col items-center md:items-start gap-2 sm:flex-row md:mt-3 mt-2">

                <Link
                  to="/docs"
                  className="bg-sky-500 hover:bg-sky-600 text-white font-medium py-2 px-6 rounded-md flex items-center gap-2 justify-center z-10 hover:text-white w-full"
                >
                  <span>See Docs</span>
                  <FontAwesomeIcon icon={ faBook } className="size-[17px]" />
                </Link>
                <Link
                  to="https://github.com/uanela/arkos"
                  className="bg-gray-700 hover:bg-gray-800 text-white font-medium py-2 px-6 rounded-md w-full flex items-center gap-2 justify-center"
                >
                  <span>GitHub</span>
                  <FontAwesomeIcon icon={ faGithub } className="size-5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right: code panel */ }
          <div className="relative z-10 mt-5 w-full max-w-sm mx-auto md:max-w-xl justify-self-end">
            <div className="rounded-xl bg-slate-950/50 border border-white/10 backdrop-blur-sm shadow-2xl relative group/code overflow-hidden">
              {/* Tabs */ }
              <div className="flex items-center border-b border-white/10 px-2">
                { (Object.keys(CODE_SNIPPETS) as (keyof typeof CODE_SNIPPETS)[]).map((tab) => (
                  <button
                    key={ tab }
                    type="button"
                    onClick={ () => setActiveTab(tab) }
                    className={ `px-4 py-2.5 text-xs font-mono transition-colors relative ${activeTab === tab
                      ? "text-sky-300"
                      : "text-gray-500 hover:text-gray-300"
                      }` }
                  >
                    { tab }
                    { activeTab === tab && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-sky-500" />
                    ) }
                  </button>
                )) }

                <button
                  type="button"
                  onClick={ () => {
                    navigator.clipboard.writeText(CODE_SNIPPETS[activeTab]);
                    setCodeTooltip("Copied!");
                    setTimeout(() => setCodeTooltip("Copy Code!"), 1500);
                  } }
                  data-tooltip-id="code-copy-tooltip"
                  className="ml-auto text-gray-500 hover:text-sky-300 transition-colors mr-2"
                  aria-label="Copy code"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={ 2 }
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
                <Tooltip
                  id="code-copy-tooltip"
                  style={ { backgroundColor: "#2c2f3e", color: "#fff", fontWeight: "bold" } }
                  className="z-10"
                >
                  { codeTooltipText }
                </Tooltip>
              </div>

              {/* Code */ }
              <pre className="font-mono text-sm leading-6 whitespace-pre-wrap px-6 py-4">
                <code
                  dangerouslySetInnerHTML={ { __html: highlightCode(CODE_SNIPPETS[activeTab]) } }
                />
              </pre>
            </div>

            <StatsPanel { ...stats } />
          </div>
        </div>
      </div>
    </header>
  );
}


function StatsPanel({ stars, latestRelease, monthlyDownloads }: HeroStats) {
  const rows = [
    { label: "Github stars", value: stars },
    { label: "Latest release", value: latestRelease },
    { label: "Monthly downloads", value: monthlyDownloads },
  ].filter((row) => row.value);

  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 items-end md:mt-16 mt-8">
      { rows.map((row) => (
        <div key={ row.label } className="flex items-baseline gap-3 text-sm">
          <span className="text-gray-400">{ row.label }</span>
          <span className="font-mono font-semibold text-white">
            { row.value }
          </span>
        </div>
      )) }
    </div>
  );
}

function CreateArkosToolTip() {
  const [tooltipText, setTooltip] = useState("Copy Code!");
  return (
    <div className="mt-3 w-full text-center md:text-left cursor-pointer group mx-auto md:mx-0">
      <div
        className="rounded-md bg-slate-950/80 outline outline-sky-500 py-2 max-w-[370px] mx-auto md:mx-0 relative group cursor-pointer hover:[box-shadow:0px_0px_20px_0px_#0ea5e9aa] create-arkos-cmd px-8 text-center"
        onClick={ () => {
          navigator.clipboard.writeText("npx create-arkos@latest");
          setTooltip("Copied!");
          setTimeout(() => setTooltip("Copy Code!"), 1500);
        } }
      >
        <p className="text-sky-100 py-0 my-0 font-mono text-base cursor-pointer">
          npm create arkos@latest
        </p>
        <Tooltip
          style={ {
            backgroundColor: "#2c2f3e",
            color: "#fff",
            fontWeight: "bold",
          } }
          anchorSelect=".create-arkos-cmd"
          className="z-[10]"
        >
          { tooltipText }
        </Tooltip>
        <div className="absolute right-3 top-[55%] transform -translate-y-1/2 group-hover:opacity-100 transition-opacity text-sky-100 hover:text-white">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={ 2 }
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
