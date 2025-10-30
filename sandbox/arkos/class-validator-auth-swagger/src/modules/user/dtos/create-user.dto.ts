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
} from 'class-validator'
import { Type } from "class-transformer";

class RoleConnectDto {
  @IsString()
  @IsNotEmpty()
  id!: string
}

class RoleConnectionDto {
  @ValidateNested()
  @Type(() => RoleConnectDto)
  role!: RoleConnectDto
}

export default class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'email is required' })
  email!: string

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  password!: string

  @IsBoolean()
  @IsOptional()
  isSuperUser?: boolean = false

  @IsBoolean()
  @IsOptional()
  isStaff?: boolean = false

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleConnectionDto)
  @IsOptional()
  roles?: RoleConnectionDto[]
}
