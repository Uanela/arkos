export interface PrismaField {
  name: string;
  type: string;
  isOptional: boolean;
  isArray: boolean;
  foreignKeyField?: string;
  foreignReferenceField?: string;
  isRelation: boolean;
  defaultValue?: any;
  isId?: boolean;
  isUnique?: boolean;
  attributes: string[];
}

export interface PrismaModel {
  name: string;
  fields: PrismaField[];
  mapName?: string;
}

export interface PrismaEnum {
  name: string;
  values: string[];
}

export interface PrismaSchema {
  models: PrismaModel[];
  enums: PrismaEnum[];
}

export type JsonSchemaProperty = {
  type: string;
  default?: any;
  items?: { type: string };
  format?: string;
  enum?: string[];
  $ref?: string;
  [key: string]: any;
} & Partial<JsonSchema>;

export interface JsonSchema {
  type: string;
  properties?: { [key: string]: JsonSchemaProperty };
  items?: { $ref?: string } | JsonSchema;
  required?: string[];
  anyOf?: { required: string[] }[];
}
