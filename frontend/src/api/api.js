import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor: attach token from localStorage ("fg_auth")
apiClient.interceptors.request.use(
  (config) => {
    try {
      const storedAuth = localStorage.getItem('fg_auth');
      if (storedAuth) {
        const { token } = JSON.parse(storedAuth);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // Ignore JSON parsing errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: on 401, clear credentials & redirect to /login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('fg_auth');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Authentication
export const login = async (email, password) => {
  const response = await apiClient.post('/api/v1/auth/login', { email, password });
  return response.data;
};

// Checkout & Customer Endpoints
export const submitCheckout = async (payload) => {
  const response = await apiClient.post('/api/v1/checkout', payload);
  return response.data;
};

export const getMyTransactions = async (page = 0, size = 20) => {
  const response = await apiClient.get('/api/v1/customer/transactions', {
    params: { page, size },
  });
  return response.data;
};

export const getMyTransactionDetail = async (id) => {
  const response = await apiClient.get(`/api/v1/customer/transactions/${id}`);
  return response.data;
};

// Analyst Dashboard & Transactions
export const getMetrics = async () => {
  const response = await apiClient.get('/api/v1/analyst/metrics');
  return response.data;
};

export const getAnalystTransactions = async (status = 'ALL', page = 0, size = 20, search = '') => {
  const params = { status: status || 'ALL', page, size };
  if (search && search.trim() !== '') {
    params.search = search.trim();
  }
  const response = await apiClient.get('/api/v1/analyst/transactions', { params });
  return response.data;
};

export const getTransactionDetail = async (id) => {
  const response = await apiClient.get(`/api/v1/analyst/transactions/${id}`);
  return response.data;
};

export const adjudicateTransaction = async (id, action, notes) => {
  const response = await apiClient.post(`/api/v1/analyst/transactions/${id}/adjudicate`, {
    action,
    notes,
  });
  return response.data;
};

// Blacklists
export const addBlacklist = async (targetType, targetValue, reason) => {
  const response = await apiClient.post('/api/v1/analyst/blacklists', {
    targetType,
    targetValue,
    reason,
  });
  return response.data;
};

export const getBlacklists = async (targetType) => {
  const params = targetType && targetType !== 'ALL' ? { targetType } : {};
  const response = await apiClient.get('/api/v1/analyst/blacklists', { params });
  return response.data;
};

export const deleteBlacklist = async (id) => {
  const response = await apiClient.delete(`/api/v1/analyst/blacklists/${id}`);
  return response.data;
};

// Fraud Rules
export const getRules = async () => {
  const response = await apiClient.get('/api/v1/analyst/rules');
  return response.data;
};

export const updateRule = async (id, payload) => {
  const response = await apiClient.put(`/api/v1/analyst/rules/${id}`, payload);
  return response.data;
};

// Audit Logs
export const getAuditLogs = async (page = 0, size = 20, action, actorEmail) => {
  const params = { page, size };
  if (action && action !== 'ALL') params.action = action;
  if (actorEmail && actorEmail.trim() !== '') params.actorEmail = actorEmail.trim();
  const response = await apiClient.get('/api/v1/analyst/audit-logs', { params });
  return response.data;
};

// Helper for SSE Stream URL
export const getDashboardStreamUrl = () => {
  return `${API_BASE_URL}/api/v1/analyst/dashboard/stream`;
};

// AI SAR Reports (Gemini 2.0 Flash)
export const generateSar = async (transactionId) => {
  const response = await apiClient.post(`/api/v1/analyst/transactions/${transactionId}/sar`);
  return response.data;
};

export const getSarReports = async (transactionId) => {
  const response = await apiClient.get(`/api/v1/analyst/transactions/${transactionId}/sar`);
  return response.data;
};

export const updateSarStatus = async (sarId, status, notes) => {
  const response = await apiClient.patch(`/api/v1/analyst/sar/${sarId}/status`, { status, notes });
  return response.data;
};

// 3D Secure (3DS) OTP Step-Up Authentication
export const issueOtpChallenge = async (transactionId) => {
  const response = await apiClient.post('/api/v1/customer/otp/issue', { transactionId });
  return response.data;
};

export const verifyOtp = async (transactionId, otp) => {
  const response = await apiClient.post('/api/v1/customer/otp/verify', { transactionId, otp });
  return response.data;
};

export const getOtpStatus = async (transactionId) => {
  const response = await apiClient.get(`/api/v1/customer/otp/status/${transactionId}`);
  return response.data;
};

// Fraud Syndicate Link Graph
export const getGraph = async (params) => {
  const response = await apiClient.get('/api/v1/analyst/graph', { params });
  return response.data;
};

export const getTransactionGraph = async (id) => {
  const response = await apiClient.get(`/api/v1/analyst/graph/transaction/${id}`);
  return response.data;
};


