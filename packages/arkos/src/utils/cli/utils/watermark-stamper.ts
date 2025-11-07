import portAndHostAllocator from "../../features/port-and-host-allocator";
import { fullCleanCwd } from "../../helpers/fs.helpers";
import { getVersion } from "./cli.helpers";

/**
 * Helps in putting Arkosjs watermark
 */
class WatermarkStamper {
  /**
   * Stamps Arkosjs watermark with Local and Environments
   */
  stamp({
    envFiles,
    host,
    port,
  }: {
    envFiles: string[] | undefined;
    host: string | undefined;
    port: string | undefined;
  }) {
    console.info(`\n  \x1b[1m\x1b[36m  Arkos.js ${getVersion()}\x1b[0m`);
    if (host && port) {
      console.info(
        `  - Local:        http://${["0.0.0.0", "127.0.0.1"].includes(host) ? "localhost" : host}:${port}`
      );
      let nonLocalIp = portAndHostAllocator.getFirstNonLocalIp();
      if (nonLocalIp && host === "0.0.0.0")
        console.info(`  - Network:      http://${nonLocalIp}:${port}`);
    }

    if (envFiles?.length || 0 > 1)
      console.info(
        `  - Environments: ${fullCleanCwd(envFiles?.join(", ") || "")
          .replaceAll(`\\`, "")
          .replaceAll("/", "")}\n`
      );
  }
}

const watermarkStamper = new WatermarkStamper();

export default watermarkStamper;
