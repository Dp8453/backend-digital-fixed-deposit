import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

class EmailService {
  isConfigured() {
    return (
      process.env.SMTP_USER &&
      process.env.SMTP_USER !== 'your_smtp_username' &&
      process.env.SMTP_PASS &&
      process.env.SMTP_PASS !== 'your_smtp_password'
    );
  }

  getTransporter() {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: Number(process.env.SMTP_PORT) || 2525,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // 1. OTP Verification Email
  async sendOtpEmail(email, otpCode, firstName) {
    logger.info(`✉️  [EMAIL SERVICE] OTP Dispatch to: ${email} | Code: ${otpCode}`);

    if (!this.isConfigured()) {
      logger.info(`ℹ️  [DEV MODE] OTP code [${otpCode}] for [${email}] logged above.`);
      return true;
    }

    try {
      const transporter = this.getTransporter();
      await transporter.sendMail({
        from: `"${process.env.FROM_NAME || 'Digital FD System'}" <${process.env.FROM_EMAIL || 'noreply@digitalfd.com'}>`,
        to: email,
        subject: 'Digital FD System - Email Verification OTP',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; background: #f4f6f8;">
            <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 30px;">
              <h2 style="color: #059669;">Welcome to Digital Fixed Deposit System</h2>
              <p>Hello ${firstName},</p>
              <p>Your One-Time Password (OTP) for email verification is:</p>
              <div style="text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #047857; background: #ecfdf5; padding: 12px 24px; border-radius: 6px;">
                  ${otpCode}
                </span>
              </div>
            </div>
          </div>
        `,
      });
      logger.info(`✅ OTP Email sent to ${email}`);
      return true;
    } catch (error) {
      logger.error(`❌ Email error: ${error.message}`);
      return false;
    }
  }

  // 2. FD Booking Confirmation Email
  async sendFdBookingEmail(email, firstName, fdNumber, principalAmount, maturityAmount, maturityDate) {
    logger.info(`✉️  [EMAIL SERVICE] FD Booking Confirmation for ${fdNumber} to ${email}`);

    if (!this.isConfigured()) {
      logger.info(`ℹ️  [DEV MODE] FD Booking Confirmation for [${fdNumber}] logged.`);
      return true;
    }

    try {
      const transporter = this.getTransporter();
      await transporter.sendMail({
        from: `"${process.env.FROM_NAME || 'Digital FD System'}" <${process.env.FROM_EMAIL || 'noreply@digitalfd.com'}>`,
        to: email,
        subject: `Fixed Deposit Advice - Account #${fdNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; background: #f4f6f8;">
            <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 30px;">
              <h2 style="color: #059669;">Fixed Deposit Booking Receipt</h2>
              <p>Dear ${firstName},</p>
              <p>Your Fixed Deposit <strong>#${fdNumber}</strong> has been booked successfully.</p>
              <ul>
                <li><strong>Principal Invested:</strong> ₹ ${principalAmount.toLocaleString('en-IN')}</li>
                <li><strong>Guaranteed Maturity Amount:</strong> ₹ ${maturityAmount.toLocaleString('en-IN')}</li>
                <li><strong>Maturity Date:</strong> ${new Date(maturityDate).toLocaleDateString('en-IN')}</li>
              </ul>
            </div>
          </div>
        `,
      });
      return true;
    } catch (error) {
      logger.error(`❌ FD Booking Email error: ${error.message}`);
      return false;
    }
  }

  // 3. FD Maturity Email
  async sendFdMaturityEmail(email, firstName, fdNumber, maturityAmount) {
    logger.info(`✉️  [EMAIL SERVICE] FD Maturity Alert for ${fdNumber} to ${email}`);

    if (!this.isConfigured()) {
      logger.info(`ℹ️  [DEV MODE] FD Maturity Email for [${fdNumber}] logged.`);
      return true;
    }

    try {
      const transporter = this.getTransporter();
      await transporter.sendMail({
        from: `"${process.env.FROM_NAME || 'Digital FD System'}" <${process.env.FROM_EMAIL || 'noreply@digitalfd.com'}>`,
        to: email,
        subject: `Fixed Deposit Matured - Account #${fdNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; background: #f4f6f8;">
            <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 30px;">
              <h2 style="color: #059669;">Fixed Deposit Maturity Advice</h2>
              <p>Dear ${firstName},</p>
              <p>Your Fixed Deposit <strong>#${fdNumber}</strong> has matured today.</p>
              <p>Maturity Payout Credited: <strong>₹ ${maturityAmount.toLocaleString('en-IN')}</strong></p>
            </div>
          </div>
        `,
      });
      return true;
    } catch (error) {
      logger.error(`❌ FD Maturity Email error: ${error.message}`);
      return false;
    }
  }

  // 4. Premature Withdrawal Email
  async sendFdWithdrawalEmail(email, firstName, fdNumber, netPayoutAmount, penaltyDeducted) {
    logger.info(`✉️  [EMAIL SERVICE] Premature Closure Advice for ${fdNumber} to ${email}`);

    if (!this.isConfigured()) {
      logger.info(`ℹ️  [DEV MODE] Premature Withdrawal Email for [${fdNumber}] logged.`);
      return true;
    }

    try {
      const transporter = this.getTransporter();
      await transporter.sendMail({
        from: `"${process.env.FROM_NAME || 'Digital FD System'}" <${process.env.FROM_EMAIL || 'noreply@digitalfd.com'}>`,
        to: email,
        subject: `Premature Closure Advice - Account #${fdNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; background: #f4f6f8;">
            <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 30px;">
              <h2 style="color: #dc2626;">Premature Closure Statement</h2>
              <p>Dear ${firstName},</p>
              <p>Your Fixed Deposit <strong>#${fdNumber}</strong> has been closed prematurely.</p>
              <ul>
                <li><strong>1% Penalty Deducted:</strong> ₹ ${penaltyDeducted}</li>
                <li><strong>Net Settlement Payout:</strong> ₹ ${netPayoutAmount.toLocaleString('en-IN')}</li>
              </ul>
            </div>
          </div>
        `,
      });
      return true;
    } catch (error) {
      logger.error(`❌ Withdrawal Email error: ${error.message}`);
      return false;
    }
  }
}

export default new EmailService();
