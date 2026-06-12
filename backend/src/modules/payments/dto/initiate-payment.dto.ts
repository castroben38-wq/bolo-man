import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class InitiatePaymentDto {
  @ApiProperty({ example: 5000, description: 'Amount in XAF (integer, no decimals)' })
  @IsInt()
  @Min(100)
  amount: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.MOMO })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({ example: 'booking-uuid' })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional({ example: 'Service payment for cleaning' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '237691234567', description: 'Phone number for MoMo / Orange' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'https://yourapp.com/payment/callback' })
  @IsOptional()
  @IsString()
  callbackUrl?: string;
}
