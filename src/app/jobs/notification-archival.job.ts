import cron, { type ScheduledTask } from 'node-cron';
import logger from '../services/logger.service';
import { NotificationArchivalService } from '../services/notification-archival.service';
import { NotificationRetentionService } from '../services/notification-retention.service';

export const NOTIFICATION_ARCHIVAL_CRON = '0 2 * * *';

export class NotificationArchivalJob {
  private task: ScheduledTask | null = null;
  private executing = false;

  start(): void {
    if (this.task) return;
    this.task = cron.schedule(
      NOTIFICATION_ARCHIVAL_CRON,
      () => void this.execute()
    );
    logger.info(
      `[NotificationArchivalJob] Scheduler started with schedule: ${NOTIFICATION_ARCHIVAL_CRON}`
    );
  }

  stop(): void {
    this.task?.stop();
    this.task = null;
  }

  async execute(referenceTime: Date = new Date()): Promise<number> {
    if (this.executing) return 0;
    this.executing = true;
    try {
      await NotificationArchivalService.archiveEligible(referenceTime);
      const result = await NotificationRetentionService.deleteExpired(referenceTime);
      return result.deletedUserNotifications;
    } catch (error: any) {
      logger.error(
        '[NotificationArchivalJob] Execution failed',
        error?.message || 'unknown error'
      );
      return 0;
    } finally {
      this.executing = false;
    }
  }

  isRunning(): boolean {
    return this.task !== null;
  }
}

export const notificationArchivalJob = new NotificationArchivalJob();
