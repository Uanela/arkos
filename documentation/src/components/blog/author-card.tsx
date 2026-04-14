import { authors, type AuthorKey } from "@/lib/authors";

const LinkedInIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const GitHubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const GlobeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export function AuthorCard({ authorKey }: { authorKey: AuthorKey }) {
  const author = authors[authorKey];
  if (!author) return null;

  return (
    <div className="flex items-center gap-3 p-1 rounded-xl max-w-[300px]">
      <img
        src={author.image_url}
        alt={author.name}
        className="w-12 h-12 rounded-full object-cover"
      />
      <div className="flex flex-col gap-1">
        <a
          href={author.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-fd-primary hover:underline"
        >
          {author.name}
        </a>
        <p className="text-xs text-fd-muted-foreground line-clamp-1">
          {author.title}
        </p>
        <div className="flex gap-2 text-fd-muted-foreground mt-1">
          {author.socials.linkedin && (
            <a
              href={`https://linkedin.com/in/${author.socials.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fd-foreground"
            >
              <LinkedInIcon />
            </a>
          )}
          {author.socials.github && (
            <a
              href={`https://github.com/${author.socials.github}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fd-foreground"
            >
              <GitHubIcon />
            </a>
          )}
          {author.socials.newsletter && (
            <a
              href={author.socials.newsletter}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fd-foreground"
            >
              <GlobeIcon />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
