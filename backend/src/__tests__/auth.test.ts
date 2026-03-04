import { describe, it, expect } from 'vitest';
import request from 'supertest';

const BASE_URL = 'http://localhost:3001';

describe('Authentication', () => {
  describe('POST /api/auth/login', () => {
    it('rejects login without credentials', async () => {
      const res = await request(BASE_URL)
        .post('/api/auth/login')
        .send({});
      expect(res.status).toBe(400);
    });

    it('rejects login with wrong password', async () => {
      const res = await request(BASE_URL)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrongpassword' });
      expect([401, 400]).toContain(res.status);
    });

    it('rejects login with invalid email format', async () => {
      const res = await request(BASE_URL)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'password123' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('rejects unauthenticated request', async () => {
      const res = await request(BASE_URL).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects invalid token', async () => {
      const res = await request(BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-here');
      expect(res.status).toBe(401);
    });
  });
});

describe('Protected Routes - Require Auth', () => {
  const protectedRoutes = [
    { method: 'get', path: '/api/contractors' },
    { method: 'get', path: '/api/projects' },
    { method: 'get', path: '/api/quotes' },
    { method: 'get', path: '/api/activity-logs' },
    { method: 'get', path: '/api/activity-logs/stats' },
    { method: 'get', path: '/api/analytics/summary' },
  ];

  protectedRoutes.forEach(({ method, path }) => {
    it(`${method.toUpperCase()} ${path} returns 401 without auth`, async () => {
      const res = await (request(BASE_URL) as any)[method](path);
      expect(res.status).toBe(401);
    });
  });
});

describe('Rate Limiting', () => {
  it('login endpoint has rate limiting headers', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'test' });
    // Rate limit headers should be present
    expect(
      res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit']
    ).toBeDefined();
  });
});
