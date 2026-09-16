const db = require('../config/db');

// Helper to convert array of objects to CSV text
function jsonToCsv(items, fields) {
  if (!items || !items.length) return '';
  const header = fields.map(f => `"${f.label.replace(/"/g, '""')}"`).join(',');
  const rows = items.map(row => {
    return fields.map(f => {
      let val = row[f.key];
      if (val === null || val === undefined) val = '';
      if (typeof val === 'number') return val;
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',');
  });
  return [header, ...rows].join('\r\n');
}

// GET /api/reports/revenue-trend
exports.getRevenueTrend = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT 
        TO_CHAR(o.order_date, 'YYYY-MM') AS order_month,
        COUNT(o.order_id) AS total_orders,
        COALESCE(SUM(o.total_amount), 0) AS total_revenue,
        ROUND(COALESCE(AVG(o.total_amount), 0), 2) AS average_order_value
      FROM orders o
      WHERE o.status != 'cancelled'
    `;
    const params = [];

    if (start_date) {
      params.push(start_date);
      query += ` AND o.order_date >= $${params.length}::timestamp`;
    }

    if (end_date) {
      params.push(`${end_date} 23:59:59`);
      query += ` AND o.order_date <= $${params.length}::timestamp`;
    }

    query += `
      GROUP BY TO_CHAR(o.order_date, 'YYYY-MM')
      ORDER BY order_month ASC
    `;

    const result = await db.query(query, params);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/best-sellers
exports.getBestSellers = async (req, res, next) => {
  try {
    const { category_id, start_date, end_date, limit = 10 } = req.query;

    let query = `
      SELECT 
        p.product_id,
        p.product_name,
        c.category_id,
        c.category_name,
        p.unit_price,
        p.stock_qty,
        COALESCE(SUM(oi.quantity), 0) AS total_quantity_sold,
        COALESCE(SUM(oi.subtotal), 0) AS total_revenue
      FROM products p
      JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN order_items oi ON p.product_id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.order_id AND o.status != 'cancelled'
    `;
    const params = [];
    const whereClauses = [];

    if (category_id) {
      params.push(parseInt(category_id, 10));
      whereClauses.push(`p.category_id = $${params.length}`);
    }

    if (start_date) {
      params.push(start_date);
      whereClauses.push(`(o.order_date IS NULL OR o.order_date >= $${params.length}::timestamp)`);
    }

    if (end_date) {
      params.push(`${end_date} 23:59:59`);
      whereClauses.push(`(o.order_date IS NULL OR o.order_date <= $${params.length}::timestamp)`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += `
      GROUP BY p.product_id, p.product_name, c.category_id, c.category_name, p.unit_price, p.stock_qty
      ORDER BY total_quantity_sold DESC
      LIMIT $${params.length + 1}
    `;
    params.push(parseInt(limit, 10));

    const result = await db.query(query, params);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/customer-spending
exports.getCustomerSpending = async (req, res, next) => {
  try {
    const { region_id, search, limit = 50 } = req.query;

    let query = `
      SELECT 
        c.customer_id,
        TRIM(c.first_name || ' ' || COALESCE(c.last_name, '')) AS customer_name,
        c.email,
        c.phone,
        r.region_id,
        COALESCE(r.region_name, 'Unassigned') AS region_name,
        COUNT(DISTINCT CASE WHEN o.status != 'cancelled' THEN o.order_id ELSE NULL END) AS total_orders,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total_amount ELSE 0 END), 0) AS total_spent,
        ROUND(COALESCE(AVG(CASE WHEN o.status != 'cancelled' THEN o.total_amount ELSE NULL END), 0), 2) AS average_order_value,
        MAX(o.order_date) AS last_order_date
      FROM customers c
      LEFT JOIN regions r ON c.region_id = r.region_id
      LEFT JOIN orders o ON c.customer_id = o.customer_id
      WHERE 1=1
    `;
    const params = [];

    if (region_id) {
      params.push(parseInt(region_id, 10));
      query += ` AND c.region_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(c.first_name) LIKE $${params.length} OR LOWER(COALESCE(c.last_name, '')) LIKE $${params.length} OR LOWER(COALESCE(c.email, '')) LIKE $${params.length})`;
    }

    query += `
      GROUP BY c.customer_id, c.first_name, c.last_name, c.email, c.phone, r.region_id, r.region_name
      ORDER BY total_spent DESC
      LIMIT $${params.length + 1}
    `;
    params.push(parseInt(limit, 10));

    const result = await db.query(query, params);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/regional-sales
exports.getRegionalSales = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT 
        r.region_id,
        r.region_name,
        COUNT(DISTINCT c.customer_id) AS total_customers,
        COUNT(DISTINCT CASE WHEN o.status != 'cancelled' THEN o.order_id ELSE NULL END) AS total_orders,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total_amount ELSE 0 END), 0) AS total_revenue
      FROM regions r
      LEFT JOIN customers c ON r.region_id = c.region_id
      LEFT JOIN orders o ON c.customer_id = o.customer_id
    `;
    const params = [];
    const dateFilters = [];

    if (start_date) {
      params.push(start_date);
      dateFilters.push(`(o.order_date IS NULL OR o.order_date >= $${params.length}::timestamp)`);
    }

    if (end_date) {
      params.push(`${end_date} 23:59:59`);
      dateFilters.push(`(o.order_date IS NULL OR o.order_date <= $${params.length}::timestamp)`);
    }

    if (dateFilters.length > 0) {
      query += ` WHERE ` + dateFilters.join(' AND ');
    }

    query += `
      GROUP BY r.region_id, r.region_name
      ORDER BY total_revenue DESC
    `;

    const result = await db.query(query, params);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/export-csv
exports.exportReportCsv = async (req, res, next) => {
  try {
    const { report_type } = req.query;
    let csvData = '';
    let filename = `report_${Date.now()}.csv`;

    if (report_type === 'revenue-trend') {
      const result = await db.query(`
        SELECT order_month, total_orders, total_revenue
        FROM monthly_revenue_view
        ORDER BY order_month ASC
      `);
      filename = `monthly_revenue_report_${Date.now()}.csv`;
      csvData = jsonToCsv(result.rows, [
        { key: 'order_month', label: 'Month' },
        { key: 'total_orders', label: 'Total Orders' },
        { key: 'total_revenue', label: 'Total Revenue ($)' }
      ]);
    } else if (report_type === 'best-sellers') {
      const result = await db.query(`
        SELECT product_id, product_name, category_name, unit_price, total_quantity_sold, total_revenue
        FROM best_selling_products_view
        LIMIT 100
      `);
      filename = `best_selling_products_${Date.now()}.csv`;
      csvData = jsonToCsv(result.rows, [
        { key: 'product_id', label: 'Product ID' },
        { key: 'product_name', label: 'Product Name' },
        { key: 'category_name', label: 'Category' },
        { key: 'unit_price', label: 'Unit Price ($)' },
        { key: 'total_quantity_sold', label: 'Total Qty Sold' },
        { key: 'total_revenue', label: 'Total Sales ($)' }
      ]);
    } else if (report_type === 'customer-spending') {
      const result = await db.query(`
        SELECT customer_id, customer_name, email, phone, region_name, total_orders, total_spent, last_order_date
        FROM customer_spending_view
        LIMIT 200
      `);
      filename = `customer_spending_report_${Date.now()}.csv`;
      csvData = jsonToCsv(result.rows, [
        { key: 'customer_id', label: 'Customer ID' },
        { key: 'customer_name', label: 'Customer Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'region_name', label: 'Region' },
        { key: 'total_orders', label: 'Orders Placed' },
        { key: 'total_spent', label: 'Total Spend ($)' },
        { key: 'last_order_date', label: 'Last Order Date' }
      ]);
    } else if (report_type === 'regional-sales') {
      const result = await db.query(`
        SELECT region_id, region_name, total_customers, total_orders, total_revenue
        FROM regional_sales_view
      `);
      filename = `regional_sales_report_${Date.now()}.csv`;
      csvData = jsonToCsv(result.rows, [
        { key: 'region_id', label: 'Region ID' },
        { key: 'region_name', label: 'Region' },
        { key: 'total_customers', label: 'Customer Count' },
        { key: 'total_orders', label: 'Completed Orders' },
        { key: 'total_revenue', label: 'Total Revenue ($)' }
      ]);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid report_type. Allowed values: revenue-trend, best-sellers, customer-spending, regional-sales'
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvData);
  } catch (err) {
    next(err);
  }
};
