import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailerService } from '@nestjs-modules/mailer';
import { Logger } from '@nestjs/common';

@Processor('email-queue')
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailerService: MailerService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.name} with ID ${job.id}`);

    switch (job.name) {
      case 'send-welcome-email':
        await this.handleWelcomeEmail(
          job.data as { email: string; fullName: string },
        );
        break;
      case 'send-otp':
        await this.handleOtpEmail(job.data as { email: string; otp: string });
        break;
      case 'send-reset-password':
        await this.handleResetPassword(
          job.data as { email: string; token: string },
        );
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleWelcomeEmail(data: { email: string; fullName: string }) {
    await this.mailerService.sendMail({
      to: data.email,
      subject: 'Welcome to our App! 🎉',
      template: './welcome', // References src/mail/templates/welcome.hbs
      context: {
        name: data.fullName,
      },
    });
  }

  private async handleOtpEmail(data: { email: string; otp: string }) {
    await this.mailerService.sendMail({
      to: data.email,
      subject: 'Your Login OTP',
      template: './otp',
      context: {
        otp: data.otp,
      },
    });
  }

  private async handleResetPassword(data: { email: string; token: string }) {
    // Implement logic
    await this.mailerService.sendMail({
      to: data.email,
      subject: 'Reset Password',
      template: './reset-password',
      context: {
        token: data.token,
      },
    });
  }
}
