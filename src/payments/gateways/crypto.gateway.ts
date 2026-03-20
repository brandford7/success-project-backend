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
  private readonly minPaymentUsd = 5; // ✅ NOWPayments minimum

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
    const amountInPesewas = this.getPriceForDuration(request.duration);
    const amountInCedis = amountInPesewas / 100;

    this.logger.log(`Amount in cedis: GHS ${amountInCedis}`);

    // ✅ Get real-time exchange rate and convert
    const amountInUsd = await this.convertGhsToUsd(amountInCedis);

    this.logger.log(`Converted amount: $${amountInUsd} USD`);

    // ✅ Check minimum payment amount
    if (amountInUsd < this.minPaymentUsd) {
      throw new BadRequestException(
        `NOWPayments minimum is $${this.minPaymentUsd} USD. The daily plan (GHS ${amountInCedis}) converts to $${amountInUsd}, which is below the minimum. Please select a longer duration.`,
      );
    }

    const reference = `crypto_${Date.now()}_${uuidv4().substring(0, 8)}`;

    // Store metadata in order_description
    const metadata = {
      userId: user.id,
      duration: Number(request.duration),
      gateway: 'crypto',
    };

    const payload = {
      price_amount: amountInUsd,
      price_currency: 'usd',
      pay_currency: request.currency || 'usdttrc20', // USDT on Tron (lowest fees)
      order_id: reference,
      order_description: JSON.stringify(metadata),
      ipn_callback_url: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/payments/webhook/crypto`,
      success_url: `${this.frontendUrl}/vip/callback?gateway=crypto&reference=${reference}`,
      cancel_url: `${this.frontendUrl}/vip/pricing`,
    };

    this.logger.log(
      'NOWPayments request payload:',
      JSON.stringify(payload, null, 2),
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.nowpaymentsBaseUrl}/invoice`, payload, {
          headers: {
            'x-api-key': this.nowpaymentsApiKey,
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(
        'NOWPayments response:',
        JSON.stringify(response.data, null, 2),
      );

      return {
        authorizationUrl: response.data.invoice_url,
        reference: reference,
        gateway: 'crypto',
      };
    } catch (error: any) {
      this.logger.error('NOWPayments initialization error:');
      this.logger.error(
        JSON.stringify(error.response?.data || error.message, null, 2),
      );
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to initialize crypto payment',
      );
    }
  }

  // ✅ Convert GHS to USD using real exchange rate
  private async convertGhsToUsd(amountInCedis: number): Promise<number> {
    try {
      // Using exchangerate-api.com (free tier: 1,500 requests/month)
      const response = await firstValueFrom(
        this.httpService.get('https://api.exchangerate-api.com/v4/latest/GHS', {
          timeout: 5000,
        }),
      );

      const exchangeRate = response.data.rates.USD;
      const amountInUsd = amountInCedis * exchangeRate;

      this.logger.log(`Exchange rate: 1 GHS = ${exchangeRate} USD`);
      this.logger.log(`${amountInCedis} GHS = ${amountInUsd.toFixed(2)} USD`);

      // Round to 2 decimal places
      return Math.round(amountInUsd * 100) / 100;
    } catch (error) {
      this.logger.error('Failed to fetch exchange rate:', error);

      // ✅ Fallback to approximate rate if API fails
      // Current rate as of March 2024: ~1 GHS = 0.082 USD
      const fallbackRate = 0.082;
      const amountInUsd = amountInCedis * fallbackRate;

      this.logger.warn(
        `Using fallback exchange rate: 1 GHS = ${fallbackRate} USD`,
      );

      return Math.round(amountInUsd * 100) / 100;
    }
  }

  async verify(
    userId: string,
    reference: string,
  ): Promise<PaymentVerifyResponse> {
    this.logger.log(`Verifying crypto payment: ${reference}`);

    try {
      // Get invoice by order_id (reference)
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

      this.logger.log(
        'NOWPayments verification response:',
        JSON.stringify(invoice, null, 2),
      );

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

      // Verify user matches
      if (metadata.userId !== userId) {
        this.logger.error(
          `User mismatch. Expected: ${userId}, Got: ${metadata.userId}`,
        );
        throw new BadRequestException(
          'Payment verification failed: User mismatch',
        );
      }

      const duration = Number(metadata.duration) || VipDuration.ONE_MONTH;

      this.logger.log(`Granting VIP to user ${userId} for ${duration} days`);

      await this.usersService.grantVip(userId, { duration });

      this.logger.log(`VIP granted successfully to user ${userId}`);

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
    this.logger.log('Webhook payload:', JSON.stringify(payload, null, 2));

    // ✅ Verify IPN signature
    if (this.nowpaymentsIpnSecret && signature) {
      const isValid = this.verifyWebhookSignature(payload, signature);
      if (!isValid) {
        this.logger.error('Invalid IPN signature');
        throw new BadRequestException('Invalid IPN signature');
      }
    }

    const { payment_status, order_id, order_description } = payload;

    this.logger.log(`Webhook status: ${payment_status}`);

    if (payment_status === 'finished' || payment_status === 'partially_paid') {
      await this.handlePaymentSuccess(order_id, order_description);
    }
  }

  private async handlePaymentSuccess(
    orderId: string,
    orderDescription: string,
  ): Promise<void> {
    this.logger.log(`Processing successful payment: ${orderId}`);

    // Parse metadata from order_description
    let metadata;
    try {
      metadata = JSON.parse(orderDescription || '{}');
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

      this.logger.log(`Successfully processed payment for ${userId}`);
    } catch (error: any) {
      this.logger.error(`Error processing payment: ${error.message}`);
      throw error;
    }
  }

  // ✅ Verify webhook signature
  private verifyWebhookSignature(payload: any, signature: string): boolean {
    // NOWPayments uses HMAC SHA512
    const sortedPayload = this.sortObject(payload);
    const payloadString = JSON.stringify(sortedPayload);

    const expectedSignature = createHmac('sha512', this.nowpaymentsIpnSecret)
      .update(payloadString)
      .digest('hex');

    return signature === expectedSignature;
  }

  // ✅ Sort object keys for consistent signature
  private sortObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObject(item));
    }

    return Object.keys(obj)
      .sort()
      .reduce((result: any, key: string) => {
        result[key] = this.sortObject(obj[key]);
        return result;
      }, {});
  }

  private getPriceForDuration(duration: number): number {
    const priceMap: Record<number, number> = {
      [VipDuration.ONE_MONTH]: 50000, // GHS 500
      [VipDuration.THREE_MONTHS]: 100000, // GHS 1,000
      [VipDuration.SIX_MONTHS]: 200000, // GHS 2,000
      [VipDuration.ONE_YEAR]: 400000, // GHS 4,000
    };

    const price = priceMap[duration];
    if (!price) {
      throw new BadRequestException('Invalid VIP duration');
    }

    return price;
  }
}
