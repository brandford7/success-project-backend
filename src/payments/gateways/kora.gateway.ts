import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../../users/users.service';

import {
  IPaymentGateway,
  PaymentInitializeRequest,
  PaymentInitializeResponse,
  PaymentVerifyResponse,
} from '../interfaces/payment-gateway.interface';
import { VipDuration } from '../../users/dto/grant-vip.dto';

@Injectable()
export class KoraGateway implements IPaymentGateway {
  private readonly logger = new Logger(KoraGateway.name);
  private readonly koraBaseUrl = 'https://api.korapay.com/merchant/api/v1';
  private readonly koraSecretKey: string;
  private readonly koraPublicKey: string;
  private readonly koraEncryptionKey: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly usersService: UsersService,
  ) {
    this.koraSecretKey =
      this.configService.getOrThrow<string>('KORA_SECRET_KEY');
    this.koraPublicKey =
      this.configService.getOrThrow<string>('KORA_PUBLIC_KEY');
    this.koraEncryptionKey = this.configService.getOrThrow<string>(
      'KORA_ENCRYPTION_KEY',
    );
    this.frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
  }

  async initialize(
    request: PaymentInitializeRequest,
  ): Promise<PaymentInitializeResponse> {
    this.logger.log(`Initializing Kora payment for user ${request.userId}`);

    const user = await this.usersService.findById(request.userId);
    const amount = this.getPriceForDuration(request.duration);
    const timestamp = Date.now();
    const reference = `kora_${timestamp}_${uuidv4().substring(0, 8)}`;

    // Kora API expects specific format

    const payload = {
      reference: reference,
      amount: amount / 100,
      currency: request.currency || 'GHS',
      redirect_url: `${this.frontendUrl}/vip/callback?gateway=kora`, // ✅ Remove reference
      notification_url: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/payments/webhook/kora`,
      merchant_bears_cost: true,
      customer: {
        name: user.email || user.phoneNumber || 'Customer',
        email: user.email || `${user.phoneNumber || 'user'}@placeholder.com`,
      },
      metadata: {
        userId: user.id,
        duration: Number(request.duration),
        gateway: 'kora',
      },
      narration: `VIP Subscription ${request.duration} days`,
    };

    this.logger.log('Kora request payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.koraBaseUrl}/charges/initialize`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${this.koraSecretKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log('Kora response:', JSON.stringify(response.data, null, 2));

      return {
        authorizationUrl: response.data.data.checkout_url,
        reference: reference,
        gateway: 'kora',
      };
    } catch (error: any) {
      this.logger.error('Kora initialization error:');
      this.logger.error(
        JSON.stringify(error.response?.data || error.message, null, 2),
      );

      // Log the full error details
      if (error.response?.data?.data) {
        this.logger.error(
          'Validation errors:',
          JSON.stringify(error.response.data.data, null, 2),
        );
      }

      throw new BadRequestException(
        error.response?.data?.message || 'Failed to initialize Kora payment',
      );
    }
  }

  async verify(
    userId: string,
    reference: string,
  ): Promise<PaymentVerifyResponse> {
    this.logger.log(`Verifying Kora payment: ${reference}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.koraBaseUrl}/charges/${reference}`, {
          headers: {
            Authorization: `Bearer ${this.koraSecretKey}`,
          },
        }),
      );

      const { data } = response.data;

      this.logger.log(
        'Kora verification response:',
        JSON.stringify(data, null, 2),
      );

      if (data.status !== 'success') {
        return {
          verified: false,
          message: `Payment status: ${data.status}`,
        };
      }

      // Verify user matches
      if (data.metadata?.userId !== userId) {
        this.logger.error(
          `User mismatch. Expected: ${userId}, Got: ${data.metadata?.userId}`,
        );
        throw new BadRequestException(
          'Payment verification failed: User mismatch',
        );
      }

      const duration = Number(data.metadata?.duration) || VipDuration.ONE_MONTH;

      this.logger.log(`Granting VIP to user ${userId} for ${duration} days`);

      await this.usersService.grantVip(userId, { duration });

      this.logger.log(`VIP granted successfully to user ${userId}`);

      return {
        verified: true,
        message: 'Payment verified and VIP access granted',
        amount: data.amount,
        duration,
        reference,
      };
    } catch (error: any) {
      this.logger.error(
        'Kora verification error:',
        error.response?.data || error.message,
      );
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to verify Kora payment',
      );
    }
  }

  async handleWebhook(payload: any): Promise<void> {
    this.logger.log('Processing Kora webhook');
    this.logger.log('Webhook payload:', JSON.stringify(payload, null, 2));

    // Kora webhook structure
    const { event, data } = payload;

    this.logger.log(`Kora webhook event: ${event}`);

    if (event === 'charge.success') {
      await this.handleChargeSuccess(data);
    }
  }

  private async handleChargeSuccess(data: any): Promise<void> {
    this.logger.log(`Processing successful Kora charge: ${data.reference}`);

    const { reference, metadata, status } = data;

    if (status !== 'success') {
      this.logger.warn(`Charge status is not success: ${status}`);
      return;
    }

    if (!metadata || !metadata.userId) {
      this.logger.error('Missing metadata or userId in webhook payload');
      return;
    }

    const userId = metadata.userId;
    const duration = Number(metadata.duration) || VipDuration.ONE_MONTH;

    this.logger.log(
      `Processing webhook for user ${userId}, duration: ${duration}`,
    );

    try {
      const user = await this.usersService.findById(userId);

      if (!user) {
        this.logger.error(`User not found: ${userId}`);
        return;
      }

      // Check if user already has VIP
      if (user.isVip && user.vipExpiresAt) {
        const expiryDate = new Date(user.vipExpiresAt);
        const now = new Date();

        if (expiryDate > now) {
          this.logger.log(
            `User ${userId} already has active VIP, extending...`,
          );
          await this.usersService.extendVip(userId, { duration });
        } else {
          this.logger.log(`User ${userId} VIP expired, granting new VIP`);
          await this.usersService.grantVip(userId, { duration });
        }
      } else {
        this.logger.log(`Granting VIP to user ${userId}`);
        await this.usersService.grantVip(userId, { duration });
      }

      this.logger.log(`Successfully processed charge.success for ${userId}`);
    } catch (error: any) {
      this.logger.error(`Error processing charge.success: ${error.message}`);
      throw error;
    }
  }

  private getPriceForDuration(duration: number): number {
    const priceMap: Record<number, number> = {
      [VipDuration.ONE_DAY]: 5000,
      [VipDuration.ONE_MONTH]: 50000,
      [VipDuration.THREE_MONTHS]: 100000,
      [VipDuration.SIX_MONTHS]: 200000,
      [VipDuration.ONE_YEAR]: 400000,
    };

    const price = priceMap[duration];
    if (!price) {
      throw new BadRequestException('Invalid VIP duration');
    }

    return price;
  }
}
