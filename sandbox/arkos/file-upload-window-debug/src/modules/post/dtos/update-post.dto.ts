import {
  IsOptional,
  IsNumber,
  ValidateNested,
  IsString,
  IsBoolean,
  IsArray,
} from "class-validator";
import { Type } from "class-transformer";

class UserForUpdatePostDto {
  @IsOptional()
  @IsString()
  id!: string;
}

class PostTagForUpdatePostDto {
  @IsOptional()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  color!: string;

  @IsOptional()
  @IsBoolean()
  featured!: boolean;
}

export default class UpdatePostDto {
  @IsOptional()
  @IsNumber()
  views?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserForUpdatePostDto)
  user?: UserForUpdatePostDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserForUpdatePostDto)
  user2?: UserForUpdatePostDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PostTagForUpdatePostDto)
  mainTag?: PostTagForUpdatePostDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PostTagForUpdatePostDto)
  tags?: PostTagForUpdatePostDto[];
}
