import fs, { realpathSync } from "fs";

export function getFolderPathFromArgs() {
  const args = process.argv.slice(2);
  let folderPath = "";
  let pathCount = 0;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-p" || args[i] === "--path") {
      pathCount++;

      if (pathCount > 1) {
        console.error(
          "Error: Cannot use both -p and --path. Please use only one."
        );
        process.exit(1);
      }

      if (i + 1 < args.length) {
        folderPath = args[i + 1];
        i++;
      } else {
        console.error("Error: Path argument missing after " + args[i]);
        process.exit(1);
      }
    }
  }

  if (!folderPath) {
    console.error("Error: Please specify a folder path using -p or --path");
    process.exit(1);
  }

  return folderPath;
}

export function removeDir(folderPath: string) {
  if (fs.existsSync(folderPath))
    fs.rmSync(folderPath, { recursive: true, force: true });
  else console.log(`Folder not found: ${folderPath}`);
}

export function isEntryPoint(): boolean {
  return realpathSync(process.argv[1]) === realpathSync(__filename);
}

(async () => {
  if (isEntryPoint()) {
    const folderPath = getFolderPathFromArgs();
    removeDir(folderPath);
  }
})();
