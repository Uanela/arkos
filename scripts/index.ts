#!/usr/bin/env node

import { writeInsomniaCollectionJson } from "./generate-insomnia-collection";

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "generate-insomnia-collection":
    writeInsomniaCollectionJson();
    break;
}

// if (command === "generate-something") {
//   console.log("Hello World from arkos generate-something!");
//   console.log("This is running from your installed arkos package.");
// } else {
//   console.log("Available commands:");
//   console.log("  generate-something - Prints a hello world message");
//   console.log("\nUsage: pnpm arkos [command]");
// }

// // 3. Optional: Create an index.js file in the root:
// // index.js

// // This allows your package to be used programmatically
// module.exports = {
//   generateSomething: () => {
//     console.log("Hello World from arkos generate-something!");
//     console.log("This is running from your imported arkos package.");
//   },
// };
