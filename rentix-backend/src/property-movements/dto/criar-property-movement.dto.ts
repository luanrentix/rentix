import { IsString, IsUUID, MinLength } from 'class-validator';

export class CriarPropertyMovementDto {
  @IsUUID()
  companyId: string;

  @IsUUID()
  propertyId: string;

  @IsString()
  @MinLength(1)
  propertyName: string;

  @IsString()
  @MinLength(1)
  type: string;

  @IsString()
  @MinLength(1)
  description: string;
}
