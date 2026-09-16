const db = require('../config/db');

// GET /api/customers
exports.getAllCustomers = async (req, res, next) => {
  try {
    const { search, region_id } = req.query;
    let query = `
      SELECT 
        c.customer_id,
        c.first_name,
        c.last_name,
        TRIM(c.first_name || ' ' || COALESCE(c.last_name, '')) AS full_name,
        c.email,
        c.phone,
        c.region_id,
        r.region_name,
        c.created_at,
        COUNT(o.order_id) AS total_orders,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total_amount ELSE 0 END), 0) AS total_spend
      FROM customers c
      LEFT JOIN regions r ON c.region_id = r.region_id
      LEFT JOIN orders o ON c.customer_id = o.customer_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (
        LOWER(c.first_name) LIKE $${params.length} OR 
        LOWER(COALESCE(c.last_name, '')) LIKE $${params.length} OR 
        LOWER(COALESCE(c.email, '')) LIKE $${params.length} OR 
        LOWER(COALESCE(c.phone, '')) LIKE $${params.length}
      )`;
    }

    if (region_id) {
      params.push(parseInt(region_id, 10));
      query += ` AND c.region_id = $${params.length}`;
    }

    query += `
      GROUP BY c.customer_id, c.first_name, c.last_name, c.email, c.phone, c.region_id, r.region_name, c.created_at
      ORDER BY c.customer_id DESC
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

// GET /api/customers/:id
exports.getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT 
        c.customer_id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.region_id,
        r.region_name,
        c.created_at
       FROM customers c
       LEFT JOIN regions r ON c.region_id = r.region_id
       WHERE c.customer_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Also fetch recent orders for this customer
    const ordersRes = await db.query(
      `SELECT order_id, order_date, status, total_amount
       FROM orders
       WHERE customer_id = $1
       ORDER BY order_date DESC LIMIT 10`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        orders: ordersRes.rows
      }
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/customers
exports.createCustomer = async (req, res, next) => {
  try {
    const { first_name, last_name, email, phone, region_id } = req.body;

    if (!first_name || !first_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer first name is required'
      });
    }

    // Verify email uniqueness if provided
    if (email && email.trim()) {
      const existing = await db.query('SELECT customer_id FROM customers WHERE LOWER(email) = LOWER($1)', [email.trim()]);
      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'A customer with this email address already exists'
        });
      }
    }

    const regId = region_id ? parseInt(region_id, 10) : null;

    const result = await db.query(
      `INSERT INTO customers (first_name, last_name, email, phone, region_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [first_name.trim(), last_name ? last_name.trim() : null, email ? email.trim() : null, phone ? phone.trim() : null, regId]
    );

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/customers/:id
exports.updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone, region_id } = req.body;

    if (!first_name || !first_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'First name cannot be empty'
      });
    }

    // Check customer exists
    const existing = await db.query('SELECT customer_id FROM customers WHERE customer_id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check duplicate email
    if (email && email.trim()) {
      const dup = await db.query(
        'SELECT customer_id FROM customers WHERE LOWER(email) = LOWER($1) AND customer_id != $2',
        [email.trim(), id]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Another customer with this email already exists'
        });
      }
    }

    const regId = region_id ? parseInt(region_id, 10) : null;

    const result = await db.query(
      `UPDATE customers
       SET first_name = $1, last_name = $2, email = $3, phone = $4, region_id = $5
       WHERE customer_id = $6
       RETURNING *`,
      [first_name.trim(), last_name ? last_name.trim() : null, email ? email.trim() : null, phone ? phone.trim() : null, regId, id]
    );

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/customers/:id (Admin only)
exports.deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if customer has associated orders
    const orderCheck = await db.query('SELECT COUNT(*) AS count FROM orders WHERE customer_id = $1', [id]);
    const orderCount = parseInt(orderCheck.rows[0].count, 10);
    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete customer: they have ${orderCount} associated order(s). Cancel or reassign orders first.`
      });
    }

    const result = await db.query('DELETE FROM customers WHERE customer_id = $1 RETURNING customer_id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer deleted successfully',
      data: { customer_id: id }
    });
  } catch (err) {
    next(err);
  }
};
