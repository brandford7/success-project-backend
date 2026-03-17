// dto/update-tip-status.dto.ts
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TipStatus } from '../entities/tip.entity';

export class UpdateTipStatusDto {
  @IsEnum(TipStatus)
  status!: TipStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  resultNotes?: string;
}
