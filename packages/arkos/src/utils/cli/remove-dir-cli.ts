import { getFolderPathFromArgs, isEntryPoint, removeDir } from "../remove-dir";

(async () => {
  if (isEntryPoint()) {
    const folderPath = getFolderPathFromArgs();
    removeDir(folderPath);
  }
})();
