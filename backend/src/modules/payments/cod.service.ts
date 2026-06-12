import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class CodService {
  constructor(private prisma: PrismaService) {}

  async generateCodQr(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { client: true, provider: true },
    });

    if (!booking) throw new BadRequestException('Booking not found');

    const qrData = JSON.stringify({
      bookingId: booking.id,
      amount: booking.price,
      clientPhone: booking.client.phone,
      providerPhone: booking.provider.phone,
      timestamp: Date.now(),
    });

    // TODO: Generate actual QR code image (using qrcode library)
    const qrCodeUrl = `https://api.boloman.cm/cod/qr/${booking.id}`;

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { paymentStatus: PaymentStatus.PENDING },
    });

    return {
      qrCodeUrl,
      qrData,
      amount: booking.price,
      instructions: 'Show this QR to the provider. They will scan to confirm cash received.',
    };
  }

  async confirmCodPayment(bookingId: string, providerId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) throw new BadRequestException('Booking not found');
    if (booking.providerId !== providerId) {
      throw new BadRequestException('Only the assigned provider can confirm COD');
    }

    await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { paymentStatus: PaymentStatus.COMPLETED },
      }),
      this.prisma.payment.create({
        data: {
          userId: booking.clientId,
          bookingId,
          amount: booking.price,
          currency: 'XAF',
          method: 'COD',
          status: PaymentStatus.COMPLETED,
          description: 'Cash on delivery confirmed via QR scan',
          paidAt: new Date(),
          countryCode: booking.countryCode,
        },
      }),
    ]);

    return { success: true, message: 'COD payment confirmed' };
  }
}
