import { TemplateOptions } from "../../template-generators";

export function generateMiddlewaresTemplate(options: TemplateOptions): string {
  const { modelName } = options;

  if (!modelName)
    throw new Error("Module name is required for middleware template");

  const isAuth = modelName.camel === "auth";
  const isFileUpload =
    modelName.camel === "fileUpload" || modelName.camel === "file-upload";

  if (isAuth) {
    return `export const beforeGetMe = []

export const afterGetMe = []

export const onGetMeError = []

export const beforeLogin = []

export const afterLogin = []

export const onLoginError = []

export const beforeLogout = []

export const afterLogout = []

export const onLogoutError = []

export const beforeSignup = []

export const afterSignup = []

export const onSignupError = []

export const beforeUpdateMe = []

export const afterUpdateMe = []

export const onUpdateMeError = []

export const beforeUpdatePassword = []

export const afterUpdatePassword = []

export const onUpdatePasswordError = []
`;
  }

  if (isFileUpload) {
    return `export const beforeFindF]ile = []

export const onFindFileError = []

export const beforeUploadFile = []

export const afterUploadFile = []

export const onUploadFileError = []

export const beforeUpdateFile = []

export const afterUpdateFile = []

export const onUpdateFileError = []

export const beforeDeleteFile = []

export const afterDeleteFile = []

export const onDeleteFileError = []
`;
  }

  return `export const beforeCreateOne = []

export const afterCreateOne = []

export const onCreateOneError = []

export const beforeFindOne = []

export const afterFindOne = []

export const onFindOneError = []

export const beforeFindMany = []

export const afterFindMany = []

export const onFindManyError = []

export const beforeUpdateOne = []

export const afterUpdateOne = []

export const onUpdateOneError = []

export const beforeDeleteOne = []

export const afterDeleteOne = []

export const onDeleteOneError = []

export const beforeCreateMany = []

export const afterCreateMany = []

export const onCreateManyError = []

export const beforeUpdateMany = []

export const afterUpdateMany = []

export const onUpdateManyError = []

export const beforeDeleteMany = []

export const afterDeleteMany = []

export const onDeleteManyError = []
`;
}
