const db = require('../config/db');

// GET /api/dashboard/summary
exports.getDashboardSummary = async (req, res, next) => {
  try {
    // 1. KPI Totals
    const totalsRes = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) AS total_revenue,
        COUNT(CASE WHEN status != 'cancelled' THEN order_id ELSE NULL END) AS total_orders,
        COUNT(CASE WHEN status = 'pending' THEN order_id ELSE NULL END) AS pending_orders
      FROM orders
    `);

    const customerRes = await db.query(`
      SELECT COUNT(DISTINCT customer_id) AS active_customers FROM orders WHERE status != 'cancelled'
    `);

    const topProductRes = await db.query(`
      SELECT product_name, total_quantity_sold, total_revenue
      FROM best_selling_products_view
      LIMIT 1
    `);

    // 2. Revenue Trend (Line Chart data)
    const trendRes = await db.query(`
      SELECT order_month, total_orders, total_revenue
      FROM monthly_revenue_view
      ORDER BY order_month ASC
      LIMIT 12
    `);

    // 3. Best Sellers (Bar Chart data)
    const bestSellersRes = await db.query(`
      SELECT product_name, total_quantity_sold, total_revenue
      FROM best_selling_products_view
      ORDER BY total_quantity_sold DESC
      LIMIT 6
    `);

    // 4. Category Split (Pie / Doughnut Chart data)
    const categorySplitRes = await db.query(`
      SELECT 
        c.category_name,
        COALESCE(SUM(oi.subtotal), 0) AS category_revenue,
        COALESCE(SUM(oi.quantity), 0) AS category_units
      FROM categories c
      LEFT JOIN products p ON c.category_id = p.category_id
      LEFT JOIN order_items oi ON p.product_id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.order_id AND o.status != 'cancelled'
      GROUP BY c.category_id, c.category_name
      ORDER BY category_revenue DESC
    `);

    // 5. Recent 5 Orders
    const recentOrdersRes = await db.query(`
      SELECT 
        o.order_id,
        o.order_date,
        o.status,
        o.total_amount,
        TRIM(c.first_name || ' ' || COALESCE(c.last_name, '')) AS customer_name,
        c.email AS customer_email
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      ORDER BY o.order_date DESC, o.order_id DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        kpis: {
          total_revenue: parseFloat(totalsRes.rows[0].total_revenue) || 0,
          total_orders: parseInt(totalsRes.rows[0].total_orders, 10) || 0,
          pending_orders: parseInt(totalsRes.rows[0].pending_orders, 10) || 0,
          active_customers: parseInt(customerRes.rows[0].active_customers, 10) || 0,
          top_product: topProductRes.rows[0] || { product_name: 'N/A', total_quantity_sold: 0, total_revenue: 0 }
        },
        revenue_trend: trendRes.rows,
        best_sellers: bestSellersRes.rows,
        category_split: categorySplitRes.rows,
        recent_orders: recentOrdersRes.rows
      }
    });
  } catch (err) {
    next(err);
  }
};
