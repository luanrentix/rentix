import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ManagementReportQuery {
  @IsOptional() @IsString() @MaxLength(120) account?: string;
  @IsISO8601({ strict: true }) start!: string;
  @IsISO8601({ strict: true }) end!: string;
  @IsOptional() @IsString() @MaxLength(120) seller?: string;
  @IsOptional() @IsString() @MaxLength(120) customer?: string;
  @IsOptional() @IsString() @MaxLength(120) product?: string;
  @IsOptional() @IsString() @MaxLength(120) brand?: string;
  @IsOptional() @IsString() @MaxLength(120) category?: string;
  @IsOptional() @IsString() @MaxLength(120) subcategory?: string;
  @IsOptional() @IsString() @MaxLength(40) method?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minimum?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maximum?: number;
  @IsOptional() @IsString() @MaxLength(120) productType?: string;
  @IsOptional() @IsString() @MaxLength(120) supplier?: string;
  @IsOptional() @IsString() @MaxLength(120) status?: string;
  @IsOptional() @IsIn(['day', 'month', 'seller']) group?: string;
  @IsOptional() @IsIn(['quantity', 'revenue']) metric?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 10, 20, 50])
  top?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(99) abcA?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100) abcB?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page?: number;
  @IsOptional() @IsIn(['asc', 'desc']) direction?: string;
  @IsOptional() @IsIn(['view', 'export', 'print']) action?: string;
}
