import request from 'supertest';
import { configureExpressApp } from '../app';

const app = configureExpressApp();

describe('AUTH.3 public password recovery CSRF contract', () => {
  it('allows forgot-password to reach its controller without a CSRF token', async () => {
    const response = await request(app)
      .post('/v1/user/password/forgot')
      .send({ email: '' });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('allows reset-password to reach its controller without a CSRF token', async () => {
    const response = await request(app)
      .post('/v1/user/password/reset')
      .send({ token: '', password: '' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('PASSWORD_RESET_INVALID');
  });

  it('keeps an unrelated state-changing route CSRF-protected', async () => {
    const response = await request(app)
      .post('/v1/categories/create')
      .send({ title: 'Test' });
    expect(response.status).toBe(403);
  });

  it('allows native biometric sign-in to reach validation without CSRF', async () => {
    const response = await request(app)
      .post('/v1/user/biometric/signin')
      .send({ deviceId: '', credential: '' });
    expect(response.status).toBe(400);
  });
});
