import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { TipStatus } from '../entities/tip.entity';

export class UpdateTipDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  match?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  league?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  pick?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1.01)
  @Max(1000)
  @IsOptional()
  odds?: number;

  @IsString()
  @IsOptional()
  reasoning?: string;

  @IsDateString()
  @IsOptional()
  kickoffTime?: string;

  @IsBoolean()
  @IsOptional()
  isVip?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Result notes must not exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  resultNotes?: string;

  @IsOptional()
  @IsEnum(TipStatus)
  status?: TipStatus; // <--- Added this
}
