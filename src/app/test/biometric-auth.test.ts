import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, BiometricCredential } from '../models';
import userRoutes from '../routes/user.route';
import { BiometricCredentialService } from '../services/biometric-credential.service';

const app = express();
app.use(express.json());
app.use('/v1/user', userRoutes);
const password = 'Testing-Password-42!';

async function account(email = `bio-${Date.now()}@example.test`) {
  return User.create({ email, password: await bcrypt.hash(password, 4) });
}
async function access(user: any) { return user.generateAccessAuthToken(); }

describe('AUTH.5 biometric sign-in backend', () => {
  it('enrolls a 256-bit credential and persists only its hash', async () => {
    const user = await account();
    const response = await request(app).post('/v1/user/biometric/enroll').set('Authorization', `Bearer ${await access(user)}`).send({ deviceId: 'install-a', label: 'My phone', platform: 'android' });
    expect(response.status).toBe(201);
    const raw = response.body.data.credential;
    expect(raw).toHaveLength(64);
    const saved = await BiometricCredential.findOne({ userId: user._id }).select('+credentialHash');
    expect(saved?.credentialHash).toBe(crypto.createHash('sha256').update(raw).digest('hex'));
    expect((saved as any)?.credential).toBeUndefined();
  });

  it('rejects unauthenticated enrollment and supports multiple devices', async () => {
    expect((await request(app).post('/v1/user/biometric/enroll').send({ deviceId: 'x', label: 'x', platform: 'android' })).status).toBe(401);
    const user = await account(); const token = await access(user);
    await request(app).post('/v1/user/biometric/enroll').set('Authorization', `Bearer ${token}`).send({ deviceId: 'a', label: 'A', platform: 'android' });
    await request(app).post('/v1/user/biometric/enroll').set('Authorization', `Bearer ${token}`).send({ deviceId: 'b', label: 'B', platform: 'android' });
    expect(await BiometricCredential.countDocuments({ userId: user._id })).toBe(2);
  });

  it('re-enrollment atomically replaces the same device credential', async () => {
    const user = await account(); const token = await access(user);
    const first = await request(app).post('/v1/user/biometric/enroll').set('Authorization', `Bearer ${token}`).send({ deviceId: 'same', label: 'A', platform: 'android' });
    const second = await request(app).post('/v1/user/biometric/enroll').set('Authorization', `Bearer ${token}`).send({ deviceId: 'same', label: 'B', platform: 'android' });
    expect(await BiometricCredential.countDocuments({ userId: user._id, deviceId: 'same' })).toBe(1);
    expect((await request(app).post('/v1/user/biometric/signin').send({ deviceId: 'same', credential: first.body.data.credential })).status).toBe(401);
    expect((await request(app).post('/v1/user/biometric/signin').send({ deviceId: 'same', credential: second.body.data.credential })).status).toBe(200);
  });

  it('returns the normal auth envelope, updates lastUsedAt, and rejects generic failures', async () => {
    const user = await account(); const token = await access(user);
    const enrolled = await request(app).post('/v1/user/biometric/enroll').set('Authorization', `Bearer ${token}`).send({ deviceId: 'sign-in', label: 'Phone', platform: 'android' });
    const response = await request(app).post('/v1/user/biometric/signin').send({ deviceId: 'sign-in', credential: enrolled.body.data.credential });
    expect(response.status).toBe(200); expect(response.body.data.tokens.accessToken).toBeTruthy(); expect(response.body.data.tokens.refreshToken).toBeTruthy();
    const saved = await BiometricCredential.findOne({ userId: user._id, deviceId: 'sign-in' }); expect(saved?.lastUsedAt).toBeTruthy();
    const bad = await request(app).post('/v1/user/biometric/signin').send({ deviceId: 'unknown', credential: 'bad' });
    expect(bad.status).toBe(401); expect(bad.body.error.code).toBe('BIOMETRIC_AUTH_FAILED');
  });

  it('revokes the current credential and password reset revokes all credentials', async () => {
    const user = await account(); const token = await access(user);
    await BiometricCredentialService.enroll(user.id, 'a', 'A', 'android');
    await BiometricCredentialService.enroll(user.id, 'b', 'B', 'android');
    expect((await request(app).delete('/v1/user/biometric/current').set('Authorization', `Bearer ${token}`).send({ deviceId: 'a' })).status).toBe(200);
    expect((await BiometricCredentialService.revokeAllForUser(user.id, 'password_reset')).modifiedCount).toBe(1);
    expect(await BiometricCredential.countDocuments({ userId: user._id, revokedAt: { $exists: true } })).toBe(2);
  });
});
