#!/usr/bin/env node

import { writeInsomniaCollectionJson } from "./generate-insomnia-collection";

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "generate-insomnia-collection":
    writeInsomniaCollectionJson();
    break;
}
