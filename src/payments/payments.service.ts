import { Injectable, BadRequestException, Logger } from '@nestjs/common';

import { KoraGateway } from './gateways/kora.gateway';
import { CryptoGateway } from './gateways/crypto.gateway';
import { PaymentGateway } from './enums/payment-gateway.enum';
import { PaystackGateway } from './gateways/paystack.gateway';
import { VipDuration } from '../users/dto/grant-vip.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly paystackGateway: PaystackGateway,
    private readonly koraGateway: KoraGateway,
    private readonly cryptoGateway: CryptoGateway,
  ) {}

  async initializePayment(
    userId: string,
    duration: VipDuration,
    gateway: PaymentGateway,
    options?: { email?: string; phoneNumber?: string; currency?: string },
  ) {
    this.logger.log(`Initializing ${gateway} payment for user ${userId}`);

    const gatewayInstance = this.getGatewayInstance(gateway);

    return gatewayInstance.initialize({
      userId,
      duration,
      ...options,
    });
  }

  async verifyPayment(
    userId: string,
    reference: string,
    gateway: PaymentGateway,
  ) {
    this.logger.log(`Verifying ${gateway} payment: ${reference}`);

    const gatewayInstance = this.getGatewayInstance(gateway);

    return gatewayInstance.verify(userId, reference);
  }

  async handleWebhook(
    gateway: PaymentGateway,
    payload: any,
    signature?: string,
  ) {
    this.logger.log(`Processing ${gateway} webhook`);

    const gatewayInstance = this.getGatewayInstance(gateway);

    return gatewayInstance.handleWebhook(payload, signature);
  }

  private getGatewayInstance(gateway: PaymentGateway) {
    switch (gateway) {
      case PaymentGateway.PAYSTACK:
        return this.paystackGateway;
      case PaymentGateway.KORA:
        return this.koraGateway;
      case PaymentGateway.CRYPTO:
        return this.cryptoGateway;
      default:
        throw new BadRequestException(
          `Unsupported payment gateway: ${gateway}`,
        );
    }
  }
}
