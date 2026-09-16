const db = require('../config/db');

// --- CATEGORIES ---

// GET /api/categories
exports.getAllCategories = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT 
        c.category_id,
        c.category_name,
        COUNT(p.product_id) AS product_count
      FROM categories c
      LEFT JOIN products p ON c.category_id = p.category_id
      GROUP BY c.category_id, c.category_name
      ORDER BY c.category_name ASC
    `);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/categories
exports.createCategory = async (req, res, next) => {
  try {
    const { category_name } = req.body;
    if (!category_name || !category_name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const result = await db.query(
      'INSERT INTO categories (category_name) VALUES ($1) RETURNING *',
      [category_name.trim()]
    );

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/categories/:id
exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category_name } = req.body;
    if (!category_name || !category_name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const result = await db.query(
      'UPDATE categories SET category_name = $1 WHERE category_id = $2 RETURNING *',
      [category_name.trim(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/categories/:id
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const check = await db.query('SELECT COUNT(*) AS count FROM products WHERE category_id = $1', [id]);
    if (parseInt(check.rows[0].count, 10) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category: products are assigned to it.'
      });
    }

    const result = await db.query('DELETE FROM categories WHERE category_id = $1 RETURNING category_id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

// --- REGIONS ---

// GET /api/regions
exports.getAllRegions = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT 
        r.region_id,
        r.region_name,
        COUNT(c.customer_id) AS customer_count
      FROM regions r
      LEFT JOIN customers c ON r.region_id = c.region_id
      GROUP BY r.region_id, r.region_name
      ORDER BY r.region_name ASC
    `);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/regions
exports.createRegion = async (req, res, next) => {
  try {
    const { region_name } = req.body;
    if (!region_name || !region_name.trim()) {
      return res.status(400).json({ success: false, message: 'Region name is required' });
    }

    const result = await db.query(
      'INSERT INTO regions (region_name) VALUES ($1) RETURNING *',
      [region_name.trim()]
    );

    res.status(201).json({
      success: true,
      message: 'Region created successfully',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/regions/:id
exports.updateRegion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { region_name } = req.body;
    if (!region_name || !region_name.trim()) {
      return res.status(400).json({ success: false, message: 'Region name is required' });
    }

    const result = await db.query(
      'UPDATE regions SET region_name = $1 WHERE region_id = $2 RETURNING *',
      [region_name.trim(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Region not found' });
    }

    res.json({
      success: true,
      message: 'Region updated successfully',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/regions/:id
exports.deleteRegion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const check = await db.query('SELECT COUNT(*) AS count FROM customers WHERE region_id = $1', [id]);
    if (parseInt(check.rows[0].count, 10) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete region: customers are assigned to it.'
      });
    }

    const result = await db.query('DELETE FROM regions WHERE region_id = $1 RETURNING region_id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Region not found' });
    }

    res.json({
      success: true,
      message: 'Region deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};
