import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { Messaging, getMessaging } from 'firebase-admin/messaging';
import logger from './logger.service';

class FirebaseAdminService {
  private app: App | null = null;
  private initializationAttempted = false;

  getMessaging(): Messaging | null {
    if (!this.initializationAttempted) {
      this.initialize();
    }

    return this.app ? getMessaging(this.app) : null;
  }

  private initialize(): void {
    this.initializationAttempted = true;

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      logger.warn(
        '[Firebase] Push delivery disabled because Firebase credentials are incomplete'
      );
      return;
    }

    try {
      this.app =
        getApps()[0] ||
        initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
          projectId,
        });
      logger.info('[Firebase] Admin SDK initialized for push delivery');
    } catch {
      this.app = null;
      logger.error(
        '[Firebase] Admin SDK initialization failed; push delivery is disabled'
      );
    }
  }
}

export const firebaseAdminService = new FirebaseAdminService();
