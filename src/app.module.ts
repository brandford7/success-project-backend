import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './role/role.module';
import { TipsModule } from './tips/tips.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentsModule } from './payments/payments.module';
import { EmailModule } from './email/email.module';
import { LeagueModule } from './league/league.module';
import { PickModule } from './pick/pick.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    // global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // scheduling for cron jobs
    ScheduleModule.forRoot(),

    // ✅ Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          // Short window: 10 requests per 10 seconds
          name: 'short',
          ttl: 10000, // 10 seconds in milliseconds
          limit: 10,
        },
        {
          // Medium window: 100 requests per minute
          name: 'medium',
          ttl: 60000, // 1 minute in milliseconds
          limit: 100,
        },
        {
          // Long window: 1000 requests per hour
          name: 'long',
          ttl: 3600000, // 1 hour in milliseconds
          limit: 1000,
        },
      ],
    }),

    // database connection
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        url: configService.get('DB_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    RolesModule, // Must be before AuthModule
    UsersModule,
    AuthModule,
    TipsModule,
    PaymentsModule,
    EmailModule,
    LeagueModule,
    PickModule,
  ],

  providers: [
    // ✅ Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // ✅ Global Rate Limiting
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // JWT Auth Guard (already global via AuthModule)
  ],
})
export class AppModule {}
