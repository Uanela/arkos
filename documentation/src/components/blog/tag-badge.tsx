import { tags, type TagKey } from "@/lib/tags";

export function TagBadge({ tagKey }: { tagKey: TagKey }) {
  const tag = tags[tagKey];
  if (!tag) return null;

  return (
    <a
      href={tag.permalink}
      title={tag.description}
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-fd-secondary text-fd-secondary-foreground hover:bg-fd-accent transition-colors"
    >
      {tag.label}
    </a>
  );
}
