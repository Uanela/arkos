import { ClassValidatorInitConfigsOptions } from "../utils/validate-dto";

export type InitConfigsAuthenticationOptions = {
  /**
   * Defines auth login related configurations to customize the api.
   */
  login?: {
    /** Defines wether to send the access token in response after login or only send as cookie, defeault is both.*/
    sendAccessTokenThrough?: "cookie-only" | "response-only" | "both";
  };
  /** Defines the field that will be used as username by the built-in auth system, by default arkos will look for the field "username" in your model User, hence when making login for example you must send:
   *
   * ```json
   *  {
   *    "username": "johndoe",
   *    "password": "somePassword123"
   *  }
   * ```
   *
   * **Note:** You can also modify the usernameField on the fly by passing it to the request query parameters. example:
   *
   * ```curl
   * POST /api/auth/login?usernameField=email
   * ```
   *
   * By specifing here another field for username, for example passing "email", "companyCode" or something else your json will be like:
   *
   * **Example with email**
   *
   * ```json
   *  {
   *    "email": "john.doe@example.com",
   *    "password": "somePassword123"
   *  }
   * ```
   */
  usernameField?: string;
  /**
   * Defines the regex that will be used by the auth system in order to verify if it is strong when using authentication.
   *
   * **Warning**: If using validation whether through zod or class-validator and passes an regex to the field password it must match this one here otherwise
   *
   * **Default**: ```/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/``` -  Checks if a password is strong, requiring uppercase, lowercase, and numeric characters
   */
  passwordRegex?: RegExp;
};

/**
 * Defines the initial configs of the api to be loaded at startup when arkos.init() is called.
 */
export type InitConfigs = {
  port?: number;
  authentication?: InitConfigsAuthenticationOptions | boolean;

  /** Allows to customize and toggle the built-in validation, by default it is set to `false`. If true is passed it will use validation with the default resolver set to `class-validator` if you intend to change the resolver to `zod` do the following:
   *
   *```ts
   * // src/app.ts
   * import arkos from 'arkos'
   *
   * arkos.init({
   *    validation: {
   *        resolver: "zod"
   *    }
   * })
   * ```
   *
   */
  validation?:
    | ClassValidatorInitConfigsOptions
    | {
        resolver?: "zod";
        validationOptions?: Record<string, any>;
      }
    | boolean;
};
