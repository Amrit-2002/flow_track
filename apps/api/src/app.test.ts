import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './app';

describe('Express Application Skeleton', () => {
  it('GET /health returns 200 OK with server status and uptime', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'flowtrack-api');
    expect(response.body).toHaveProperty('uptimeSeconds');
    expect(typeof response.body.uptimeSeconds).toBe('number');
  });

  it('GET /api/v1 returns 200 OK with operational message', async () => {
    const response = await request(app).get('/api/v1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'FlowTrack REST API v1 is operational',
      version: '1.0.0',
    });
  });

  it('GET /undefined-route returns 404 with standard error envelope', async () => {
    const response = await request(app).get('/undefined-route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Cannot GET /undefined-route',
      },
    });
  });
});

