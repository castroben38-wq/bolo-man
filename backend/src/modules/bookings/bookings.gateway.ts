import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { UseGuards, Logger, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BookingStatus } from '@prisma/client';

interface BookingStatusPayload {
  bookingId: string;
  status: BookingStatus;
  updatedBy: string;
  timestamp: string;
  cancelReason?: string;
}

/**
 * BookingsGateway – real-time booking status updates via Socket.IO.
 *
 * Clients join per-booking rooms: `booking:{bookingId}`
 * Clients join per-user rooms:    `user:{userId}`
 *
 * Events emitted:
 *   booking:status_updated  – broadcast to all participants when status changes
 *   booking:error           – sent to requester on invalid action
 */
@WebSocketGateway({
  namespace: 'bookings',
  cors: {
    origin: '*', // Tighten in production
    credentials: true,
  },
})
@Injectable()
export class BookingsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(BookingsGateway.name);

  // userId → Set of socketIds (for multi-device awareness)
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  afterInit(server: Server) {
    this.logger.log('BookingsGateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify<{ sub: string; role: string }>(
        token,
        { secret: this.configService.get('JWT_SECRET') },
      );

      // Attach decoded user to socket data for later use
      client.data.userId = payload.sub;
      client.data.role = payload.role;

      // Join per-user room so we can push notifications directly
      await client.join(`user:${payload.sub}`);

      // Track connection
      if (!this.userSockets.has(payload.sub)) {
        this.userSockets.set(payload.sub, new Set());
      }
      this.userSockets.get(payload.sub)!.add(client.id);

      this.logger.log(
        `Client connected: ${client.id} | userId: ${payload.sub} | role: ${payload.role}`,
      );
    } catch (err) {
      this.logger.warn(`Auth failed for socket ${client.id}: ${err.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      this.userSockets.get(userId)?.delete(client.id);
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ---------------------------------------------------------------------------
  // Client → Server: join a booking room
  // ---------------------------------------------------------------------------

  @SubscribeMessage('booking:join')
  async handleJoinBooking(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bookingId: string },
  ) {
    if (!data?.bookingId) {
      client.emit('booking:error', { message: 'bookingId is required' });
      return;
    }

    await client.join(`booking:${data.bookingId}`);
    this.logger.log(
      `Socket ${client.id} (user ${client.data.userId}) joined room booking:${data.bookingId}`,
    );

    client.emit('booking:joined', { bookingId: data.bookingId });
  }

  // ---------------------------------------------------------------------------
  // Client → Server: leave a booking room
  // ---------------------------------------------------------------------------

  @SubscribeMessage('booking:leave')
  async handleLeaveBooking(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bookingId: string },
  ) {
    if (!data?.bookingId) return;

    await client.leave(`booking:${data.bookingId}`);
    this.logger.log(
      `Socket ${client.id} left room booking:${data.bookingId}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Server → Client: emit status update (called by BookingsService)
  // ---------------------------------------------------------------------------

  /**
   * Broadcast a status change to everyone in the booking room
   * and also push directly to the target user's room.
   */
  notifyBookingStatusChanged(payload: BookingStatusPayload) {
    // Broadcast to booking room participants (client + provider both join this room)
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit('booking:status_updated', payload);

    this.logger.log(
      `Emitted booking:status_updated for booking ${payload.bookingId} → ${payload.status}`,
    );
  }

  /**
   * Push a direct notification to a specific user (by userId) regardless of
   * whether they have joined the booking room (e.g., push-like alert).
   */
  notifyUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Return the count of connected sockets for a given user.
   */
  isUserOnline(userId: string): boolean {
    return (this.userSockets.get(userId)?.size ?? 0) > 0;
  }
}
