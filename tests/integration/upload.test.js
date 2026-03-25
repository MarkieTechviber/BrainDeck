// tests/integration/upload.test.js
const request = require('supertest');
const app     = require('../../server/server');

describe('GET /api/health', () => {
  it('returns 200 with status OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.app).toBe('BrainDeck');
  });
});

describe('POST /api/upload', () => {
  it('rejects request with no file', async () => {
    const res = await request(app).post('/api/upload');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects unsupported file types', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('document', Buffer.from('fake content'), {
        filename: 'test.exe',
        contentType: 'application/octet-stream',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('accepts a valid text file', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('document', Buffer.from('Hello world content here'), {
        filename: 'test.txt',
        contentType: 'text/plain',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.extension).toBe('txt');
  });
});
