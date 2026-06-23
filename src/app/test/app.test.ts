import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { configureExpressApp } from '../app';

const app = configureExpressApp();

describe('App & Environment', () => {
  it('should have a configured express app', () => {
    expect(app).toBeDefined();
  });

  // Adding a dummy 404 test to verify basic routing handles unknowns
  it('should return 404 for unknown endpoints', async () => {
    const res = await request(app).get('/api/unknown-endpoint');
    expect(res.status).toBe(404);
  });
});
