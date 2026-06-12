import { Test, TestingModule } from '@nestjs/testing';
import { MilestoneEscrowService } from './milestone-escrow.service';
import { PrismaService } from '../../config/prisma.service';
import { WalletService } from './wallet/wallet.service';

describe('MilestoneEscrowService', () => {
  let service: MilestoneEscrowService;
  let prisma: PrismaService;
  let walletService: WalletService;

  const mockPrisma = {
    booking: {
      findUnique: jest.fn(),
    },
    escrowMilestone: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((ops) => Promise.all(ops)),
  };

  const mockWalletService = {
    topUp: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneEscrowService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WalletService, useValue: mockWalletService },
      ],
    }).compile();

    service = module.get<MilestoneEscrowService>(MilestoneEscrowService);
    prisma = module.get<PrismaService>(PrismaService);
    walletService = module.get<WalletService>(WalletService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createMilestones', () => {
    it('should create 3 milestones for a 50,000 XAF booking', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({ id: 'booking-1', price: 50000 });
      mockPrisma.escrowMilestone.create.mockResolvedValue({});

      const result = await service.createMilestones('booking-1', 50000);

      expect(result.milestones).toHaveLength(3);
      expect(result.milestones[0]).toEqual({
        milestone: 'DEPOSIT',
        percentage: 25,
        amount: 12500,
      });
      expect(result.milestones[1]).toEqual({
        milestone: 'START',
        percentage: 50,
        amount: 25000,
      });
      expect(result.milestones[2]).toEqual({
        milestone: 'COMPLETION',
        percentage: 25,
        amount: 12500,
      });
    });

    it('should reject non-existent booking', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      await expect(service.createMilestones('invalid-id', 50000)).rejects.toThrow('Booking not found');
    });
  });

  describe('releaseMilestone', () => {
    it('should release milestone and credit provider wallet', async () => {
      mockPrisma.escrowMilestone.findFirst.mockResolvedValue({
        id: 'milestone-1',
        milestone: 'DEPOSIT',
        amount: 12500,
        status: 'PENDING',
      });

      const result = await service.releaseMilestone('booking-1', 'DEPOSIT', 'provider-1');

      expect(mockWalletService.topUp).toHaveBeenCalledWith(
        'provider-1',
        12500,
        'milestone:milestone-1',
        expect.stringContaining('Milestone release'),
      );
      expect(result.releasedAmount).toBe(12500);
    });

    it('should reject releasing already released milestone', async () => {
      mockPrisma.escrowMilestone.findFirst.mockResolvedValue({
        id: 'milestone-1',
        status: 'RELEASED',
      });

      await expect(
        service.releaseMilestone('booking-1', 'DEPOSIT', 'provider-1'),
      ).rejects.toThrow('already released');
    });
  });

  describe('getMilestoneStatus', () => {
    it('should calculate total released and pending amounts', async () => {
      mockPrisma.escrowMilestone.findMany.mockResolvedValue([
        { milestone: 'DEPOSIT', amount: 12500, status: 'RELEASED' },
        { milestone: 'START', amount: 25000, status: 'RELEASED' },
        { milestone: 'COMPLETION', amount: 12500, status: 'PENDING' },
      ]);

      const result = await service.getMilestoneStatus('booking-1');

      expect(result.totalReleased).toBe(37500);
      expect(result.totalPending).toBe(12500);
    });
  });
});
