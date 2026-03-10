import { IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Email or phone number is required' })
  @Transform(({ value }) => value?.trim())
  identifier!: string; // Can be email or phone

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;
}
