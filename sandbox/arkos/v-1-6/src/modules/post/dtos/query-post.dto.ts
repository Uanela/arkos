import { IsOptional, IsString, IsNumber, ValidateNested, Max, IsNotEmpty } from "class-validator";
import { Type, Transform } from "class-transformer";

class DateTimeFilter {
  @IsOptional()
  @IsString()
  @Type(() => String)
  equals?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  gte?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  lte?: string;
}

export default class PostQueryDto {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  page?: number;

  @IsOptional()
  @IsNumber()
  @Max(100)
  @Transform(({ value }) => (value ? Number(value) : undefined))
  limit?: number;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @Type(() => String)
  sort?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @Type(() => String)
  fields?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DateTimeFilter)
  createdAt?: DateTimeFilter;

  @IsOptional()
  @ValidateNested()
  @Type(() => DateTimeFilter)
  updatedAt?: DateTimeFilter;
}