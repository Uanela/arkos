import 'reflect-metadata'
import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export default class UpdateMeDto {
  @IsString()
  @IsNotEmpty({ message: 'email is required' })
  @IsOptional()
  email!: string
}
