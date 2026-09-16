'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { api } from '../../lib/api';
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Award, 
  TrendingUp, 
  ArrowUpRight, 
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      setError('');
      const res = await api.getDashboardSummary();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || 'Failed to load dashboard data');
      }
    } catch (err) {
      setError(err.message || 'Error connecting to server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <AppLayout title="Executive Overview">
        <div className="py-20">
          <LoadingSpinner text="Aggregating sales intelligence metrics..." />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Executive Overview">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-rose-300 rounded-lg hover:bg-rose-100"
          >
            Retry
          </button>
        </div>
      </AppLayout>
    );
  }

  const { kpis, revenue_trend = [], best_sellers = [], category_split = [], recent_orders = [] } = data || {};

  // 1. Line Chart Data: Monthly Revenue Trend
  const lineChartData = {
    labels: revenue_trend.map(item => item.order_month),
    datasets: [
      {
        label: 'Monthly Revenue ($)',
        data: revenue_trend.map(item => parseFloat(item.total_revenue)),
        fill: true,
        borderColor: '#0d9488', // teal-600
        backgroundColor: 'rgba(13, 148, 136, 0.1)',
        tension: 0.35,
        pointBackgroundColor: '#0d9488',
        pointBorderColor: '#fff',
        pointHoverRadius: 6,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` Revenue: $${context.raw.toLocaleString()}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: {
          callback: (value) => `$${value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}`,
        },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  // 2. Bar Chart Data: Best-Selling Products
  const barChartData = {
    labels: best_sellers.map(item => {
      const name = item.product_name;
      return name.length > 18 ? name.substring(0, 16) + '...' : name;
    }),
    datasets: [
      {
        label: 'Units Sold',
        data: best_sellers.map(item => parseInt(item.total_quantity_sold, 10)),
        backgroundColor: [
          '#14b8a6', // teal-500
          '#0ea5e9', // sky-500
          '#8b5cf6', // violet-500
          '#ec4899', // pink-500
          '#f59e0b', // amber-500
          '#10b981', // emerald-500
        ],
        borderRadius: 8,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` Units Sold: ${context.raw}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  // 3. Doughnut Chart Data: Category Split
  const doughnutColors = [
    '#0d9488', // teal-600
    '#6366f1', // indigo-500
    '#f43f5e', // rose-500
    '#eab308', // yellow-500
    '#8b5cf6', // purple-500
    '#06b6d4', // cyan-500
  ];

  const doughnutChartData = {
    labels: category_split.map(item => item.category_name),
    datasets: [
      {
        data: category_split.map(item => parseFloat(item.category_revenue)),
        backgroundColor: doughnutColors.slice(0, category_split.length),
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          font: { size: 11 },
          padding: 14,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => ` $${parseFloat(context.raw).toLocaleString()}`,
        },
      },
    },
    cutout: '68%',
  };

  return (
    <AppLayout title="Executive Overview">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Sales Intelligence Dashboard</h2>
            <p className="text-xs text-slate-500">Real-time analytical metrics for retail and textile performance</p>
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-xs hover:bg-slate-50 transition disabled:opacity-50 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh KPIs'}</span>
          </button>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Revenue */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Revenue</span>
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-slate-900">
                ${kpis?.total_revenue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Active Sales Volume</span>
              </div>
            </div>
          </div>

          {/* Total Orders */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Orders</span>
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-slate-900">
                {kpis?.total_orders?.toLocaleString()}
              </h3>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>{kpis?.pending_orders || 0} orders pending fulfillment</span>
              </div>
            </div>
          </div>

          {/* Active Customers */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Customers</span>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-slate-900">
                {kpis?.active_customers?.toLocaleString()}
              </h3>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-teal-600 font-medium">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Purchasing Accounts</span>
              </div>
            </div>
          </div>

          {/* Top Product */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Top Product</span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-bold text-slate-900 truncate" title={kpis?.top_product?.product_name}>
                {kpis?.top_product?.product_name || 'No sales yet'}
              </h3>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{kpis?.top_product?.total_quantity_sold || 0} units</span>
                <span>• ${(parseFloat(kpis?.top_product?.total_revenue) || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trend Line Chart (2 Cols) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Monthly Revenue Trend</h3>
                <p className="text-xs text-slate-500">Revenue performance over recent billing cycles</p>
              </div>
              <span className="px-2.5 py-1 text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200/60 rounded-lg">
                monthly_revenue_view
              </span>
            </div>
            <div className="h-64 sm:h-72">
              {revenue_trend.length > 0 ? (
                <Line data={lineChartData} options={lineChartOptions} />
              ) : (
                <EmptyState title="No trend data" description="Place orders to see monthly revenue trends." />
              )}
            </div>
          </div>

          {/* Category Split Pie/Doughnut Chart (1 Col) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Sales by Category</h3>
                <p className="text-xs text-slate-500">Revenue contribution per textile line</p>
              </div>
            </div>
            <div className="h-64 sm:h-72 flex items-center justify-center">
              {category_split.length > 0 ? (
                <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
              ) : (
                <EmptyState title="No categories" description="No categorical sales recorded." />
              )}
            </div>
          </div>
        </div>

        {/* Best Sellers & Recent Orders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Best-Sellers Bar Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Best-Selling Products</h3>
                <p className="text-xs text-slate-500">Highest volume items by total units ordered</p>
              </div>
              <span className="px-2.5 py-1 text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200/60 rounded-lg">
                best_selling_products_view
              </span>
            </div>
            <div className="h-64">
              {best_sellers.length > 0 ? (
                <Bar data={barChartData} options={barChartOptions} />
              ) : (
                <EmptyState title="No best sellers" description="Sales data will populate best seller rankings." />
              )}
            </div>
          </div>

          {/* Recent Orders List */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Recent Activity</h3>
                  <p className="text-xs text-slate-500">Latest orders submitted across sales channels</p>
                </div>
              </div>
              {recent_orders.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {recent_orders.map((order) => (
                    <div key={order.order_id} className="py-3 flex items-center justify-between">
                      <div className="min-w-0 pr-3">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {order.customer_name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Order #{order.order_id} • {new Date(order.order_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-slate-900">
                          ${parseFloat(order.total_amount).toFixed(2)}
                        </p>
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                          order.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : order.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No recent orders" description="Orders placed will appear here." />
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
