-- ==========================================================
-- Sales Data Analysis System - Relational Schema & Views
-- Domain: Retail / Textile Industry Business Intelligence
-- Target Database: PostgreSQL / Neon Serverless Postgres
-- ==========================================================

-- Drop views if they exist to allow clean re-runs
DROP VIEW IF EXISTS regional_sales_view CASCADE;
DROP VIEW IF EXISTS customer_spending_view CASCADE;
DROP VIEW IF EXISTS best_selling_products_view CASCADE;
DROP VIEW IF EXISTS monthly_revenue_view CASCADE;

-- Drop tables in reverse order of foreign key dependencies
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS regions CASCADE;

-- 1. Regions Lookup Table
CREATE TABLE regions (
  region_id SERIAL PRIMARY KEY,
  region_name VARCHAR(100) UNIQUE NOT NULL
);

-- 2. Categories Lookup Table
CREATE TABLE categories (
  category_id SERIAL PRIMARY KEY,
  category_name VARCHAR(100) UNIQUE NOT NULL
);

-- 3. Users Table (Auth & RBAC)
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'analyst',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Customers Table
CREATE TABLE customers (
  customer_id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  email VARCHAR(150) UNIQUE,
  phone VARCHAR(20),
  region_id INT REFERENCES regions(region_id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Products Table (Stock & Category)
CREATE TABLE products (
  product_id SERIAL PRIMARY KEY,
  product_name VARCHAR(150) NOT NULL,
  category_id INT REFERENCES categories(category_id),
  unit_price NUMERIC(10,2) NOT NULL,
  stock_qty INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Orders Table
CREATE TABLE orders (
  order_id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customers(customer_id),
  order_date TIMESTAMP DEFAULT NOW(),
  status VARCHAR(30) DEFAULT 'pending',
  total_amount NUMERIC(12,2) DEFAULT 0
);

-- 7. Order Items Table
CREATE TABLE order_items (
  order_item_id SERIAL PRIMARY KEY,
  order_id INT REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id INT REFERENCES products(product_id),
  quantity INT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL
);

-- ==========================================================
-- ANALYTICAL VIEWS FOR BI REPORTING & DASHBOARD
-- ==========================================================

-- View 1: Monthly Revenue Trend View
CREATE OR REPLACE VIEW monthly_revenue_view AS
SELECT 
  TO_CHAR(order_date, 'YYYY-MM') AS order_month,
  COUNT(order_id) AS total_orders,
  COALESCE(SUM(total_amount), 0) AS total_revenue
FROM orders
WHERE status != 'cancelled'
GROUP BY TO_CHAR(order_date, 'YYYY-MM')
ORDER BY order_month ASC;

-- View 2: Best-Selling Products View
CREATE OR REPLACE VIEW best_selling_products_view AS
SELECT 
  p.product_id,
  p.product_name,
  c.category_id,
  c.category_name,
  p.unit_price,
  COALESCE(SUM(oi.quantity), 0) AS total_quantity_sold,
  COALESCE(SUM(oi.subtotal), 0) AS total_revenue
FROM products p
JOIN categories c ON p.category_id = c.category_id
LEFT JOIN order_items oi ON p.product_id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.order_id AND o.status != 'cancelled'
GROUP BY p.product_id, p.product_name, c.category_id, c.category_name, p.unit_price
ORDER BY total_quantity_sold DESC;

-- View 3: Customer Spending View
CREATE OR REPLACE VIEW customer_spending_view AS
SELECT 
  c.customer_id,
  c.first_name,
  c.last_name,
  TRIM(c.first_name || ' ' || COALESCE(c.last_name, '')) AS customer_name,
  c.email,
  c.phone,
  r.region_id,
  COALESCE(r.region_name, 'Unassigned') AS region_name,
  COUNT(o.order_id) AS total_orders,
  COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total_amount ELSE 0 END), 0) AS total_spent,
  MAX(o.order_date) AS last_order_date
FROM customers c
LEFT JOIN regions r ON c.region_id = r.region_id
LEFT JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.first_name, c.last_name, c.email, c.phone, r.region_id, r.region_name
ORDER BY total_spent DESC;

-- View 4: Regional Sales View
CREATE OR REPLACE VIEW regional_sales_view AS
SELECT 
  r.region_id,
  r.region_name,
  COUNT(DISTINCT c.customer_id) AS total_customers,
  COUNT(DISTINCT CASE WHEN o.status != 'cancelled' THEN o.order_id ELSE NULL END) AS total_orders,
  COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total_amount ELSE 0 END), 0) AS total_revenue
FROM regions r
LEFT JOIN customers c ON r.region_id = c.region_id
LEFT JOIN orders o ON c.customer_id = o.customer_id
GROUP BY r.region_id, r.region_name
ORDER BY total_revenue DESC;
