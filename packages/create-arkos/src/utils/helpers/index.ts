import fs from "fs";

export async function getLatestVersion(packageName: string) {
  const res = await fetch(`https://registry.npmjs.org/${packageName}`);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

  const data = await res.json();
  return data["dist-tags"].latest;
}

export function getProcjetPackageJsonDependecies(projectPath: string): {
  dependencies: string[];
  devDependencies: string[];
} {
  const content = fs.readFileSync(`${projectPath}/package.json`, {
    encoding: "utf8",
  });

  const packageJson: {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  } = JSON.parse(content);
  const dependencies = Object.keys(packageJson.dependencies);
  const devDependencies = Object.keys(packageJson.devDependencies);

  return { dependencies, devDependencies };
}
