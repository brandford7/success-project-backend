import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { createHmac } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../../users/users.service';

import {
  IPaymentGateway,
  PaymentInitializeRequest,
  PaymentInitializeResponse,
  PaymentVerifyResponse,
} from '../interfaces/payment-gateway.interface';
import { VipDuration } from '../../users/dto/grant-vip.dto';

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: string;
    reference: string;
    amount: number;
    metadata?: {
      userId?: string;
      duration?: number;
    };
  };
}

@Injectable()
export class PaystackGateway implements IPaymentGateway {
  private readonly logger = new Logger(PaystackGateway.name);
  private readonly paystackBaseUrl = 'https://api.paystack.co';
  private readonly paystackSecretKey: string;
  private readonly paystackWebhookSecret: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly usersService: UsersService,
  ) {
    this.paystackSecretKey = this.configService.getOrThrow<string>(
      'PAYSTACK_SECRET_KEY',
    );
    this.paystackWebhookSecret = this.configService.getOrThrow<string>(
      'PAYSTACK_WEBHOOK_SECRET',
    );
    this.frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
  }

  async initialize(
    request: PaymentInitializeRequest,
  ): Promise<PaymentInitializeResponse> {
    this.logger.log(`Initializing Paystack payment for user ${request.userId}`);

    const user = await this.usersService.findById(request.userId);
    const amount = this.getPriceForDuration(request.duration);
    const timestamp = Date.now();
    const reference = `paystack_${timestamp}_${uuidv4().substring(0, 8)}`;

    const payload = {
      email:
        user.email || request.email || `${user.phoneNumber}@placeholder.com`,
      amount: amount,
      currency: request.currency || 'GHS',
      reference: reference,
      callback_url: `${this.frontendUrl}/vip/callback?gateway=paystack`,
      metadata: {
        userId: user.id,
        duration: Number(request.duration),
        gateway: 'paystack',
        custom_fields: [
          {
            display_name: 'User ID',
            variable_name: 'user_id',
            value: user.id,
          },
          {
            display_name: 'VIP Duration',
            variable_name: 'vip_duration',
            value: `${request.duration} days`,
          },
        ],
      },
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<PaystackInitializeResponse>(
          `${this.paystackBaseUrl}/transaction/initialize`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${this.paystackSecretKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Paystack payment initialized: ${reference}`);

      return {
        authorizationUrl: response.data.data.authorization_url,
        reference: response.data.data.reference,
        gateway: 'paystack',
      };
    } catch (error: any) {
      this.logger.error(
        'Paystack initialization error:',
        error.response?.data || error.message,
      );
      throw new BadRequestException(
        error.response?.data?.message ||
          'Failed to initialize Paystack payment',
      );
    }
  }

  async verify(
    userId: string,
    reference: string,
  ): Promise<PaymentVerifyResponse> {
    this.logger.log(`Verifying Paystack payment: ${reference}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get<PaystackVerifyResponse>(
          `${this.paystackBaseUrl}/transaction/verify/${reference}`,
          {
            headers: {
              Authorization: `Bearer ${this.paystackSecretKey}`,
            },
          },
        ),
      );

      const { data } = response.data;

      if (data.status !== 'success') {
        return {
          verified: false,
          message: 'Payment was not successful',
        };
      }

      if (data.metadata?.userId !== userId) {
        throw new BadRequestException(
          'Payment verification failed: User mismatch',
        );
      }

      const duration = Number(data.metadata?.duration) || VipDuration.ONE_MONTH;

      await this.usersService.grantVip(userId, { duration });

      return {
        verified: true,
        message: 'Payment verified and VIP access granted',
        amount: data.amount / 100,
        duration,
        reference,
      };
    } catch (error: any) {
      this.logger.error(
        'Paystack verification error:',
        error.response?.data || error.message,
      );
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to verify Paystack payment',
      );
    }
  }

  async handleWebhook(payload: any, signature?: string): Promise<void> {
    // Verify webhook signature
    if (this.paystackWebhookSecret && signature) {
      const hash = createHmac('sha512', this.paystackWebhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (hash !== signature) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const { event, data } = payload;

    if (event === 'charge.success') {
      await this.handleChargeSuccess(data);
    }
  }

  private async handleChargeSuccess(data: any): Promise<void> {
    const { metadata, status } = data;

    if (status !== 'success' || !metadata?.userId) {
      return;
    }

    const userId = metadata.userId;
    const duration = Number(metadata.duration) || VipDuration.ONE_MONTH;

    try {
      const user = await this.usersService.findById(userId);

      if (
        user.isVip &&
        user.vipExpiresAt &&
        new Date(user.vipExpiresAt) > new Date()
      ) {
        await this.usersService.extendVip(userId, { duration });
      } else {
        await this.usersService.grantVip(userId, { duration });
      }
    } catch (error: any) {
      this.logger.error(`Error processing webhook: ${error.message}`);
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
