export async function getLatestVersion(packageName: string) {
  const res = await fetch(`https://registry.npmjs.org/${packageName}`);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

  const data = await res.json();
  return data["dist-tags"].latest;
}
