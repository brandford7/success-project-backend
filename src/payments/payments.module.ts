import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { UsersModule } from '../users/users.module';
import { CryptoGateway } from './gateways/crypto.gateway';
import { PaystackGateway } from './gateways/paystack.gateway';
import { KoraGateway } from './gateways/kora.gateway';

@Module({
  imports: [ConfigModule, UsersModule, HttpModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaystackGateway, KoraGateway, CryptoGateway],
})
export class PaymentsModule {}
