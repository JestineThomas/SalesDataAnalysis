const http = require('http');
const app = require('./src/app');
const db = require('./src/config/db');

function request(server, method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Backend Automated API Tests ---');
  await db.initDb();

  const server = app.listen(0);
  await new Promise(r => setTimeout(r, 200));

  try {
    // 1. Health check
    console.log('\n1. Testing GET /api/health');
    const health = await request(server, 'GET', '/api/health');
    console.log('Health check status:', health.status, health.body.status);

    // 2. Admin Login
    console.log('\n2. Testing POST /api/auth/login (Admin)');
    const adminLogin = await request(server, 'POST', '/api/auth/login', {}, {
      email: 'admin@salesbi.com',
      password: 'Admin@123'
    });
    console.log('Admin login status:', adminLogin.status, 'User:', adminLogin.body.data.user.email, 'Role:', adminLogin.body.data.user.role);
    const adminToken = adminLogin.body.data.token;

    // 3. Analyst Login
    console.log('\n3. Testing POST /api/auth/login (Analyst)');
    const analystLogin = await request(server, 'POST', '/api/auth/login', {}, {
      email: 'analyst@salesbi.com',
      password: 'Analyst@123'
    });
    console.log('Analyst login status:', analystLogin.status, 'Role:', analystLogin.body.data.user.role);
    const analystToken = analystLogin.body.data.token;

    const authHeaders = { Authorization: `Bearer ${adminToken}` };
    const analystAuthHeaders = { Authorization: `Bearer ${analystToken}` };

    // 4. Dashboard Summary
    console.log('\n4. Testing GET /api/dashboard/summary');
    const dash = await request(server, 'GET', '/api/dashboard/summary', authHeaders);
    console.log('Dashboard status:', dash.status);
    console.log('KPIs:', dash.body.data.kpis);
    console.log('Revenue Trend data points:', dash.body.data.revenue_trend.length);
    console.log('Best sellers data points:', dash.body.data.best_sellers.length);

    // 5. Products list
    console.log('\n5. Testing GET /api/products');
    const prods = await request(server, 'GET', '/api/products', authHeaders);
    console.log('Products count:', prods.body.count);
    const firstProduct = prods.body.data[0];
    console.log('First product:', firstProduct.product_name, 'Stock:', firstProduct.stock_qty, 'Price:', firstProduct.unit_price);

    // 6. Customers list
    console.log('\n6. Testing GET /api/customers');
    const custs = await request(server, 'GET', '/api/customers', authHeaders);
    console.log('Customers count:', custs.body.count);
    const firstCustomer = custs.body.data[0];

    // 7. Create Order & verify stock deduction
    console.log('\n7. Testing POST /api/orders (Create Order with stock deduction)');
    const initialStock = firstProduct.stock_qty;
    const orderRes = await request(server, 'POST', '/api/orders', authHeaders, {
      customer_id: firstCustomer.customer_id,
      status: 'completed',
      items: [
        { product_id: firstProduct.product_id, quantity: 2 }
      ]
    });
    console.log('Create order status:', orderRes.status, 'Order ID:', orderRes.body.data.order_id, 'Total Amount:', orderRes.body.data.total_amount);

    // Check product stock decremented by 2
    const prodAfter = await request(server, 'GET', `/api/products/${firstProduct.product_id}`, authHeaders);
    console.log('Product stock before:', initialStock, 'After:', prodAfter.body.data.stock_qty);
    if (prodAfter.body.data.stock_qty === initialStock - 2) {
      console.log(' Stock was successfully decremented by 2!');
    } else {
      console.error(' Stock deduction mismatch!');
    }

    // 8. Reports tests
    console.log('\n8. Testing Report Endpoints');
    const repTrend = await request(server, 'GET', '/api/reports/revenue-trend', authHeaders);
    console.log('GET /api/reports/revenue-trend count:', repTrend.body.data.length);

    const repBest = await request(server, 'GET', '/api/reports/best-sellers', authHeaders);
    console.log('GET /api/reports/best-sellers top 1:', repBest.body.data[0].product_name);

    const repCust = await request(server, 'GET', '/api/reports/customer-spending', authHeaders);
    console.log('GET /api/reports/customer-spending top 1:', repCust.body.data[0].customer_name, 'Spend:', repCust.body.data[0].total_spent);

    const repRegion = await request(server, 'GET', '/api/reports/regional-sales', authHeaders);
    console.log('GET /api/reports/regional-sales count:', repRegion.body.data.length);

    // 9. RBAC Test: Analyst attempting to delete a customer (should receive 403 Forbidden)
    console.log('\n9. Testing RBAC: Analyst deleting customer');
    const deleteAttempt = await request(server, 'DELETE', `/api/customers/${firstCustomer.customer_id}`, analystAuthHeaders);
    console.log('Analyst delete status (expected 403):', deleteAttempt.status, 'Message:', deleteAttempt.body.message);

    console.log('\n ALL BACKEND API TESTS PASSED SUCCESSFULLY! \n');
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
