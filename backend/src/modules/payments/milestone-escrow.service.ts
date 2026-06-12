import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { WalletService } from './wallet/wallet.service';

@Injectable()
export class MilestoneEscrowService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  async createMilestones(bookingId: string, totalAmount: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    // Default milestone split: 25% deposit, 50% at start, 25% on completion
    const milestones = [
      { milestone: 'DEPOSIT', percentage: 25, amount: Math.round(totalAmount * 0.25) },
      { milestone: 'START', percentage: 50, amount: Math.round(totalAmount * 0.50) },
      { milestone: 'COMPLETION', percentage: 25, amount: Math.round(totalAmount * 0.25) },
    ];

    await this.prisma.$transaction(
      milestones.map((m) =>
        this.prisma.escrowMilestone.create({
          data: {
            bookingId,
            milestone: m.milestone,
            percentage: m.percentage,
            amount: m.amount,
            status: 'PENDING',
          },
        }),
      ),
    );

    return { milestones, message: 'Escrow milestones created' };
  }

  async releaseMilestone(bookingId: string, milestoneName: string, providerId: string) {
    const milestone = await this.prisma.escrowMilestone.findFirst({
      where: { bookingId, milestone: milestoneName },
    });

    if (!milestone) throw new NotFoundException('Milestone not found');
    if (milestone.status !== 'PENDING') {
      throw new BadRequestException('Milestone already released or disputed');
    }

    // Credit provider wallet
    await this.walletService.topUp(
      providerId,
      milestone.amount,
      `milestone:${milestone.id}`,
      `Milestone release: ${milestoneName} for booking ${bookingId}`,
    );

    await this.prisma.escrowMilestone.update({
      where: { id: milestone.id },
      data: { status: 'RELEASED', releasedAt: new Date() },
    });

    return {
      success: true,
      releasedAmount: milestone.amount,
      message: `${milestoneName} milestone released: ${milestone.amount} XAF`,
    };
  }

  async getMilestoneStatus(bookingId: string) {
    const milestones = await this.prisma.escrowMilestone.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });

    const totalReleased = milestones
      .filter((m) => m.status === 'RELEASED')
      .reduce((sum, m) => sum + m.amount, 0);

    return {
      milestones,
      totalReleased,
      totalPending: milestones.reduce((sum, m) => sum + m.amount, 0) - totalReleased,
    };
  }
}
