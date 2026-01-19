import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class UserDto {
  @IsNotEmpty()
  id: number;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  displayImage?: string;

  @IsBoolean()
  isVerified: boolean;

  @IsString()
  @IsOptional()
  role?: string;
}
