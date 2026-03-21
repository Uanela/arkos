export const beforeCreateOne = [
  (req: any, res: any, next: any) => {
    console.log(req.query);
    console.log(JSON.stringify(req.file, null, 2));
    console.log(req.body);

    const a: Record<string, any> = [];
    next();
  },
];

export const afterCreateOne = [];

export const onCreateOneError = [];

export const beforeFindOne = [];

export const afterFindOne = [];

export const onFindOneError = [];

export const beforeFindMany = [];

export const afterFindMany = [];

export const onFindManyError = [];

export const beforeUpdateOne = [];

export const afterUpdateOne = [];

export const onUpdateOneError = [];

export const beforeDeleteOne = [];

export const afterDeleteOne = [];

export const onDeleteOneError = [];

export const beforeCreateMany = [];

export const afterCreateMany = [];

export const onCreateManyError = [];

export const beforeUpdateMany = [];

export const afterUpdateMany = [];

export const onUpdateManyError = [];

export const beforeDeleteMany = [];

export const afterDeleteMany = [];

export const onDeleteManyError = [];
