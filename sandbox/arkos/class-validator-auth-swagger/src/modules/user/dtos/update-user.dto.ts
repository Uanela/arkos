import 'reflect-metadata'
import { 
  IsString, 
  MinLength, 
  Matches, 
  IsNotEmpty, 
  IsBoolean, 
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum
} from 'class-validator'
import { Type } from 'class-transformer'
import apiActions from "../../../utils/validation/api-actions"

class RoleConnectDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  id?: string
}

class RoleConnectionDto {
  @IsString()
  @IsOptional()
  id?: string

  @IsEnum(apiActions)
  @IsOptional()
  apiAction?: string

  @ValidateNested()
  @Type(() => RoleConnectDto)
  @IsOptional()
  role?: RoleConnectDto
}

export default class UpdateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'email is required' })
  @IsOptional()
  email?: string

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @IsOptional()
  password?: string

  @IsBoolean()
  @IsOptional()
  isSuperUser?: boolean

  @IsBoolean()
  @IsOptional()
  isStaff?: boolean

  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleConnectionDto)
  @IsOptional()
  roles?: RoleConnectionDto[]
}
