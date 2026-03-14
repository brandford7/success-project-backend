import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly sendGridApiKey: string;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly nodeEnv: string;

  constructor(private readonly configService: ConfigService) {
    this.sendGridApiKey = this.configService.get('SENDGRID_API_KEY', '');
    this.fromEmail = this.configService.get(
      'SENDGRID_FROM_EMAIL',
      'noreply@example.com',
    );
    this.fromName = this.configService.get(
      'SENDGRID_FROM_NAME',
      'Betting Tips',
    );
    this.nodeEnv = this.configService.get('NODE_ENV', 'development');

    // Initialize SendGrid
    if (this.sendGridApiKey) {
      sgMail.setApiKey(this.sendGridApiKey);
      this.logger.log('✅ SendGrid initialized');
    } else {
      this.logger.warn(
        '⚠️  SendGrid API key not found - emails will be logged only',
      );
    }
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/auth/reset-password?token=${resetToken}`;

    const subject = 'Reset Your Password';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hi there,</p>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request a password reset, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Betting Tips. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(to, subject, html);
  }

  async sendWelcomeEmail(to: string, name?: string): Promise<void> {
    const subject = 'Welcome to Betting Tips!';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Betting Tips! 🎉</h1>
            </div>
            <div class="content">
              <p>Hi ${name || 'there'},</p>
              <p>Thank you for joining Betting Tips! We're excited to have you on board.</p>
              <p>Get started by exploring our expert tips and predictions.</p>
              <p style="text-align: center;">
                <a href="${this.configService.get('FRONTEND_URL')}/tips" class="button">View Tips</a>
              </p>
              <p>Happy betting! 🍀</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(to, subject, html);
  }

  async sendVipUpgradeEmail(to: string, duration: number): Promise<void> {
    const subject = 'VIP Access Activated! 🌟';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .badge { background: #fbbf24; color: #78350f; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
            .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌟 VIP Access Activated! 🌟</h1>
            </div>
            <div class="content">
              <p>Congratulations!</p>
              <p>Your VIP subscription has been activated for <span class="badge">${duration} days</span></p>
              <p><strong>You now have access to:</strong></p>
              <ul>
                <li>Premium VIP betting tips</li>
                <li>Detailed match analysis</li>
                <li>Priority customer support</li>
                <li>Ad-free experience</li>
              </ul>
              <p style="text-align: center;">
                <a href="${this.configService.get('FRONTEND_URL')}/tips/vip" class="button">View VIP Tips</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(to, subject, html);
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    const msg = {
      to,
      from: {
        email: this.fromEmail,
        name: this.fromName,
      },
      subject,
      html,
    };

    try {
      if (this.sendGridApiKey) {
        // Production: Send via SendGrid
        await sgMail.send(msg);
        this.logger.log(`✅ Email sent to ${to}: ${subject}`);
      } else {
        // Development: Log email
        this.logger.log('📧 EMAIL (Development Mode):');
        this.logger.log(`To: ${to}`);
        this.logger.log(`Subject: ${subject}`);
        this.logger.log(`Body: ${html.substring(0, 200)}...`);
      }
    } catch (error: any) {
      this.logger.error(`❌ Failed to send email to ${to}:`, error.message);
      if (error.response) {
        this.logger.error(error.response.body);
      }
      throw error;
    }
  }
}
