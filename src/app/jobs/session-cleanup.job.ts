import cron, { type ScheduledTask } from 'node-cron';
import logger from '../services/logger.service';
import {
  SessionCleanupService,
  type SessionCleanupResult,
} from '../services/session-cleanup.service';

export const SESSION_CLEANUP_CRON = '30 2 * * *';

export class SessionCleanupJob {
  private task: ScheduledTask | null = null;
  private executing = false;

  start(): void {
    if (this.task) return;
    this.task = cron.schedule(SESSION_CLEANUP_CRON, () => {
      void this.execute();
    });
    logger.info(
      `[SessionCleanupJob] Scheduler started with schedule: ${SESSION_CLEANUP_CRON}`
    );
  }

  stop(): void {
    this.task?.stop();
    this.task = null;
  }

  async execute(
    referenceTime: Date = new Date()
  ): Promise<SessionCleanupResult> {
    if (this.executing) return { matchedUsers: 0, modifiedUsers: 0 };
    this.executing = true;
    try {
      const result =
        await SessionCleanupService.cleanupExpiredSessions(referenceTime);
      logger.info('[SessionCleanupJob] Cleanup completed', result);
      return result;
    } catch (error: any) {
      logger.error(
        '[SessionCleanupJob] Cleanup failed',
        error?.message || 'unknown error'
      );
      return { matchedUsers: 0, modifiedUsers: 0 };
    } finally {
      this.executing = false;
    }
  }

  isRunning(): boolean {
    return this.task !== null;
  }
}

export const sessionCleanupJob = new SessionCleanupJob();
