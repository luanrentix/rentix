import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class VariacaoProdutoVendaDto {
  @IsOptional() @IsDateString() expectedUpdatedAt?: string;
  @IsOptional() @IsUUID() id?: string;
  @IsString() @IsNotEmpty() @MaxLength(80) name!: string;
  @IsOptional() @IsString() @MaxLength(80) barcode?: string | null;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number | null;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) stock!: number;
}

export class CriarProdutoVendaDto {
  @IsOptional() @IsUUID() gridId?: string | null;
  @IsOptional() @IsDateString() expectedUpdatedAt?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariacaoProdutoVendaDto)
  variants?: VariacaoProdutoVendaDto[];
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  sku?: string;

  @IsOptional() @IsString() @MaxLength(50) reference?: string;
  @IsOptional() @IsString() @MaxLength(80) barcode?: string;
  @IsOptional() @IsString() @MaxLength(80) factoryCode?: string;
  @IsOptional() @IsString() @MaxLength(12) unit?: string;
  @IsOptional() @IsString() @MaxLength(20) kind?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsBoolean() showInSale?: boolean;
  @IsOptional() @IsBoolean() manageStock?: boolean;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsBoolean() allowDiscount?: boolean;
  @IsOptional() @IsBoolean() allowAddition?: boolean;
  @IsString() @IsNotEmpty() @MaxLength(80) category!: string;
  @IsOptional() @IsString() @MaxLength(80) subcategory?: string;
  @IsString() @IsNotEmpty() @MaxLength(80) brand!: string;
  @IsOptional() @IsString() @MaxLength(30) productType?: string;
  @IsOptional() @IsString() @MaxLength(1000) internalNote?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  stock?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  minimumStock?: number;
  @IsOptional() @IsString() @MaxLength(500) variations?: string;
  @IsOptional() @IsBoolean() inheritGridPrice?: boolean;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  commission?: number;
  @IsOptional() @IsBoolean() commissionEnabled?: boolean;
  @IsOptional()
  @IsIn(['VENDEDOR', 'PERCENTUAL', 'FIXO'])
  commissionType?: string;
  @IsOptional()
  @IsIn(['PADRAO', 'PRECO_BRUTO', 'VALOR_LIQUIDO'])
  commissionRule?: string;
  @IsOptional() @IsString() @MaxLength(160) supplierName?: string;
  @IsOptional() @IsUUID() supplierId?: string | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchaseCost?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  additionalCost?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  markupMultiplier?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  promotionalPrice?: number | null;
}
