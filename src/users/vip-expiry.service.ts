import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersService } from './users.service';

@Injectable()
export class VipExpiryService {
  private readonly logger = new Logger(VipExpiryService.name);

  constructor(private readonly usersService: UsersService) {}

  // Run every day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleVipExpiry() {
    this.logger.log('🔍 Checking for expired VIP subscriptions...');

    try {
      await this.usersService.checkAndUpdateExpiredVips();
      this.logger.log('✅ VIP expiry check completed');
    } catch (error) {
      this.logger.error('❌ VIP expiry check failed:', error);
    }
  }

  // Run every hour (for testing or more frequent checks)
  @Cron(CronExpression.EVERY_HOUR)
  async handleVipExpiryHourly() {
    this.logger.debug('🔍 Hourly VIP expiry check...');

    try {
      await this.usersService.checkAndUpdateExpiredVips();
    } catch (error) {
      this.logger.error(' Hourly VIP expiry check failed:', error);
    }
  }

  // Manual trigger endpoint can use this
  async manualExpiryCheck() {
    this.logger.log('🔧 Manual VIP expiry check triggered...');
    await this.usersService.checkAndUpdateExpiredVips();
  }
}
