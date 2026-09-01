import cron, { type ScheduledTask } from 'node-cron';
import { temporaryPermissionService } from '../services/temporary-permission.service';
import logger from '../services/logger.service';

/**
 * Permission Expiry Job
 * 
 * Runs periodically to process expired temporary permissions.
 * Deactivates expired permissions and invalidates user caches.
 */
class PermissionExpiryJob {
  private task: ScheduledTask | null = null;

  /**
   * Start the cron job
   * Runs every hour by default
   */
  start(cronExpression: string = '0 * * * *'): void {
    if (this.task) {
      logger.warn('Permission expiry job is already running');
      return;
    }

    this.task = cron.schedule(cronExpression, async () => {
      await this.execute();
    });

    logger.info(`Permission expiry job started with schedule: ${cronExpression}`);
  }

  /**
   * Stop the cron job
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Permission expiry job stopped');
    }
  }

  /**
   * Execute the job manually
   */
  async execute(): Promise<void> {
    try {
      logger.info('Running permission expiry job...');

      const processedCount = await temporaryPermissionService.processExpiredPermissions();

      if (processedCount > 0) {
        logger.info(`Permission expiry job completed: ${processedCount} permissions processed`);
      } else {
        logger.debug('Permission expiry job completed: no expired permissions found');
      }
    } catch (error: any) {
      logger.error('Error in permission expiry job:', error.message);
    }
  }

  /**
   * Get job status
   */
  isRunning(): boolean {
    return this.task !== null;
  }
}

export const permissionExpiryJob = new PermissionExpiryJob();
