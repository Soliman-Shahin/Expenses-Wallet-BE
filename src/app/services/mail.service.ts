import logger from './logger.service';

export class MailService {
  static async sendPasswordReset(email: string, token: string): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    const destination = process.env.PASSWORD_RESET_URL;
    if (!apiKey || !from || !destination)
      throw new Error('Password reset mail is not configured');
    const url = new URL(destination);
    url.searchParams.set('token', token);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: 'Reset your Expenses Wallet password',
        html: `<p><strong>Expenses Wallet</strong></p><p>We received a request to reset your password.</p><p><a href="${url.toString()}">Reset your password</a></p><p>This link expires in 20 minutes. If you did not request this, you can safely ignore this email.</p>`,
        text: `Expenses Wallet\n\nReset your password: ${url.toString()}\n\nThis link expires in 20 minutes. If you did not request this, you can safely ignore this email.`,
      }),
    });
    if (!response.ok) {
      logger.error('Password reset email delivery failed');
      throw new Error('Password reset mail delivery failed');
    }
  }
}
