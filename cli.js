#!/usr/bin/env node

// First, we need to detect which module system we're running in
// We'll use dynamic import which works in both systems
;(async () => {
  try {
    // Get path and fs using dynamic import
    const { join } = await import('path')
    const { existsSync, readFileSync } = await import('fs')

    // Determine if we should use ESM or CJS
    let useEsm = false

    try {
      // Check if current environment is set to use ESM
      const pkgPath = join('..', process.cwd(), 'package.json')
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
        useEsm = pkg.type === 'module'
      }
    } catch (err) {
      // Ignore errors and default to CJS
      console.error('Error checking package.json:', err)
    }

    // Import the appropriate version
    if (useEsm) {
      // Use dynamic import for ESM
      await import('./dist/es2020/utils/cli/index.js')
    } else {
      // For CommonJS, we still need to use dynamic import in an ESM context
      await import('./dist/cjs/utils/cli/index.js')
      //   console.log("cjs", index);
    }
  } catch (err) {
    console.error('Failed to load CLI:', err)
    process.exit(1)
  }
})()
