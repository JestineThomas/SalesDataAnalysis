const db = require('../config/db');

// GET /api/orders
exports.getAllOrders = async (req, res, next) => {
  try {
    const { status, customer_id, start_date, end_date } = req.query;
    let query = `
      SELECT 
        o.order_id,
        o.customer_id,
        c.first_name,
        c.last_name,
        TRIM(c.first_name || ' ' || COALESCE(c.last_name, '')) AS customer_name,
        c.email AS customer_email,
        r.region_name,
        o.order_date,
        o.status,
        o.total_amount,
        COUNT(oi.order_item_id) AS total_items,
        COALESCE(SUM(oi.quantity), 0) AS total_quantity
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.customer_id
      LEFT JOIN regions r ON c.region_id = r.region_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status.toLowerCase());
      query += ` AND LOWER(o.status) = $${params.length}`;
    }

    if (customer_id) {
      params.push(parseInt(customer_id, 10));
      query += ` AND o.customer_id = $${params.length}`;
    }

    if (start_date) {
      params.push(start_date);
      query += ` AND o.order_date >= $${params.length}::timestamp`;
    }

    if (end_date) {
      params.push(`${end_date} 23:59:59`);
      query += ` AND o.order_date <= $${params.length}::timestamp`;
    }

    query += `
      GROUP BY o.order_id, o.customer_id, c.first_name, c.last_name, c.email, r.region_name, o.order_date, o.status, o.total_amount
      ORDER BY o.order_date DESC, o.order_id DESC
    `;

    const result = await db.query(query, params);
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/:id
exports.getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Header
    const orderRes = await db.query(
      `SELECT 
        o.order_id,
        o.customer_id,
        c.first_name,
        c.last_name,
        TRIM(c.first_name || ' ' || COALESCE(c.last_name, '')) AS customer_name,
        c.email AS customer_email,
        c.phone AS customer_phone,
        r.region_name,
        o.order_date,
        o.status,
        o.total_amount
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.customer_id
       LEFT JOIN regions r ON c.region_id = r.region_id
       WHERE o.order_id = $1`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Line items
    const itemsRes = await db.query(
      `SELECT 
        oi.order_item_id,
        oi.product_id,
        p.product_name,
        cat.category_name,
        oi.quantity,
        oi.unit_price,
        oi.subtotal
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       LEFT JOIN categories cat ON p.category_id = cat.category_id
       WHERE oi.order_id = $1
       ORDER BY oi.order_item_id ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...orderRes.rows[0],
        items: itemsRes.rows
      }
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/orders (Create order with nested line items + inventory deduction)
exports.createOrder = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { customer_id, status = 'completed', items } = req.body;

    if (!customer_id) {
      return res.status(400).json({
        success: false,
        message: 'Customer is required to place an order.'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one product item is required.'
      });
    }

    // Validate customer exists
    const custRes = await client.query('SELECT customer_id FROM customers WHERE customer_id = $1', [customer_id]);
    if (custRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Selected customer does not exist.'
      });
    }

    await client.query('BEGIN');

    let totalAmount = 0;
    const validatedItems = [];

    // Process and validate items
    for (const item of items) {
      const pId = parseInt(item.product_id, 10);
      const qty = parseInt(item.quantity, 10);

      if (isNaN(pId) || isNaN(qty) || qty <= 0) {
        throw new Error('Each order item must have a valid product and positive quantity.');
      }

      // Check product stock and price
      const prodRes = await client.query(
        'SELECT product_id, product_name, unit_price, stock_qty FROM products WHERE product_id = $1',
        [pId]
      );

      if (prodRes.rows.length === 0) {
        throw new Error(`Product ID #${pId} was not found.`);
      }

      const product = prodRes.rows[0];
      if (product.stock_qty < qty) {
        throw new Error(`Insufficient stock for "${product.product_name}". Available: ${product.stock_qty}, Requested: ${qty}.`);
      }

      const unitPrice = parseFloat(product.unit_price);
      const subtotal = Math.round(unitPrice * qty * 100) / 100;
      totalAmount += subtotal;

      validatedItems.push({
        product_id: pId,
        quantity: qty,
        unit_price: unitPrice,
        subtotal
      });

      // Decrement stock quantity
      await client.query(
        'UPDATE products SET stock_qty = stock_qty - $1 WHERE product_id = $2',
        [qty, pId]
      );
    }

    totalAmount = Math.round(totalAmount * 100) / 100;

    // Insert order header
    const orderRes = await client.query(
      `INSERT INTO orders (customer_id, order_date, status, total_amount)
       VALUES ($1, NOW(), $2, $3)
       RETURNING order_id, customer_id, order_date, status, total_amount`,
      [customer_id, status.toLowerCase(), totalAmount]
    );

    const newOrder = orderRes.rows[0];

    // Insert order items
    for (const item of validatedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [newOrder.order_id, item.product_id, item.quantity, item.unit_price, item.subtotal]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        ...newOrder,
        items: validatedItems
      }
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      console.error('Rollback error:', rbErr);
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to process order.'
    });
  } finally {
    client.release();
  }
};

// PUT /api/orders/:id (Update order status, restore stock on cancellation)
exports.updateOrderStatus = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'completed', 'cancelled'].includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Status must be one of: pending, completed, cancelled.'
      });
    }

    await client.query('BEGIN');

    const orderRes = await client.query('SELECT order_id, status FROM orders WHERE order_id = $1', [id]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentOrder = orderRes.rows[0];
    const newStatus = status.toLowerCase();

    // If changing to cancelled from an active status, restore stock
    if (newStatus === 'cancelled' && currentOrder.status !== 'cancelled') {
      const items = await client.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [id]);
      for (const item of items.rows) {
        await client.query(
          'UPDATE products SET stock_qty = stock_qty + $1 WHERE product_id = $2',
          [item.quantity, item.product_id]
        );
      }
    }

    // If changing from cancelled back to active (pending or completed), deduct stock if available
    if (currentOrder.status === 'cancelled' && (newStatus === 'completed' || newStatus === 'pending')) {
      const items = await client.query(
        'SELECT oi.product_id, oi.quantity, p.stock_qty, p.product_name FROM order_items oi JOIN products p ON oi.product_id = p.product_id WHERE oi.order_id = $1',
        [id]
      );
      for (const item of items.rows) {
        if (item.stock_qty < item.quantity) {
          throw new Error(`Cannot reactivate order: insufficient stock for product "${item.product_name}". Available: ${item.stock_qty}, Needed: ${item.quantity}`);
        }
        await client.query(
          'UPDATE products SET stock_qty = stock_qty - $1 WHERE product_id = $2',
          [item.quantity, item.product_id]
        );
      }
    }

    const updateRes = await client.query(
      'UPDATE orders SET status = $1 WHERE order_id = $2 RETURNING *',
      [newStatus, id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Order status updated to ${newStatus}`,
      data: updateRes.rows[0]
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {}
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to update order status.'
    });
  } finally {
    client.release();
  }
};
