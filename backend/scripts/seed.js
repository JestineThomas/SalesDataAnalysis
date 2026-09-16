const bcrypt = require('bcryptjs');
const db = require('../src/config/db');
const { runMigration } = require('./migrate');

async function seed() {
  console.log('=== Starting Database Seed ===');
  
  // Ensure schema is up to date first
  await runMigration();

  console.log('Seeding Regions...');
  const regions = [
    'North Zone',
    'South Zone',
    'East Zone',
    'West Zone',
    'Central Zone',
    'International Exports'
  ];
  const regionMap = {};
  for (const r of regions) {
    const res = await db.query(
      'INSERT INTO regions (region_name) VALUES ($1) ON CONFLICT (region_name) DO UPDATE SET region_name = EXCLUDED.region_name RETURNING region_id, region_name',
      [r]
    );
    regionMap[r] = res.rows[0].region_id;
  }

  console.log('Seeding Categories...');
  const categories = [
    'Cotton Apparel',
    'Silk & Ethnic Wear',
    'Denim & Casuals',
    'Linen & Blends',
    'Home & Furnishing',
    'Woolens & Knits'
  ];
  const categoryMap = {};
  for (const c of categories) {
    const res = await db.query(
      'INSERT INTO categories (category_name) VALUES ($1) ON CONFLICT (category_name) DO UPDATE SET category_name = EXCLUDED.category_name RETURNING category_id, category_name',
      [c]
    );
    categoryMap[c] = res.rows[0].category_id;
  }

  console.log('Seeding Users...');
  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('Admin@123', salt);
  const analystHash = await bcrypt.hash('Analyst@123', salt);

  await db.query(
    `INSERT INTO users (full_name, email, password_hash, role) 
     VALUES 
       ($1, $2, $3, $4),
       ($5, $6, $7, $8)
     ON CONFLICT (email) DO NOTHING`,
    [
      'Aarav Sharma (Admin)', 'admin@salesbi.com', adminHash, 'admin',
      'Priya Mehta (Analyst)', 'analyst@salesbi.com', analystHash, 'analyst'
    ]
  );

  console.log('Seeding Customers...');
  const sampleCustomers = [
    { first_name: 'Rajesh', last_name: 'Patel', email: 'rajesh.patel@textilehub.in', phone: '+91 98250 11223', region: 'West Zone' },
    { first_name: 'Ananya', last_name: 'Deshmukh', email: 'ananya.d@mumbaiapparel.com', phone: '+91 98190 22334', region: 'West Zone' },
    { first_name: 'Vikram', last_name: 'Singhania', email: 'vikram.s@delhifashions.in', phone: '+91 98110 33445', region: 'North Zone' },
    { first_name: 'Meera', last_name: 'Kapoor', email: 'meera.k@chandigarhfabrics.com', phone: '+91 98140 44556', region: 'North Zone' },
    { first_name: 'Karthik', last_name: 'Ramanathan', email: 'karthik.r@chennaitextiles.com', phone: '+91 98400 55667', region: 'South Zone' },
    { first_name: 'Lakshmi', last_name: 'Narayanan', email: 'lakshmi.n@bengaluruboutique.in', phone: '+91 98450 66778', region: 'South Zone' },
    { first_name: 'Subhash', last_name: 'Banerjee', email: 'subhash.b@kolkatasarees.co', phone: '+91 98300 77889', region: 'East Zone' },
    { first_name: 'Debjani', last_name: 'Roy', email: 'debjani.roy@silksind.org', phone: '+91 98310 88990', region: 'East Zone' },
    { first_name: 'Amit', last_name: 'Verma', email: 'amit.v@indoreloom.com', phone: '+91 98260 99001', region: 'Central Zone' },
    { first_name: 'Pooja', last_name: 'Chouhan', email: 'pooja.c@bhopalweavers.in', phone: '+91 98270 12345', region: 'Central Zone' },
    { first_name: 'Marcus', last_name: 'Vanderbilt', email: 'm.vanderbilt@eurofashion.de', phone: '+49 151 234567', region: 'International Exports' },
    { first_name: 'Sophia', last_name: 'Chen', email: 'sophia.chen@pacifictextile.sg', phone: '+65 9123 4567', region: 'International Exports' },
    { first_name: 'Rohan', last_name: 'Gupta', email: 'rohan.gupta@jaipurcrafts.in', phone: '+91 98290 76543', region: 'North Zone' },
    { first_name: 'Sneha', last_name: 'Reddy', email: 'sneha.reddy@hyderabadlooms.com', phone: '+91 98490 87654', region: 'South Zone' },
    { first_name: 'Sunil', last_name: 'Joshi', email: 'sunil.joshi@punesuits.in', phone: '+91 98220 98765', region: 'West Zone' }
  ];

  const customerMap = [];
  for (const cust of sampleCustomers) {
    const regId = regionMap[cust.region] || null;
    const res = await db.query(
      `INSERT INTO customers (first_name, last_name, email, phone, region_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET phone = EXCLUDED.phone RETURNING customer_id, first_name, last_name`,
      [cust.first_name, cust.last_name, cust.email, cust.phone, regId]
    );
    customerMap.push(res.rows[0]);
  }

  console.log('Seeding Products...');
  const sampleProducts = [
    // Cotton Apparel
    { name: 'Organic Supima Cotton Oxford Shirt', category: 'Cotton Apparel', price: 45.00, stock: 120 },
    { name: 'Pure Cotton Handloom Kurti Set', category: 'Cotton Apparel', price: 38.50, stock: 95 },
    { name: 'Premium Combed Cotton Chino Trousers', category: 'Cotton Apparel', price: 52.00, stock: 80 },
    { name: 'Egyptian Cotton Formal Dress Shirt', category: 'Cotton Apparel', price: 58.00, stock: 60 },

    // Silk & Ethnic Wear
    { name: 'Banarasi Pure Katan Silk Saree', category: 'Silk & Ethnic Wear', price: 185.00, stock: 45 },
    { name: 'Chanderi Handwoven Silk Dupatta', category: 'Silk & Ethnic Wear', price: 65.00, stock: 75 },
    { name: 'Raw Silk Festive Bandhgala Jacket', category: 'Silk & Ethnic Wear', price: 140.00, stock: 35 },
    { name: 'Mulberry Silk Embroidered Stole', category: 'Silk & Ethnic Wear', price: 42.00, stock: 110 },

    // Denim & Casuals
    { name: 'Selvedge Heavyweight Denim Jeans', category: 'Denim & Casuals', price: 78.00, stock: 85 },
    { name: 'Vintage Washed Denim Trucker Jacket', category: 'Denim & Casuals', price: 89.00, stock: 50 },
    { name: 'Stretch Denim Overshirt', category: 'Denim & Casuals', price: 62.00, stock: 65 },

    // Linen & Blends
    { name: 'Pure Belgian Linen Relaxed Trouser', category: 'Linen & Blends', price: 72.00, stock: 55 },
    { name: 'Breezy Linen Cuban Collar Shirt', category: 'Linen & Blends', price: 55.00, stock: 90 },
    { name: 'Tailored Linen-Cotton Summer Blazer', category: 'Linen & Blends', price: 125.00, stock: 40 },

    // Home & Furnishing
    { name: 'Damask Woven Cotton Table Runner Set', category: 'Home & Furnishing', price: 34.00, stock: 100 },
    { name: 'Jacquard Embroidered Velvet Cushion Pack', category: 'Home & Furnishing', price: 48.00, stock: 115 },
    { name: 'Pure Linen Bath & Spa Towel Set', category: 'Home & Furnishing', price: 42.00, stock: 70 },

    // Woolens & Knits
    { name: 'Merino Wool Ribbed Turtleneck Sweater', category: 'Woolens & Knits', price: 95.00, stock: 50 },
    { name: 'Himalayan Cashmere Blend Pashmina Shawl', category: 'Woolens & Knits', price: 160.00, stock: 30 },
    { name: 'Worsted Wool Tailored Overcoat', category: 'Woolens & Knits', price: 220.00, stock: 25 }
  ];

  const productMap = [];
  for (const prod of sampleProducts) {
    const catId = categoryMap[prod.category];
    const res = await db.query(
      `INSERT INTO products (product_name, category_id, unit_price, stock_qty)
       VALUES ($1, $2, $3, $4)
       RETURNING product_id, product_name, unit_price, stock_qty`,
      [prod.name, catId, prod.price, prod.stock]
    );
    productMap.push(res.rows[0]);
  }

  console.log('Seeding Orders & Order Items across recent months...');
  // Check if orders already seeded
  const existingOrders = await db.query('SELECT COUNT(*) as cnt FROM orders');
  if (parseInt(existingOrders.rows[0].cnt, 10) > 0) {
    console.log(`Found ${existingOrders.rows[0].cnt} existing orders. Skipping order seed.`);
  } else {
    // Generate orders spread across the last 6 months
    // Reference date: current or recent 2026 dates
    const now = new Date();
    const monthsBack = 6;

    const statuses = ['completed', 'completed', 'completed', 'completed', 'pending', 'cancelled'];

    let totalOrdersCreated = 0;

    for (let m = monthsBack; m >= 0; m--) {
      // Create 6-12 orders per month
      const ordersInMonth = 7 + (m % 4) * 2;
      for (let i = 0; i < ordersInMonth; i++) {
        // Random date in month m
        const date = new Date(now.getFullYear(), now.getMonth() - m, Math.min(28, (i * 3) + 1), 10 + (i % 8), (i * 7) % 60);
        const customer = customerMap[(i + m * 3) % customerMap.length];
        const status = statuses[(i + m) % statuses.length];

        // Pick 1 to 4 items
        const itemCount = 1 + ((i + m) % 3);
        const orderItems = [];
        let totalAmount = 0;

        for (let k = 0; k < itemCount; k++) {
          const product = productMap[(i * 2 + k * 3 + m) % productMap.length];
          const qty = 1 + ((k + i) % 4);
          const unitPrice = parseFloat(product.unit_price);
          const subtotal = Math.round(unitPrice * qty * 100) / 100;
          totalAmount += subtotal;
          orderItems.push({
            product_id: product.product_id,
            quantity: qty,
            unit_price: unitPrice,
            subtotal: subtotal
          });
        }

        totalAmount = Math.round(totalAmount * 100) / 100;

        // Insert order
        const ordRes = await db.query(
          `INSERT INTO orders (customer_id, order_date, status, total_amount)
           VALUES ($1, $2, $3, $4)
           RETURNING order_id`,
          [customer.customer_id, date.toISOString(), status, totalAmount]
        );
        const orderId = ordRes.rows[0].order_id;

        // Insert order items
        for (const item of orderItems) {
          await db.query(
            `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
             VALUES ($1, $2, $3, $4, $5)`,
            [orderId, item.product_id, item.quantity, item.unit_price, item.subtotal]
          );
        }

        totalOrdersCreated++;
      }
    }

    console.log(` Created ${totalOrdersCreated} orders with associated line items.`);
  }

  console.log('=== Database Seeding Completed Successfully! ===');
  console.log('Demo Credentials:');
  console.log('  Admin:   admin@salesbi.com   / Admin@123');
  console.log('  Analyst: analyst@salesbi.com / Analyst@123');
}

if (require.main === module) {
  seed().then(() => {
    console.log('Seed process finished.');
    process.exit(0);
  }).catch(err => {
    console.error('Seed process error:', err);
    process.exit(1);
  });
}

module.exports = { seed };
