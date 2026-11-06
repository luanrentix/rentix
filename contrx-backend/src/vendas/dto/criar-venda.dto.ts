import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayMaxSize,
  Matches,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ItemVendaDto {
  @IsOptional() @IsUUID() variantId?: string;
  @IsString()
  productId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;
}

export class ItemDevolvidoDto {
  @IsInt() @Min(0) itemIndex!: number;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;
}

export class CardPaymentDto {
  @IsIn(['CARTAO_CREDITO', 'CARTAO_DEBITO']) method!: string;
  @IsUUID() administratorId!: string;
  @IsString() @MinLength(1) @MaxLength(40) brand!: string;
  @IsOptional() @Matches(/^\d{4}$/) lastFour?: string;
  @IsOptional() @IsString() @MaxLength(120) holderName?: string;
  @IsString() @MinLength(1) @MaxLength(80) nsu!: string;
  @IsOptional() @IsString() @MaxLength(80) authorizationCode?: string;
  @IsInt() @Min(1) @Max(60) installments!: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount!: number;
}

export class CriarVendaDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => CardPaymentDto)
  cardPayments?: CardPaymentDto[];
  @IsOptional() @IsUUID() originalOrderId?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDevolvidoDto)
  returnedItems?: ItemDevolvidoDto[];
  @IsOptional() @IsIn(['REFUND', 'CREDIT']) returnDisposition?: string;
  @IsOptional() @IsBoolean() refundConfirmed?: boolean;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  expectedTotal?: number;
  @IsOptional() @IsUUID() requestId?: string;
  @IsOptional() @IsInt() @Min(1) version?: number;
  @IsOptional() @IsUUID() bankAccountId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(60) installments?: number;
  @IsUUID() customerId!: string;
  @IsUUID() sellerId!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  customerName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  sellerName!: string;

  @IsIn(['VENDA', 'ORCAMENTO', 'CONDICIONAL', 'PEDIDO', 'TROCA'])
  saleType!: string;

  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => ItemVendaDto)
  items!: ItemVendaDto[];

  @IsIn([
    'DINHEIRO',
    'PIX',
    'CARTAO_CREDITO',
    'CARTAO_DEBITO',
    'CREDIARIO',
    'SALDO_CLIENTE',
    'MISTO',
  ])
  paymentMethod!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  addition!: number;

  @IsOptional()
  @IsIn(['EM_ANDAMENTO', 'CONCLUIDA'])
  status?: string;

  @IsOptional()
  @IsObject()
  paymentDetails?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
