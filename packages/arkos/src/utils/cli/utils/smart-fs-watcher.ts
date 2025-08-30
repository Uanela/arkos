import chokidar, { FSWatcher } from "chokidar";
import path from "path";

class SmartFSWather {
  private watchedFiles!: Set<string>;
  private watcher!: FSWatcher | null;
  private onNewFile!: (filePath: string) => void;

  start(onNewFile: (filePath: string) => void) {
    this.watchedFiles = new Set();
    this.watcher = null;
    this.onNewFile = onNewFile;

    this.watcher = chokidar.watch(
      [
        "src",
        "package.json",
        "tsconfig.json",
        "jsconfig.json",
        "arkos.config.ts",
        "arkos.config.js",
      ],
      {
        ignoreInitial: true,
        ignored: [
          /node_modules/,
          /\.git/,
          /\.dist/,
          /\.build/,
          /dist/,
          /build/,
          /\.env.*/,
        ],
        awaitWriteFinish: {
          stabilityThreshold: 1000,
        },
      }
    );

    this.setupListeners();
  }

  private setupListeners() {
    if (!this.watcher) return;

    this.watcher
      .on("add", (filePath) => {
        const wasAlreadyWatched = this.watchedFiles.has(filePath);
        if (!wasAlreadyWatched) this.onNewFile(filePath);

        // Update tracking
        this.watchedFiles.add(filePath);
      })
      .on("ready", () => {
        // Initialize tracking with currently watched files
        const initiallyWatched = this.watcher!.getWatched();
        Object.entries(initiallyWatched).forEach(([dir, files]) => {
          files.forEach((file) => {
            const fullPath = path.join(dir, file);
            this.watchedFiles.add(fullPath);
          });
        });
      })
      .on("unlink", (filePath) => {
        this.watchedFiles.delete(filePath);
      });
  }

  reset() {
    // Clear tracked files so next add events will be treated as new
    this.watchedFiles?.clear();
  }

  close() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.watchedFiles?.clear();
  }
}

const smartFsWatcher = new SmartFSWather();

export default smartFsWatcher;
