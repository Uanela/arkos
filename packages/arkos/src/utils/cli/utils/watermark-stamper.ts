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
    if (host && port) console.info(`  - Local:        http://${host}:${port}`);
    if (envFiles?.length || 0 > 1)
      console.info(
        `  - Environments: ${envFiles
          ?.join(", ")
          .replaceAll(`${process.cwd()}/`, "")}\n`
      );
  }
}

const watermarkStamper = new WatermarkStamper();

export default watermarkStamper;
