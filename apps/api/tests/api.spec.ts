import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Restaurant POS API Integration Tests', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Acquire auth token via demo super-admin login
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@restaurant-pos.com' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.accessToken).toBeDefined();
    authToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('FR-AUTH-001: should reject unauthorized access to protected endpoints with RFC 9457 Problem Details', async () => {
    const res = await request(app.getHttpServer()).get('/api/menu/items');

    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('BR-IDEM-001: should reject mutating order creation if Idempotency-Key header is omitted', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        orderType: 'DINE_IN',
        items: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.detail).toContain('Idempotency-Key');
  });

  it('End-to-End POS Order, KDS, Split & Invoice Lifecycle', async () => {
    // 1. Fetch menu items
    const menuRes = await request(app.getHttpServer())
      .get('/api/menu/items')
      .set('Authorization', `Bearer ${authToken}`);

    expect(menuRes.status).toBe(200);
    expect(menuRes.body.length).toBeGreaterThan(0);
    const item = menuRes.body[0];

    // 2. Create Order with Idempotency-Key
    const createOrderRes = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Idempotency-Key', 'test-order-key-1001')
      .send({
        orderType: 'DINE_IN',
        tableId: 'tab-1',
        items: [
          {
            menuItemId: item.id,
            name: item.name,
            basePrice: item.basePrice,
            quantity: 2,
            taxRatePercent: item.taxRate,
            isTaxInclusive: item.taxInclusive,
          },
        ],
      });

    expect(createOrderRes.status).toBe(201);
    const order = createOrderRes.body;
    expect(order.id).toBeDefined();
    expect(order.calculation.finalTotal).toBeDefined();

    // 3. Send to Kitchen
    const kdsRes = await request(app.getHttpServer())
      .post(`/api/orders/${order.id}/send-to-kitchen`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Idempotency-Key', 'test-kot-key-1001');

    expect(kdsRes.status).toBe(201);
    expect(kdsRes.body.kotNumber).toContain('KOT-');

    // 4. Preview Bill
    const billRes = await request(app.getHttpServer())
      .get(`/api/billing/order/${order.id}/preview`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(billRes.status).toBe(200);
    const totalToPay = billRes.body.finalTotal;

    // 5. Settle Split Payment (e.g. 50% Cash + 50% UPI)
    const half = (parseFloat(totalToPay) / 2).toFixed(2);
    const otherHalf = (parseFloat(totalToPay) - parseFloat(half)).toFixed(2);

    const settleRes = await request(app.getHttpServer())
      .post('/api/billing/settle')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Idempotency-Key', 'test-settle-key-1001')
      .send({
        orderId: order.id,
        payments: [
          { method: 'CASH', amount: half },
          { method: 'UPI', amount: otherHalf, referenceNumber: 'UPI-REF-9988' },
        ],
      });

    expect(settleRes.status).toBe(201);
    expect(settleRes.body.invoiceNumber).toMatch(/^INV-\d{4}-BLR01-\d{5}$/);
    expect(settleRes.body.totalAmount).toBe(totalToPay);
  });
});
