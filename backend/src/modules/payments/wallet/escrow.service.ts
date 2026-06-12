import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../config/prisma.service';

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException(`Wallet not found for user ${userId}`);
    if (!wallet.isActive) throw new BadRequestException('Wallet is inactive');
    return wallet;
  }

  private escrowRef(bookingId: string): string {
    return `escrow:${bookingId}`;
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  /**
   * Hold funds in escrow when a booking is accepted.
   * Debits the client's wallet and records an ESCROW_HOLD transaction.
   *
   * @param clientId   - User ID of the client
   * @param bookingId  - Booking being paid for
   * @param amount     - Integer XAF amount
   */
  async holdFunds(clientId: string, bookingId: string, amount: number): Promise<void> {
    if (amount <= 0) throw new BadRequestException('Escrow hold amount must be positive');

    const wallet = await this.getWallet(clientId);

    if (wallet.balance < amount) {
      throw new BadRequestException(
        `Insufficient balance for escrow. Available: ${wallet.balance} XAF, Required: ${amount} XAF`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: -amount,
          type: 'ESCROW_HOLD',
          reference: this.escrowRef(bookingId),
          description: `Escrow hold for booking ${bookingId}`,
        },
      }),
    ]);

    this.logger.log(`Escrow hold: clientId=${clientId} bookingId=${bookingId} amount=${amount}`);
  }

  /**
   * Release escrowed funds to the provider upon service completion.
   * Credits the provider's wallet and records ESCROW_RELEASE on both sides.
   *
   * @param providerId - User ID of the provider receiving funds
   * @param bookingId  - Booking that was completed
   * @param amount     - Integer XAF amount to release
   */
  async releaseFunds(providerId: string, bookingId: string, amount: number): Promise<void> {
    if (amount <= 0) throw new BadRequestException('Escrow release amount must be positive');

    const providerWallet = await this.getWallet(providerId);

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: providerWallet.id },
        data: { balance: { increment: amount } },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: providerWallet.id,
          amount: amount,
          type: 'ESCROW_RELEASE',
          reference: this.escrowRef(bookingId),
          description: `Escrow release for completed booking ${bookingId}`,
        },
      }),
    ]);

    // Update booking payment status to completed
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { paymentStatus: 'COMPLETED' },
    });

    this.logger.log(`Escrow release: providerId=${providerId} bookingId=${bookingId} amount=${amount}`);
  }

  /**
   * Refund escrowed funds to the client upon booking cancellation.
   * Credits the client's wallet and records an ESCROW_REFUND transaction.
   *
   * @param clientId  - User ID of the client to refund
   * @param bookingId - Cancelled booking ID
   * @param amount    - Integer XAF amount to refund
   */
  async refundFunds(clientId: string, bookingId: string, amount: number): Promise<void> {
    if (amount <= 0) throw new BadRequestException('Escrow refund amount must be positive');

    const clientWallet = await this.getWallet(clientId);

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: clientWallet.id },
        data: { balance: { increment: amount } },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: clientWallet.id,
          amount: amount,
          type: 'REFUND',
          reference: this.escrowRef(bookingId),
          description: `Escrow refund for cancelled booking ${bookingId}`,
        },
      }),
    ]);

    // Update booking payment status to reflect refund
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { paymentStatus: 'REFUNDED' },
    });

    this.logger.log(`Escrow refund: clientId=${clientId} bookingId=${bookingId} amount=${amount}`);
  }
}
