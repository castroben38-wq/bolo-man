import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { BookingStatus, Role } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsEnum,
  Min,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingsGateway } from './bookings.gateway';

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
  [BookingStatus.REQUESTED]: [BookingStatus.ACCEPTED, BookingStatus.CANCELLED],
  [BookingStatus.ACCEPTED]: [BookingStatus.EN_ROUTE, BookingStatus.CANCELLED],
  [BookingStatus.EN_ROUTE]: [BookingStatus.ON_SITE],
  [BookingStatus.ON_SITE]: [BookingStatus.COMPLETED],
};

function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export class CreateBookingDto {
  @ApiProperty({ example: 'provider-uuid' })
  @IsUUID()
  providerId: string;

  @ApiProperty({ example: 'service-uuid' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({ example: '2026-06-10T10:00:00.000Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ example: 60, description: 'Duration in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiProperty({ example: 15000, description: 'Agreed price in XAF' })
  @IsInt()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 4.0583, description: 'Client location latitude' })
  @IsOptional()
  @IsNumber()
  locationLat?: number;

  @ApiPropertyOptional({ example: 9.7085, description: 'Client location longitude' })
  @IsOptional()
  @IsNumber()
  locationLng?: number;

  @ApiPropertyOptional({ example: 'Rue de la Paix, Douala' })
  @IsOptional()
  @IsString()
  locationAddress?: string;

  @ApiPropertyOptional({ example: 'Please bring extra sealing tape.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ example: '0 8 * * 1' })
  @IsOptional()
  @IsString()
  recurringRule?: string;
}

export class UpdateBookingStatusDto {
  @ApiProperty({ enum: BookingStatus })
  @IsEnum(BookingStatus)
  status: BookingStatus;

  @ApiPropertyOptional({ example: 'Client cancelled due to emergency' })
  @IsOptional()
  @IsString()
  cancelReason?: string;
}

export class ListBookingsQueryDto {
  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsString()
  toDate?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => BookingsGateway))
    private readonly bookingsGateway: BookingsGateway,
  ) {}

  // -------------------------------------------------------------------------
  // Create booking
  // -------------------------------------------------------------------------

  async createBooking(clientId: string, dto: CreateBookingDto) {
    // Validate service exists and is active
    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, isActive: true },
      include: {
        provider: { select: { userId: true, id: true } },
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found or inactive');
    }

    // Prevent client from booking their own service
    if (service.provider.userId === clientId) {
      throw new BadRequestException('You cannot book your own service');
    }

    // Check the provider user matches the provided providerId
    const providerUser = await this.prisma.user.findUnique({
      where: { id: dto.providerId },
      select: { id: true, role: true, isActive: true },
    });

    if (!providerUser || providerUser.role !== Role.PROVIDER) {
      throw new BadRequestException('Invalid provider');
    }

    if (!providerUser.isActive) {
      throw new BadRequestException('Provider account is not active');
    }

    const booking = await this.prisma.booking.create({
      data: {
        clientId,
        providerId: dto.providerId,
        serviceId: dto.serviceId,
        scheduledAt: new Date(dto.scheduledAt),
        durationMinutes: dto.durationMinutes,
        price: dto.price,
        locationLat: dto.locationLat,
        locationLng: dto.locationLng,
        locationAddress: dto.locationAddress,
        notes: dto.notes,
        isRecurring: dto.isRecurring ?? false,
        recurringRule: dto.recurringRule,
        status: BookingStatus.REQUESTED,
        countryCode: 'CM',
      },
      include: {
        service: { include: { category: true } },
        client: { select: { id: true, name: true, phone: true, avatar: true } },
        provider: { select: { id: true, name: true, phone: true, avatar: true } },
      },
    });

    return booking;
  }

  // -------------------------------------------------------------------------
  // List bookings (with role-aware filtering)
  // -------------------------------------------------------------------------

  async listBookings(
    userId: string,
    userRole: Role,
    query: ListBookingsQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Role-based scoping
    if (userRole === Role.CLIENT) {
      where.clientId = userId;
    } else if (userRole === Role.PROVIDER) {
      where.providerId = userId;
    }
    // ADMIN can see all bookings

    if (query.status) where.status = query.status;

    if (query.fromDate || query.toDate) {
      where.scheduledAt = {};
      if (query.fromDate) where.scheduledAt.gte = new Date(query.fromDate);
      if (query.toDate) where.scheduledAt.lte = new Date(query.toDate);
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'desc' },
        include: {
          service: { include: { category: true } },
          client: { select: { id: true, name: true, avatar: true } },
          provider: { select: { id: true, name: true, avatar: true } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // -------------------------------------------------------------------------
  // Get single booking
  // -------------------------------------------------------------------------

  async getBookingById(userId: string, userRole: Role, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: { include: { category: true } },
        client: { select: { id: true, name: true, phone: true, avatar: true } },
        provider: { select: { id: true, name: true, phone: true, avatar: true } },
        reviews: true,
        payments: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Authorization: only the client, provider, or admin can view the booking
    const isParticipant =
      booking.clientId === userId || booking.providerId === userId;
    if (userRole !== Role.ADMIN && !isParticipant) {
      throw new ForbiddenException('Access denied');
    }

    return booking;
  }

  // -------------------------------------------------------------------------
  // Update booking status (state machine)
  // -------------------------------------------------------------------------

  async updateBookingStatus(
    userId: string,
    userRole: Role,
    bookingId: string,
    dto: UpdateBookingStatusDto,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Authorization check
    const isClient = booking.clientId === userId;
    const isProvider = booking.providerId === userId;
    const isAdmin = userRole === Role.ADMIN;

    if (!isClient && !isProvider && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    // Role-based transition restrictions
    const targetStatus = dto.status;
    const currentStatus = booking.status;

    if (!canTransition(currentStatus, targetStatus)) {
      throw new BadRequestException(
        `Cannot transition booking from ${currentStatus} to ${targetStatus}`,
      );
    }

    // Only the provider can accept/dispatch; only the client can cancel a REQUESTED booking
    if (
      targetStatus === BookingStatus.ACCEPTED ||
      targetStatus === BookingStatus.EN_ROUTE ||
      targetStatus === BookingStatus.ON_SITE ||
      targetStatus === BookingStatus.COMPLETED
    ) {
      if (!isProvider && !isAdmin) {
        throw new ForbiddenException(
          'Only the provider can perform this status update',
        );
      }
    }

    if (
      targetStatus === BookingStatus.CANCELLED &&
      currentStatus === BookingStatus.REQUESTED
    ) {
      // Both client and provider may cancel a REQUESTED booking
      if (!isClient && !isProvider && !isAdmin) {
        throw new ForbiddenException('Access denied to cancel this booking');
      }
    }

    if (
      targetStatus === BookingStatus.CANCELLED &&
      currentStatus === BookingStatus.ACCEPTED
    ) {
      // Only provider or admin can cancel an ACCEPTED booking
      if (!isProvider && !isAdmin) {
        throw new ForbiddenException(
          'Only the provider can cancel an accepted booking',
        );
      }
    }

    if (
      targetStatus === BookingStatus.CANCELLED &&
      !dto.cancelReason
    ) {
      throw new BadRequestException('A cancel reason is required when cancelling');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: targetStatus,
        ...(dto.cancelReason && { cancelReason: dto.cancelReason }),
      },
      include: {
        service: { include: { category: true } },
        client: { select: { id: true, name: true, avatar: true } },
        provider: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Broadcast real-time status update via WebSocket
    this.bookingsGateway.notifyBookingStatusChanged({
      bookingId: updated.id,
      status: updated.status,
      updatedBy: userId,
      timestamp: new Date().toISOString(),
      ...(dto.cancelReason && { cancelReason: dto.cancelReason }),
    });

    // Push direct notification to both participants
    this.bookingsGateway.notifyUser(updated.clientId, 'booking:notification', {
      bookingId: updated.id,
      status: updated.status,
      message: `Your booking status changed to ${updated.status}`,
    });
    this.bookingsGateway.notifyUser(updated.providerId, 'booking:notification', {
      bookingId: updated.id,
      status: updated.status,
      message: `Booking status changed to ${updated.status}`,
    });

    return updated;
  }
}
