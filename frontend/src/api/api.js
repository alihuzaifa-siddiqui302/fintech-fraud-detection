import axios from 'axios';
import {
  INITIAL_GRAPH,
  getStoredTransactions,
  saveStoredTransactions,
  getStoredRules,
  saveStoredRules,
  getStoredBlacklists,
  saveStoredBlacklists,
  getStoredAudit,
  appendStoredAudit,
  evaluateMockTransaction,
  generateMockSarText,
} from './mockData';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Check if we are running on Vercel or in a standalone frontend environment without a live backend
const isVercelHosted =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('render.com')) &&
  (!import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL.includes('localhost'));

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000, // Fast failover to mock simulation if backend is unreachable
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

/**
 * Authentication
 * Connects to Spring Boot backend; if backend is unreachable or running on Vercel,
 * provides instant demo authentication without network errors.
 */
export const login = async (email, password) => {
  if (isVercelHosted) {
    return mockLogin(email, password);
  }

  try {
    const response = await apiClient.post('/api/v1/auth/login', { email, password });
    return response.data;
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
      return mockLogin(email, password);
    }
    throw err;
  }
};

const mockLogin = (email, password) => {
  const isAnalyst = email?.toLowerCase().includes('analyst');
  return {
    token: isAnalyst ? 'demo-jwt-analyst-token' : 'demo-jwt-customer-token',
    userId: isAnalyst ? 'usr_analyst_01' : 'usr_customer_01',
    email: email || (isAnalyst ? 'analyst@fraudguard.io' : 'customer@fraudguard.io'),
    fullName: isAnalyst ? 'Compliance Analyst' : 'Customer Demo',
    role: isAnalyst ? 'ROLE_ANALYST' : 'ROLE_CUSTOMER',
  };
};

/**
 * Checkout & Customer Endpoints
 */
export const submitCheckout = async (payload) => {
  if (isVercelHosted) {
    return evaluateMockTransaction(payload);
  }

  try {
    const response = await apiClient.post('/api/v1/checkout', payload);
    return response.data;
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK') {
      return evaluateMockTransaction(payload);
    }
    throw err;
  }
};

export const getMyTransactions = async (page = 0, size = 20) => {
  if (isVercelHosted) {
    const list = getStoredTransactions();
    return {
      content: list.slice(page * size, (page + 1) * size),
      page,
      totalPages: Math.max(1, Math.ceil(list.length / size)),
      totalElements: list.length,
    };
  }

  try {
    const response = await apiClient.get('/api/v1/customer/transactions', {
      params: { page, size },
    });
    return response.data;
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK') {
      const list = getStoredTransactions();
      return {
        content: list.slice(page * size, (page + 1) * size),
        page,
        totalPages: Math.max(1, Math.ceil(list.length / size)),
        totalElements: list.length,
      };
    }
    throw err;
  }
};

export const getMyTransactionDetail = async (id) => {
  if (isVercelHosted) {
    const list = getStoredTransactions();
    return list.find((t) => t.id === id) || list[0];
  }

  try {
    const response = await apiClient.get(`/api/v1/customer/transactions/${id}`);
    return response.data;
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK') {
      const list = getStoredTransactions();
      return list.find((t) => t.id === id) || list[0];
    }
    throw err;
  }
};

/**
 * Analyst Dashboard & Metrics
 */
export const getMetrics = async () => {
  if (isVercelHosted) {
    return calculateMockMetrics();
  }

  try {
    const response = await apiClient.get('/api/v1/analyst/metrics');
    return response.data;
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK') {
      return calculateMockMetrics();
    }
    throw err;
  }
};

const calculateMockMetrics = () => {
  const txns = getStoredTransactions();
  const volume = txns.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const blocked = txns.filter((t) => t.status === 'BLOCKED').length;
  const pending = txns.filter((t) => t.status === 'PENDING_REVIEW').length;
  const approved = txns.filter((t) => t.status === 'APPROVED').length;
  return {
    totalVolumeToday: volume,
    blockedCount: blocked,
    pendingCount: pending,
    approvedCount: approved,
    autoBlockRate: ((blocked / Math.max(1, txns.length)) * 100).toFixed(1) + '%',
    avgLatencyMs: 38,
  };
};

export const getAnalystTransactions = async (status = 'ALL', page = 0, size = 20, search = '') => {
  if (isVercelHosted) {
    return filterMockTransactions(status, page, size, search);
  }

  try {
    const params = { status: status || 'ALL', page, size };
    if (search && search.trim() !== '') {
      params.search = search.trim();
    }
    const response = await apiClient.get('/api/v1/analyst/transactions', { params });
    return response.data;
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK') {
      return filterMockTransactions(status, page, size, search);
    }
    throw err;
  }
};

const filterMockTransactions = (status, page, size, search) => {
  let list = getStoredTransactions();
  if (status && status !== 'ALL') {
    list = list.filter((t) => t.status === status);
  }
  if (search && search.trim() !== '') {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (t) =>
        t.id?.toLowerCase().includes(q) ||
        t.ipAddress?.includes(q) ||
        t.userId?.toLowerCase().includes(q)
    );
  }
  return {
    content: list.slice(page * size, (page + 1) * size),
    page,
    totalPages: Math.max(1, Math.ceil(list.length / size)),
    totalElements: list.length,
  };
};

export const getTransactionDetail = async (id) => {
  if (isVercelHosted) {
    const list = getStoredTransactions();
    return list.find((t) => t.id === id) || list[0];
  }

  try {
    const response = await apiClient.get(`/api/v1/analyst/transactions/${id}`);
    return response.data;
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK') {
      const list = getStoredTransactions();
      return list.find((t) => t.id === id) || list[0];
    }
    throw err;
  }
};

export const adjudicateTransaction = async (id, action, notes) => {
  if (isVercelHosted) {
    return mockAdjudicate(id, action, notes);
  }

  try {
    const response = await apiClient.post(`/api/v1/analyst/transactions/${id}/adjudicate`, {
      action,
      notes,
    });
    return response.data;
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK') {
      return mockAdjudicate(id, action, notes);
    }
    throw err;
  }
};

const mockAdjudicate = (id, action, notes) => {
  const txns = getStoredTransactions();
  const target = txns.find((t) => t.id === id);
  const newStatus = action === 'APPROVE' ? 'APPROVED' : 'BLOCKED';
  if (target) {
    target.status = newStatus;
    target.reviewedByName = 'Compliance Analyst';
    target.adjudicationNotes = notes;
    saveStoredTransactions(txns);
  }
  appendStoredAudit({
    id: 'aud_' + Date.now().toString(36),
    timestamp: new Date().toISOString(),
    actorEmail: 'analyst@fraudguard.io',
    action: action === 'APPROVE' ? 'TXN_APPROVED' : 'TXN_BLOCKED',
    entityType: 'TRANSACTION',
    entityId: id,
    details: `Manual analyst override: ${action}. Notes: ${notes || 'None'}`,
  });
  return { success: true, transactionId: id, status: newStatus };
};

/**
 * Blacklists
 */
export const addBlacklist = async (targetType, targetValue, reason) => {
  if (isVercelHosted) {
    return mockAddBlacklist(targetType, targetValue, reason);
  }

  try {
    const response = await apiClient.post('/api/v1/analyst/blacklists', {
      targetType,
      targetValue,
      reason,
    });
    return response.data;
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK') {
      return mockAddBlacklist(targetType, targetValue, reason);
    }
    throw err;
  }
};

const mockAddBlacklist = (targetType, targetValue, reason) => {
  const list = getStoredBlacklists();
  const newEntry = {
    id: 'bl_' + Date.now().toString(36),
    type: targetType,
    value: targetValue,
    reason,
    createdAt: new Date().toISOString(),
    createdBy: 'analyst@fraudguard.io',
  };
  saveStoredBlacklists([newEntry, ...list]);
  appendStoredAudit({
    id: 'aud_' + Date.now().toString(36),
    timestamp: new Date().toISOString(),
    actorEmail: 'analyst@fraudguard.io',
    action: 'BLACKLIST_ADDED',
    entityType: targetType,
    entityId: targetValue,
    details: `Added ${targetType} to blacklist: ${reason}`,
  });
  return newEntry;
};

export const getBlacklists = async (targetType) => {
  if (isVercelHosted) {
    let list = getStoredBlacklists();
    if (targetType && targetType !== 'ALL') {
      list = list.filter((b) => b.type === targetType);
    }
    return list;
  }

  try {
    const params = targetType && targetType !== 'ALL' ? { targetType } : {};
    const response = await apiClient.get('/api/v1/analyst/blacklists', { params });
    return response.data;
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK') {
      let list = getStoredBlacklists();
      if (targetType && targetType !== 'ALL') {
        list = list.filter((b) => b.type === targetType);
      }
      return list;
    }
    throw err;
  }
};

export const deleteBlacklist = async (id) => {
  if (isVercelHosted) {
    const list = getStoredBlacklists().filter((b) => b.id !== id);
    saveStoredBlacklists(list);
    return { success: true };
  }

  try {
    const response = await apiClient.delete(`/api/v1/analyst/blacklists/${id}`);
    return response.data;
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK') {
      const list = getStoredBlacklists().filter((b) => b.id !== id);
      saveStoredBlacklists(list);
      return { success: true };
    }
    throw err;
  }
};

/**
 * Fraud Rules Engine
 */
export const getRules = async () => {
  if (isVercelHosted) {
    return getStoredRules();
  }

  try {
    const response = await apiClient.get('/api/v1/analyst/rules');
    return response.data;
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK') {
      return getStoredRules();
    }
    throw err;
  }
};

export const updateRule = async (id, payload) => {
  if (isVercelHosted) {
    const rules = getStoredRules();
    const idx = rules.findIndex((r) => r.id === String(id) || r.ruleCode === id);
    if (idx !== -1) {
      rules[idx] = { ...rules[idx], ...payload };
      saveStoredRules(rules);
      return rules[idx];
    }
    return payload;
  }

  try {
    const response = await apiClient.put(`/api/v1/analyst/rules/${id}`, payload);
    return response.data;
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK') {
      const rules = getStoredRules();
      const idx = rules.findIndex((r) => r.id === String(id) || r.ruleCode === id);
      if (idx !== -1) {
        rules[idx] = { ...rules[idx], ...payload };
        saveStoredRules(rules);
        return rules[idx];
      }
      return payload;
    }
    throw err;
  }
};

/**
 * Audit Logs
 */
export const getAuditLogs = async (page = 0, size = 20, action, actorEmail) => {
  if (isVercelHosted) {
    let list = getStoredAudit();
    if (action && action !== 'ALL') {
      list = list.filter((a) => a.action === action);
    }
    if (actorEmail && actorEmail.trim() !== '') {
      list = list.filter((a) => a.actorEmail?.toLowerCase().includes(actorEmail.trim().toLowerCase()));
    }
    return {
      content: list.slice(page * size, (page + 1) * size),
      page,
      totalPages: Math.max(1, Math.ceil(list.length / size)),
      totalElements: list.length,
    };
  }

  try {
    const params = { page, size };
    if (action && action !== 'ALL') params.action = action;
    if (actorEmail && actorEmail.trim() !== '') params.actorEmail = actorEmail.trim();
    const response = await apiClient.get('/api/v1/analyst/audit-logs', { params });
    return response.data;
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK') {
      let list = getStoredAudit();
      if (action && action !== 'ALL') {
        list = list.filter((a) => a.action === action);
      }
      if (actorEmail && actorEmail.trim() !== '') {
        list = list.filter((a) => a.actorEmail?.toLowerCase().includes(actorEmail.trim().toLowerCase()));
      }
      return {
        content: list.slice(page * size, (page + 1) * size),
        page,
        totalPages: Math.max(1, Math.ceil(list.length / size)),
        totalElements: list.length,
      };
    }
    throw err;
  }
};

/**
 * Helper for SSE Stream URL
 */
export const getDashboardStreamUrl = () => {
  return `${API_BASE_URL}/api/v1/analyst/dashboard/stream`;
};

/**
 * AI SAR Reports (Google Gemini 2.5 Flash)
 */
export const generateSar = async (transactionId) => {
  if (isVercelHosted) {
    const txn = getStoredTransactions().find((t) => t.id === transactionId) || getStoredTransactions()[0];
    return {
      id: 'sar_' + Date.now().toString(36),
      transactionId,
      reportText: generateMockSarText(txn),
      status: 'GENERATED',
      createdAt: new Date().toISOString(),
    };
  }

  try {
    const response = await apiClient.post(`/api/v1/analyst/transactions/${transactionId}/sar`, null, {
      timeout: 60000,
    });
    return response.data;
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK') {
      const txn = getStoredTransactions().find((t) => t.id === transactionId) || getStoredTransactions()[0];
      return {
        id: 'sar_' + Date.now().toString(36),
        transactionId,
        reportText: generateMockSarText(txn),
        status: 'GENERATED',
        createdAt: new Date().toISOString(),
      };
    }
    throw err;
  }
};

export const getSarReports = async (transactionId) => {
  if (isVercelHosted) {
    const txn = getStoredTransactions().find((t) => t.id === transactionId) || getStoredTransactions()[0];
    return [
      {
        id: 'sar_' + Date.now().toString(36),
        transactionId,
        reportText: generateMockSarText(txn),
        status: 'GENERATED',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  try {
    const response = await apiClient.get(`/api/v1/analyst/transactions/${transactionId}/sar`);
    return response.data;
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK') {
      const txn = getStoredTransactions().find((t) => t.id === transactionId) || getStoredTransactions()[0];
      return [
        {
          id: 'sar_' + Date.now().toString(36),
          transactionId,
          reportText: generateMockSarText(txn),
          status: 'GENERATED',
          createdAt: new Date().toISOString(),
        },
      ];
    }
    throw err;
  }
};

export const updateSarStatus = async (sarId, status, notes = '', reportText = null) => {
  const payload = { status, notes };
  if (reportText !== null && reportText !== undefined) {
    payload.reportText = reportText;
  }

  if (isVercelHosted) {
    return { id: sarId, status, notes, reportText, updatedAt: new Date().toISOString() };
  }

  try {
    const response = await apiClient.patch(`/api/v1/analyst/sar/${sarId}/status`, payload);
    return response.data;
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK') {
      return { id: sarId, status, notes, reportText, updatedAt: new Date().toISOString() };
    }
    throw err;
  }
};

/**
 * 3D Secure (3DS) OTP Step-Up Authentication
 */
export const issueOtpChallenge = async (transactionId) => {
  if (isVercelHosted) {
    return {
      success: true,
      transactionId,
      message: '3DS OTP challenge issued. Demo auto-fill code: 749201',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    };
  }

  try {
    const response = await apiClient.post('/api/v1/customer/otp/issue', { transactionId });
    return response.data;
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK') {
      return {
        success: true,
        transactionId,
        message: '3DS OTP challenge issued. Demo auto-fill code: 749201',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      };
    }
    throw err;
  }
};

export const verifyOtp = async (transactionId, otp) => {
  if (isVercelHosted) {
    return mockVerifyOtp(transactionId, otp);
  }

  try {
    const response = await apiClient.post('/api/v1/customer/otp/verify', { transactionId, otp });
    return response.data;
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK') {
      return mockVerifyOtp(transactionId, otp);
    }
    throw err;
  }
};

const mockVerifyOtp = (transactionId, otp) => {
  const txns = getStoredTransactions();
  const txn = txns.find((t) => t.id === transactionId);
  if (txn) {
    txn.status = 'APPROVED';
    saveStoredTransactions(txns);
  }
  appendStoredAudit({
    id: 'aud_' + Date.now().toString(36),
    timestamp: new Date().toISOString(),
    actorEmail: 'customer@fraudguard.io',
    action: 'TXN_APPROVED',
    entityType: 'TRANSACTION',
    entityId: transactionId,
    details: 'Customer completed 3D-Secure biometric OTP verification challenge.',
  });
  return { success: true, verified: true, transactionId, status: 'APPROVED' };
};

export const getOtpStatus = async (transactionId) => {
  if (isVercelHosted) {
    return { transactionId, isVerified: true, status: 'APPROVED' };
  }

  try {
    const response = await apiClient.get(`/api/v1/customer/otp/status/${transactionId}`);
    return response.data;
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK') {
      return { transactionId, isVerified: true, status: 'APPROVED' };
    }
    throw err;
  }
};

/**
 * Fraud Syndicate Link Graph
 */
export const getGraph = async (params) => {
  if (isVercelHosted) {
    return INITIAL_GRAPH;
  }

  try {
    const response = await apiClient.get('/api/v1/analyst/graph', { params });
    return response.data;
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK') {
      return INITIAL_GRAPH;
    }
    throw err;
  }
};

export const getTransactionGraph = async (id) => {
  if (isVercelHosted) {
    return INITIAL_GRAPH;
  }

  try {
    const response = await apiClient.get(`/api/v1/analyst/graph/transaction/${id}`);
    return response.data;
  } catch (err) {
    if (!err.response || err.code === 'ERR_NETWORK') {
      return INITIAL_GRAPH;
    }
    throw err;
  }
};
