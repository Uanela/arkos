// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",

  // Foreground colors
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  // Background colors
  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m",
};

// Usage
console.log(
  `${colors.cyan}🏛️ ♜ ⛺︎ ☗ ⏏︎ Arkos.js${colors.reset} - Framework initialized`
);
console.log(`${colors.green}✓${colors.reset} Server running on port 3000`);
console.log(`${colors.yellow}⚠${colors.reset} Warning: Development mode`);
console.log(`${colors.bright}${colors.blue}API ready${colors.reset}`);
