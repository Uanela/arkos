"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/retext-stringify@4.0.0";
exports.ids = ["vendor-chunks/retext-stringify@4.0.0"];
exports.modules = {

/***/ "(rsc)/../node_modules/.pnpm/retext-stringify@4.0.0/node_modules/retext-stringify/lib/index.js":
/*!***********************************************************************************************!*\
  !*** ../node_modules/.pnpm/retext-stringify@4.0.0/node_modules/retext-stringify/lib/index.js ***!
  \***********************************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ retextStringify)\n/* harmony export */ });\n/* harmony import */ var nlcst_to_string__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! nlcst-to-string */ \"(rsc)/../node_modules/.pnpm/nlcst-to-string@4.0.0/node_modules/nlcst-to-string/lib/index.js\");\n/**\n * @typedef {import('nlcst').Root} Root\n */\n\n\n\n/**\n * Add support for serializing natural language.\n *\n * @returns {undefined}\n *   Nothing.\n */\nfunction retextStringify() {\n  // eslint-disable-next-line unicorn/no-this-assignment\n  const self =\n    /** @type {import('unified').Processor<undefined, undefined, undefined, Root, string>} */ (\n      // @ts-expect-error -- TS in JSDoc doesn’t understand `this`.\n      this\n    )\n\n  self.compiler = compiler\n}\n\n/** @type {import('unified').Compiler<Root, string>} */\nfunction compiler(tree) {\n  return (0,nlcst_to_string__WEBPACK_IMPORTED_MODULE_0__.toString)(tree)\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3JldGV4dC1zdHJpbmdpZnlANC4wLjAvbm9kZV9tb2R1bGVzL3JldGV4dC1zdHJpbmdpZnkvbGliL2luZGV4LmpzIiwibWFwcGluZ3MiOiI7Ozs7O0FBQUE7QUFDQSxhQUFhLHNCQUFzQjtBQUNuQzs7QUFFd0M7O0FBRXhDO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ2U7QUFDZjtBQUNBO0FBQ0EsZUFBZSw0RUFBNEU7QUFDM0Y7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUEsV0FBVywwQ0FBMEM7QUFDckQ7QUFDQSxTQUFTLHlEQUFRO0FBQ2pCIiwic291cmNlcyI6WyIvVXNlcnMvdWFuZWxhX2NvbW8vRG9jdW1lbnRzL2RldmVsb3BtZW50L25vZGVqcy9hcmtvcy9ub2RlX21vZHVsZXMvLnBucG0vcmV0ZXh0LXN0cmluZ2lmeUA0LjAuMC9ub2RlX21vZHVsZXMvcmV0ZXh0LXN0cmluZ2lmeS9saWIvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAdHlwZWRlZiB7aW1wb3J0KCdubGNzdCcpLlJvb3R9IFJvb3RcbiAqL1xuXG5pbXBvcnQge3RvU3RyaW5nfSBmcm9tICdubGNzdC10by1zdHJpbmcnXG5cbi8qKlxuICogQWRkIHN1cHBvcnQgZm9yIHNlcmlhbGl6aW5nIG5hdHVyYWwgbGFuZ3VhZ2UuXG4gKlxuICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAqICAgTm90aGluZy5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmV0ZXh0U3RyaW5naWZ5KCkge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgdW5pY29ybi9uby10aGlzLWFzc2lnbm1lbnRcbiAgY29uc3Qgc2VsZiA9XG4gICAgLyoqIEB0eXBlIHtpbXBvcnQoJ3VuaWZpZWQnKS5Qcm9jZXNzb3I8dW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgUm9vdCwgc3RyaW5nPn0gKi8gKFxuICAgICAgLy8gQHRzLWV4cGVjdC1lcnJvciAtLSBUUyBpbiBKU0RvYyBkb2VzbuKAmXQgdW5kZXJzdGFuZCBgdGhpc2AuXG4gICAgICB0aGlzXG4gICAgKVxuXG4gIHNlbGYuY29tcGlsZXIgPSBjb21waWxlclxufVxuXG4vKiogQHR5cGUge2ltcG9ydCgndW5pZmllZCcpLkNvbXBpbGVyPFJvb3QsIHN0cmluZz59ICovXG5mdW5jdGlvbiBjb21waWxlcih0cmVlKSB7XG4gIHJldHVybiB0b1N0cmluZyh0cmVlKVxufVxuIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/../node_modules/.pnpm/retext-stringify@4.0.0/node_modules/retext-stringify/lib/index.js\n");

/***/ })

};
;