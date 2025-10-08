"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/recma-jsx@1.0.0_acorn@8.15.0";
exports.ids = ["vendor-chunks/recma-jsx@1.0.0_acorn@8.15.0"];
exports.modules = {

/***/ "(rsc)/../node_modules/.pnpm/recma-jsx@1.0.0_acorn@8.15.0/node_modules/recma-jsx/lib/index.js":
/*!**********************************************************************************************!*\
  !*** ../node_modules/.pnpm/recma-jsx@1.0.0_acorn@8.15.0/node_modules/recma-jsx/lib/index.js ***!
  \**********************************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ recmaJsx)\n/* harmony export */ });\n/* harmony import */ var acorn_jsx__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! acorn-jsx */ \"(rsc)/../node_modules/.pnpm/acorn-jsx@5.3.2_acorn@8.15.0/node_modules/acorn-jsx/index.js\");\n/* harmony import */ var estree_util_to_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! estree-util-to-js */ \"(rsc)/../node_modules/.pnpm/estree-util-to-js@2.0.0/node_modules/estree-util-to-js/lib/jsx.js\");\n/**\n * @import {} from 'recma-parse'\n * @import {} from 'recma-stringify'\n * @import {Processor} from 'unified'\n */\n\n\n\n\n/**\n * Plugin to add support for parsing and serializing JSX.\n *\n * @this {Processor}\n *   Processor.\n * @returns {undefined}\n *   Nothing.\n */\nfunction recmaJsx() {\n  const data = this.data()\n  const settings = data.settings || (data.settings = {})\n  const handlers = settings.handlers || (settings.handlers = {})\n  const plugins = settings.plugins || (settings.plugins = [])\n\n  // No useful options yet.\n  plugins.push(acorn_jsx__WEBPACK_IMPORTED_MODULE_0__())\n  Object.assign(handlers, estree_util_to_js__WEBPACK_IMPORTED_MODULE_1__.jsx)\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3JlY21hLWpzeEAxLjAuMF9hY29ybkA4LjE1LjAvbm9kZV9tb2R1bGVzL3JlY21hLWpzeC9saWIvaW5kZXguanMiLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7QUFDQSxjQUFjO0FBQ2QsY0FBYztBQUNkLFlBQVksV0FBVztBQUN2Qjs7QUFFaUM7QUFDbUI7O0FBRXBEO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ2U7QUFDZjtBQUNBLHVEQUF1RDtBQUN2RCwrREFBK0Q7QUFDL0Q7O0FBRUE7QUFDQSxlQUFlLHNDQUFTO0FBQ3hCLDBCQUEwQixrREFBVztBQUNyQyIsInNvdXJjZXMiOlsiL1VzZXJzL3VhbmVsYV9jb21vL0RvY3VtZW50cy9kZXZlbG9wbWVudC9ub2RlanMvYXJrb3Mvbm9kZV9tb2R1bGVzLy5wbnBtL3JlY21hLWpzeEAxLjAuMF9hY29ybkA4LjE1LjAvbm9kZV9tb2R1bGVzL3JlY21hLWpzeC9saWIvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAaW1wb3J0IHt9IGZyb20gJ3JlY21hLXBhcnNlJ1xuICogQGltcG9ydCB7fSBmcm9tICdyZWNtYS1zdHJpbmdpZnknXG4gKiBAaW1wb3J0IHtQcm9jZXNzb3J9IGZyb20gJ3VuaWZpZWQnXG4gKi9cblxuaW1wb3J0IGpzeFBsdWdpbiBmcm9tICdhY29ybi1qc3gnXG5pbXBvcnQge2pzeCBhcyBqc3hIYW5kbGVyc30gZnJvbSAnZXN0cmVlLXV0aWwtdG8tanMnXG5cbi8qKlxuICogUGx1Z2luIHRvIGFkZCBzdXBwb3J0IGZvciBwYXJzaW5nIGFuZCBzZXJpYWxpemluZyBKU1guXG4gKlxuICogQHRoaXMge1Byb2Nlc3Nvcn1cbiAqICAgUHJvY2Vzc29yLlxuICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAqICAgTm90aGluZy5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVjbWFKc3goKSB7XG4gIGNvbnN0IGRhdGEgPSB0aGlzLmRhdGEoKVxuICBjb25zdCBzZXR0aW5ncyA9IGRhdGEuc2V0dGluZ3MgfHwgKGRhdGEuc2V0dGluZ3MgPSB7fSlcbiAgY29uc3QgaGFuZGxlcnMgPSBzZXR0aW5ncy5oYW5kbGVycyB8fCAoc2V0dGluZ3MuaGFuZGxlcnMgPSB7fSlcbiAgY29uc3QgcGx1Z2lucyA9IHNldHRpbmdzLnBsdWdpbnMgfHwgKHNldHRpbmdzLnBsdWdpbnMgPSBbXSlcblxuICAvLyBObyB1c2VmdWwgb3B0aW9ucyB5ZXQuXG4gIHBsdWdpbnMucHVzaChqc3hQbHVnaW4oKSlcbiAgT2JqZWN0LmFzc2lnbihoYW5kbGVycywganN4SGFuZGxlcnMpXG59XG4iXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbMF0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/../node_modules/.pnpm/recma-jsx@1.0.0_acorn@8.15.0/node_modules/recma-jsx/lib/index.js\n");

/***/ })

};
;