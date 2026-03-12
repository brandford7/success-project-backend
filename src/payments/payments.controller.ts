import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initialize')
  @HttpCode(HttpStatus.OK)
  async initializePayment(
    @CurrentUser() user: User,
    @Body('duration') duration: number,
  ) {
    return this.paymentsService.initializePayment(user.id, duration);
  }

  @Get('verify')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(
    @CurrentUser() user: User,
    @Query('reference') reference: string,
  ) {
    if (!reference) {
      throw new BadRequestException('Payment reference is required');
    }

    return this.paymentsService.verifyPayment(user.id, reference);
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    this.logger.log('Webhook received');
    this.logger.debug('Webhook body:', JSON.stringify(body));

    // Verify webhook signature
    const isValid = this.paymentsService.verifyWebhookSignature(
      JSON.stringify(body),
      signature,
    );

    if (!isValid) {
      this.logger.error('Invalid webhook signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.logger.log('Webhook signature verified');

    // Handle webhook event
    await this.paymentsService.handleWebhookEvent(body);

    return { status: 'success' };
  }
}
