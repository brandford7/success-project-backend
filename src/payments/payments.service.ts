import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { createHmac } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { VipDuration } from '../users/dto/grant-vip.dto';

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
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    currency: string;
    customer: {
      id: number;
      email: string;
    };
    metadata: {
      userId: string;
      duration: number;
    };
  };
}

interface WebhookEvent {
  event: string;
  data: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    customer: {
      email: string;
    };
    metadata?: {
      userId: string;
      duration: number;
    };
  };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly paystackSecretKey: string;
  private readonly paystackWebhookSecret: string;
  private readonly paystackBaseUrl = 'https://api.paystack.co';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly usersService: UsersService,
  ) {
    this.paystackSecretKey = this.configService.get<string>(
      'PAYSTACK_SECRET_KEY',
    ) as string;
    this.paystackWebhookSecret =
      this.configService.get<string>('PAYSTACK_WEBHOOK_SECRET') || '';

    if (!this.paystackSecretKey) {
      this.logger.warn('PAYSTACK_SECRET_KEY not configured');
    }
  }

  private getPriceForDuration(duration: number): number {
    const priceMap: Record<number, number> = {
      [VipDuration.ONE_MONTH]: 5000, // ₵50 = 5000 pesewas
      [VipDuration.THREE_MONTHS]: 10000, // ₵100
      [VipDuration.SIX_MONTHS]: 20000, // ₵200
      [VipDuration.ONE_YEAR]: 40000, // ₵400
    };

    const price = priceMap[duration];
    if (!price) {
      throw new BadRequestException('Invalid VIP duration');
    }

    return price;
  }

  async initializePayment(userId: string, duration: number) {
    this.logger.log(
      `Initializing payment for user ${userId}, duration: ${duration}`,
    );

    const user = await this.usersService.findById(userId);
    const amount = this.getPriceForDuration(duration);
    const reference = `vip_${uuidv4()}`;

    const payload = {
      email: user.email || `${user.phoneNumber}@placeholder.com`,
      amount: amount,
      currency: 'GHS', // Ghana Cedis (change to NGN for Nigeria)
      reference: reference,
      callback_url: `${this.configService.get('FRONTEND_URL')}/vip/callback`,
      metadata: {
        userId: user.id,
        duration: duration,
        custom_fields: [
          {
            display_name: 'User ID',
            variable_name: 'user_id',
            value: user.id,
          },
          {
            display_name: 'VIP Duration',
            variable_name: 'vip_duration',
            value: `${duration} days`,
          },
        ],
      },
    };

    this.logger.debug('Paystack payload:', JSON.stringify(payload));

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

      this.logger.log(`Payment initialized: ${reference}`);

      return {
        authorizationUrl: response.data.data.authorization_url,
        reference: response.data.data.reference,
      };
    } catch (error: any) {
      this.logger.error(
        'Paystack initialization error:',
        error.response?.data || error.message,
      );
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to initialize payment',
      );
    }
  }

  async verifyPayment(userId: string, reference: string) {
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

      const { data } = response.data;

      this.logger.debug('Verification response:', JSON.stringify(data));

      if (data.status !== 'success') {
        this.logger.warn(`Payment not successful: ${data.status}`);
        return {
          verified: false,
          message: 'Payment was not successful',
        };
      }

      // Verify the user matches
      if (data.metadata?.userId !== userId) {
        this.logger.error(
          `User mismatch. Expected: ${userId}, Got: ${data.metadata?.userId}`,
        );
        throw new BadRequestException(
          'Payment verification failed: User mismatch',
        );
      }

      // Grant VIP access
      const duration = data.metadata?.duration || VipDuration.ONE_MONTH;

      this.logger.log(`Granting VIP to user ${userId} for ${duration} days`);

      await this.usersService.grantVip(userId, { duration });

      this.logger.log(`VIP granted successfully to user ${userId}`);

      return {
        verified: true,
        message: 'Payment verified and VIP access granted',
        amount: data.amount / 100, // Convert from kobo/pesewas to main currency
        duration,
      };
    } catch (error: any) {
      this.logger.error(
        'Payment verification error:',
        error.response?.data || error.message,
      );
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to verify payment',
      );
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    // In development, if no webhook secret is set, accept all webhooks
    if (
      this.configService.get('NODE_ENV') === 'development' &&
      !this.paystackWebhookSecret
    ) {
      this.logger.warn(
        'Webhook signature verification skipped (development mode)',
      );
      return true;
    }

    if (!this.paystackWebhookSecret) {
      this.logger.error('PAYSTACK_WEBHOOK_SECRET not configured');
      return false;
    }

    const hash = createHmac('sha512', this.paystackWebhookSecret)
      .update(payload)
      .digest('hex');

    const isValid = hash === signature;

    this.logger.debug(
      `Signature verification: ${isValid ? 'PASSED' : 'FAILED'}`,
    );

    return isValid;
  }

  async handleWebhookEvent(event: WebhookEvent): Promise<void> {
    this.logger.log(`Handling webhook event: ${event.event}`);

    try {
      switch (event.event) {
        case 'charge.success':
          await this.handleChargeSuccess(event.data);
          break;

        case 'charge.failed':
          await this.handleChargeFailed(event.data);
          break;

        case 'transfer.success':
          this.logger.log('Transfer success event received');
          break;

        case 'transfer.failed':
          this.logger.log('Transfer failed event received');
          break;

        default:
          this.logger.log(`Unhandled webhook event: ${event.event}`);
      }
    } catch (error: any) {
      this.logger.error(`Error handling webhook event: ${error.message}`);
      throw error;
    }
  }

  private async handleChargeSuccess(data: any): Promise<void> {
    this.logger.log(`Processing successful charge: ${data.reference}`);

    const { reference, metadata, status } = data;

    if (status !== 'success') {
      this.logger.warn(`Charge status is not success: ${status}`);
      return;
    }

    if (!metadata || !metadata.userId) {
      this.logger.error('Missing metadata or userId in webhook payload');
      return;
    }

    const { userId, duration } = metadata;

    try {
      // Check if user exists
      const user = await this.usersService.findById(userId);

      if (!user) {
        this.logger.error(`User not found: ${userId}`);
        return;
      }

      // Check if user already has VIP (to prevent duplicate grants)
      if (user.isVip && user.vipExpiresAt) {
        const expiryDate = new Date(user.vipExpiresAt);
        const now = new Date();

        // If VIP is still active and expires in the future, extend it
        if (expiryDate > now) {
          this.logger.log(
            `User ${userId} already has active VIP, extending...`,
          );
          await this.usersService.extendVip(userId, { duration });
        } else {
          // VIP expired, grant new
          this.logger.log(`User ${userId} VIP expired, granting new VIP`);
          await this.usersService.grantVip(userId, { duration });
        }
      } else {
        // No VIP, grant new
        this.logger.log(`Granting VIP to user ${userId}`);
        await this.usersService.grantVip(userId, { duration });
      }

      this.logger.log(`Successfully processed charge.success for ${userId}`);
    } catch (error: any) {
      this.logger.error(`Error processing charge.success: ${error.message}`);
      throw error;
    }
  }

  private handleChargeFailed(data: any): void {
    this.logger.warn(`Charge failed: ${data.reference}`);
    this.logger.debug('Failed charge data:', JSON.stringify(data));

    // You could send an email to the user here
    // or log this for analytics
  }
}
