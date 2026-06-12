import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { PaymentGatewayFactory } from './gateways/payment-gateway.factory';
import { WalletService } from './wallet/wallet.service';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gatewayFactory: PaymentGatewayFactory,
    private readonly walletService: WalletService,
  ) {}

  // ─── Initiate Payment ─────────────────────────────────────────────────────────

  /**
   * Initiate a payment for a booking or top-up.
   * - WALLET payments are debited immediately from the user's in-app wallet.
   * - All other methods delegate to the appropriate gateway.
   */
  async initiatePayment(userId: string, countryCode: string, dto: InitiatePaymentDto) {
    const { amount, method, bookingId, description, phone, email, callbackUrl } = dto;

    // For wallet payments, debit immediately
    if (method === PaymentMethod.WALLET) {
      const balance = await this.walletService.debit(
        userId,
        amount,
        'BOOKING_PAYMENT',
        bookingId,
        description,
      );

      const payment = await this.prisma.payment.create({
        data: {
          userId,
          bookingId: bookingId ?? null,
          amount,
          currency: 'XAF',
          method: PaymentMethod.WALLET,
          status: PaymentStatus.COMPLETED,
          description: description ?? null,
          paidAt: new Date(),
          countryCode,
        },
      });

      if (bookingId) {
        await this.prisma.booking.update({
          where: { id: bookingId },
          data: { paymentStatus: PaymentStatus.COMPLETED },
        });
      }

      return { payment, walletBalance: balance.balance };
    }

    // COD – record pending payment; no gateway call
    if (method === PaymentMethod.COD) {
      const payment = await this.prisma.payment.create({
        data: {
          userId,
          bookingId: bookingId ?? null,
          amount,
          currency: 'XAF',
          method: PaymentMethod.COD,
          status: PaymentStatus.PENDING,
          description: description ?? 'Cash on delivery',
          countryCode,
        },
      });
      return { payment };
    }

    // Online gateway payment (MOMO, ORANGE, CARD)
    const gateway = this.gatewayFactory.resolve(method, countryCode);

    const gatewayResult = await gateway.initiate(amount, 'XAF', {
      userId,
      bookingId,
      description,
      callbackUrl,
      phone,
      email,
    });

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        bookingId: bookingId ?? null,
        amount,
        currency: 'XAF',
        method,
        status: PaymentStatus.PENDING,
        transactionRef: gatewayResult.transactionRef,
        description: description ?? null,
        countryCode,
      },
    });

    return {
      payment,
      transactionRef: gatewayResult.transactionRef,
      status: gatewayResult.status,
      redirectUrl: gatewayResult.redirectUrl,
      message: gatewayResult.message,
    };
  }

  // ─── Verify Payment ───────────────────────────────────────────────────────────

  async verifyPayment(transactionRef: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { transactionRef },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ref ${transactionRef} not found`);
    }

    const gateway = this.gatewayFactory.resolve(payment.method, payment.countryCode);
    const verifyResult = await gateway.verify(transactionRef);

    let newStatus: PaymentStatus = payment.status;
    if (verifyResult.status === 'completed') newStatus = PaymentStatus.COMPLETED;
    else if (verifyResult.status === 'failed') newStatus = PaymentStatus.FAILED;

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        paidAt: verifyResult.paidAt ?? payment.paidAt,
        gatewayResponse: verifyResult.gatewayResponse ?? undefined,
      },
    });

    if (newStatus === PaymentStatus.COMPLETED && payment.bookingId) {
      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { paymentStatus: PaymentStatus.COMPLETED },
      });
      // Top-up wallet with the paid amount so it can be escrowed
      await this.walletService.topUp(
        payment.userId,
        payment.amount,
        transactionRef,
        `Gateway payment confirmed for booking ${payment.bookingId}`,
      );
    }

    return updated;
  }

  // ─── Webhook Processing ───────────────────────────────────────────────────────

  /**
   * Process incoming webhooks from payment gateways.
   */
  async processWebhook(
    gatewayMethod: PaymentMethod,
    countryCode: string,
    payload: any,
    signature?: string,
  ) {
    const gateway = this.gatewayFactory.resolve(gatewayMethod, countryCode);
    const webhookResult = await gateway.handleWebhook(payload, signature);

    const { transactionRef, status, amount, currency } = webhookResult;

    const payment = await this.prisma.payment.findUnique({
      where: { transactionRef },
    });

    if (!payment) {
      this.logger.warn(`Webhook received for unknown transactionRef: ${transactionRef}`);
      return { received: true, known: false };
    }

    const newStatus =
      status === 'completed' ? PaymentStatus.COMPLETED : PaymentStatus.FAILED;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        paidAt: status === 'completed' ? new Date() : payment.paidAt,
        gatewayResponse: { status, amount, currency },
      },
    });

    if (newStatus === PaymentStatus.COMPLETED && payment.bookingId) {
      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { paymentStatus: PaymentStatus.COMPLETED },
      });
      await this.walletService.topUp(
        payment.userId,
        payment.amount,
        transactionRef,
        `Webhook payment confirmed for booking ${payment.bookingId}`,
      );
    }

    this.logger.log(
      `Webhook processed: transactionRef=${transactionRef} status=${newStatus}`,
    );

    return { received: true, known: true, status: newStatus };
  }

  // ─── Payment History ──────────────────────────────────────────────────────────

  async getPaymentHistory(
    userId: string,
    limit = 20,
    offset = 0,
  ) {
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { booking: { select: { id: true, scheduledAt: true } } },
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);

    return { payments, total, limit, offset };
  }

  // ─── Single Payment ───────────────────────────────────────────────────────────

  async getPaymentById(paymentId: string, userId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId },
      include: { booking: true },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }
}
