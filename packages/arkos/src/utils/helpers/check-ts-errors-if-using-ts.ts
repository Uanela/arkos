import { promisify } from "util";
import { exec } from "child_process";
import { getUserFileExtension } from "./fs.helpers";

const execAsync = promisify(exec);

export default async function checkTsErrorsIfUsingTs() {
  const ext = getUserFileExtension();
  if (ext !== "ts") return;

  try {
    await execAsync("tsc --noEmit");
  } catch (err) {
    throw err;
  }
}
