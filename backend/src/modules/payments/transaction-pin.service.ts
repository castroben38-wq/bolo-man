import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { RedisService } from '../../config/redis.service';
import * as argon2 from 'argon2';

@Injectable()
export class TransactionPinService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async setPin(userId: string, pin: string) {
    if (!/^\d{4,6}$/.test(pin)) {
      throw new BadRequestException('PIN must be 4-6 digits');
    }
    const hash = await argon2.hash(pin);
    await this.prisma.user.update({
      where: { id: userId },
      data: { transactionPin: hash },
    });
    return { success: true, message: 'Transaction PIN set successfully' };
  }

  async verifyPin(userId: string, pin: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { transactionPin: true },
    });

    if (!user?.transactionPin) {
      throw new BadRequestException({
        code: 'PIN_NOT_SET',
        message: 'Please set a transaction PIN first',
      });
    }

    const isValid = await argon2.verify(user.transactionPin, pin);
    if (!isValid) {
      throw new UnauthorizedException({
        code: 'INVALID_PIN',
        message: 'Incorrect transaction PIN',
      });
    }

    return { success: true };
  }

  async changePin(userId: string, oldPin: string, newPin: string) {
    await this.verifyPin(userId, oldPin);
    return this.setPin(userId, newPin);
  }

  // ─── Payment OTP (SMS) ───────────────────────────────────────────────────────

  async requestPaymentOtp(userId: string, amount: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, name: true },
    });

    if (!user) throw new BadRequestException('User not found');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const key = `payment_otp:${userId}`;

    await this.redis.set(key, otp, 300); // 5 minutes expiry

    // TODO: Send SMS via Twilio or local provider
    console.log(`[SMS OTP] To ${user.phone}: ${otp} — Confirm payment of ${amount} XAF on Bolo-Man`);

    return {
      message: 'OTP sent to your phone',
      expiresIn: 300,
      maskedPhone: this.maskPhone(user.phone),
    };
  }

  async verifyPaymentOtp(userId: string, otp: string) {
    const key = `payment_otp:${userId}`;
    const stored = await this.redis.get(key);

    if (!stored || stored !== otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.redis.del(key);
    return { success: true };
  }

  // ─── High-value booking voice confirmation ───────────────────────────────────

  async requestVoiceConfirmation(userId: string, bookingId: string, amount: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });

    if (!user) throw new BadRequestException('User not found');

    // Mark booking as requiring OTP
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { requiresOtp: true },
    });

    // TODO: Initiate voice call via Twilio or local IVR
    console.log(`[VOICE CALL] To ${user.phone}: Confirm booking ${bookingId} worth ${amount} XAF. Press 1 to confirm.`);

    return {
      message: 'Voice confirmation initiated',
      method: 'voice_call',
    };
  }

  private maskPhone(phone: string): string {
    return phone.slice(0, 6) + '****' + phone.slice(-2);
  }
}
