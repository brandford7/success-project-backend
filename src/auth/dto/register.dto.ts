import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  ValidateIf,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ValidateIf((o) => !o.phoneNumber)
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email or phone number is required' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @ValidateIf((o) => !o.email)
  @IsString()
  @IsNotEmpty({ message: 'Email or phone number is required' })
  @Matches(/^(\+?233|0)[2-5]\d{8}$|^(\+?234|0)[7-9]\d{9}$/, {
    message: 'Phone number must be a valid Ghana or Nigeria number',
  })
  @Transform(({ value }) => value?.trim())
  phoneNumber?: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(100, { message: 'Password must not exceed 100 characters' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password must contain uppercase, lowercase, and number/special character',
  })
  password!: string;
}
