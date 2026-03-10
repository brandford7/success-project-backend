import {
  Controller,
  Post,
  Body,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';

import { VipDuration } from '../users/dto/grant-vip.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Public } from '../common/decorators/public.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initialize')
  @HttpCode(HttpStatus.OK)
  async initializePayment(
    @CurrentUser() user: User,
    @Body('duration') duration: VipDuration,
  ) {
    if (!user.email && !user.phoneNumber) {
      throw new BadRequestException('User must have email or phone number');
    }

    // Use email if available, otherwise use phone number
    const email = user.email || `${user.phoneNumber}@placeholder.com`;

    return this.paymentsService.initializePayment(user.id, email, duration);
  }

  @Get('verify')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(@Query('reference') reference: string) {
    if (!reference) {
      throw new BadRequestException('Reference is required');
    }

    return this.paymentsService.verifyPayment(reference);
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Body() payload: any,
  ) {
    if (!signature) {
      throw new BadRequestException('No signature provided');
    }

    return this.paymentsService.handleWebhook(signature, payload);
  }
}
