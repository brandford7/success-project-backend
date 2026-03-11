import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { VipDuration } from '../users/dto/grant-vip.dto';
import { v4 as uuidv4 } from 'uuid';

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
    id: number;
    status: string;
    reference: string;
    amount: number;
    metadata: {
      userId: string;
      duration: string;
    };
  };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly paystackSecretKey: string;
  private readonly paystackBaseUrl = 'https://api.paystack.co';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly usersService: UsersService,
  ) {
    this.paystackSecretKey =
      this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';

    if (!this.paystackSecretKey || this.paystackSecretKey.length < 10) {
      this.logger.warn('⚠️ PAYSTACK_SECRET_KEY not configured properly!');
    } else {
      this.logger.log('✅ Paystack initialized');
    }
  }

  async initializePayment(
    userId: string,
    email: string,
    duration: VipDuration,
  ): Promise<{ authorizationUrl: string; reference: string }> {
    // Validate secret key
    if (!this.paystackSecretKey || !this.paystackSecretKey.startsWith('sk_')) {
      throw new BadRequestException('Paystack not configured properly');
    }

    // Calculate price
    const priceMap = {
      [VipDuration.ONE_DAY]: 500,
      [VipDuration.ONE_MONTH]: 5000,
      [VipDuration.THREE_MONTHS]: 10000,
      [VipDuration.SIX_MONTHS]: 20000,
      [VipDuration.ONE_YEAR]: 40000,
    };

    const amount = priceMap[duration];

    if (!amount) {
      throw new BadRequestException(`Invalid duration: ${duration}`);
    }

    const durationNames = {
      [VipDuration.ONE_DAY]: '1 Day',
      [VipDuration.ONE_MONTH]: '1 Month',
      [VipDuration.THREE_MONTHS]: '3 Months',
      [VipDuration.SIX_MONTHS]: '6 Months',
      [VipDuration.ONE_YEAR]: '1 Year',
    };

    // Generate completely unique reference using UUID
    const reference = `vip_${uuidv4()}`;

    this.logger.log(`Initializing payment - Reference: ${reference}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post<PaystackInitializeResponse>(
          `${this.paystackBaseUrl}/transaction/initialize`,
          {
            email,
            amount,
            reference,
            currency: 'GHS',
            callback_url: `${this.configService.get('FRONTEND_URL')}/vip/callback`,
            metadata: {
              userId,
              duration: duration.toString(),
              planName: `VIP Subscription - ${durationNames[duration]}`,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${this.paystackSecretKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const data = response.data;

      if (!data.status) {
        this.logger.error(`Paystack error: ${data.message}`);
        throw new BadRequestException(
          data.message || 'Payment initialization failed',
        );
      }

      this.logger.log(`✅ Payment initialized: ${reference}`);

      return {
        authorizationUrl: data.data.authorization_url,
        reference: data.data.reference,
      };
    } catch (error: any) {
      this.logger.error(
        'Payment initialization failed:',
        error.response?.data || error.message,
      );

      if (error.response?.status === 403) {
        throw new BadRequestException('Invalid Paystack API key');
      }

      throw new BadRequestException(
        error.response?.data?.message || 'Payment initialization failed',
      );
    }
  }

  async verifyPayment(reference: string): Promise<{
    verified: boolean;
    userId?: string;
    duration?: number;
  }> {
    this.logger.log(`Verifying payment: ${reference}`);

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

      const data = response.data;

      if (!data.status) {
        throw new BadRequestException('Payment verification failed');
      }

      const isSuccess = data.data.status === 'success';

      if (isSuccess) {
        const userId = data.data.metadata.userId;
        const duration = parseInt(data.data.metadata.duration);

        // Grant VIP access
        await this.usersService.grantVip(userId, { duration });

        this.logger.log(
          `✅ VIP granted to user ${userId} for ${duration} days`,
        );

        return {
          verified: true,
          userId,
          duration,
        };
      }

      return { verified: false };
    } catch (error: any) {
      this.logger.error(
        'Payment verification failed:',
        error.response?.data || error.message,
      );
      throw new BadRequestException('Payment verification failed');
    }
  }

  async handleWebhook(
    signature: string,
    payload: any,
  ): Promise<{ received: boolean }> {
    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', this.paystackSecretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (hash !== signature) {
      throw new BadRequestException('Invalid signature');
    }

    // Handle the event
    const event = payload.event;

    this.logger.log(`Webhook received: ${event}`);

    switch (event) {
      case 'charge.success':
        await this.handleSuccessfulPayment(payload.data);
        break;
      default:
        this.logger.log(`Unhandled event type ${event}`);
    }

    return { received: true };
  }

  private async handleSuccessfulPayment(data: any): Promise<void> {
    const userId = data.metadata?.userId;
    const duration = parseInt(data.metadata?.duration || '0');

    if (!userId || !duration) {
      this.logger.error('Missing metadata in payment');
      return;
    }

    // Grant VIP access
    await this.usersService.grantVip(userId, { duration });

    this.logger.log(
      `✅ VIP granted to user ${userId} for ${duration} days via webhook`,
    );
  }
}
