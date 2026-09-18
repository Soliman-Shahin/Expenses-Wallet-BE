import crypto from 'crypto';
import request from 'supertest';
import { configureExpressApp } from '../app';
import { GoogleOAuthExchange, User } from '../models';
import {
  GOOGLE_OAUTH_EXCHANGE_PURPOSE,
} from '../models/google-oauth-exchange.model';

const app = configureExpressApp();
const code = () => crypto.randomBytes(32).toString('hex');
const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

async function createExchange(value = code(), expiresAt = new Date(Date.now() + 60_000)) {
  const user = await User.create({
    email: `oauth-${value.slice(0, 8)}@example.test`,
    password: 'not-used',
  });
  await GoogleOAuthExchange.create({
    codeHash: hash(value),
    userId: user._id,
    purpose: GOOGLE_OAUTH_EXCHANGE_PURPOSE,
    expiresAt,
  });
  return value;
}

describe('browser Google OAuth opaque exchange', () => {
  it('exchanges a valid code once and never accepts it again', async () => {
    const value = await createExchange();
    const first = await request(app)
      .post('/v1/user/auth/google/exchange')
      .send({ code: value });
    expect(first.status).toBe(200);
    expect(first.body.data.tokens.accessToken).toBeTruthy();
    expect(first.body.data.tokens.refreshToken).toBeTruthy();

    const replay = await request(app)
      .post('/v1/user/auth/google/exchange')
      .send({ code: value });
    expect(replay.status).toBe(400);
    expect(replay.body.message).toBe('Invalid or expired exchange code');
  });

  it('rejects invalid, expired, and purpose-mismatched codes', async () => {
    expect(
      (await request(app).post('/v1/user/auth/google/exchange').send({ code: 'a'.repeat(64) })).status
    ).toBe(400);

    const expired = await createExchange(code(), new Date(Date.now() - 1));
    expect(
      (await request(app).post('/v1/user/auth/google/exchange').send({ code: expired })).status
    ).toBe(400);

    const wrongPurpose = await createExchange();
    await GoogleOAuthExchange.updateOne(
      { codeHash: hash(wrongPurpose) },
      { $set: { purpose: 'other-purpose' } }
    );
    expect(
      (await request(app).post('/v1/user/auth/google/exchange').send({ code: wrongPurpose })).status
    ).toBe(400);
  });

  it('allows exactly one winner under concurrent exchange attempts', async () => {
    const value = await createExchange();
    const responses = await Promise.all(
      [1, 2].map(() =>
        request(app).post('/v1/user/auth/google/exchange').send({ code: value })
      )
    );
    expect(responses.filter((response) => response.status === 200)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 400)).toHaveLength(1);
  });
});
