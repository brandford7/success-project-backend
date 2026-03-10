import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { TipStatus } from '../entities/tip.entity';

export class UpdateTipDto {
  @IsEnum(TipStatus, {
    message: 'Status must be one of: pending, won, lost, void',
  })
  status!: TipStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Result notes must not exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  resultNotes?: string;
}
