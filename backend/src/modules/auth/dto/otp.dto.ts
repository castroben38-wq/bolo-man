import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OtpRequestDto {
  @ApiProperty({ example: '+237670000001' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class OtpVerifyDto {
  @ApiProperty({ example: '+237670000001' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  otp: string;
}
