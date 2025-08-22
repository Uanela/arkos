import { getUserFileExtension } from "../../../../helpers/fs.helpers";
import { TemplateOptions } from "../../template-generators";

export function generateMiddlewaresTemplate(options: TemplateOptions): string {
  const { modelName } = options;
  const ext = getUserFileExtension();
  const isTypeScript = ext === "ts";

  if (!modelName)
    throw new Error("Model name is required for middleware template");

  const isAuth = modelName.camel === "auth";
  const isFileUpload =
    modelName.camel === "fileUpload" || modelName.camel === "file-upload";

  // Generate imports based on TypeScript/JavaScript
  const requestType = isTypeScript ? "ArkosRequest" : "req";
  const responseType = isTypeScript ? "ArkosResponse" : "res";
  const nextType = isTypeScript ? "ArkosNextFunction" : "next";

  const baseImports = isTypeScript
    ? `import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "arkos";
import { catchAsync } from "arkos/error-handler";`
    : `import { catchAsync } from "arkos/error-handler";`;

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
//     // Your logic here
//     next();
//   }]

// export const afterGetMe = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const onGetMeError =
//   [async (${errorFunctionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const beforeLogin = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const afterLogin = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const onLoginError =
//   [async (${errorFunctionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const beforeLogout = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const afterLogout = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const onLogoutError =
//   [async (${errorFunctionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const beforeSignup = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const afterSignup = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const onSignupError =
//   [async (${errorFunctionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const beforeUpdatePassword = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const afterUpdatePassword = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const onUpdatePasswordError =
//   [async (${errorFunctionParams}) => {
//     // Your logic here
//     next();
//   }]
`;
  }

  if (isFileUpload) {
    return `${baseImports}


// export const beforeFindF]ile = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// There is not afterFindFile: because the main handler is handleded by express.static()

// export const onFindFileError =
//   [async (${errorFunctionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const beforeUploadFile = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const afterUploadFile = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const onUploadFileError =
//   [async (${errorFunctionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const beforeUpdateFile = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const afterUpdateFile = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const onUpdateFileError =
//   [async (${errorFunctionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const beforeDeleteFile = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const afterDeleteFile = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const onDeleteFileError =
//   [async (${errorFunctionParams}) => {
//     // Your logic here
//     next();
//   }]
`;
  }

  // Regular model interceptors
  return `${baseImports}

// export const beforeCreateOne = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const afterCreateOne = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const onCreateOneError =
//   [async (${errorFunctionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const beforeFindOne = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const afterFindOne = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const onFindOneError =
//   [async (${errorFunctionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const beforeFindMany = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const afterFindMany = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const onFindManyError =
//   [async (${errorFunctionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const beforeUpdateOne = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const afterUpdateOne = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const onUpdateOneError =
//   [async (${errorFunctionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const beforeDeleteOne = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const afterDeleteOne = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const onDeleteOneError =
//   [async (${errorFunctionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const beforeCreateMany = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const afterCreateMany = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const onCreateManyError =
//   [async (${errorFunctionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const beforeUpdateMany = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const afterUpdateMany = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const onUpdateManyError =
//   [async (${errorFunctionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const beforeDeleteMany = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const afterDeleteMany = 
//   [async (${functionParams}) => {
//     // Your logic here
//     next();
//   }]

// export const onDeleteManyError =
//   [async (${errorFunctionParams}) => {
//     // Your logic here
//     next();
//   }]
`;
}
