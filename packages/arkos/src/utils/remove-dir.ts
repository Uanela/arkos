import fs from "fs";

export function removeDir(folderPath: string) {
  if (fs.existsSync(folderPath))
    fs.rmSync(folderPath, { recursive: true, force: true });
  else console.info(`Folder not found: ${folderPath}`);
}
