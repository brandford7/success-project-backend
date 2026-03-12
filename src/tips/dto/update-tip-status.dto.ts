import { IsEnum, IsString, IsOptional } from 'class-validator';
import { TipStatus } from '../entities/tip.entity';

export class UpdateTipStatusDto {
  @IsEnum(TipStatus)
  status!: TipStatus;

  @IsString()
  @IsOptional()
  resultNotes?: string;
}
