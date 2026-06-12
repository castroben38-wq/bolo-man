import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../config/prisma.service';

export interface WalletBalanceResult {
  walletId: string;
  userId: string;
  balance: number;
  currency: string;
}

export interface WalletTransactionResult {
  id: string;
  amount: number;
  type: string;
  reference?: string | null;
  description?: string | null;
  createdAt: Date;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async findWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException(`Wallet not found for user ${userId}`);
    }
    if (!wallet.isActive) {
      throw new BadRequestException('Wallet is inactive');
    }
    return wallet;
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  /**
   * Get wallet balance for a user.
   */
  async getBalance(userId: string): Promise<WalletBalanceResult> {
    const wallet = await this.findWallet(userId);
    return {
      walletId: wallet.id,
      userId: wallet.userId,
      balance: wallet.balance,
      currency: wallet.currency,
    };
  }

  /**
   * Top up wallet (credit). Amount must be a positive integer in XAF.
   */
  async topUp(
    userId: string,
    amount: number,
    reference?: string,
    description?: string,
  ): Promise<WalletBalanceResult> {
    if (amount <= 0) {
      throw new BadRequestException('Top-up amount must be positive');
    }

    const wallet = await this.findWallet(userId);

    const [updatedWallet] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: amount,
          type: 'TOP_UP',
          reference: reference ?? null,
          description: description ?? `Wallet top-up of ${amount} XAF`,
        },
      }),
    ]);

    this.logger.log(`Wallet top-up: userId=${userId} amount=${amount} newBalance=${updatedWallet.balance}`);

    return {
      walletId: updatedWallet.id,
      userId: updatedWallet.userId,
      balance: updatedWallet.balance,
      currency: updatedWallet.currency,
    };
  }

  /**
   * Debit wallet. Amount must be a positive integer in XAF.
   * Throws if balance is insufficient.
   */
  async debit(
    userId: string,
    amount: number,
    type: string,
    reference?: string,
    description?: string,
  ): Promise<WalletBalanceResult> {
    if (amount <= 0) {
      throw new BadRequestException('Debit amount must be positive');
    }

    const wallet = await this.findWallet(userId);

    if (wallet.balance < amount) {
      throw new BadRequestException(
        `Insufficient wallet balance. Available: ${wallet.balance} XAF, Required: ${amount} XAF`,
      );
    }

    const [updatedWallet] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: -amount, // negative = debit
          type,
          reference: reference ?? null,
          description: description ?? `Debit of ${amount} XAF`,
        },
      }),
    ]);

    this.logger.log(`Wallet debit: userId=${userId} amount=${amount} type=${type} newBalance=${updatedWallet.balance}`);

    return {
      walletId: updatedWallet.id,
      userId: updatedWallet.userId,
      balance: updatedWallet.balance,
      currency: updatedWallet.currency,
    };
  }

  /**
   * Get paginated wallet transaction history.
   */
  async getTransactions(
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<{ transactions: WalletTransactionResult[]; total: number }> {
    const wallet = await this.findWallet(userId);

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        reference: t.reference,
        description: t.description,
        createdAt: t.createdAt,
      })),
      total,
    };
  }
}
