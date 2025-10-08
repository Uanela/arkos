"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/nlcst-to-string@4.0.0";
exports.ids = ["vendor-chunks/nlcst-to-string@4.0.0"];
exports.modules = {

/***/ "(rsc)/../node_modules/.pnpm/nlcst-to-string@4.0.0/node_modules/nlcst-to-string/lib/index.js":
/*!*********************************************************************************************!*\
  !*** ../node_modules/.pnpm/nlcst-to-string@4.0.0/node_modules/nlcst-to-string/lib/index.js ***!
  \*********************************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   toString: () => (/* binding */ toString)\n/* harmony export */ });\n/**\n * @typedef {import('nlcst').Nodes} Nodes\n */\n\n/** @type {Readonly<Array<Nodes>>} */\nconst emptyNodes = []\n\n/**\n * Get the text content of a node or list of nodes.\n *\n * Prefers the node’s plain-text fields, otherwise serializes its children, and\n * if the given value is an array, serialize the nodes in it.\n *\n * @param {Array<Nodes> | Nodes} value\n *   Node or list of nodes to serialize.\n * @returns {string}\n *   Result.\n */\nfunction toString(value) {\n  let index = -1\n\n  if (!value || (!Array.isArray(value) && !value.type)) {\n    throw new Error('Expected node, not `' + value + '`')\n  }\n\n  if ('value' in value) return value.value\n\n  const children = (Array.isArray(value) ? value : value.children) || emptyNodes\n\n  /** @type {Array<string>} */\n  const values = []\n\n  while (++index < children.length) {\n    values[index] = toString(children[index])\n  }\n\n  return values.join('')\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vbm9kZV9tb2R1bGVzLy5wbnBtL25sY3N0LXRvLXN0cmluZ0A0LjAuMC9ub2RlX21vZHVsZXMvbmxjc3QtdG8tc3RyaW5nL2xpYi9pbmRleC5qcyIsIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQSxhQUFhLHVCQUF1QjtBQUNwQzs7QUFFQSxXQUFXLHdCQUF3QjtBQUNuQzs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLHNCQUFzQjtBQUNqQztBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ087QUFDUDs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUEsYUFBYSxlQUFlO0FBQzVCOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBIiwic291cmNlcyI6WyIvVXNlcnMvdWFuZWxhX2NvbW8vRG9jdW1lbnRzL2RldmVsb3BtZW50L25vZGVqcy9hcmtvcy9ub2RlX21vZHVsZXMvLnBucG0vbmxjc3QtdG8tc3RyaW5nQDQuMC4wL25vZGVfbW9kdWxlcy9ubGNzdC10by1zdHJpbmcvbGliL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQHR5cGVkZWYge2ltcG9ydCgnbmxjc3QnKS5Ob2Rlc30gTm9kZXNcbiAqL1xuXG4vKiogQHR5cGUge1JlYWRvbmx5PEFycmF5PE5vZGVzPj59ICovXG5jb25zdCBlbXB0eU5vZGVzID0gW11cblxuLyoqXG4gKiBHZXQgdGhlIHRleHQgY29udGVudCBvZiBhIG5vZGUgb3IgbGlzdCBvZiBub2Rlcy5cbiAqXG4gKiBQcmVmZXJzIHRoZSBub2Rl4oCZcyBwbGFpbi10ZXh0IGZpZWxkcywgb3RoZXJ3aXNlIHNlcmlhbGl6ZXMgaXRzIGNoaWxkcmVuLCBhbmRcbiAqIGlmIHRoZSBnaXZlbiB2YWx1ZSBpcyBhbiBhcnJheSwgc2VyaWFsaXplIHRoZSBub2RlcyBpbiBpdC5cbiAqXG4gKiBAcGFyYW0ge0FycmF5PE5vZGVzPiB8IE5vZGVzfSB2YWx1ZVxuICogICBOb2RlIG9yIGxpc3Qgb2Ygbm9kZXMgdG8gc2VyaWFsaXplLlxuICogQHJldHVybnMge3N0cmluZ31cbiAqICAgUmVzdWx0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9TdHJpbmcodmFsdWUpIHtcbiAgbGV0IGluZGV4ID0gLTFcblxuICBpZiAoIXZhbHVlIHx8ICghQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgIXZhbHVlLnR5cGUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCBub2RlLCBub3QgYCcgKyB2YWx1ZSArICdgJylcbiAgfVxuXG4gIGlmICgndmFsdWUnIGluIHZhbHVlKSByZXR1cm4gdmFsdWUudmFsdWVcblxuICBjb25zdCBjaGlsZHJlbiA9IChBcnJheS5pc0FycmF5KHZhbHVlKSA/IHZhbHVlIDogdmFsdWUuY2hpbGRyZW4pIHx8IGVtcHR5Tm9kZXNcblxuICAvKiogQHR5cGUge0FycmF5PHN0cmluZz59ICovXG4gIGNvbnN0IHZhbHVlcyA9IFtdXG5cbiAgd2hpbGUgKCsraW5kZXggPCBjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICB2YWx1ZXNbaW5kZXhdID0gdG9TdHJpbmcoY2hpbGRyZW5baW5kZXhdKVxuICB9XG5cbiAgcmV0dXJuIHZhbHVlcy5qb2luKCcnKVxufVxuIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/../node_modules/.pnpm/nlcst-to-string@4.0.0/node_modules/nlcst-to-string/lib/index.js\n");

/***/ })

};
;