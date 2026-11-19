import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertPostDto {
  @IsOptional() @IsString() @MaxLength(300) title?: string;
  @IsOptional() @IsString() @MaxLength(200) slug?: string;
  @IsOptional() @IsString() @MaxLength(3_000_000) html?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) categories?: string[];
  @IsOptional() @IsString() @MaxLength(2000) featuredImage?: string;
  @IsOptional() @IsIn(['draft', 'published']) status?: string;
  @IsOptional() @IsIn(['public', 'private']) visibility?: string;
}
