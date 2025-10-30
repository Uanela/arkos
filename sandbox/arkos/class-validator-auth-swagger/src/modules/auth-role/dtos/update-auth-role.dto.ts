import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import 'reflect-metadata'
import { AuthPermissionAction } from "@prisma/client"

export enum ApiAction {
  connect = 'connect',
  delete = 'delete'
}

class UpdatePermissionForRoleDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty({ message: 'Resource is required' })
  resource!: string;

  @IsEnum(AuthPermissionAction)
  @Transform(({ value }) => value)
  action!: AuthPermissionAction

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value)
  description?: string;

  @IsEnum(ApiAction)
  @IsOptional()
  apiAction?: ApiAction;
}

export default class UpdateAuthRoleDto {
  @IsString()
  @IsNotEmpty({ message: 'Role name is required' })
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePermissionForRoleDto)
  @Transform(({ value }) => value || [])
  permissions?: UpdatePermissionForRoleDto[] = [];
}
