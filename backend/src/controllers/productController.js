const db = require('../config/db');

// GET /api/products
exports.getAllProducts = async (req, res, next) => {
  try {
    const { search, category_id, stock_status } = req.query;
    let query = `
      SELECT 
        p.product_id,
        p.product_name,
        p.category_id,
        c.category_name,
        p.unit_price,
        p.stock_qty,
        p.created_at,
        COALESCE(SUM(oi.quantity), 0) AS total_sold
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN order_items oi ON p.product_id = oi.product_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND LOWER(p.product_name) LIKE $${params.length}`;
    }

    if (category_id) {
      params.push(parseInt(category_id, 10));
      query += ` AND p.category_id = $${params.length}`;
    }

    if (stock_status === 'out_of_stock') {
      query += ` AND p.stock_qty <= 0`;
    } else if (stock_status === 'low_stock') {
      query += ` AND p.stock_qty > 0 AND p.stock_qty <= 15`;
    } else if (stock_status === 'in_stock') {
      query += ` AND p.stock_qty > 15`;
    }

    query += `
      GROUP BY p.product_id, p.product_name, p.category_id, c.category_name, p.unit_price, p.stock_qty, p.created_at
      ORDER BY p.product_id DESC
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

// GET /api/products/:id
exports.getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT 
        p.product_id,
        p.product_name,
        p.category_id,
        c.category_name,
        p.unit_price,
        p.stock_qty,
        p.created_at
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.category_id
       WHERE p.product_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/products
exports.createProduct = async (req, res, next) => {
  try {
    const { product_name, category_id, unit_price, stock_qty } = req.body;

    if (!product_name || !product_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required'
      });
    }

    const price = parseFloat(unit_price);
    if (isNaN(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid unit price is required'
      });
    }

    const stock = parseInt(stock_qty, 10);
    const validStock = isNaN(stock) || stock < 0 ? 0 : stock;
    const catId = category_id ? parseInt(category_id, 10) : null;

    const result = await db.query(
      `INSERT INTO products (product_name, category_id, unit_price, stock_qty)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [product_name.trim(), catId, price, validStock]
    );

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/products/:id
exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { product_name, category_id, unit_price, stock_qty } = req.body;

    if (!product_name || !product_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product name cannot be empty'
      });
    }

    const price = parseFloat(unit_price);
    if (isNaN(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid unit price is required'
      });
    }

    const stock = parseInt(stock_qty, 10);
    const validStock = isNaN(stock) || stock < 0 ? 0 : stock;
    const catId = category_id ? parseInt(category_id, 10) : null;

    const result = await db.query(
      `UPDATE products
       SET product_name = $1, category_id = $2, unit_price = $3, stock_qty = $4
       WHERE product_id = $5
       RETURNING *`,
      [product_name.trim(), catId, price, validStock, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/products/:id (Admin only)
exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if product is in order_items
    const check = await db.query('SELECT COUNT(*) AS count FROM order_items WHERE product_id = $1', [id]);
    const count = parseInt(check.rows[0].count, 10);
    if (count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete product: it is included in ${count} existing order item(s).`
      });
    }

    const result = await db.query('DELETE FROM products WHERE product_id = $1 RETURNING product_id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully',
      data: { product_id: id }
    });
  } catch (err) {
    next(err);
  }
};
