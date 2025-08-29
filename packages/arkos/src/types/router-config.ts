export type RouterEndpoint =
  | "createOne"
  | "findOne"
  | "updateOne"
  | "deleteOne"
  | "findMany"
  | "createMany"
  | "updateMany"
  | "deleteMany";

/**
 * Auth module specific endpoint types
 */
export type AuthRouterEndpoint =
  | "getMe"
  | "updateMe"
  | "deleteMe"
  | "login"
  | "logout"
  | "signup"
  | "updatePassword"
  | "findManyAuthAction";

/**
 * File upload module specific endpoint types
 */
export type FileUploadRouterEndpoint =
  | "findFile"
  | "uploadFile"
  | "updateFile"
  | "deleteFile";

/**
 * Base router configuration for Prisma models
 */
interface PrismaBaseRouterConfig {
  /**
   * Allows to configure nested routes.
   *
   * **Example**
   *
   * ```curl
   * GET /api/authors/:id/posts
   * ```
   *
   * Returning only the fields belonging to the passed author id.
   *
   * See more at [https://www.arkosjs.com/docs/guide/adding-custom-routers#2-customizing-prisma-model-routers](https://www.arkosjs.com/docs/guide/adding-custom-routers#2-customizing-prisma-model-routers)
   */
  parent?: {
    /**
     * Your prisma model name in kebab-case and singular.
     */
    model?: string;
    /**
     * Defines the parentId field stores the Id relation. e.g authorId, categoryId, productId.
     *
     * **Note**: By default **Arkos** will look for modelNameId, modelName being the model specified in `parent.model`.
     *
     * **Example**
     * ```prisma
     * model Post {
     *  // other fields
     *  authorId String
     *  author   Author @relation(fields: [authorId], references: [id])
     * }
     * ```
     *
     * When passed *`parent.model`* to *`author`* **Arkos** will create an endpoint:
     * ```curl
     * GET /api/authors/:id/posts
     * GET /api/authors/:id/posts/:id
     * POST /api/authors/:id/posts
     * UPDATE /api/authors/:id/posts/:id
     * DELETE /api/authors/:id/posts/:id
     * POST /api/authors/:id/posts/many
     * UPDATE /api/authors/:id/posts/many
     * DELETE /api/authors/:id/posts/many
     * ```
     *
     * If you want to point to a different field pass it here.
     */
    foreignKeyField?: string;
    /**
     * Customizes what endpoints to be created.
     *
     * Default is "*" to generate all endpoints
     */
    endpoints?: "*" | RouterEndpoint[];
  };
}

/**
 * Allows to customize the generated routers
 *
 * See docs [https://www.arkosjs.com/docs/guide/adding-custom-routers#2-customizing-prisma-model-routers](https://www.arkosjs.com/docs/guide/adding-custom-routers#2-customizing-prisma-model-routers)
 */
export type RouterConfig<T extends string = string> = T extends "auth"
  ? {
      /**
       * Use to disable endpoints or the whole router
       *
       * If `true`, will disable all endpoints for the router
       */
      disable?:
        | boolean
        | {
            /**
             * If `true`, will disable:
             *
             * ```curl
             * GET /api/users/me
             * ```
             */
            getMe?: boolean;
            /**
             * If `true`, will disable:
             *
             * ```curl
             * PATCH /api/users/me
             * ```
             */
            updateMe?: boolean;
            /**
             * If `true`, will disable:
             *
             * ```curl
             * DELETE /api/users/me
             * ```
             */
            deleteMe?: boolean;
            /**
             * If `true`, will disable:
             *
             * ```curl
             * POST /api/auth/login
             * ```
             */
            login?: boolean;
            /**
             * If `true`, will disable:
             *
             * ```curl
             * DELETE /api/auth/logout
             * ```
             */
            logout?: boolean;
            /**
             * If `true`, will disable:
             *
             * ```curl
             * POST /api/auth/signup
             * ```
             */
            signup?: boolean;
            /**
             * If `true`, will disable:
             *
             * ```curl
             * POST /api/auth/update-password
             * ```
             */
            updatePassword?: boolean;
            /**
             * If `true`, will disable:
             *
             * ```curl
             * GET /api/auth-actions
             * ```
             */
            findManyAuthAction?: boolean;
          };
    }
  : T extends "file-upload"
    ? {
        /**
         * Use to disable endpoints or the whole router
         *
         * If `true`, will disable all endpoints for the router
         */
        disable?:
          | boolean
          | {
              /**
               * If `true`, will disable:
               *
               * ```curl
               * GET /{basePathname}*
               * ```
               */
              findFile?: boolean;
              /**
               * If `true`, will disable:
               *
               * ```curl
               * POST /{basePathname}:fileType
               * ```
               */
              uploadFile?: boolean;
              /**
               * If `true`, will disable:
               *
               * ```curl
               * PATCH /{basePathname}:fileType/:fileName
               * ```
               */
              updateFile?: boolean;
              /**
               * If `true`, will disable:
               *
               * ```curl
               * DELETE /{basePathname}:fileType/:fileName
               * ```
               */
              deleteFile?: boolean;
            };
      }
    : PrismaBaseRouterConfig & {
        /**
         * Use to disable endpoints or the whole router
         *
         * If `true`, will disable all endpoints for the router
         */
        disable?:
          | boolean
          | {
              /**
               * If `true`, will disable:
               *
               * ```curl
               * POST /api/[model-name]
               * ```
               */
              createOne?: boolean;
              /**
               * If `true`, will disable:
               *
               * ```curl
               * GET /api/[model-name]/:id
               * ```
               */
              findOne?: boolean;
              /**
               * If `true`, will disable:
               *
               * ```curl
               * PATCH /api/[model-name]:id
               * ```
               */
              updateOne?: boolean;
              /**
               * If `true`, will disable:
               *
               * ```curl
               * DELETE /api/[model-name]:id
               * ```
               */
              deleteOne?: boolean;
              /**
               * If `true`, will disable:
               *
               * ```curl
               * POST /api/[model-name]/many
               * ```
               */
              createMany?: boolean;
              /**
               * If `true`, will disable:
               *
               * ```curl
               * GET /api/[model-name]
               * ```
               */
              findMany?: boolean;
              /**
               * If `true`, will disable:
               *
               * ```curl
               * UPDATE /api/[model-name]/many
               * ```
               */
              updateMany?: boolean;
              /**
               * If `true`, will disable:
               *
               * ```curl
               * DELETE /api/[model-name]/many
               * ```
               */
              deleteMany?: boolean;
            };
      };
