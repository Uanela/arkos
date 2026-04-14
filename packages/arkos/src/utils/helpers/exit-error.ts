import sheu from "../sheu";

export default function ExitError(message: any, code = 1) {
  console.log("");
  sheu.error(message);
  process.exit(code);
}
