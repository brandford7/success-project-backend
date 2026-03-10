import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
  IsBoolean,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateTipDto {
  @IsString()
  @IsNotEmpty({ message: 'Match name is required' })
  @MaxLength(200, { message: 'Match name must not exceed 200 characters' })
  @Transform(({ value }) => value.trim())
  match!: string;

  @IsString()
  @IsNotEmpty({ message: 'League is required' })
  @MaxLength(100, { message: 'League name must not exceed 100 characters' })
  @Transform(({ value }) => value.trim())
  league!: string;

  @IsString()
  @IsNotEmpty({ message: 'Pick/prediction is required' })
  @MaxLength(200, { message: 'Pick must not exceed 200 characters' })
  @Transform(({ value }) => value.trim())
  pick!: string;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Odds must be a valid number with max 2 decimal places' },
  )
  @Type(() => Number)
  @Min(1.01, { message: 'Odds must be at least 1.01' })
  @Max(100, { message: 'Odds must not exceed 100' })
  odds!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Reasoning must not exceed 1000 characters' })
  @Transform(({ value }) => value?.trim())
  reasoning?: string;

  @IsDateString({}, { message: 'Kickoff time must be a valid ISO 8601 date' })
  kickoffTime!: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isVip?: boolean = false;
}
