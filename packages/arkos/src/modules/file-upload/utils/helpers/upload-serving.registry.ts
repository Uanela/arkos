import type { UploadUrlPath } from "../../../../types/upload";
import type { ArkosRouterState } from "../../../../utils/arkos-router/types";

export type UploadWriteRegistration = {
  dir?: string;
  urlPath?: UploadUrlPath;
  serve?: boolean;
  route: string;
  hasPrepare?: boolean;
  type?: "single" | "array" | "fields";
};

export type UploadServeRegistration = {
  dir: string;
  urlPath: string;
  dirParams: string[];
  pathParams: string[];
  recursive: boolean;
  dynamic: boolean;
  hasPrepare: boolean;
};

export type UploadServeSource = Omit<
  UploadServeRegistration,
  "urlPath" | "pathParams"
> & {
  router: ArkosRouterState;
};

export class UploadServingRegistry {
  private writeRegistrations: UploadWriteRegistration[] = [];
  private serveRegistrations: UploadServeRegistration[] = [];
  private serveSources: UploadServeSource[] = [];
  private findFileServingEnabled = false;

  registerWrite(registration: UploadWriteRegistration) {
    this.writeRegistrations.push(registration);
  }

  registerServe(registration: UploadServeRegistration) {
    this.serveRegistrations.push(registration);
  }

  registerServeSource(source: UploadServeSource) {
    this.serveSources.push(source);
  }

  getWriteRegistrations() {
    return [...this.writeRegistrations];
  }

  getServeRegistrations() {
    return [...this.serveRegistrations];
  }

  getServeSources() {
    return [...this.serveSources];
  }

  setFindFileServingEnabled(enabled: boolean) {
    this.findFileServingEnabled = enabled;
  }

  isFindFileServingEnabled() {
    return this.findFileServingEnabled;
  }

  reset() {
    this.writeRegistrations = [];
    this.serveRegistrations = [];
    this.serveSources = [];
    this.findFileServingEnabled = false;
  }
}

export const uploadServingRegistry = new UploadServingRegistry();
