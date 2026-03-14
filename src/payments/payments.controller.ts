import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  UseGuards,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { PaymentGateway } from './enums/payment-gateway.enum';
import { Public } from '../common/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { VipDuration } from '../users/dto/grant-vip.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  // endpoint to get public keys
  @Get('config')
  @Public()
  getPaymentConfig() {
    return {
      paystack: {
        publicKey: this.configService.getOrThrow<string>('PAYSTACK_PUBLIC_KEY'),
      },
      kora: {
        publicKey: this.configService.getOrThrow<string>('KORA_PUBLIC_KEY'),
        encryptionKey: this.configService.getOrThrow<string>(
          'KORA_ENCRYPTION_KEY',
        ),
      },
      crypto: {
        publicKey: this.configService.getOrThrow<string>(
          'NOWPAYMENTS_PUBLIC_KEY',
        ),
      },
    };
  }
  @Post('initialize')
  async initializePayment(
    @CurrentUser() user: User,
    @Body()
    body: {
      duration: number;
      gateway: PaymentGateway;
      email?: string;
      phoneNumber?: string;
    },
  ) {
    if (!body.gateway) {
      throw new BadRequestException('Payment gateway is required');
    }

    if (!body.duration) {
      throw new BadRequestException('Duration is required');
    }

    console.log('=== INITIALIZE PAYMENT ===');
    console.log('User:', user.id);
    console.log('Duration:', body.duration);
    console.log('Gateway:', body.gateway);

    return this.paymentsService.initializePayment(
      user.id,
      body.duration as VipDuration,
      body.gateway,
      { email: body.email, phoneNumber: body.phoneNumber },
    );
  }

  @Get('verify')
  async verifyPayment(
    @CurrentUser() user: User,
    @Query('reference') reference: string,
    @Query('gateway') gateway: PaymentGateway,
  ) {
    if (!reference) {
      throw new BadRequestException('Payment reference is required');
    }

    if (!gateway) {
      throw new BadRequestException('Payment gateway is required');
    }

    console.log('=== VERIFY PAYMENT ===');
    console.log('User:', user.id);
    console.log('Reference:', reference);
    console.log('Gateway:', gateway);

    return this.paymentsService.verifyPayment(user.id, reference, gateway);
  }

  @Post('webhook/:gateway')
  @Public()
  async handleWebhook(
    @Param('gateway') gateway: string,
    @Body() payload: any,
    @Headers('x-paystack-signature') paystackSignature?: string,
    @Headers('x-korapay-signature') koraSignature?: string,
    @Headers('x-nowpayments-sig') cryptoSignature?: string,
  ) {
    console.log('=== WEBHOOK RECEIVED ===');
    console.log('Gateway:', gateway);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    if (!Object.values(PaymentGateway).includes(gateway as PaymentGateway)) {
      throw new BadRequestException(`Invalid payment gateway: ${gateway}`);
    }

    const signature = paystackSignature || koraSignature || cryptoSignature;

    await this.paymentsService.handleWebhook(
      gateway as PaymentGateway,
      payload,
      signature,
    );

    return { status: 'success' };
  }
}
