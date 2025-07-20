"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestVersion = void 0;
function getLatestVersion(packageName) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield fetch(`https://registry.npmjs.org/${packageName}`);
        if (!res.ok)
            throw new Error(`Failed to fetch: ${res.status}`);
        const data = yield res.json();
        return data["dist-tags"].latest;
    });
}
exports.getLatestVersion = getLatestVersion;
//# sourceMappingURL=index.js.map