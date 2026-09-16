const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function apiRequest(endpoint, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle binary/csv responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    if (!response.ok) {
      throw new Error('Failed to download CSV export');
    }
    return response.blob();
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => apiRequest('/auth/me'),

  // Dashboard
  getDashboardSummary: () => apiRequest('/dashboard/summary'),

  // Customers
  getCustomers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/customers${query ? `?${query}` : ''}`);
  },
  getCustomer: (id) => apiRequest(`/customers/${id}`),
  createCustomer: (data) => apiRequest('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id, data) => apiRequest(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id) => apiRequest(`/customers/${id}`, { method: 'DELETE' }),

  // Products
  getProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/products${query ? `?${query}` : ''}`);
  },
  getProduct: (id) => apiRequest(`/products/${id}`),
  createProduct: (data) => apiRequest('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => apiRequest(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => apiRequest(`/products/${id}`, { method: 'DELETE' }),

  // Lookups
  getCategories: () => apiRequest('/categories'),
  createCategory: (data) => apiRequest('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => apiRequest(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => apiRequest(`/categories/${id}`, { method: 'DELETE' }),

  getRegions: () => apiRequest('/regions'),
  createRegion: (data) => apiRequest('/regions', { method: 'POST', body: JSON.stringify(data) }),
  updateRegion: (id, data) => apiRequest(`/regions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRegion: (id) => apiRequest(`/regions/${id}`, { method: 'DELETE' }),

  // Orders
  getOrders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/orders${query ? `?${query}` : ''}`);
  },
  getOrder: (id) => apiRequest(`/orders/${id}`),
  createOrder: (data) => apiRequest('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrderStatus: (id, status) => apiRequest(`/orders/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Reports
  getRevenueTrend: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/reports/revenue-trend${query ? `?${query}` : ''}`);
  },
  getBestSellers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/reports/best-sellers${query ? `?${query}` : ''}`);
  },
  getCustomerSpending: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/reports/customer-spending${query ? `?${query}` : ''}`);
  },
  getRegionalSales: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/reports/regional-sales${query ? `?${query}` : ''}`);
  },
  exportCsv: (reportType) => apiRequest(`/reports/export-csv?report_type=${reportType}`),
};
