"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/recma-build-jsx@1.0.0";
exports.ids = ["vendor-chunks/recma-build-jsx@1.0.0"];
exports.modules = {

/***/ "(rsc)/../node_modules/.pnpm/recma-build-jsx@1.0.0/node_modules/recma-build-jsx/lib/index.js":
/*!*********************************************************************************************!*\
  !*** ../node_modules/.pnpm/recma-build-jsx@1.0.0/node_modules/recma-build-jsx/lib/index.js ***!
  \*********************************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ recmaJsx)\n/* harmony export */ });\n/* harmony import */ var estree_util_build_jsx__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! estree-util-build-jsx */ \"(rsc)/../node_modules/.pnpm/estree-util-build-jsx@3.0.1/node_modules/estree-util-build-jsx/lib/index.js\");\n/**\n * @import {Program} from 'estree'\n * @import {Options} from 'recma-build-jsx'\n * @import {VFile} from 'vfile'\n */\n\n\n\n/**\n * Plugin to build JSX.\n *\n * @param {Options | null | undefined} [options]\n *   Configuration (optional).\n * @returns\n *   Transform.\n */\nfunction recmaJsx(options) {\n  /**\n   * @param {Program} tree\n   *   Tree.\n   * @param {VFile} file\n   *   File.\n   * @returns {undefined}\n   *   Nothing.\n   */\n  return function (tree, file) {\n    (0,estree_util_build_jsx__WEBPACK_IMPORTED_MODULE_0__.buildJsx)(tree, {filePath: file.history[0], ...options})\n  }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3JlY21hLWJ1aWxkLWpzeEAxLjAuMC9ub2RlX21vZHVsZXMvcmVjbWEtYnVpbGQtanN4L2xpYi9pbmRleC5qcyIsIm1hcHBpbmdzIjoiOzs7OztBQUFBO0FBQ0EsWUFBWSxTQUFTO0FBQ3JCLFlBQVksU0FBUztBQUNyQixZQUFZLE9BQU87QUFDbkI7O0FBRThDOztBQUU5QztBQUNBO0FBQ0E7QUFDQSxXQUFXLDRCQUE0QjtBQUN2QztBQUNBO0FBQ0E7QUFDQTtBQUNlO0FBQ2Y7QUFDQSxhQUFhLFNBQVM7QUFDdEI7QUFDQSxhQUFhLE9BQU87QUFDcEI7QUFDQSxlQUFlO0FBQ2Y7QUFDQTtBQUNBO0FBQ0EsSUFBSSwrREFBUSxRQUFRLHNDQUFzQztBQUMxRDtBQUNBIiwic291cmNlcyI6WyIvVXNlcnMvdWFuZWxhX2NvbW8vRG9jdW1lbnRzL2RldmVsb3BtZW50L25vZGVqcy9hcmtvcy9ub2RlX21vZHVsZXMvLnBucG0vcmVjbWEtYnVpbGQtanN4QDEuMC4wL25vZGVfbW9kdWxlcy9yZWNtYS1idWlsZC1qc3gvbGliL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGltcG9ydCB7UHJvZ3JhbX0gZnJvbSAnZXN0cmVlJ1xuICogQGltcG9ydCB7T3B0aW9uc30gZnJvbSAncmVjbWEtYnVpbGQtanN4J1xuICogQGltcG9ydCB7VkZpbGV9IGZyb20gJ3ZmaWxlJ1xuICovXG5cbmltcG9ydCB7YnVpbGRKc3h9IGZyb20gJ2VzdHJlZS11dGlsLWJ1aWxkLWpzeCdcblxuLyoqXG4gKiBQbHVnaW4gdG8gYnVpbGQgSlNYLlxuICpcbiAqIEBwYXJhbSB7T3B0aW9ucyB8IG51bGwgfCB1bmRlZmluZWR9IFtvcHRpb25zXVxuICogICBDb25maWd1cmF0aW9uIChvcHRpb25hbCkuXG4gKiBAcmV0dXJuc1xuICogICBUcmFuc2Zvcm0uXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJlY21hSnN4KG9wdGlvbnMpIHtcbiAgLyoqXG4gICAqIEBwYXJhbSB7UHJvZ3JhbX0gdHJlZVxuICAgKiAgIFRyZWUuXG4gICAqIEBwYXJhbSB7VkZpbGV9IGZpbGVcbiAgICogICBGaWxlLlxuICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgKiAgIE5vdGhpbmcuXG4gICAqL1xuICByZXR1cm4gZnVuY3Rpb24gKHRyZWUsIGZpbGUpIHtcbiAgICBidWlsZEpzeCh0cmVlLCB7ZmlsZVBhdGg6IGZpbGUuaGlzdG9yeVswXSwgLi4ub3B0aW9uc30pXG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/../node_modules/.pnpm/recma-build-jsx@1.0.0/node_modules/recma-build-jsx/lib/index.js\n");

/***/ })

};
;