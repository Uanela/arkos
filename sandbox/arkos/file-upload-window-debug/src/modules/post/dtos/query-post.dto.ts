// import { IsOptional, IsString, IsNumber, ValidateNested, IsEnum } from "class-validator";
// import { Type, Transform } from "class-transformer";
// import { PostType } from "@prisma/client";

// class StringFilter {
//   @IsOptional()
//   @IsString()
//   @Type(() => String)
//   icontains?: string;
// }

// class DateTimeFilter {
//   @IsOptional()
//   @IsString()
//   @Type(() => String)
//   equals?: string;

//   @IsOptional()
//   @IsString()
//   @Type(() => String)
//   gte?: string;

//   @IsOptional()
//   @IsString()
//   @Type(() => String)
//   lte?: string;
// }

// class UserForQueryPostDto {
//   @IsString()
//   id!: string;
// }

// export default class PostQueryDto {
//   @IsOptional()
//   @IsNumber()
//   @Transform(({ value }) => (value ? Number(value) : undefined))
//   page?: number;

//   @IsOptional()
//   @IsNumber()
//   @Transform(({ value }) => (value ? Number(value) : undefined))
//   limit?: number;

//   @IsOptional()
//   @IsString()
//   @Type(() => String)
//   sort?: string;

//   @IsOptional()
//   @IsString()
//   @Type(() => String)
//   fields?: string;

//   @IsOptional()
//   @ValidateNested()
//   @Type(() => DateTimeFilter)
//   createdAt?: DateTimeFilter;

//   @IsOptional()
//   @ValidateNested()
//   @Type(() => DateTimeFilter)
//   updatedAt?: DateTimeFilter;

//   @IsOptional()
//   @ValidateNested()
//   @Type(() => StringFilter)
//   userId?: StringFilter;

//   @IsOptional()
//   @ValidateNested()
//   @Type(() => UserForQueryPostDto)
//   user?: UserForQueryPostDto;

//   @IsOptional()
//   @ValidateNested()
//   @Type(() => StringFilter)
//   userId2?: StringFilter;

//   @IsOptional()
//   @ValidateNested()
//   @Type(() => UserForQueryPostDto)
//   user2?: UserForQueryPostDto;

//   @IsOptional()
//   @IsEnum(PostType)
//   type?: PostType;
// }
