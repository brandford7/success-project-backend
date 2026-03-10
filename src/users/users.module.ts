import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { RolesModule } from '../role/role.module';
import { VipExpiryService } from './vip-expiry.service';
import { TipsModule } from '../tips/tips.module';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User]), RolesModule, TipsModule],
  controllers: [UsersController],
  providers: [UsersService, VipExpiryService],
  exports: [UsersService],
})
export class UsersModule {}
