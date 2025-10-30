import { IsString, IsNotEmpty, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import 'reflect-metadata'
import { AuthPermissionAction } from "@prisma/client"

class RoleConnectDto {
  @IsString()
  @IsNotEmpty({ message: 'Role ID is required' })
  id!: string;
}

export default class CreateAuthPermissionDto {
  @IsString()
  @IsNotEmpty({ message: 'Resource is required' })
  resource!: string;

  @IsEnum(AuthPermissionAction)
  @Transform(({ value }) => value || AuthPermissionAction.View)
  action?: AuthPermissionAction = AuthPermissionAction.View;

  @ValidateNested()
  @Type(() => RoleConnectDto)
  role!: RoleConnectDto;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value)
  description?: string;
}
