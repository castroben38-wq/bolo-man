import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { WalletService } from './wallet/wallet.service';
import { TransactionPinService } from './transaction-pin.service';
import { CodService } from './cod.service';
import { MilestoneEscrowService } from './milestone-escrow.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentMethod } from '@prisma/client';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly walletService: WalletService,
    private readonly pinService: TransactionPinService,
    private readonly codService: CodService,
    private readonly milestoneService: MilestoneEscrowService,
  ) {}

  // ─── Initiate Payment ─────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate a payment (MoMo, Orange Money, Card, Wallet, COD, USSD)' })
  @ApiResponse({ status: 201, description: 'Payment initiated successfully' })
  async initiatePayment(
    @CurrentUser() user: { id: string; countryCode: string },
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiatePayment(user.id, user.countryCode || 'CM', dto);
  }

  // ─── Transaction PIN ──────────────────────────────────────────────────────────

  @Post('pin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set transaction PIN (4-6 digits)' })
  async setPin(
    @CurrentUser('id') userId: string,
    @Body('pin') pin: string,
  ) {
    return this.pinService.setPin(userId, pin);
  }

  @Post('pin/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify transaction PIN before payment' })
  async verifyPin(
    @CurrentUser('id') userId: string,
    @Body('pin') pin: string,
  ) {
    return this.pinService.verifyPin(userId, pin);
  }

  // ─── Payment OTP (SMS) ────────────────────────────────────────────────────────

  @Post('otp/request')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request SMS OTP for payment confirmation' })
  async requestPaymentOtp(
    @CurrentUser('id') userId: string,
    @Body('amount') amount: number,
  ) {
    return this.pinService.requestPaymentOtp(userId, amount);
  }

  @Post('otp/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify payment OTP' })
  async verifyPaymentOtp(
    @CurrentUser('id') userId: string,
    @Body('otp') otp: string,
  ) {
    return this.pinService.verifyPaymentOtp(userId, otp);
  }

  // ─── COD QR Code ──────────────────────────────────────────────────────────────

  @Post('cod/qr/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate QR code for COD confirmation' })
  async generateCodQr(
    @CurrentUser('id') userId: string,
    @Param('bookingId') bookingId: string,
  ) {
    return this.codService.generateCodQr(bookingId);
  }

  @Post('cod/confirm/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Provider confirms COD via QR scan' })
  async confirmCod(
    @CurrentUser('id') providerId: string,
    @Param('bookingId') bookingId: string,
  ) {
    return this.codService.confirmCodPayment(bookingId, providerId);
  }

  // ─── Milestone Escrow ─────────────────────────────────────────────────────────

  @Post('escrow/milestones/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create milestone-based escrow for a booking' })
  async createMilestones(
    @Param('bookingId') bookingId: string,
    @Body('amount') amount: number,
  ) {
    return this.milestoneService.createMilestones(bookingId, amount);
  }

  @Post('escrow/milestones/:bookingId/release')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Release a milestone payment to provider' })
  async releaseMilestone(
    @CurrentUser('id') providerId: string,
    @Param('bookingId') bookingId: string,
    @Body('milestone') milestone: string,
  ) {
    return this.milestoneService.releaseMilestone(bookingId, milestone, providerId);
  }

  @Get('escrow/milestones/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get milestone status for a booking' })
  async getMilestoneStatus(@Param('bookingId') bookingId: string) {
    return this.milestoneService.getMilestoneStatus(bookingId);
  }

  // ─── Payment History ──────────────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment history for authenticated user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Payment list returned' })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.paymentsService.getPaymentHistory(userId, limit, offset);
  }

  // ─── Get Single Payment ───────────────────────────────────────────────────────

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment record' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPayment(
    @CurrentUser('id') userId: string,
    @Param('id') paymentId: string,
  ) {
    return this.paymentsService.getPaymentById(paymentId, userId);
  }

  // ─── Verify Payment ───────────────────────────────────────────────────────────

  @Get('verify/:transactionRef')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a payment by transaction reference' })
  @ApiResponse({ status: 200, description: 'Verification result' })
  async verifyPayment(@Param('transactionRef') transactionRef: string) {
    return this.paymentsService.verifyPayment(transactionRef);
  }

  // ─── Wallet ───────────────────────────────────────────────────────────────────

  @Get('wallet/balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wallet balance for authenticated user' })
  @ApiResponse({ status: 200, description: 'Wallet balance' })
  async getWalletBalance(@CurrentUser('id') userId: string) {
    return this.walletService.getBalance(userId);
  }

  @Get('wallet/transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wallet transaction history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Wallet transactions' })
  async getWalletTransactions(
    @CurrentUser('id') userId: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.walletService.getTransactions(userId, limit, offset);
  }

  // ─── Webhooks ─────────────────────────────────────────────────────────────────

  @Post('webhooks/momo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'MTN MoMo webhook callback' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async momoWebhook(@Body() payload: any) {
    return this.paymentsService.processWebhook(PaymentMethod.MOMO, 'CM', payload);
  }

  @Post('webhooks/orange')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Orange Money webhook callback' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async orangeWebhook(@Body() payload: any) {
    return this.paymentsService.processWebhook(PaymentMethod.ORANGE, 'CM', payload);
  }

  @Post('webhooks/flutterwave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Flutterwave webhook callback' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async flutterwaveWebhook(
    @Body() payload: any,
    @Headers('verif-hash') verifHash: string,
  ) {
    return this.paymentsService.processWebhook(
      PaymentMethod.CARD,
      'CM',
      payload,
      verifHash,
    );
  }
}
