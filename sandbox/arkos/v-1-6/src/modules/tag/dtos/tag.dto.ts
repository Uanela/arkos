import { IsNotEmpty, IsString, IsDate } from "class-validator";

export default class TagDto {
  @IsNotEmpty()
  @IsString()
  id!: string;

  @IsDate()
  createdAt!: Date;

  @IsDate()
  updatedAt!: Date;
}