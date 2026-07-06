import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class TransferenciaSaldoDto {
  @IsString()
  @IsNotEmpty()
  originBankAccountId: string;

  @IsString()
  @IsNotEmpty()
  destinationBankAccountId: string;

  @IsNumber()
  amount: number;

  @IsNumber()
  @IsOptional()
  fee?: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  date: string;
}
