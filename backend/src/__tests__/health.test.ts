import { describe, it, expect } from 'vitest';
import request from 'supertest';

const BASE_URL = 'http://localhost:3001';

describe('Health Endpoint', () => {
  it('GET /health returns OK status', async () => {
    const res = await request(BASE_URL).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.checks).toBeDefined();
    expect(res.body.checks.database).toBe('OK');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /health includes memory and uptime', async () => {
    const res = await request(BASE_URL).get('/health');
    expect(res.body.checks.memoryMB).toBeDefined();
    expect(Number(res.body.checks.memoryMB)).toBeGreaterThan(0);
    expect(res.body.checks.uptimeHours).toBeDefined();
  });
});

describe('API Root', () => {
  it('GET /api returns welcome message and endpoint list', async () => {
    const res = await request(BASE_URL).get('/api');
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Vilches');
    expect(res.body.endpoints).toBeDefined();
    expect(res.body.endpoints.auth).toBeDefined();
    expect(res.body.endpoints.projects).toBeDefined();
    expect(res.body.endpoints.quotes).toBeDefined();
  });
});

describe('404 Handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(BASE_URL).get('/api/nonexistent-route');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
