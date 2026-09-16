'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { api } from '../../lib/api';
import { 
  Download, 
  Calendar, 
  Filter, 
  RotateCcw, 
  TrendingUp, 
  Award, 
  Users, 
  Globe, 
  AlertCircle 
} from 'lucide-react';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('revenue-trend');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  // Lookups for filters
  const [categories, setCategories] = useState([]);
  const [regions, setRegions] = useState([]);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [regionId, setRegionId] = useState('');
  const [search, setSearch] = useState('');

  // Report Data
  const [reportData, setReportData] = useState([]);

  // Load lookup options
  useEffect(() => {
    Promise.all([api.getCategories(), api.getRegions()])
      .then(([cats, regs]) => {
        if (cats.success) setCategories(cats.data);
        if (regs.success) setRegions(regs.data);
      })
      .catch(() => {});
  }, []);

  // Fetch report data on filter/tab changes
  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (categoryId) params.category_id = categoryId;
      if (regionId) params.region_id = regionId;
      if (search) params.search = search;

      let res;
      if (activeTab === 'revenue-trend') {
        res = await api.getRevenueTrend(params);
      } else if (activeTab === 'best-sellers') {
        res = await api.getBestSellers(params);
      } else if (activeTab === 'customer-spending') {
        res = await api.getCustomerSpending(params);
      } else if (activeTab === 'regional-sales') {
        res = await api.getRegionalSales(params);
      }

      if (res && res.success) {
        setReportData(res.data);
      } else {
        setError(res?.message || 'Failed to load report data');
      }
    } catch (err) {
      setError(err.message || 'Error loading report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, startDate, endDate, categoryId, regionId, search]);

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setCategoryId('');
    setRegionId('');
    setSearch('');
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const blob = await api.exportCsv(activeTab);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTab}_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message || 'Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  // Chart configs
  const trendChartData = {
    labels: reportData.map(d => d.order_month),
    datasets: [
      {
        label: 'Total Revenue ($)',
        data: reportData.map(d => parseFloat(d.total_revenue)),
        borderColor: '#0d9488',
        backgroundColor: 'rgba(13, 148, 136, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const bestSellersChartData = {
    labels: reportData.slice(0, 10).map(d => d.product_name),
    datasets: [
      {
        label: 'Total Revenue ($)',
        data: reportData.slice(0, 10).map(d => parseFloat(d.total_revenue)),
        backgroundColor: '#0d9488',
        borderRadius: 6,
      },
    ],
  };

  const regionalChartData = {
    labels: reportData.map(d => d.region_name),
    datasets: [
      {
        label: 'Regional Revenue ($)',
        data: reportData.map(d => parseFloat(d.total_revenue)),
        backgroundColor: '#6366f1',
        borderRadius: 6,
      },
    ],
  };

  return (
    <AppLayout title="Sales Analysis & Reports">
      <div className="space-y-6">
        {/* Header & Export button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Business Intelligence Reports</h2>
            <p className="text-xs text-slate-500">Query and export aggregate views across revenue, products, customers, and regions</p>
          </div>
          <button
            onClick={handleExportCsv}
            disabled={exporting || loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition disabled:opacity-50 self-start sm:self-auto"
          >
            <Download className="w-4 h-4 text-teal-400" />
            <span>{exporting ? 'Generating CSV...' : 'Export to CSV'}</span>
          </button>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-slate-400 hover:text-slate-600 font-bold ml-2">×</button>
          </div>
        )}

        {/* Report Perspective Tabs */}
        <div className="border-b border-slate-200 flex gap-2 overflow-x-auto pb-1">
          {[
            { id: 'revenue-trend', label: 'Monthly Revenue Trend', icon: TrendingUp },
            { id: 'best-sellers', label: 'Best-Selling Products', icon: Award },
            { id: 'customer-spending', label: 'Customer Spending Patterns', icon: Users },
            { id: 'regional-sales', label: 'Regional Performance', icon: Globe },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-teal-600 text-teal-600 bg-teal-50/50 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-teal-600" />
              <span>Report Filters</span>
            </div>
            {(startDate || endDate || categoryId || regionId || search) && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Date Range Start */}
            <div>
              <label className="block text-slate-500 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Date Range End */}
            <div>
              <label className="block text-slate-500 mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-slate-500 mb-1">Product Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                ))}
              </select>
            </div>

            {/* Region Filter */}
            <div>
              <label className="block text-slate-500 mb-1">Geographic Region</label>
              <select
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All Regions</option>
                {regions.map((r) => (
                  <option key={r.region_id} value={r.region_id}>{r.region_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Visual Chart Card */}
        {reportData.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Visual Trend Breakdown</h3>
            <div className="h-64 sm:h-72">
              {activeTab === 'revenue-trend' && (
                <Line data={trendChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              )}
              {activeTab === 'best-sellers' && (
                <Bar data={bestSellersChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              )}
              {activeTab === 'regional-sales' && (
                <Bar data={regionalChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              )}
              {activeTab === 'customer-spending' && (
                <Bar 
                  data={{
                    labels: reportData.slice(0, 8).map(d => d.customer_name),
                    datasets: [{
                      label: 'Total Spend ($)',
                      data: reportData.slice(0, 8).map(d => parseFloat(d.total_spent)),
                      backgroundColor: '#14b8a6',
                      borderRadius: 6,
                    }]
                  }}
                  options={{ responsive: true, maintainAspectRatio: false }} 
                />
              )}
            </div>
          </div>
        )}

        {/* Report Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-16">
              <LoadingSpinner text="Compiling analytical query results..." />
            </div>
          ) : reportData.length === 0 ? (
            <div className="p-8">
              <EmptyState 
                title="No report records found" 
                description="No records match the applied criteria. Try expanding the date range or clearing category/region filters."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Tab 1: Monthly Revenue Trend Table */}
              {activeTab === 'revenue-trend' && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Billing Month</th>
                      <th className="py-3 px-4">Total Orders</th>
                      <th className="py-3 px-4">Average Order Value</th>
                      <th className="py-3 px-4 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-bold text-slate-900">{row.order_month}</td>
                        <td className="py-3 px-4 text-slate-600">{row.total_orders} orders</td>
                        <td className="py-3 px-4 text-slate-600">${parseFloat(row.average_order_value || 0).toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          ${parseFloat(row.total_revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Tab 2: Best-Selling Products Table */}
              {activeTab === 'best-sellers' && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Unit Price</th>
                      <th className="py-3 px-4">Units Sold</th>
                      <th className="py-3 px-4">Remaining Stock</th>
                      <th className="py-3 px-4 text-right">Total Sales Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.map((row) => (
                      <tr key={row.product_id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-bold text-slate-900">{row.product_name}</td>
                        <td className="py-3 px-4 text-slate-600">{row.category_name}</td>
                        <td className="py-3 px-4 text-slate-700 font-medium">${parseFloat(row.unit_price).toFixed(2)}</td>
                        <td className="py-3 px-4 font-semibold text-teal-700">{row.total_quantity_sold} units</td>
                        <td className="py-3 px-4 text-slate-600">{row.stock_qty} in stock</td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          ${parseFloat(row.total_revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Tab 3: Customer Spending Table */}
              {activeTab === 'customer-spending' && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Region</th>
                      <th className="py-3 px-4">Completed Orders</th>
                      <th className="py-3 px-4">Average Order</th>
                      <th className="py-3 px-4 text-right">Total Spend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.map((row) => (
                      <tr key={row.customer_id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-bold text-slate-900">{row.customer_name}</td>
                        <td className="py-3 px-4 text-slate-500">{row.email || 'N/A'}</td>
                        <td className="py-3 px-4 text-slate-600">{row.region_name}</td>
                        <td className="py-3 px-4 text-slate-700">{row.total_orders} orders</td>
                        <td className="py-3 px-4 text-slate-600">${parseFloat(row.average_order_value || 0).toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          ${parseFloat(row.total_spent).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Tab 4: Regional Performance Table */}
              {activeTab === 'regional-sales' && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Territory / Region</th>
                      <th className="py-3 px-4">Customer Accounts</th>
                      <th className="py-3 px-4">Orders Executed</th>
                      <th className="py-3 px-4 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.map((row) => (
                      <tr key={row.region_id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-bold text-slate-900">{row.region_name}</td>
                        <td className="py-3 px-4 text-slate-600">{row.total_customers} clients</td>
                        <td className="py-3 px-4 text-slate-600">{row.total_orders} orders</td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          ${parseFloat(row.total_revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
