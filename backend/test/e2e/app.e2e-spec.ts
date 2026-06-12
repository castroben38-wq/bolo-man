import { describe, it, expect, beforeAll } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/config/prisma.service';

describe('Bolo-Man API E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ═══════════════════════════════════════════════════════════════
  // AUTH TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('POST /auth/register', () => {
    it('should register a new client user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test Client',
          email: 'test.client@boloman.cm',
          phone: '+237699999999',
          password: 'SecurePass123!',
          role: 'CLIENT',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.user).toBeDefined();
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
          expect(res.body.user.role).toBe('CLIENT');
        });
    });

    it('should reject duplicate email/phone', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Duplicate User',
          email: 'test.client@boloman.cm',
          phone: '+237699999999',
          password: 'SecurePass123!',
        })
        .expect(409);
    });

    it('should reject weak password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Weak Pass',
          email: 'weak@boloman.cm',
          phone: '+237688888888',
          password: '123',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with email and password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          identifier: 'test.client@boloman.cm',
          password: 'SecurePass123!',
        })
        .expect(200);

      authToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
      expect(authToken).toBeDefined();
      expect(res.body.user.role).toBe('CLIENT');
    });

    it('should login with phone and password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          identifier: '+237699999999',
          password: 'SecurePass123!',
        })
        .expect(200);
    });

    it('should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          identifier: 'test.client@boloman.cm',
          password: 'WrongPass123!',
        })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh access token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
        });
    });

    it('should reject invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PAYMENT SECURITY TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('POST /payments/pin', () => {
    it('should set transaction PIN (4-6 digits)', () => {
      return request(app.getHttpServer())
        .post('/payments/pin')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '1234' })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });

    it('should reject invalid PIN length', () => {
      return request(app.getHttpServer())
        .post('/payments/pin')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '12' })
        .expect(400);
    });
  });

  describe('POST /payments/pin/verify', () => {
    it('should verify correct PIN', () => {
      return request(app.getHttpServer())
        .post('/payments/pin/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '1234' })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });

    it('should reject incorrect PIN', () => {
      return request(app.getHttpServer())
        .post('/payments/pin/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '9999' })
        .expect(401);
    });
  });

  describe('POST /payments/otp/request', () => {
    it('should request payment OTP', () => {
      return request(app.getHttpServer())
        .post('/payments/otp/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 25000 })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain('OTP sent');
          expect(res.body.maskedPhone).toBeDefined();
          expect(res.body.expiresIn).toBe(300);
        });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PAYMENT GATEWAY TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('POST /payments', () => {
    it('should initiate MoMo payment', () => {
      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 5000,
          currency: 'XAF',
          method: 'MOMO',
          description: 'Test MoMo payment',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.transactionRef).toBeDefined();
          expect(res.body.status).toBe('pending');
        });
    });

    it('should initiate Orange Money payment', () => {
      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 10000,
          currency: 'XAF',
          method: 'ORANGE',
          description: 'Test Orange Money payment',
        })
        .expect(201);
    });

    it('should initiate Card payment via Flutterwave', () => {
      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 25000,
          currency: 'XAF',
          method: 'CARD',
          description: 'Test card payment',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.redirectUrl).toBeDefined();
        });
    });

    it('should initiate USSD fallback payment', () => {
      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 5000,
          currency: 'XAF',
          method: 'USSD',
          description: 'Test USSD payment',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toContain('Dial');
          expect(res.body.message).toContain('*126');
        });
    });

    it('should reject unsupported country for MoMo', () => {
      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 5000,
          currency: 'XAF',
          method: 'MOMO',
          countryCode: 'NG',
        })
        .expect(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ESCROW TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('POST /payments/escrow/milestones/:bookingId', () => {
    it('should create milestone escrow', () => {
      return request(app.getHttpServer())
        .post('/payments/escrow/milestones/test-booking-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 50000 })
        .expect(200)
        .expect((res) => {
          expect(res.body.milestones).toHaveLength(3);
          expect(res.body.milestones[0].milestone).toBe('DEPOSIT');
          expect(res.body.milestones[0].percentage).toBe(25);
        });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // COD TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('POST /payments/cod/qr/:bookingId', () => {
    it('should generate COD QR code', () => {
      return request(app.getHttpServer())
        .post('/payments/cod/qr/test-booking-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.qrCodeUrl).toBeDefined();
          expect(res.body.instructions).toContain('QR');
        });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GATED CONTACT TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('GET /contacts/:providerId', () => {
    it('should deny contact access without subscription', () => {
      return request(app.getHttpServer())
        .get('/contacts/test-provider-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403)
        .expect((res) => {
          expect(res.body.code).toBe('CONTACT_ACCESS_DENIED');
          expect(res.body.options).toBeDefined();
          expect(res.body.options.subscription).toBeDefined();
          expect(res.body.options.microPayment).toBeDefined();
        });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // BOOKING TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('POST /bookings', () => {
    it('should create a new booking', () => {
      return request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          serviceId: 'test-service-id',
          providerId: 'test-provider-id',
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          price: 25000,
          locationAddress: 'Akwa, Douala',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.status).toBe('REQUESTED');
          expect(res.body.paymentStatus).toBe('PENDING');
        });
    });

    it('should enforce booking state machine', async () => {
      const booking = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          serviceId: 'test-service-id',
          providerId: 'test-provider-id',
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          price: 25000,
        });

      // Cannot go from REQUESTED to COMPLETED directly
      return request(app.getHttpServer())
        .patch(`/bookings/${booking.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'COMPLETED' })
        .expect(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SUBSCRIPTION TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('GET /subscriptions', () => {
    it('should list subscription plans for Cameroon', () => {
      return request(app.getHttpServer())
        .get('/subscriptions?countryCode=CM')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0].currency).toBe('XAF');
        });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ADMIN TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('GET /admin/dashboard', () => {
    it('should reject non-admin access', () => {
      return request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RATE LIMITING TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('Rate Limiting', () => {
    it('should throttle excessive auth requests', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app.getHttpServer())
          .post('/auth/login')
          .send({ identifier: 'test', password: 'wrong' }),
      );

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.some((r) => r.status === 429);
      expect(tooManyRequests).toBe(true);
    });
  });
});
