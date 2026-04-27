import { IsNotEmpty, IsString, IsDate } from "class-validator";

export default class PostDto {
  @IsNotEmpty()
  @IsString()
  id!: string;

  @IsDate()
  createdAt!: Date;

  @IsDate()
  updatedAt!: Date;
}