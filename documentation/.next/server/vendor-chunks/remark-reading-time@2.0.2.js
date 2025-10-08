"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/remark-reading-time@2.0.2";
exports.ids = ["vendor-chunks/remark-reading-time@2.0.2"];
exports.modules = {

/***/ "(rsc)/../node_modules/.pnpm/remark-reading-time@2.0.2/node_modules/remark-reading-time/index.js":
/*!*************************************************************************************************!*\
  !*** ../node_modules/.pnpm/remark-reading-time@2.0.2/node_modules/remark-reading-time/index.js ***!
  \*************************************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ readingTime)\n/* harmony export */ });\n/* harmony import */ var reading_time__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! reading-time */ \"(rsc)/../node_modules/.pnpm/reading-time@1.5.0/node_modules/reading-time/index.js\");\n/* harmony import */ var unist_util_visit__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! unist-util-visit */ \"(rsc)/../node_modules/.pnpm/unist-util-visit@3.1.0/node_modules/unist-util-visit/index.js\");\n\n\n\nfunction readingTime({\n  /**\n   * The attribute name to store the reading time under data.\n   *\n   * @type {string}\n   * @default \"readingTime\"\n   */\n  attribute = \"readingTime\",\n} = {}) {\n  return function (info, file) {\n    let text = \"\";\n\n    (0,unist_util_visit__WEBPACK_IMPORTED_MODULE_1__.visit)(info, [\"text\", \"code\"], (node) => {\n      text += node.value;\n    });\n\n    file.data[attribute] = reading_time__WEBPACK_IMPORTED_MODULE_0__(text);\n  };\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3JlbWFyay1yZWFkaW5nLXRpbWVAMi4wLjIvbm9kZV9tb2R1bGVzL3JlbWFyay1yZWFkaW5nLXRpbWUvaW5kZXguanMiLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQTBDO0FBQ0Q7O0FBRTFCO0FBQ2Y7QUFDQTtBQUNBO0FBQ0EsWUFBWTtBQUNaO0FBQ0E7QUFDQTtBQUNBLEVBQUUsSUFBSTtBQUNOO0FBQ0E7O0FBRUEsSUFBSSx1REFBSztBQUNUO0FBQ0EsS0FBSzs7QUFFTCwyQkFBMkIseUNBQWM7QUFDekM7QUFDQSIsInNvdXJjZXMiOlsiL1VzZXJzL3VhbmVsYV9jb21vL0RvY3VtZW50cy9kZXZlbG9wbWVudC9ub2RlanMvYXJrb3Mvbm9kZV9tb2R1bGVzLy5wbnBtL3JlbWFyay1yZWFkaW5nLXRpbWVAMi4wLjIvbm9kZV9tb2R1bGVzL3JlbWFyay1yZWFkaW5nLXRpbWUvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGdldFJlYWRpbmdUaW1lIGZyb20gXCJyZWFkaW5nLXRpbWVcIjtcbmltcG9ydCB7IHZpc2l0IH0gZnJvbSBcInVuaXN0LXV0aWwtdmlzaXRcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVhZGluZ1RpbWUoe1xuICAvKipcbiAgICogVGhlIGF0dHJpYnV0ZSBuYW1lIHRvIHN0b3JlIHRoZSByZWFkaW5nIHRpbWUgdW5kZXIgZGF0YS5cbiAgICpcbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQGRlZmF1bHQgXCJyZWFkaW5nVGltZVwiXG4gICAqL1xuICBhdHRyaWJ1dGUgPSBcInJlYWRpbmdUaW1lXCIsXG59ID0ge30pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIChpbmZvLCBmaWxlKSB7XG4gICAgbGV0IHRleHQgPSBcIlwiO1xuXG4gICAgdmlzaXQoaW5mbywgW1widGV4dFwiLCBcImNvZGVcIl0sIChub2RlKSA9PiB7XG4gICAgICB0ZXh0ICs9IG5vZGUudmFsdWU7XG4gICAgfSk7XG5cbiAgICBmaWxlLmRhdGFbYXR0cmlidXRlXSA9IGdldFJlYWRpbmdUaW1lKHRleHQpO1xuICB9O1xufVxuIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/../node_modules/.pnpm/remark-reading-time@2.0.2/node_modules/remark-reading-time/index.js\n");

/***/ })

};
;