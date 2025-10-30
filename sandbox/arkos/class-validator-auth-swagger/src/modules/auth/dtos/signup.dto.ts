import { IsString, MinLength, Matches, IsNotEmpty } from 'class-validator'
import "reflect-metadata"

export default class SignupDto {
  @IsString()
  @IsNotEmpty({ message: 'email is required' })
  email!: string

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  password!: string
}
