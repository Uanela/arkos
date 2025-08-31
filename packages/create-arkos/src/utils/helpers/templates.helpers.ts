import path from "path";
import fs from "fs";
import { handlebars } from "../..";

/**
 * This one was added to help testing the hbs templates files.
 */
export function renderTemplate(
  templatePath: string,
  context: Record<string, any>
) {
  return handlebars.compile(
    fs.readFileSync(path.join(process.cwd(), "templates", templatePath), "utf8")
  )(context);
}
