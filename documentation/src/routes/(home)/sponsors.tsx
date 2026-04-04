import { createFileRoute } from "@tanstack/react-router";

const tiers = [
  {
    name: "Gold",
    description: "Primary sponsors with the highest visibility",
    sponsors: [
      {
        name: "SuperM7.com",
        logo: "/img/superm7-logo.webp",
        url: "https://www.superm7.com",
      },
    ],
    cols: "grid-cols-2",
    cardHeight: "h-36",
    logoHeight: "h-12",
  },
  {
    name: "Silver",
    description: "Supporting sponsors",
    sponsors: [],
    cols: "grid-cols-4",
    cardHeight: "h-24",
    logoHeight: "h-8",
  },
  {
    name: "Bronze",
    description: "Community supporters",
    sponsors: [],
    cols: "grid-cols-6",
    cardHeight: "h-20",
    logoHeight: "h-6",
  },
];

function SponsorsPage() {
  return (
    <main className="flex flex-col w-full max-w-[1200px] mx-auto px-4 py-16 gap-16">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <p className="text-xs uppercase tracking-widest text-sky-400 font-semibold">
          Sponsors
        </p>
        <h1 className="text-4xl font-bold leading-tight">
          Support the future of Arkos.js
        </h1>
        <p className="text-gray-400 max-w-xl">
          Arkos.js is an independent open source project. Sponsors get their
          logo featured here, in the docs, and in the README — in front of
          thousands of developers.
        </p>
        <div className="flex items-center gap-3 mt-2">
          <a
            href="https://github.com/sponsors/uanela"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 transition-colors text-white text-sm font-semibold px-5 py-2.5 rounded-full"
          >
            ♥ Become a Sponsor
          </a>
          <a
            href="mailto:uanelaluiswayne@gmail.com"
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors border border-white/10 px-5 py-2.5 rounded-full"
          >
            Contact us
          </a>
        </div>
      </div>

      {/* Tiers */}
      {tiers.map((tier) => (
        <div key={tier.name} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">{tier.name}</h2>
            <p className="text-sm text-gray-500">{tier.description}</p>
          </div>

          {tier.sponsors.length > 0 ? (
            <div className={`grid ${tier.cols} gap-3`}>
              {tier.sponsors.map((s: any) => (
                <a
                  key={s.name}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center ${tier.cardHeight} border border-white/10 rounded-xl hover:border-white/30 transition-colors bg-fd-card`}
                >
                  <img
                    src={s.logo}
                    alt={s.name}
                    className={`${tier.logoHeight} object-contain`}
                  />
                </a>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-white/10 rounded-xl p-8 text-center">
              <p className="text-sm text-gray-600">
                No {tier.name.toLowerCase()} sponsors yet —{" "}
                <a
                  href="https://github.com/sponsors/uanela"
                  target="_blank"
                  className="text-sky-500 hover:underline"
                >
                  be the first
                </a>
              </p>
            </div>
          )}
        </div>
      ))}

      {/* Past sponsors placeholder */}
      <div className="flex flex-col gap-4 opacity-50">
        <h2 className="text-lg font-semibold">Past Sponsors</h2>
        <p className="text-sm text-gray-500">
          Previous sponsors will be listed here.
        </p>
      </div>
    </main>
  );
}

export const Route = createFileRoute("/(home)/sponsors")({
  component: SponsorsPage,
});
