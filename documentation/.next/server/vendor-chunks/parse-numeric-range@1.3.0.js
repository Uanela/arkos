/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/parse-numeric-range@1.3.0";
exports.ids = ["vendor-chunks/parse-numeric-range@1.3.0"];
exports.modules = {

/***/ "(rsc)/../node_modules/.pnpm/parse-numeric-range@1.3.0/node_modules/parse-numeric-range/index.js":
/*!*************************************************************************************************!*\
  !*** ../node_modules/.pnpm/parse-numeric-range@1.3.0/node_modules/parse-numeric-range/index.js ***!
  \*************************************************************************************************/
/***/ ((module, exports) => {

eval("/**\n * @param {string} string    The string to parse\n * @returns {Array<number>}  Returns an energetic array.\n */\nfunction parsePart(string) {\n  let res = [];\n  let m;\n\n  for (let str of string.split(\",\").map((str) => str.trim())) {\n    // just a number\n    if (/^-?\\d+$/.test(str)) {\n      res.push(parseInt(str, 10));\n    } else if (\n      (m = str.match(/^(-?\\d+)(-|\\.\\.\\.?|\\u2025|\\u2026|\\u22EF)(-?\\d+)$/))\n    ) {\n      // 1-5 or 1..5 (equivalent) or 1...5 (doesn't include 5)\n      let [_, lhs, sep, rhs] = m;\n\n      if (lhs && rhs) {\n        lhs = parseInt(lhs);\n        rhs = parseInt(rhs);\n        const incr = lhs < rhs ? 1 : -1;\n\n        // Make it inclusive by moving the right 'stop-point' away by one.\n        if (sep === \"-\" || sep === \"..\" || sep === \"\\u2025\") rhs += incr;\n\n        for (let i = lhs; i !== rhs; i += incr) res.push(i);\n      }\n    }\n  }\n\n  return res;\n}\n\nexports[\"default\"] = parsePart;\nmodule.exports = parsePart;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3BhcnNlLW51bWVyaWMtcmFuZ2VAMS4zLjAvbm9kZV9tb2R1bGVzL3BhcnNlLW51bWVyaWMtcmFuZ2UvaW5kZXguanMiLCJtYXBwaW5ncyI6IkFBQUE7QUFDQSxXQUFXLFFBQVE7QUFDbkIsYUFBYSxnQkFBZ0I7QUFDN0I7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSwwQkFBMEIsV0FBVztBQUNyQztBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSxrQkFBZTtBQUNmIiwic291cmNlcyI6WyIvVXNlcnMvdWFuZWxhX2NvbW8vRG9jdW1lbnRzL2RldmVsb3BtZW50L25vZGVqcy9hcmtvcy9ub2RlX21vZHVsZXMvLnBucG0vcGFyc2UtbnVtZXJpYy1yYW5nZUAxLjMuMC9ub2RlX21vZHVsZXMvcGFyc2UtbnVtZXJpYy1yYW5nZS9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgICAgVGhlIHN0cmluZyB0byBwYXJzZVxuICogQHJldHVybnMge0FycmF5PG51bWJlcj59ICBSZXR1cm5zIGFuIGVuZXJnZXRpYyBhcnJheS5cbiAqL1xuZnVuY3Rpb24gcGFyc2VQYXJ0KHN0cmluZykge1xuICBsZXQgcmVzID0gW107XG4gIGxldCBtO1xuXG4gIGZvciAobGV0IHN0ciBvZiBzdHJpbmcuc3BsaXQoXCIsXCIpLm1hcCgoc3RyKSA9PiBzdHIudHJpbSgpKSkge1xuICAgIC8vIGp1c3QgYSBudW1iZXJcbiAgICBpZiAoL14tP1xcZCskLy50ZXN0KHN0cikpIHtcbiAgICAgIHJlcy5wdXNoKHBhcnNlSW50KHN0ciwgMTApKTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgKG0gPSBzdHIubWF0Y2goL14oLT9cXGQrKSgtfFxcLlxcLlxcLj98XFx1MjAyNXxcXHUyMDI2fFxcdTIyRUYpKC0/XFxkKykkLykpXG4gICAgKSB7XG4gICAgICAvLyAxLTUgb3IgMS4uNSAoZXF1aXZhbGVudCkgb3IgMS4uLjUgKGRvZXNuJ3QgaW5jbHVkZSA1KVxuICAgICAgbGV0IFtfLCBsaHMsIHNlcCwgcmhzXSA9IG07XG5cbiAgICAgIGlmIChsaHMgJiYgcmhzKSB7XG4gICAgICAgIGxocyA9IHBhcnNlSW50KGxocyk7XG4gICAgICAgIHJocyA9IHBhcnNlSW50KHJocyk7XG4gICAgICAgIGNvbnN0IGluY3IgPSBsaHMgPCByaHMgPyAxIDogLTE7XG5cbiAgICAgICAgLy8gTWFrZSBpdCBpbmNsdXNpdmUgYnkgbW92aW5nIHRoZSByaWdodCAnc3RvcC1wb2ludCcgYXdheSBieSBvbmUuXG4gICAgICAgIGlmIChzZXAgPT09IFwiLVwiIHx8IHNlcCA9PT0gXCIuLlwiIHx8IHNlcCA9PT0gXCJcXHUyMDI1XCIpIHJocyArPSBpbmNyO1xuXG4gICAgICAgIGZvciAobGV0IGkgPSBsaHM7IGkgIT09IHJoczsgaSArPSBpbmNyKSByZXMucHVzaChpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzO1xufVxuXG5leHBvcnRzLmRlZmF1bHQgPSBwYXJzZVBhcnQ7XG5tb2R1bGUuZXhwb3J0cyA9IHBhcnNlUGFydDtcbiJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/../node_modules/.pnpm/parse-numeric-range@1.3.0/node_modules/parse-numeric-range/index.js\n");

/***/ })

};
;