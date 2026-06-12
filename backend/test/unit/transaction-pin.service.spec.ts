import { Test, TestingModule } from '@nestjs/testing';
import { TransactionPinService } from './transaction-pin.service';
import { PrismaService } from '../../config/prisma.service';
import { RedisService } from '../../config/redis.service';

describe('TransactionPinService', () => {
  let service: TransactionPinService;
  let prisma: PrismaService;
  let redis: RedisService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockRedis = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionPinService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<TransactionPinService>(TransactionPinService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('setPin', () => {
    it('should set a valid 4-digit PIN', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });

      const result = await service.setPin('user-1', '1234');

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({ transactionPin: expect.any(String) }),
      });
    });

    it('should set a valid 6-digit PIN', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });

      const result = await service.setPin('user-1', '123456');

      expect(result.success).toBe(true);
    });

    it('should reject PIN with non-digit characters', async () => {
      await expect(service.setPin('user-1', '12a4')).rejects.toThrow('PIN must be 4-6 digits');
    });

    it('should reject PIN shorter than 4 digits', async () => {
      await expect(service.setPin('user-1', '123')).rejects.toThrow('PIN must be 4-6 digits');
    });

    it('should reject PIN longer than 6 digits', async () => {
      await expect(service.setPin('user-1', '1234567')).rejects.toThrow('PIN must be 4-6 digits');
    });
  });

  describe('verifyPin', () => {
    it('should verify correct PIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        transactionPin: '$argon2id$v=19$m=65536,t=3,p=4$...', // hashed "1234"
      });

      // Mock argon2.verify to return true for this test
      jest.spyOn(require('argon2'), 'verify').mockResolvedValue(true);

      const result = await service.verifyPin('user-1', '1234');
      expect(result.success).toBe(true);
    });

    it('should reject when PIN not set', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ transactionPin: null });

      await expect(service.verifyPin('user-1', '1234')).rejects.toThrow('PIN_NOT_SET');
    });

    it('should reject incorrect PIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        transactionPin: '$argon2id$v=19$m=65536,t=3,p=4$...',
      });
      jest.spyOn(require('argon2'), 'verify').mockResolvedValue(false);

      await expect(service.verifyPin('user-1', '9999')).rejects.toThrow('INVALID_PIN');
    });
  });

  describe('requestPaymentOtp', () => {
    it('should generate and store OTP with 5min expiry', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        phone: '+237670000001',
        name: 'Test User',
      });

      const result = await service.requestPaymentOtp('user-1', 25000);

      expect(result.maskedPhone).toBe('+237 67****01');
      expect(result.expiresIn).toBe(300);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'payment_otp:user-1',
        expect.stringMatching(/^\d{6}$/),
        300,
      );
    });
  });

  describe('verifyPaymentOtp', () => {
    it('should verify correct OTP', async () => {
      mockRedis.get.mockResolvedValue('123456');

      const result = await service.verifyPaymentOtp('user-1', '123456');

      expect(result.success).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('payment_otp:user-1');
    });

    it('should reject incorrect OTP', async () => {
      mockRedis.get.mockResolvedValue('123456');

      await expect(service.verifyPaymentOtp('user-1', '999999')).rejects.toThrow('Invalid or expired OTP');
    });

    it('should reject expired OTP', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.verifyPaymentOtp('user-1', '123456')).rejects.toThrow('Invalid or expired OTP');
    });
  });
});
