import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipStatus } from '../entities/tip.entity';

export class QueryTipsDto {
  @IsOptional()
  @IsEnum(TipStatus)
  status?: TipStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isVip?: boolean;

  @IsOptional()
  league?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
