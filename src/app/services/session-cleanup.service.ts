import { User } from '../models/user.model';

export interface SessionCleanupResult {
  matchedUsers: number;
  modifiedUsers: number;
}

export class SessionCleanupService {
  static async cleanupExpiredSessions(
    referenceTime: Date = new Date()
  ): Promise<SessionCleanupResult> {
    const cutoffSeconds = Math.floor(referenceTime.getTime() / 1000);
    const result = await User.updateMany(
      { 'sessions.expiresAt': { $lte: cutoffSeconds } },
      {
        $pull: {
          sessions: { expiresAt: { $lte: cutoffSeconds } },
        },
      }
    );

    return {
      matchedUsers: result.matchedCount,
      modifiedUsers: result.modifiedCount,
    };
  }
}
