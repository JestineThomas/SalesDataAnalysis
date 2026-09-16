'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { api } from '../../lib/api';
import { 
  Plus, 
  Trash2, 
  Eye, 
  ShoppingCart, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Receipt, 
  Calendar, 
  User, 
  MapPin,
  AlertCircle
} from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // New Order Form state
  const [customerId, setCustomerId] = useState('');
  const [orderStatus, setOrderStatus] = useState('completed');
  const [orderItems, setOrderItems] = useState([
    { product_id: '', quantity: 1, unit_price: 0, subtotal: 0, stock_qty: 0 }
  ]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const [ordRes, custRes, prodRes] = await Promise.all([
        api.getOrders(params),
        api.getCustomers(),
        api.getProducts(),
      ]);

      if (ordRes.success) setOrders(ordRes.data);
      if (custRes.success) setCustomers(custRes.data);
      if (prodRes.success) setProducts(prodRes.data);
    } catch (err) {
      setError(err.message || 'Failed to load orders data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleOpenCreateModal = () => {
    setCustomerId(customers[0]?.customer_id ? String(customers[0].customer_id) : '');
    setOrderStatus('completed');
    const defaultProd = products.find(p => p.stock_qty > 0) || products[0];
    setOrderItems([
      {
        product_id: defaultProd ? String(defaultProd.product_id) : '',
        quantity: 1,
        unit_price: defaultProd ? parseFloat(defaultProd.unit_price) : 0,
        subtotal: defaultProd ? parseFloat(defaultProd.unit_price) : 0,
        stock_qty: defaultProd ? defaultProd.stock_qty : 0,
      }
    ]);
    setIsCreateModalOpen(true);
  };

  const handleOpenDetailModal = async (orderId) => {
    try {
      const res = await api.getOrder(orderId);
      if (res.success) {
        setSelectedOrder(res.data);
        setIsDetailModalOpen(true);
      }
    } catch (err) {
      setError(err.message || 'Failed to load order details');
    }
  };

  // Line item handlers
  const handleAddItem = () => {
    const availableProd = products.find(p => p.stock_qty > 0) || products[0];
    setOrderItems([
      ...orderItems,
      {
        product_id: availableProd ? String(availableProd.product_id) : '',
        quantity: 1,
        unit_price: availableProd ? parseFloat(availableProd.unit_price) : 0,
        subtotal: availableProd ? parseFloat(availableProd.unit_price) : 0,
        stock_qty: availableProd ? availableProd.stock_qty : 0,
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (orderItems.length === 1) return;
    const updated = orderItems.filter((_, i) => i !== index);
    setOrderItems(updated);
  };

  const handleItemProductChange = (index, prodId) => {
    const prod = products.find(p => String(p.product_id) === String(prodId));
    const updated = [...orderItems];
    const unitPrice = prod ? parseFloat(prod.unit_price) : 0;
    const qty = updated[index].quantity || 1;
    updated[index] = {
      ...updated[index],
      product_id: prodId,
      unit_price: unitPrice,
      subtotal: Math.round(unitPrice * qty * 100) / 100,
      stock_qty: prod ? prod.stock_qty : 0,
    };
    setOrderItems(updated);
  };

  const handleItemQuantityChange = (index, qtyVal) => {
    const qty = Math.max(1, parseInt(qtyVal, 10) || 1);
    const updated = [...orderItems];
    const unitPrice = updated[index].unit_price || 0;
    updated[index] = {
      ...updated[index],
      quantity: qty,
      subtotal: Math.round(unitPrice * qty * 100) / 100,
    };
    setOrderItems(updated);
  };

  // Live order total
  const calculatedTotal = orderItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // Validate customer
      if (!customerId) throw new Error('Please select a customer.');

      // Validate items
      for (const item of orderItems) {
        if (!item.product_id) throw new Error('Please select a valid product for every item.');
        if (item.quantity <= 0) throw new Error('Quantity must be greater than 0.');
        if (item.stock_qty < item.quantity) {
          throw new Error(`Insufficient stock for selected product. Available: ${item.stock_qty}, requested: ${item.quantity}.`);
        }
      }

      await api.createOrder({
        customer_id: parseInt(customerId, 10),
        status: orderStatus,
        items: orderItems.map(item => ({
          product_id: parseInt(item.product_id, 10),
          quantity: item.quantity,
        })),
      });

      setIsCreateModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      fetchData();
      if (selectedOrder && selectedOrder.order_id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err) {
      setError(err.message || 'Failed to update order status');
    }
  };

  return (
    <AppLayout title="Order Management">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Orders & Invoicing</h2>
            <p className="text-xs text-slate-500">Create multi-item transactions with auto-stock updates and fulfillment tracking</p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Order</span>
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

        {/* Filter Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status:</span>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'All Orders', value: '' },
              { label: 'Completed', value: 'completed' },
              { label: 'Pending', value: 'pending' },
              { label: 'Cancelled', value: 'cancelled' },
            ].map(tab => (
              <button
                key={tab.label}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl transition ${
                  statusFilter === tab.value
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-16">
              <LoadingSpinner text="Retrieving orders database..." />
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8">
              <EmptyState 
                title="No orders found" 
                description="No transactions match the selected filter. Create a new order to test inventory updates."
                action={
                  <button
                    onClick={handleOpenCreateModal}
                    className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700"
                  >
                    Place First Order
                  </button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Items / Qty</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {orders.map((o) => (
                    <tr key={o.order_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        #{o.order_id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{o.customer_name}</div>
                        <div className="text-[11px] text-slate-400">{o.customer_email || o.region_name}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {new Date(o.order_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="font-medium text-slate-800">{o.total_items} item(s)</span>
                        <span className="text-slate-400"> ({o.total_quantity} units)</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          o.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : o.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {o.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                          {o.status === 'pending' && <Clock className="w-3 h-3" />}
                          {o.status === 'cancelled' && <XCircle className="w-3 h-3" />}
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        ${parseFloat(o.total_amount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenDetailModal(o.order_id)}
                          className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                          title="View Order Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {o.status === 'pending' && (
                          <button
                            onClick={() => handleStatusUpdate(o.order_id, 'completed')}
                            className="px-2 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition"
                          >
                            Mark Complete
                          </button>
                        )}
                        {o.status !== 'cancelled' && (
                          <button
                            onClick={() => handleStatusUpdate(o.order_id, 'cancelled')}
                            className="px-2 py-1 text-[11px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg border border-rose-200 transition"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Order Modal (Multi-line Items & Live Calculations) */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Multi-Item Order"
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSubmitOrder} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer *
                </label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white"
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.customer_id} value={c.customer_id}>
                      {c.full_name} ({c.region_name || 'No Region'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Order Status
                </label>
                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white"
                >
                  <option value="completed">Completed (Fulfill immediately)</option>
                  <option value="pending">Pending (Awaiting fulfillment)</option>
                </select>
              </div>
            </div>

            {/* Line Items Section */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Order Line Items
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Line Item
                </button>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {orderItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    {/* Product select */}
                    <div className="flex-1 min-w-0">
                      <select
                        required
                        value={item.product_id}
                        onChange={(e) => handleItemProductChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Select Product SKU</option>
                        {products.map((p) => (
                          <option key={p.product_id} value={p.product_id} disabled={p.stock_qty <= 0}>
                            {p.product_name} — ${parseFloat(p.unit_price).toFixed(2)} (Stock: {p.stock_qty})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="w-20">
                      <input
                        type="number"
                        min="1"
                        max={item.stock_qty || 999}
                        value={item.quantity}
                        onChange={(e) => handleItemQuantityChange(idx, e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center font-medium focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    {/* Line Subtotal */}
                    <div className="w-24 text-right pr-2">
                      <span className="text-xs font-bold text-slate-800">
                        ${(item.subtotal || 0).toFixed(2)}
                      </span>
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={orderItems.length === 1}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Order Summary Footer */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between mt-4">
              <div>
                <span className="text-xs text-slate-400 block">Total Order Value</span>
                <span className="text-xs text-teal-400 font-medium">{orderItems.length} items configured</span>
              </div>
              <div className="text-2xl font-black text-teal-400">
                ${calculatedTotal.toFixed(2)}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl disabled:opacity-50"
              >
                {submitting ? 'Processing Transaction...' : 'Confirm & Place Order'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Order Details Modal */}
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Order #${selectedOrder?.order_id} Summary`}
          maxWidth="max-w-xl"
        >
          {selectedOrder && (
            <div className="space-y-4">
              {/* Header Details */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block">Customer</span>
                  <span className="font-semibold text-slate-900">{selectedOrder.customer_name}</span>
                  <span className="text-slate-500 block text-[11px]">{selectedOrder.customer_email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Order Date</span>
                  <span className="font-semibold text-slate-900">
                    {new Date(selectedOrder.order_date).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Region</span>
                  <span className="font-semibold text-slate-900">{selectedOrder.region_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Status</span>
                  <span className="font-bold uppercase text-teal-600">{selectedOrder.status}</span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Line Items
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-[11px] text-slate-500 uppercase">
                      <tr>
                        <th className="py-2 px-3">Product</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3 text-right">Unit Price</th>
                        <th className="py-2 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrder.items?.map((item) => (
                        <tr key={item.order_item_id}>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {item.product_name}
                            <span className="block text-[10px] text-slate-400">{item.category_name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-700">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">${parseFloat(item.unit_price).toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">${parseFloat(item.subtotal).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                      <tr>
                        <td colSpan="3" className="py-2.5 px-3 text-right text-slate-700">Total Order Amount:</td>
                        <td className="py-2.5 px-3 text-right text-teal-700 text-sm font-black">
                          ${parseFloat(selectedOrder.total_amount).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
}
