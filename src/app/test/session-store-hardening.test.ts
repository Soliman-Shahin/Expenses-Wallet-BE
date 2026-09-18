import request from 'supertest';
import { configureExpressApp } from '../app';

describe('production session-store hardening', () => {
  it('does not require the legacy session secret or create an Express session', async () => {
    const previousSecret = process.env.SECRET_KEY;
    delete process.env.SECRET_KEY;

    try {
      const response = await request(configureExpressApp()).get('/health');

      expect(response.status).toBe(200);
      expect(response.headers['set-cookie'] ?? []).not.toEqual(
        expect.arrayContaining([expect.stringContaining('connect.sid=')])
      );
    } finally {
      if (previousSecret === undefined) delete process.env.SECRET_KEY;
      else process.env.SECRET_KEY = previousSecret;
    }
  });
});
