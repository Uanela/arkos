import type { UploadUrlPath } from "../../../../types/upload";

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

export class UploadServingRegistry {
  private writeRegistrations: UploadWriteRegistration[] = [];
  private serveRegistrations: UploadServeRegistration[] = [];
  private findFileServingEnabled = false;

  registerWrite(registration: UploadWriteRegistration) {
    this.writeRegistrations.push(registration);
  }

  registerServe(registration: UploadServeRegistration) {
    this.serveRegistrations.push(registration);
  }

  getWriteRegistrations() {
    return [...this.writeRegistrations];
  }

  getServeRegistrations() {
    return [...this.serveRegistrations];
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
    this.findFileServingEnabled = false;
  }
}

export const uploadServingRegistry = new UploadServingRegistry();
