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

  if (isAuth) {
    return `${baseImports}

// export const beforeGetMe = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterGetMe = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeLogin = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterLogin = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeLogout = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterLogout = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeSignup = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterSignup = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeUpdatePassword = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterUpdatePassword = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );
`;
  }

  if (isFileUpload) {
    return `${baseImports}


// export const beforeFindFile = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// There is not afterFindFile: because the main handler is handleded by express.static()

// export const beforeUploadFile = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterUploadFile = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeUpdateFile = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterUpdateFile = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeDeleteFile = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterDeleteFile = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );
`;
  }

  // Regular model middlewares
  return `${baseImports}

// export const beforeCreateOne = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterCreateOne = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeFindOne = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterFindOne = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeFindMany = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterFindMany = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeUpdateOne = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterUpdateOne = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeDeleteOne = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterDeleteOne = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeCreateMany = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterCreateMany = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeUpdateMany = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterUpdateMany = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const beforeDeleteMany = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );

// export const afterDeleteMany = catchAsync(
//   async (${functionParams}) => {
//     // Your logic here
//     next();
//   }
// );
`;
}
