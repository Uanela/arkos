import { getUserFileExtension } from "../../../../helpers/fs.helpers";
import { TemplateOptions } from "../../template-generators";

export function generateMiddlewaresTemplate(options: TemplateOptions): string {
  const { modelName } = options;
  const ext = getUserFileExtension();
  const isTypeScript = ext === "ts";

  if (!modelName)
    throw new Error("Module name is required for middleware template");

  const isAuth = modelName.camel === "auth";
  const isFileUpload =
    modelName.camel === "fileUpload" || modelName.camel === "file-upload";

  // Generate imports based on TypeScript/JavaScript
  const requestType = isTypeScript ? "ArkosRequest" : "req";
  const responseType = isTypeScript ? "ArkosResponse" : "res";
  const nextType = isTypeScript ? "ArkosNextFunction" : "next";

  const baseImports = isTypeScript
    ? `import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";`
    : ``;

  const functionParams = isTypeScript
    ? `req: ${requestType}, res: ${responseType}, next: ${nextType}`
    : `req, res, next`;

  const errorFunctionParams = isTypeScript
    ? `err: any, req: ${requestType}, res: ${responseType}, next: ${nextType}`
    : `err, req, res, next`;

  if (isAuth) {
    return `${baseImports}

// export const beforeGetMe = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const afterGetMe = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const onGetMeError =
//   [async (${errorFunctionParams}) => {
//     next();
//   }]

// export const beforeLogin = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const afterLogin = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const onLoginError =
//   [async (${errorFunctionParams}) => {
//     next();
//   }]

// export const beforeLogout = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const afterLogout = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const onLogoutError =
//   [async (${errorFunctionParams}) => {
//     next();
//   }]

// export const beforeSignup = 
//   [async (${functionParams}) => {
//   }]

// export const afterSignup = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const onSignupError =
//   [async (${errorFunctionParams}) => {
//     next();
//   }]

// export const beforeUpdatePassword = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const afterUpdatePassword = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const onUpdatePasswordError =
//   [async (${errorFunctionParams}) => {
//     next();
//   }]
`;
  }

  if (isFileUpload) {
    return `${baseImports}


// export const beforeFindF]ile = 
//   [async (${functionParams}) => {
//     next();
//   }]

// There is not afterFindFile: because the main handler is handleded by express.static()

// export const onFindFileError =
//   [async (${errorFunctionParams}) => {
//     next();
//   }]

// export const beforeUploadFile = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const afterUploadFile = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const onUploadFileError =
//   [async (${errorFunctionParams}) => {
//     next();
//   }]

// export const beforeUpdateFile = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const afterUpdateFile = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const onUpdateFileError =
//   [async (${errorFunctionParams}) => {
//     next();
//   }]

// export const beforeDeleteFile = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const afterDeleteFile = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const onDeleteFileError =
//   [async (${errorFunctionParams}) => {
//     next();
//   }]
`;
  }

  // Regular model interceptors
  return `${baseImports}

// export const beforeCreateOne = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const afterCreateOne = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const onCreateOneError =
//   [async (${errorFunctionParams}) => {
//     next();
//   }]

// export const beforeFindOne = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const afterFindOne = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const onFindOneError =
//   [async (${errorFunctionParams}) => {
//     next();
//   }]

// export const beforeFindMany = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const afterFindMany = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const onFindManyError =
//   [async (${errorFunctionParams}) => {
//     next();
//   }]

// export const beforeUpdateOne = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const afterUpdateOne = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const onUpdateOneError =
//   [async (${errorFunctionParams}) => {
//     next();
//   }]

// export const beforeDeleteOne = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const afterDeleteOne = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const onDeleteOneError =
//   [async (${errorFunctionParams}) => {
//     next();
//   }]

// export const beforeCreateMany = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const afterCreateMany = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const onCreateManyError =
//   [async (${errorFunctionParams}) => {
//     next();
//   }]

// export const beforeUpdateMany = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const afterUpdateMany = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const onUpdateManyError =
//   [async (${errorFunctionParams}) => {
//     next();
//   }]

// export const beforeDeleteMany = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const afterDeleteMany = 
//   [async (${functionParams}) => {
//     next();
//   }]

// export const onDeleteManyError =
//   [async (${errorFunctionParams}) => {
//     next();
//   }]
`;
}
