import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import * as bcrypt from 'bcrypt';
import { RolesService } from '../role/role.service';

@Injectable()
export class AdminSeedService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Only seed in development or if explicitly enabled
    const shouldSeed = this.configService.get('SEED_ADMIN', 'false') === 'true';

    if (shouldSeed) {
      await this.seedAdmin();
    }
  }

  async seedAdmin(): Promise<void> {
    this.logger.log('Checking for admin user...');

    const adminEmail = this.configService.getOrThrow<string>('ADMIN_EMAIL');
    const adminPassword =
      this.configService.getOrThrow<string>('ADMIN_PASSWORD');

    try {
      // Check if admin already exists
      const existingAdmin = await this.usersService.findByEmail(adminEmail);

      if (existingAdmin) {
        this.logger.log(`Admin user already exists: ${adminEmail}`);
        return;
      }

      // Ensure roles exist
      await this.rolesService.ensureDefaultRoles();

      // Get user and admin roles
      const userRole = await this.rolesService.findByName('user');
      const adminRole = await this.rolesService.findByName('admin');

      if (!userRole || !adminRole) {
        this.logger.error('❌ Required roles not found. Run roles seed first.');
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      // Create admin user
      await this.usersService.create({
        email: adminEmail,
        phoneNumber: null,
        password: hashedPassword,
        roleNames: ['user', 'admin'],
      });

      this.logger.log('Admin user created successfully!');
      this.logger.log(`Email: ${adminEmail}`);
      this.logger.log(`Password: ${adminPassword}`);
      this.logger.log(' Please change the password after first login!');
    } catch (error: unknown) {
      // ✅ Proper error handling
      if (error instanceof Error) {
        this.logger.error('Failed to seed admin user:', error.message);
        this.logger.error(error.stack);
      } else {
        this.logger.error('Failed to seed admin user:', String(error));
      }
    }
  }
}
