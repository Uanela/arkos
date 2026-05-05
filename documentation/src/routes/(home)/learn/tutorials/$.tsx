import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { tutorials } from "@/lib/source";
import defaultMdxComponents from "fumadocs-ui/mdx";
import browserCollections from ".source/browser";
import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ListIcon,
  ArrowUpIcon,
  InfoIcon,
  SparklesIcon,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

function extractText(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number" || typeof node === "bigint") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node?.props?.children) return extractText(node.props.children);
  return "";
}

const serverLoader = createServerFn({ method: "GET" }).handler(
  async ({ data: slug }) => {
    const page = tutorials.getPage(
      slug.split("/").length < 2 ? [slug] : slug.split("/")
    );
    if (!page) throw notFound();
    const pages = tutorials.getPages();
    const index = pages.findIndex((p) => p.slugs[0] === slug);

    const allChapters = pages.map((p, i) => ({
      title: extractText(p.data.title),
      slug: p.slugs.join("/"),
      description: p.data.description,
      isCompleted: i < index,
      isCurrent: i === index,
    }));

    console.log(allChapters);

    return {
      path: page.path,
      title: extractText(page.data.title),
      description: page.data.description,
      chapterNumber: index + 1,
      totalChapters: pages.length,
      chapters: allChapters,
      url: page.url,
      isIntro: index === 0,
      prev: pages[index - 1]
        ? {
            title: extractText(pages[index - 1].data.title),
            slug: pages[index - 1].slugs.join("/"),
            chapterNumber: index,
          }
        : null,
      next: pages[index + 1]
        ? {
            title: extractText(pages[index + 1].data.title),
            slug: pages[index + 1].slugs.join("/"),
            description: pages[index + 1].data.description,
            chapterNumber: index + 2,
          }
        : null,
    };
  }
);

// ─── Emoji feedback widget ───────────────────────────────────────────────────
function FeedbackBar() {
  const [selected, setSelected] = useState<number | null>(null);
  const emojis = ["😞", "😐", "🙂", "😄"];
  return (
    <div className="flex items-center gap-3 px-5 py-3 rounded-full border border-border bg-background/80 backdrop-blur-sm w-fit mx-auto">
      <span className="text-sm text-muted-foreground">Was this helpful?</span>
      {emojis.map((e, i) => (
        <button
          key={i}
          onClick={() => setSelected(i)}
          className={`text-xl leading-none transition-transform hover:scale-125 focus:outline-none ${
            selected === i ? "scale-125" : "opacity-60 hover:opacity-100"
          }`}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

// ─── Chapter list overlay ─────────────────────────────────────────────────────
function ChapterListOverlay({
  chapters,
  open,
  onClose,
  courseName,
}: {
  chapters: any[];
  open: boolean;
  onClose: () => void;
  courseName: string;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const numbered = chapters.slice(1); // skip intro

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 left-0 top-40" onClick={onClose} />
      {/* Panel — top-left aligned under the nav */}
      <div
        // ref={overlayRef}
        className="fixed top-[72px] left-3 z-50 w-[560px] max-h-[80vh] overflow-y-auto rounded-2xl border border-border bg-popover shadow-2xl"
      >
        {/* Course tabs (decorative — wire up if you have multiple courses) */}
        <div className="grid grid-cols-2 gap-2 p-3 border-b border-border">
          {[
            { label: courseName, count: chapters.length - 1, active: true },
            { label: "Pages Router", count: 46 },
            { label: "React Foundations", count: 10 },
            { label: "SEO", count: 33 },
          ].map((tab) => (
            <button
              key={tab.label}
              className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors text-left ${
                tab.active
                  ? "bg-muted font-medium text-foreground"
                  : "hover:bg-muted/60 text-muted-foreground"
              }`}
            >
              <div>
                <div className="font-medium">{tab.label}</div>
                <div className="text-xs text-muted-foreground">
                  0/{tab.count} Chapters
                </div>
              </div>
              {tab.active && (
                <CheckCircleIcon className="size-4 text-blue-500 shrink-0" />
              )}
            </button>
          ))}
        </div>

        {/* Chapter list — two columns */}
        <div className="p-3">
          {/* Introduction row */}
          {chapters[0] && (
            <Link
              to="/learn/tutorials/$slug"
              params={{ slug: chapters[0].slug }}
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-muted/60 transition-colors mb-1"
            >
              <span className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                <InfoIcon className="size-3.5 text-muted-foreground" />
              </span>
              <span className="text-sm text-muted-foreground">
                Introduction
              </span>
            </Link>
          )}

          <div className="grid grid-cols-2 gap-x-4">
            {numbered.map((chapter, idx) => (
              <Link
                key={chapter.slug}
                to="/learn/tutorials/$slug"
                params={{ slug: chapter.slug }}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-muted/60 transition-colors ${
                  chapter.isCurrent
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <span
                  className={`size-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                    chapter.isCurrent
                      ? "bg-blue-600 text-white"
                      : chapter.isCompleted
                        ? "bg-blue-600/20 text-blue-400"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {chapter.isCompleted ? (
                    <CheckCircleIcon className="size-3.5" />
                  ) : (
                    idx + 1
                  )}
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] text-muted-foreground">
                    Chapter {idx + 1}
                  </div>
                  <div className="text-sm font-medium truncate">
                    {chapter.title}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Next Steps */}
          <div className="flex items-center gap-3 px-4 py-2.5 mt-1 rounded-lg">
            <span className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0">
              <SparklesIcon className="size-3.5 text-muted-foreground" />
            </span>
            <span className="text-sm text-muted-foreground">Next Steps</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
const clientLoader = browserCollections.tutorialColletions.createClientLoader({
  component({ default: Mdx }) {
    const {
      title,
      description,
      chapters,
      chapterNumber,
      totalChapters,
      prev,
      next,
      isIntro,
    } = Route.useLoaderData();

    const [listOpen, setListOpen] = useState(false);
    const isLastChapter = chapterNumber === totalChapters && !isIntro;
    const displayChapterNumber = isIntro ? null : chapterNumber - 1;
    const courseName = "App Router"; // adjust to your course name

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

    return (
      <div className="min-h-screen bg-background text-foreground">
        {/* ── Floating top navbar ── */}
        <header className="fixed top-20 left-[25%] w-5xl z-30 flex items-center justify-between rounded-2xl border border-border bg-background/90 backdrop-blur-md px-2 py-2 shadow-lg">
          {/* Left: chapter list toggle + course breadcrumb */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setListOpen((v) => !v)}
              className="size-10 rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Toggle chapter list"
            >
              <ListIcon className="size-5 text-muted-foreground" />
            </button>

            <div className="h-8 w-px bg-border mx-1" />

            {/* Course icon */}
            <div className="size-9 rounded-lg bg-foreground flex items-center justify-center text-background font-bold text-sm shrink-0">
              A
            </div>

            <div className="ml-1">
              <div className="text-xs text-muted-foreground leading-none mb-0.5">
                {isIntro ? "Introduction" : `Chapter ${displayChapterNumber}`}
              </div>
              <div className="text-sm font-semibold leading-none">{title}</div>
            </div>
          </div>

          {/* Right: sign in + scroll to top */}
          <div className="flex items-center gap-2">
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-xl hover:bg-muted">
              Sign in to save progress
            </button>
            <div className="h-8 w-px bg-border mx-1" />
            <button
              onClick={scrollToTop}
              className="size-10 rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Scroll to top"
            >
              <ArrowUpIcon className="size-4 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Chapter list overlay */}
        <ChapterListOverlay
          chapters={chapters}
          open={listOpen}
          onClose={() => setListOpen(false)}
          courseName={courseName}
        />

        {/* ── Main content ── */}
        <main className="max-w-4xl mx-auto px-6 pt-28 pb-24">
          {/* Chapter hero header */}
          <div className="flex items-start gap-5 mb-8">
            <div className="size-20 rounded-full bg-muted flex items-center justify-center text-3xl font-bold text-foreground shrink-0 relative">
              {isIntro ? (
                <InfoIcon className="size-8" />
              ) : (
                <span>{displayChapterNumber}</span>
              )}
              {isLastChapter && (
                <span className="absolute -bottom-1 -right-1 size-7 rounded-full bg-blue-600 flex items-center justify-center">
                  <CheckCircleIcon className="size-4 text-white" />
                </span>
              )}
            </div>
            <div className="pt-1">
              <p className="text-sm text-muted-foreground mb-1">
                {isIntro ? "Introduction" : `Chapter ${displayChapterNumber}`}
              </p>
              <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
            </div>
          </div>

          <hr className="border-border mb-10" />

          {/* MDX body */}
          {description && (
            <p className="text-lg text-muted-foreground leading-relaxed mb-10">
              {description}
            </p>
          )}

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <Mdx components={defaultMdxComponents} />
          </div>

          {/* ── Completion / next-up section ── */}
          {isLastChapter && (
            <div className="mt-20 flex flex-col items-center text-center gap-6">
              {/* Big numbered circle with checkmark */}
              <div className="relative">
                <div className="size-28 rounded-full bg-blue-600/20 border-2 border-blue-600/40 flex items-center justify-center">
                  <div className="size-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-4xl font-bold">
                    {displayChapterNumber}
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 size-9 rounded-full bg-blue-600 border-2 border-background flex items-center justify-center">
                  <CheckCircleIcon className="size-5 text-white" />
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-1">
                  You've Completed Chapter {displayChapterNumber}
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {description ??
                    "Great work! You've finished this chapter. Keep going!"}
                </p>
              </div>

              {next && (
                <Link
                  to="/learn/tutorials/$slug"
                  params={{ slug: next.slug }}
                  className="w-full max-w-sm"
                >
                  <div className="border border-border rounded-2xl p-6 hover:bg-muted/40 transition-colors text-left">
                    <p className="text-xs text-muted-foreground mb-1">
                      Next Up
                    </p>
                    <p className="font-semibold text-lg mb-1">
                      {next.chapterNumber - 1}: {next.title}
                    </p>
                    {next.description && (
                      <p className="text-sm text-muted-foreground mb-5">
                        {next.description}
                      </p>
                    )}
                    <button className="w-full flex items-center justify-center gap-2 bg-foreground text-background rounded-xl py-3 px-4 text-sm font-semibold hover:opacity-90 transition-opacity">
                      Start Chapter {next.chapterNumber - 1}
                      <ChevronRightIcon className="size-4" />
                    </button>
                  </div>
                </Link>
              )}

              <FeedbackBar />
            </div>
          )}

          {/* ── Intro "Ready to get started?" CTA ── */}
          {isIntro && next && (
            <div className="mt-20 flex flex-col items-center text-center gap-6">
              <hr className="w-full border-border" />
              <div>
                <h2 className="text-xl font-semibold mb-1">
                  Ready to get started?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Now that you've been introduced to the course, let's dive in.
                </p>
              </div>
              <Link
                to="/learn/tutorials/$slug"
                params={{ slug: next.slug }}
                className="w-full max-w-sm"
              >
                <div className="border border-border rounded-2xl p-6 hover:bg-muted/40 transition-colors text-left">
                  <p className="text-xs text-muted-foreground mb-1">Next Up</p>
                  <p className="font-semibold mb-1">1: {next.title}</p>
                  {next.description && (
                    <p className="text-sm text-muted-foreground mb-4">
                      {next.description}
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-2 bg-foreground text-background rounded-xl py-2.5 px-4 text-sm font-semibold">
                    Start Chapter 1
                    <ChevronRightIcon className="size-4" />
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* ── Prev / Next navigation (non-intro, non-last pages) ── */}
          {!isIntro && !isLastChapter && (
            <div className="mt-16 pt-8 border-t border-border">
              <div className="flex items-stretch gap-4">
                {prev ? (
                  <Link
                    to="/learn/tutorials/$slug"
                    params={{ slug: prev.slug }}
                    className="flex-1 group"
                  >
                    <div className="h-full p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">
                        ← Previous
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {prev.chapterNumber === 1
                            ? "Intro"
                            : prev.chapterNumber - 1}
                        </span>
                        <span className="text-sm font-medium group-hover:text-foreground transition-colors line-clamp-1">
                          {prev.title}
                        </span>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}

                {next ? (
                  <Link
                    to="/learn/tutorials/$slug"
                    params={{ slug: next.slug }}
                    className="flex-1 group text-right"
                  >
                    <div className="h-full p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">
                        Next →
                      </p>
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm font-medium group-hover:text-foreground transition-colors line-clamp-1">
                          {next.title}
                        </span>
                        <span className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {next.chapterNumber - 1}
                        </span>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            </div>
          )}

          {/* Feedback at bottom of non-last pages too */}
          {!isLastChapter && (
            <div className="mt-16">
              <FeedbackBar />
            </div>
          )}
        </main>
      </div>
    );
  },
});

function Page() {
  const { path } = Route.useLoaderData();
  const Component = clientLoader.getComponent(path);
  return <Component />;
}

export const Route = createFileRoute("/(home)/learn/tutorials/$")({
  ssr: true,
  loader: async ({ params }) => {
    const data = await serverLoader({ data: params._splat! });
    await clientLoader.preload(data.path);
    return data;
  },
  notFoundComponent: () => <p>Post not found.</p>,
  component: Page,
});
