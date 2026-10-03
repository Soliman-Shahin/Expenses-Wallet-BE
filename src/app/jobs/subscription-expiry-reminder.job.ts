import cron, { type ScheduledTask } from 'node-cron';
import logger from '../services/logger.service';
import { SubscriptionExpiryReminderService } from '../services/subscription-expiry-reminder.service';

export const SUBSCRIPTION_EXPIRY_REMINDER_CRON = '0 * * * *';

export class SubscriptionExpiryReminderJob {
  private task: ScheduledTask | null = null;
  private executing = false;

  start(): void {
    if (this.task) {
      logger.warn('[SubscriptionExpiryReminderJob] Scheduler is already running');
      return;
    }

    try {
      this.task = cron.schedule(SUBSCRIPTION_EXPIRY_REMINDER_CRON, () => {
        void this.execute();
      });
      logger.info(
        `[SubscriptionExpiryReminderJob] Scheduler started with schedule: ${SUBSCRIPTION_EXPIRY_REMINDER_CRON}`
      );
    } catch (error: any) {
      logger.error(
        '[SubscriptionExpiryReminderJob] Scheduler registration failed',
        error?.message || 'unknown error'
      );
      return;
    }

    // No persisted last-run state exists, so startup covers only the current window.
    void this.execute();
  }

  stop(): void {
    if (!this.task) return;

    this.task.stop();
    this.task = null;
    logger.info('[SubscriptionExpiryReminderJob] Scheduler stopped');
  }

  async execute(referenceTime: Date = new Date()): Promise<void> {
    if (this.executing) {
      logger.debug('[SubscriptionExpiryReminderJob] Overlapping execution skipped');
      return;
    }

    this.executing = true;
    try {
      await SubscriptionExpiryReminderService.processExpiringSubscriptions(
        referenceTime
      );
    } catch (error: any) {
      logger.error(
        '[SubscriptionExpiryReminderJob] Execution failed',
        error?.message || 'unknown error'
      );
    } finally {
      this.executing = false;
    }
  }

  isRunning(): boolean {
    return this.task !== null;
  }
}

export const subscriptionExpiryReminderJob = new SubscriptionExpiryReminderJob();
