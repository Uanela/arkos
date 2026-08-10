export type RouterEndpoint =
  | 'createOne'
  | 'findOne'
  | 'updateOne'
  | 'deleteOne'
  | 'findMany'
  | 'createMany'
  | 'updateMany'
  | 'deleteMany';

export type AuthRouterEndpoint =
  | 'getMe'
  | 'updateMe'
  | 'deleteMe'
  | 'login'
  | 'logout'
  | 'signup'
  | 'updatePassword'
  | 'findManyAuthAction'
  | 'findOneAuthAction';

export type FileUploadRouterEndpoint =
  'findFile' | 'uploadFile' | 'updateFile' | 'deleteFile';

