import {
  IsNumber,
  IsOptional,
  ValidateNested,
  IsString,
  IsBoolean,
  IsArray,
} from "class-validator";
import { Type } from "class-transformer";

class UserForCreatePostDto {
  @IsString()
  id!: string;
}

class PostTagDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  featured!: boolean;
}

export default class CreatePostDto {
  @IsNumber()
  views!: number;

  @ValidateNested()
  @Type(() => UserForCreatePostDto)
  user!: UserForCreatePostDto;

  @ValidateNested()
  @Type(() => UserForCreatePostDto)
  user2!: UserForCreatePostDto;

  @ValidateNested()
  @Type(() => PostTagDto)
  mainTag!: PostTagDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PostTagDto)
  tags!: PostTagDto[];
}
