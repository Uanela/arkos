import cors from "cors";
import express from "express";
import { Options as RateLimitOptions } from "express-rate-limit";
import cookieParser from "cookie-parser";
import compression from "compression";
import { Options as QueryParserOptions } from "../utils/helpers/query-parser.helpers";
import { ValidatorOptions } from "class-validator";
import { SignOptions } from "jsonwebtoken";

/**
 * Defines the initial configs of the api to be loaded at startup when arkos.init() is called.
 */
export type ArkosConfig = {
  /** Message you would like to send, as Json and 200 response when
   * ```
   * GET /api
   * ```
   * ```json
   * { "message": "Welcome to YourAppName" }
   * ```
   *
   * default message is: Welcome to our Rest API generated by Arkos, find more about Arkos at www.arkosjs.com,
   *
   *
   *  */
  welcomeMessage?: string;
  /**
   * Port where the application will run, can be set in 3 ways:
   *
   * 1. default is 8000
   * 2. PORT under environment variables (Lower precedence)
   * 3. this config option (Higher precedence)
   */
  port?: number | undefined;
  /**
   * Allows to listen on a different host than localhost only
   */
  host?: string;
  /**
   * Defines authentication related configurations, by default is undefined.
   *
   * See [www.arkosjs.com/docs/core-concepts/built-in-authentication-system](https://www.arkosjs.com/docs/core-concepts/built-in-authentication-system) for details.
   */
  authentication?: {
    /**
     * Defines whether to use Static or Dynamic Role-Based Acess Control
     *
     * Visit [www.arkosjs.com/docs/core-concepts/built-in-authentication-system](https://www.arkosjs.com/docs/core-concepts/built-in-authentication-system) for more details.
     */
    mode: "static" | "dynamic";
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
     * Specifies the regex pattern used by the authentication system to enforce password strength requirements.
     *
     * **Important**: If using validation libraries like Zod or class-validator, this will be completely overwritten.
     *
     * **Default**: ```/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/``` - Ensures the password contains at least one uppercase letter, one lowercase letter, and one numeric digit.
     *
     * **message**: (Optional) A custom error message to display when the password does not meet the required strength criteria.
     */
    passwordValidation?: { regex: RegExp; message?: string };
    /**
     * Allows to specify the request rate limit for all authentication endpoints but `/api/users/me`.
     * 
     * #### Default
     *{
        windowMs: 5000,
        limit: 10,
        standardHeaders: "draft-7",
        legacyHeaders: false,
      }
     * 
     * Passing an object not overriding all the default options will only
     * cause it to be deepmerged and not actually replace with empty fields
     * 
     * This is are the options used on the `express-rate-limit` npm package used on epxress. read more about [https://www.npmjs.com/package/express-rate-limit](https://www.npmjs.com/package/express-rate-limit)
     */
    requestRateLimitOptions?: RateLimitOptions;
    /**
     * Defines jwt configurations for secret, expiresIn, cookieExpiresIn
     *
     * Can be pass also through env variables:
     * - jwt.secret => JWT_SECRET: If not passed production auth will  throw an error
     * - jwt.expiresIn => JWT_EXPIRES_IN: default 30d
     * - jwt.cookieExpiresIn => JWT_COOKIE_EXPIRES_IN: default 90
     * - jwt.secure => JWT_SECURE: default true
     *
     * **Note**: the values passed here will take precedence
     */
    jwt?: {
      /** Secret to sign and decode jwt tokens */
      secret?: string;
      /**
       * Do define when the toke expires
       */
      expiresIn?: SignOptions["expiresIn"];
      /** Days in which the cookie must be kept before expire*/
      cookieExpiresIn?: number;
      /** If it must be secure or not, Default: true */
      secure?: boolean;
    };
  };
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
   * See [www.arkosjs.com/docs/core-concepts/request-data-validation](https://www.arkosjs.com/docs/core-concepts/request-data-validation) for more details.
   */
  validation?:
    | {
        resolver?: "class-validator";
        /**
         * ValidatorOptions to used while validating request data.
         *
         * **Default**:
         * ```ts
         * {
         *  whitelist: true
         * }
         * ```
         */
        validationOptions?: ValidatorOptions;
      }
    | {
        resolver?: "zod";
        validationOptions?: Record<string, any>;
      };
  /**
   * Defines file upload configurations
   *
   * See [www.arkosjs.com/docs/core-concepts/file-upload#costum-configurations](https://www.arkosjs.com/docs/core-concepts/file-upload#costum-configurations)
   */
  fileUpload?: {
    /**
     * Defiens the base file upload directory, default is set to /uploads (on root directory)
     *
     * When setting up a path dir always now that root directory will be the starting reference.
     *
     * #### Example
     * passing `../my-arkos-uploaded-files`
     *
     * Will save uploaded files one level outside the root dir inside `my-arkos-uploaded-files`
     *
     * NB: You must be aware of permissions on your server to acess files outside your project directory.
     *
     */
    baseUploadDir?: string;
    /**
     * Changes the default `/api/uploads` base route for accessing file upload route.
     *
     * #### IMPORTANT
     * Changing this will not affect the `baseUploadDir` folder. You can
     * pass here `/api/files/my-user-files` and `baseUploadDir` be `/uploaded-files`.
     *
     */
    baseRoute?: string;
    /**
     * Defines options for `express.static(somePath, someOptions)`
     *
     * #### Default:
     *
     * ```ts
     *{
          maxAge: "1y",
          etag: true,
          lastModified: true,
          dotfiles: "ignore",
          fallthrough: true,
          index: false,
          cacheControl: true,
        }
     * ```
     * 
     * By passing your custom options have in mind that it
     * will be deepmerged with the default.
     * 
     * Visit [https://expressjs.com/en/4x/api.html#express.static](https://expressjs.com/en/4x/api.html#express.static) for more understanding.
     * 
     */
    expressStaticOptions?: Parameters<typeof express.static>[1];
    /**
     * Defines upload restrictions for each file type: image, video, document or other.
     *
     * #### Important:
     * Passing an object without overriding everything will only cause it
     * to be deepmerged with the default options.
     *
     * See [www.arkosjs.com/docs/api-reference/default-supported-upload-files](https://www.arkosjs.com/docs/api-reference/default-supported-upload-files) for detailed explanation about default values.
     * ```
     */
    restrictions?: {
      images?: {
        maxCount?: number;
        maxSize?: number;
        supportedFilesRegex?: RegExp;
      };
      videos?: {
        maxCount?: number;
        maxSize?: number;
        supportedFilesRegex?: RegExp;
      };
      documents?: {
        maxCount?: number;
        maxSize?: number;
        supportedFilesRegex?: RegExp;
      };
      files?: {
        maxCount?: number;
        maxSize?: number;
        supportedFilesRegex?: RegExp;
      };
    };
  };
  /**
   * Allows to specify the request rate limit for all endpoints.
   * 
   * #### Default
   *
      windowMs: 60 * 1000,
      limit: 1000,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    }
   * 
   * Passing an object not overriding all the default options will only
   * cause it to be deepmerged and not actually replace with empty fields
   * 
   * This is are the options used on the `express-rate-limit` npm package used on epxress. read more about [https://www.npmjs.com/package/express-rate-limit](https://www.npmjs.com/package/express-rate-limit)
   */
  globalRequestRateLimitOptions?: Partial<RateLimitOptions>;
  /**
   * Defines options for the built-in express.json() middleware
   * Nothing is passed by default.
   */
  jsonBodyParserOptions?: Parameters<typeof express.json>[0];
  /**
   * Allows to pass paremeters to cookieParser from npm package cookie-parser
   * Nothing is passed by default.
   *
   * See [www.npmjs.com/package/cookie-parser](https://www.npmjs.com/package/cookie-parser) for further details.
   */
  cookieParserParameters?: Parameters<typeof cookieParser>;
  /**
   * Allows to define options for npm package compression
   * Nothing is passed by default.
   *
   * See [www.npmjs.com/package/compression](https://www.npmjs.com/package/compression) for further details.
   */
  compressionOptions?: compression.CompressionOptions;
  /**
   * Options to define how query must be parsed.
   *
   * #### for example:
   * ```
   * GET /api/product?saleId=null
   * ```
   *
   * Normally would parsed to { saleId: "null" } so query parser
   * trough setting option `parseNull` will transform { saleId: null }
   * 
   * #### Default:
   * 
   * {
      parseNull: true,
      parseUndefined: true,
      parseBoolean: true,
    }
   * 
   * parseNumber may convert fields that are string but you only passed
   * numbers to query pay attention to this.
   * 
   * Soon a feature to converted the query to the end prisma type will be added.
   */
  queryParserOptions?: QueryParserOptions;
  /**
   * Configuration for CORS (Cross-Origin Resource Sharing).
   *
   * @property {string | string[] | "all"} [allowedOrigins] - List of allowed origins. If set to `"all"`, all origins are accepted.
   * @property {import('cors').CorsOptions} [options] - Additional CORS options passed directly to the `cors` middleware.
   * @property {import('cors').CorsOptionsDelegate} [customMiddleware] - A custom middleware function that overrides the default behavior.
   *
   * @remarks
   * If `customMiddleware` is provided, both `allowedOrigins` and `options` will be ignored in favor of the custom logic.
   *
   * See https://www.npmjs.com/package/cors
   */
  cors?: {
    allowedOrigins?: string | string[] | "*";
    options?: cors.CorsOptions;
    /**
     * If you would like to override the entire middleware
     *
     * see
     */
    customHandler?: cors.CorsOptionsDelegate;
  };
  /**
   * Defines express/arkos middlewares configurations
   */
  middlewares?: {
    /**
     * Allows to add an array of custom express middlewares into the default middleware stack.
     *
     * **Tip**: If you would like to acess the express app before everthing use `configureApp` and pass a function.
     *
     * **Where will these be placed?**: see [www.arkosjs.com/docs/advanced-guide/replace-or-disable-built-in-middlewares#middleware-execution-order](https://www.arkosjs.com/docs/advanced-guide/replace-or-disable-built-in-middlewares#middleware-execution-order)
     *
     * **Note**: If you want to use custom global error handler middleware use `middlewares.replace.globalErrorHandler`.
     *
     * Read more about The Arkos Middleware Stack at [www.arkosjs.com/docs/the-middleware-stack](https://www.arkosjs.com/docs/the-middleware-stack) for in-depth details.
     */
    additionals?: express.RequestHandler[];
    /**
     * An array containing a list of defaults middlewares to be disabled
     *
     * **Caution**: Be careful with this because you may endup breaking your entire application.
     */
    disable?: (
      | "compression"
      | "global-rate-limit"
      | "auth-rate-limit"
      | "cors"
      | "express-json"
      | "cookie-parser"
      | "query-parser"
      | "database-connection"
      | "request-logger"
      | "global-error-handler"
    )[];
    /**
     * Allows you to replace each of the built-in middlewares with your own implementation
     *
     * **Caution**: Be careful with this because you may endup breaking your entire application.
     */
    replace?: {
      /**
       * Replace the default compression middleware
       */
      compression?: express.RequestHandler;
      /**
       * Replace the default global rate limit middleware
       */
      globalRateLimit?: express.RequestHandler;
      /**
       * Replace the default authentication rate limit middleware
       */
      authRateLimit?: express.RequestHandler;
      /**
       * Replace the default CORS middleware
       */
      cors?: express.RequestHandler;
      /**
       * Replace the default JSON body parser middleware
       */
      expressJson?: express.RequestHandler;
      /**
       * Replace the default cookie parser middleware
       */
      cookieParser?: express.RequestHandler;
      /**
       * Replace the default query parser middleware
       */
      queryParser?: express.RequestHandler;
      /**
       * Replace the default database connection check middleware
       */
      databaseConnection?: express.RequestHandler;
      /**
       * Replace the default request logger middleware
       */
      requestLogger?: express.RequestHandler;
      /**
       * Replace the default global error handler middleware
       */
      globalErrorHandler?: express.ErrorRequestHandler;
    };
  };
  /**
   * Defines express/arkos routers configurations
   */
  routers?: {
    /**
     * Allows to add an array of custom express routers into the default middleware/router stack.
     *
     * **Where will these be placed?**: see [www.arkosjs.com/docs/advanced-guide/adding-custom-routers](https://www.arkosjs.com/docs/advanced-guide/adding-custom-routers)
     *
     *
     * Read more about The Arkos Middleware Stack at [www.arkosjs.com/docs/the-middleware-stack](https://www.arkosjs.com/docs/the-middleware-stack) for in-depth details.
     */
    additionals?: express.Router[];
    disable?: (
      | "auth-router"
      | "prisma-models-router"
      | "file-uploader"
      | "welcome-endpoint"
    )[];
    /**
     * Allows you to replace each of the built-in routers with your own implementation.
     *
     * **Note**: Doing this you will lose all default middleware chaining, auth control, handlers from the specific router.
     *
     * **Tip**: I you want to disable some prisma models specific endpoint
     * see [www.arkosjs.com/docs/advanced-guide/customizing-prisma-models-routers#disabling-endpoints](https://www.arkosjs.com/docs/advanced-guide/customizing-prisma-models-routers#disabling-endpoints)
     *
     * **Caution**: Be careful with this because you may endup breaking your entire application.
     */
    replace?: {
      /**
       * Replace the default authentication router
       * @param config The original Arkos configuration
       * @returns A router handling authentication endpoints
       */
      authRouter?: (
        config: ArkosConfig
      ) => express.Router | Promise<express.Router>;
      /**
       * Replace the default Prisma models router
       * @param config The original Arkos configuration
       * @returns A router handling Prisma model endpoints
       */
      prismaModelsRouter?: (
        config: ArkosConfig
      ) => express.Router | Promise<express.Router>;
      /**
       * Replace the default file uploader router
       * @param config The original Arkos configuration
       * @returns A router handling file upload endpoints
       */
      fileUploader?: (
        config: ArkosConfig
      ) => express.Router | Promise<express.Router>;
      /**
       * Replace the default welcome endpoint handler
       * @param req Express request object
       * @param res Express response object
       * @param next Express next function
       */
      welcomeEndpoint?: express.RequestHandler;
    };
  };
  /**
   * Gives acess to the underlying express app so that you can add custom configurations beyong **Arkos** customization capabilities
   *
   * **Note**: In the end **Arkos** will call `app.listen` for you.
   *
   * If you want to call `app.listen` by yourself pass port as `undefined` and then use the return app from `arkos.init()`.
   *
   * See how to call `app.listen` correctly [www.arkosjs.com/docs/accessing-the-express-app#calling-applisten-by-yourself](https://www.arkosjs.com/docs/accessing-the-express-app#calling-applisten-by-yourself)
   *
   * See [www.arkosjs.com/docs/accessing-the-express-app](https://www.arkosjs.com/docs/accessing-the-express-app) for further details on the method configureApp.
   *
   * @param {express.Express} app
   * @returns {any}
   */
  configureApp?: (app: express.Express) => Promise<any> | any;
  /**
   * Allows to configure email configurations for sending emails through `emailService`
   *
   * See [www.arkosjs.com/docs/core-concepts/sending-emails](https://www.arkosjs.com/docs/core-concepts/sending-emails)
   */
  email?: {
    /**
     * Your email provider url
     */
    host: string;
    /**
     * Email provider SMTP port, Default is `465`
     */
    port?: number;
    /**
     * If smtp connection must be secure, Default is `true`
     */
    secure?: boolean;
    /**
     * Used to authenticate in your smtp server
     */
    auth: {
      /**
       * Email used for auth as well as sending emails
       */
      user: string;
      /**
       * Your SMTP password
       */
      pass: string;
    };
    /**
     * Email name to used like:
     *
     * John Doe\<john.doe@gmail.com>
     */
    name?: string;
  };
};
