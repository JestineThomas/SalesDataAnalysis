# Sales Data Analysis System (Retail & Textile BI Studio)

A modern, full-stack Business Intelligence (BI) web application designed for analyzing and managing sales operations in the retail and textile industry. Built with Next.js (App Router), Chart.js, Tailwind CSS, Node.js + Express REST API, and PostgreSQL (Neon serverless Postgres).

---

##  Architecture & Tech Stack

```
                               ┌────────────────────────────────────────┐
                               │       Next.js 14 Frontend Client       │
                               │  (App Router, Tailwind CSS, Chart.js)  │
                               └──────────────────┬─────────────────────┘
                                                  │ REST API / JWT
                                                  ▼
                               ┌────────────────────────────────────────┐
                               │        Node.js + Express Backend       │
                               │    (MVC Pattern: Routes/Controllers)   │
                               └──────────────────┬─────────────────────┘
                                                  │ SQL Queries & Views
                                                  ▼
                               ┌────────────────────────────────────────┐
                               │        PostgreSQL Database Engine      │
                               │   (Neon Serverless Postgres / PGlite)  │
                               └────────────────────────────────────────┘
```

- **Frontend**: Next.js 14 (App Router), React 18, Chart.js + `react-chartjs-2`, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express.js, MVC architecture, `pg` connection pool, JWT session tokens, `bcryptjs` password hashing.
- **Database**: PostgreSQL (Neon Serverless Postgres) with fallback embedded Postgres (`@electric-sql/pglite`) for immediate offline testing.
- **Security**: Role-Based Access Control (RBAC) with `admin` and `analyst` tiers; administrative protection on destructive actions (deletions, lookup mutation).

---

##  Database Schema & PostgreSQL Views

### Tables Created (`backend/db.sql`):
1. `regions` — Geographic territories (`region_id`, `region_name`)
2. `categories` — Textile & retail product lines (`category_id`, `category_name`)
3. `users` — Authentication & RBAC credentials (`user_id`, `full_name`, `email`, `password_hash`, `role`, `created_at`)
4. `customers` — Buyer records (`customer_id`, `first_name`, `last_name`, `email`, `phone`, `region_id`, `created_at`)
5. `products` — Inventory catalog (`product_id`, `product_name`, `category_id`, `unit_price`, `stock_qty`, `created_at`)
6. `orders` — Sales transactions (`order_id`, `customer_id`, `order_date`, `status`, `total_amount`)
7. `order_items` — Itemized line items (`order_item_id`, `order_id`, `product_id`, `quantity`, `unit_price`, `subtotal`)

### PostgreSQL Analytical Views:
- **`monthly_revenue_view`**: Aggregates revenue, order volume, and order counts grouped by billing cycle (`TO_CHAR(order_date, 'YYYY-MM')`).
- **`best_selling_products_view`**: Computes units sold and total revenue contribution per product.
- **`customer_spending_view`**: Tracks buyer lifetime value, total orders, and latest transaction date.
- **`regional_sales_view`**: Evaluates territorial market performance by revenue and unique customer accounts.

---

##  Default Demo Credentials

Seeded automatically by `npm run seed`:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Administrator** | `admin@salesbi.com` | `Admin@123` | Full Access: CRUD all records, Delete, Modify Lookups |
| **Analyst** | `analyst@salesbi.com` | `Analyst@123` | Analytics, Create Orders, View Customers & Products (Deletions Restricted) |

*(Quick 1-click demo login buttons are also available directly on the `/login` page).*

---

##  Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+ (tested with Node.js v24 LTS)
- **npm** v9+

### 2. Environment Configuration
Create or inspect `backend/.env` (a pre-configured `.env` is already created):

```env
PORT=5000
# Neon PostgreSQL Connection URL
# Example: postgresql://username:password@ep-something.us-east-2.aws.neon.tech/neondb?sslmode=require
DATABASE_URL=
DATABASE_SSL=true
JWT_SECRET=sales_data_bi_jwt_secret_token_secure_2026
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

> **Neon Serverless Postgres**:
> Paste your Neon connection string into `DATABASE_URL` in `backend/.env`.
> If `DATABASE_URL` is left empty or offline, the backend automatically uses its embedded persistent PostgreSQL engine (`@electric-sql/pglite`), ensuring zero configuration is required to test immediately!

### 3. Run Database Migration & Seed
From the root directory:

```bash
# Runs db.sql schema & seeds textile products, customers, and historical orders
npm run seed
```

### 4. Start the Application Servers

Open two terminal tabs:

**Terminal 1 (Backend API on http://localhost:5000):**
```bash
npm run dev:backend
```

**Terminal 2 (Next.js Frontend on http://localhost:3000):**
```bash
npm run dev:frontend
```

Now open [http://localhost:3000](http://localhost:3000) in your browser.

---

##  REST API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new analyst or administrator account
- `POST /api/auth/login` — Authenticate and receive a JWT Bearer token
- `GET /api/auth/me` — Retrieve current authenticated user profile

### Dashboard & Analytics (`/api/dashboard` & `/api/reports`)
- `GET /api/dashboard/summary` — Returns real-time KPI metrics, revenue trend, top products, and category distribution
- `GET /api/reports/revenue-trend` — Monthly revenue breakdown (filters: `start_date`, `end_date`)
- `GET /api/reports/best-sellers` — Best-selling products (filters: `category_id`, `start_date`, `end_date`, `limit`)
- `GET /api/reports/customer-spending` — Customer ranking by lifetime spend (filters: `region_id`, `search`, `limit`)
- `GET /api/reports/regional-sales` — Revenue breakdown grouped by sales territory
- `GET /api/reports/export-csv?report_type=...` — Downloadable CSV export for any of the above 4 reports

### Orders Management (`/api/orders`)
- `GET /api/orders` — List orders with customer info, line item count, and status filters
- `GET /api/orders/:id` — Full order details with itemized product lines
- `POST /api/orders` — Atomic multi-line order creation with automatic stock deduction
- `PUT /api/orders/:id` — Update status (`pending`, `completed`, `cancelled` with automatic inventory restoration)

### Customers (`/api/customers`)
- `GET /api/customers` — Search by name/email/phone, filter by region
- `GET /api/customers/:id` — Single customer profile & order history
- `POST /api/customers` — Create customer
- `PUT /api/customers/:id` — Update customer
- `DELETE /api/customers/:id` — Delete customer (*Admin only*)

### Products & Inventory (`/api/products`)
- `GET /api/products` — Filter by category, stock status (`in_stock`, `low_stock`, `out_of_stock`), and search
- `GET /api/products/:id` — Single product details
- `POST /api/products` — Add SKU
- `PUT /api/products/:id` — Update SKU pricing and stock
- `DELETE /api/products/:id` — Delete SKU (*Admin only*)

### Lookups (`/api/categories` & `/api/regions`)
- `GET /api/categories`, `POST/PUT/DELETE /api/categories`
- `GET /api/regions`, `POST/PUT/DELETE /api/regions`

---

##  Testing & Verification

Run the automated backend test suite covering authentication, RBAC authorization, transactional orders, inventory deductions, and reporting views:

```bash
npm run test:api
```
