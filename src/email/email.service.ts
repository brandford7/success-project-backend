import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // For development: Use Ethereal (fake SMTP)
    // For production: Use real SMTP (Gmail, SendGrid, etc.)
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    const isDevelopment = this.configService.get('NODE_ENV') === 'development';

    if (isDevelopment) {
      // Create test account for development
      const testAccount = await nodemailer.createTestAccount();

      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      this.logger.log('📧 Using Ethereal email for development');
    } else {
      // Production: Use environment variables
      this.transporter = nodemailer.createTransport({
        host: this.configService.get('SMTP_HOST'),
        port: this.configService.get('SMTP_PORT'),
        secure: true,
        auth: {
          user: this.configService.get('SMTP_USER'),
          pass: this.configService.get('SMTP_PASS'),
        },
      });

      this.logger.log('Email service initialized');
    }
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/auth/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: this.configService.get('SMTP_FROM') || 'noreply@bettingtips.com',
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested a password reset for your Betting Tips account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);

      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.log(
          `📧 Preview URL: ${nodemailer.getTestMessageUrl(info)}`,
        );
      }

      this.logger.log(`✅ Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      throw error;
    }
  }
}
