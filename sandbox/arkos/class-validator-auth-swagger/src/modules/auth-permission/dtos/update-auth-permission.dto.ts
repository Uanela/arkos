import { IsString, IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import 'reflect-metadata'
import { AuthPermissionAction } from "@prisma/client"

export default class UpdateAuthPermissionDto {
  @IsOptional()
  @IsString()
  resource?: string;

  @IsOptional()
  @IsEnum(AuthPermissionAction)
  @Transform(({ value }) => value) 
  action?: AuthPermissionAction

  @IsOptional()
  @IsString()
  description?: string;
}
