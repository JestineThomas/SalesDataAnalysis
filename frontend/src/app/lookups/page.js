'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit2, Trash2, Tag, MapPin, AlertCircle, Shield } from 'lucide-react';

export default function LookupsPage() {
  const { isAdmin } = useAuth();
  const [categories, setCategories] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal States
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'regions'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [cats, regs] = await Promise.all([
        api.getCategories(),
        api.getRegions(),
      ]);
      if (cats.success) setCategories(cats.data);
      if (regs.success) setRegions(regs.data);
    } catch (err) {
      setError(err.message || 'Failed to load lookup tables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setNameInput('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setNameInput(activeTab === 'categories' ? item.category_name : item.region_name);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (item) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      if (activeTab === 'categories') {
        if (editingItem) {
          await api.updateCategory(editingItem.category_id, { category_name: nameInput.trim() });
        } else {
          await api.createCategory({ category_name: nameInput.trim() });
        }
      } else {
        if (editingItem) {
          await api.updateRegion(editingItem.region_id, { region_name: nameInput.trim() });
        } else {
          await api.createRegion({ region_name: nameInput.trim() });
        }
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to save lookup value');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setSubmitting(true);
    setError('');

    try {
      if (activeTab === 'categories') {
        await api.deleteCategory(deletingItem.category_id);
      } else {
        await api.deleteRegion(deletingItem.region_id);
      }

      setIsDeleteModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to delete');
      setIsDeleteModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout title="Categories & Regions">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Lookup Management</h2>
            <p className="text-xs text-slate-500">Configure core product categories and sales distribution regions</p>
          </div>
          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add {activeTab === 'categories' ? 'Category' : 'Region'}</span>
            </button>
          )}
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

        {/* Tab switch */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'categories'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Tag className="w-4 h-4 text-teal-400" />
            <span>Product Categories ({categories.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('regions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'regions'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <MapPin className="w-4 h-4 text-teal-400" />
            <span>Sales Regions ({regions.length})</span>
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-16">
              <LoadingSpinner text="Retrieving lookups..." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">
                      {activeTab === 'categories' ? 'Assigned Products' : 'Assigned Customers'}
                    </th>
                    {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeTab === 'categories' ? (
                    categories.map((c) => (
                      <tr key={c.category_id} className="hover:bg-slate-50/60">
                        <td className="py-3.5 px-4 font-bold text-slate-400">#{c.category_id}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{c.category_name}</td>
                        <td className="py-3.5 px-4 text-slate-600">{c.product_count || 0} product(s)</td>
                        {isAdmin && (
                          <td className="py-3.5 px-4 text-right space-x-1">
                            <button
                              onClick={() => handleOpenEdit(c)}
                              className="p-1.5 text-slate-500 hover:text-teal-600 rounded-lg hover:bg-teal-50"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(c)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    regions.map((r) => (
                      <tr key={r.region_id} className="hover:bg-slate-50/60">
                        <td className="py-3.5 px-4 font-bold text-slate-400">#{r.region_id}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{r.region_name}</td>
                        <td className="py-3.5 px-4 text-slate-600">{r.customer_count || 0} customer(s)</td>
                        {isAdmin && (
                          <td className="py-3.5 px-4 text-right space-x-1">
                            <button
                              onClick={() => handleOpenEdit(r)}
                              className="p-1.5 text-slate-500 hover:text-teal-600 rounded-lg hover:bg-teal-50"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(r)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add / Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`${editingItem ? 'Edit' : 'Add New'} ${activeTab === 'categories' ? 'Category' : 'Region'}`}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {activeTab === 'categories' ? 'Category' : 'Region'} Name *
              </label>
              <input
                type="text"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={activeTab === 'categories' ? 'e.g. Denim & Casuals' : 'e.g. Northern Territory'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Deletion"
        >
          <div className="space-y-4 text-xs text-slate-600">
            <p>
              Are you sure you want to delete this {activeTab === 'categories' ? 'category' : 'region'}?
            </p>
            <p className="text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-[11px]">
              Note: Lookups that are referenced by existing products or customers cannot be removed to maintain relational integrity.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="px-4 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
