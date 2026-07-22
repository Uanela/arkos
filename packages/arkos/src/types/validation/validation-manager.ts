import { getArkosConfig } from "../../server";
import { isClass, isZodSchema } from "../../utils/dynamic-loader";
import validateDto from "../../utils/validate-dto";
import validateSchema from "../../utils/validate-schema";
import { ArkosConfig } from "../new-arkos-config";
import { Validator } from "./validator";

class ValidationManager {
  arkosConfig!: ArkosConfig;

  get validationConfig() {
    if (!this.arkosConfig) this.arkosConfig = getArkosConfig();
    return getArkosConfig().validation || ({} as ArkosConfig["validation"]);
  }

  get validatorName() {
    return this.validationConfig?.resolver == "zod"
      ? "zod schema"
      : "class-validator dto";
  }

  get validationFn() {
    return this.validationConfig?.resolver == "zod"
      ? validateSchema
      : validateDto;
  }

  get validatorNameType() {
    return this.validationConfig?.resolver == "zod" ? "Schema" : "Dto";
  }

  isValidValidator = (validator: Validator) => {
    const fn = this.validationConfig?.resolver == "zod" ? isZodSchema : isClass;
    return [false, null, undefined].includes(validator as any) || fn(validator);
  };

  isValidator = (validator: Validator) => {
    const fn = this.validationConfig?.resolver == "zod" ? isZodSchema : isClass;
    return fn(validator);
  };

  shouldValidate = (
    validator: Validator,
    data: any
  ): "prohibit" | "passthrough" | "validate" => {
    let hasInput = !!data;
    if (typeof data === "object") hasInput = Object.keys(data || {}).length > 0;

    // null explicitly set → always prohibit input
    if (validator === null && hasInput) return "prohibit";

    // strict mode + key not declared or set to undefined → prohibit input
    if (this.validationConfig?.strict && validator === undefined && hasInput)
      return "prohibit";

    // false explicitly set → allow input through without validation
    if (validator === false) return "passthrough";

    return "validate";
  };

  getInvalidValidatorError() {}
}

const validationManager = new ValidationManager();

export default validationManager;
