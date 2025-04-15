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
 * Allows to customize the generated routers
 *
 * See docs [https://www.arkosjs.com/docs/advanced-guide/customizing-prisma-models-routers](https://https://www.arkosjs.com/docs/advanced-guide/customizing-prisma-models-routers)
 */
export type RouterConfig = {
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
   * See more at [ttps://www.arkosjs.com/docs/advanced-guide/customizing-prisma-models-routers](https://ttps://www.arkosjs.com/docs/advanced-guide/customizing-prisma-models-routers)
   */
  parent?: {
    /**
     * Your prisma model name in kebab-case and singular.
     */
    model?: string;
    /**
     * Defines the parentId field stores the Id relation. e.g authorId, categoryId, productId.
     *
     *
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
     * When passed `parent.model` to `author` **Arkos** will create an endpoint:
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
    foreignKey?: string;
    /**
     * Customizes what endpoints to be created.
     *
     * Default is "*" to generate all endpoints
     */
    endpoints?: "*" | RouterEndpoint | RouterEndpoint[];
  };
  /**
   * Use to disable endpoints or the whole router
   *
   * If `true`, will disable:
   *
   * ```curl
   * POST /api/[mode-name]
   * GET /api/[mode-name]/:id
   * PATCH /api/[mode-name]:id
   * DELETE /api/[mode-name]:id
   * POST /api/[mode-name]/many
   * GET /api/[mode-name]
   * UPDATE /api/[mode-name]/many
   * DELETE /api/[mode-name]/many
   * ```
   */
  disable?:
    | boolean
    | {
        /**
         * If `true`, will disable:
         *
         * ```curl
         * POST /api/[mode-name]
         * ```
         */
        createOne?: boolean;
        /**
         * If `true`, will disable:
         *
         * ```curl
         * GET /api/[mode-name]/:id
         * ```
         */
        findOne?: boolean;
        /**
         * If `true`, will disable:
         *
         * ```curl
         * PATCH /api/[mode-name]:id
         * ```
         */
        updateOne?: boolean;
        /**
         * If `true`, will disable:
         *
         * ```curl
         * DELETE /api/[mode-name]:id
         * ```
         */
        deleteOne?: boolean;
        /**
         * If `true`, will disable:
         *
         * ```curl
         * POST /api/[mode-name]/many
         * ```
         */
        createMany?: boolean;
        /**
         * If `true`, will disable:
         *
         * ```curl
         * GET /api/[mode-name]
         * ```
         */
        findMany?: boolean;
        /**
         * If `true`, will disable:
         *
         * ```curl
         * UPDATE /api/[mode-name]/many
         * ```
         */
        updateMany?: boolean;
        /**
         * If `true`, will disable:
         *
         * ```curl
         * DELETE /api/[mode-name]/many
         * ```
         */
        deleteMany?: boolean;
      };
};
