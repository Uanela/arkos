import { Link } from "@tanstack/react-router";

const sponsors: Record<
  "gold" | "silver" | "bronze",
  { logo: string; name: string; url: string }[]
> = {
  gold: [
    {
      name: "SuperM7.com",
      logo: "/img/superm7-logo.webp",
      url: "https://www.superm7.com",
    },
  ],
  silver: [],
  bronze: [],
};

export default function SponsorsSection() {
  const hasSponsors =
    sponsors.gold.length > 0 ||
    sponsors.silver.length > 0 ||
    sponsors.bronze.length > 0;

  return (
    <section className="py-16 px-4 max-w-5xl mx-auto w-full text-center">
      <p className="text-xs uppercase tracking-widest text-gray-500 mb-2 font-semibold">
        Sponsors
      </p>
      <h2 className="md:text-2xl text-xl font-bold mb-3">
        Supported By The Best
      </h2>
      <p className="text-fd-foreground text-sm max-w-xl mx-auto mb-10">
        Arkos.js is free and open source. These companies help make it possible
        to maintain and evolve the framework full-time.
      </p>

      {hasSponsors ? (
        <div className="flex flex-col gap-4">
          {/* Gold */}
          {sponsors.gold.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {sponsors.gold.map((s) => (
                <a
                  key={s.name}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center border border-white/10 rounded-xl p-8 hover:border-white/30 transition-colors bg-fd-card"
                >
                  <img
                    src={s.logo}
                    alt={s.name}
                    className="h-10 object-contain"
                  />
                </a>
              ))}
            </div>
          )}

          {/* Silver */}
          {sponsors.silver.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {sponsors.silver.map((s) => (
                <a
                  key={s.name}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center border border-white/10 rounded-xl p-6 hover:border-white/30 transition-colors bg-fd-card"
                >
                  <img
                    src={s.logo}
                    alt={s.name}
                    className="h-7 object-contain"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Empty state — no sponsors yet */
        <div className="border border-dashed border-white/10 rounded-2xl p-12 mb-8">
          <p className="text-gray-500 text-sm mb-1">No sponsors yet</p>
          <p className="text-gray-600 text-xs">
            Be the first to support Arkos.js
          </p>
        </div>
      )}

      <div className="flex items-center justify-center gap-3 mt-8">
        <a
          href="https://github.com/sponsors/uanela"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 transition-colors text-white text-sm font-semibold px-5 py-2.5 rounded-full"
        >
          ♥ Become a Sponsor
        </a>
        <Link
          to="/sponsors"
          className="inline-flex items-center gap-1 text-sm text-fd-foreground hover:text-white transition-colors border border-white/10 px-5 py-2.5 rounded-full"
        >
          View all sponsors →
        </Link>
      </div>
    </section>
  );
}
