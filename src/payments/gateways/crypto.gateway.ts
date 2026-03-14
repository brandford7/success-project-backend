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

@Injectable()
export class CryptoGateway implements IPaymentGateway {
  private readonly logger = new Logger(CryptoGateway.name);
  private readonly nowpaymentsBaseUrl = 'https://api.nowpayments.io/v1';
  private readonly nowpaymentsApiKey: string;
  private readonly nowpaymentsIpnSecret: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly usersService: UsersService,
  ) {
    this.nowpaymentsApiKey = this.configService.getOrThrow<string>(
      'NOWPAYMENTS_API_KEY',
    );
    this.nowpaymentsIpnSecret = this.configService.getOrThrow<string>(
      'NOWPAYMENTS_IPN_SECRET',
    );
    this.frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
  }

  async initialize(
    request: PaymentInitializeRequest,
  ): Promise<PaymentInitializeResponse> {
    this.logger.log(`Initializing crypto payment for user ${request.userId}`);

    const user = await this.usersService.findById(request.userId);
    const amountInCedis = this.getPriceForDuration(request.duration) / 100;
    const reference = `crypto_${Date.now()}_${uuidv4().substring(0, 8)}`;

    // Convert GHS to USD (approximate rate: 1 USD = 12 GHS)
    const amountInUSD = (amountInCedis / 12).toFixed(2);

    // Store metadata in order_description (NOWPayments limitation)
    const metadata = {
      userId: user.id,
      duration: Number(request.duration),
      gateway: 'crypto',
    };

    const payload = {
      price_amount: Number(amountInUSD),
      price_currency: 'usd',
      pay_currency: 'usdttrc20', // Default to USDT on Tron (lowest fees)
      order_id: reference,
      order_description: JSON.stringify(metadata), // ✅ Store metadata in description
      ipn_callback_url: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/payments/webhook/crypto`,
      success_url: `${this.frontendUrl}/vip/success?gateway=crypto&reference=${reference}`,
      cancel_url: `${this.frontendUrl}/vip/pricing`,
      // Remove metadata field - it's not allowed
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.nowpaymentsBaseUrl}/invoice`, payload, {
          headers: {
            'x-api-key': this.nowpaymentsApiKey,
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`Crypto payment initialized: ${reference}`);

      return {
        authorizationUrl: response.data.invoice_url,
        reference: reference,
        gateway: 'crypto',
      };
    } catch (error: any) {
      this.logger.error('NOWPayments initialization error:');
      this.logger.error(error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to initialize crypto payment',
      );
    }
  }

  async verify(
    userId: string,
    reference: string,
  ): Promise<PaymentVerifyResponse> {
    this.logger.log(`Verifying crypto payment: ${reference}`);

    try {
      // NOWPayments doesn't have a direct endpoint to get by order_id
      // We need to use the payment status endpoint with the payment_id
      // So we'll use the invoice endpoint instead
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.nowpaymentsBaseUrl}/invoice/${reference}`,
          {
            headers: {
              'x-api-key': this.nowpaymentsApiKey,
            },
          },
        ),
      );

      const invoice = response.data;

      this.logger.log(`Invoice status: ${invoice.payment_status}`);

      if (
        invoice.payment_status !== 'finished' &&
        invoice.payment_status !== 'partially_paid'
      ) {
        return {
          verified: false,
          message: `Payment status: ${invoice.payment_status}`,
        };
      }

      // Parse metadata from order_description
      let metadata;
      try {
        metadata = JSON.parse(invoice.order_description || '{}');
      } catch (e) {
        this.logger.error('Failed to parse metadata from order_description');
        throw new BadRequestException('Invalid payment metadata');
      }

      if (metadata.userId !== userId) {
        this.logger.error(
          `User mismatch. Expected: ${userId}, Got: ${metadata.userId}`,
        );
        throw new BadRequestException(
          'Payment verification failed: User mismatch',
        );
      }

      const duration = Number(metadata.duration) || VipDuration.ONE_MONTH;

      await this.usersService.grantVip(userId, { duration });

      return {
        verified: true,
        message: 'Crypto payment verified and VIP access granted',
        amount: invoice.price_amount,
        duration,
        reference,
      };
    } catch (error: any) {
      this.logger.error(
        'Crypto verification error:',
        error.response?.data || error.message,
      );
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to verify crypto payment',
      );
    }
  }

  async handleWebhook(payload: any, signature?: string): Promise<void> {
    this.logger.log('Processing NOWPayments webhook');

    // Verify IPN signature
    if (this.nowpaymentsIpnSecret && signature) {
      const hmac = createHmac('sha512', this.nowpaymentsIpnSecret);
      hmac.update(JSON.stringify(payload));
      const calculatedSignature = hmac.digest('hex');

      if (calculatedSignature !== signature) {
        this.logger.error('Invalid IPN signature');
        throw new BadRequestException('Invalid IPN signature');
      }
    }

    const { payment_status, order_id, order_description } = payload;

    this.logger.log(
      `Webhook - Payment status: ${payment_status}, Order ID: ${order_id}`,
    );

    if (payment_status === 'finished' || payment_status === 'partially_paid') {
      try {
        // Parse metadata from order_description
        let metadata;
        try {
          metadata = JSON.parse(order_description || '{}');
        } catch (e) {
          this.logger.error('Failed to parse metadata from order_description');
          return;
        }

        const userId = metadata.userId;
        const duration = Number(metadata.duration) || VipDuration.ONE_MONTH;

        if (!userId) {
          this.logger.error('No userId found in webhook metadata');
          return;
        }

        const user = await this.usersService.findById(userId);

        if (
          user.isVip &&
          user.vipExpiresAt &&
          new Date(user.vipExpiresAt) > new Date()
        ) {
          this.logger.log(
            `User ${userId} already has active VIP, extending...`,
          );
          await this.usersService.extendVip(userId, { duration });
        } else {
          this.logger.log(`Granting VIP to user ${userId}`);
          await this.usersService.grantVip(userId, { duration });
        }

        this.logger.log(`VIP granted to user ${userId} via crypto payment`);
      } catch (error: any) {
        this.logger.error(`Error processing crypto webhook: ${error.message}`);
        throw error;
      }
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
