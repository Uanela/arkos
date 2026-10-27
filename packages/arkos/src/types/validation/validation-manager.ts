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
    return this.validationConfig?.resolver == "hybrid"
      ? "zod schema or class-validator dto"
      : this.validationConfig?.resolver == "zod"
        ? "zod schema"
        : "class-validator dto";
  }

  get validationFn() {
    return (schema: any, data: any, options: any) =>
      isZodSchema(schema)
        ? validateSchema(schema, data, options)
        : validateDto(schema, data, options);
  }

  get validatorNameType() {
    return this.validationConfig?.resolver == "hybrid"
      ? "Schema or Dto"
      : this.validationConfig?.resolver == "zod"
        ? "Schema"
        : "Dto";
  }

  isValidValidator = (validator: Validator) => {
    return (
      [false, null, undefined].includes(validator as any) ||
      this.isValidator(validator)
    );
  };

  isValidator = (validator: Validator) => {
    const fn = this.validationConfig?.resolver == "zod" ? isZodSchema : isClass;
    return this.validationConfig?.resolver === "hybrid"
      ? isZodSchema(validator) || isClass(validator)
      : fn(validator);
  };

  shouldValidate = (
    validator: Validator,
    data: any,
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

