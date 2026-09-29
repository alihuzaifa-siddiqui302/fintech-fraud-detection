import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DollarSign,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Search,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { getMetrics, getAnalystTransactions, apiClient } from '../../api/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/StatusBadge';
import RiskScorePill from '../../components/RiskScorePill';
import CountryFlag from '../../components/CountryFlag';
import CopyButton from '../../components/CopyButton';
import PagedTable from '../../components/PagedTable';
import ForensicDrawer from '../../components/ForensicDrawer';
import clsx from 'clsx';

export const AnalystDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const [transactions, setTransactions] = useState([]);
  const [txnsLoading, setTxnsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [flashingTxnId, setFlashingTxnId] = useState(null);

  const { token } = useAuth();
  const toast = useToast();
  const abortControllerRef = useRef(null);

  // 1. Fetch Metrics
  const fetchMetricsData = useCallback(async () => {
    try {
      const data = await getMetrics();
      setMetrics(data);
    } catch {
      // ignore in silent poll
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // 2. Fetch Transactions
  const fetchTxnsData = useCallback(async (targetPage = 0, status = 'ALL', search = '') => {
    setTxnsLoading(true);
    try {
      const data = await getAnalystTransactions(status, targetPage, 15, search);
      setTransactions(data.content || []);
      setPage(data.page || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      toast.error('Failed to load transaction review queue');
    } finally {
      setTxnsLoading(false);
    }
  }, [toast]);

  // Keep latest refs for SSE callback without triggering reconnects
  const stateRef = useRef({ statusFilter, searchTerm, page, fetchTxnsData, fetchMetricsData, toast });
  useEffect(() => {
    stateRef.current = { statusFilter, searchTerm, page, fetchTxnsData, fetchMetricsData, toast };
  });

  // Initial metrics load
  useEffect(() => {
    fetchMetricsData();
  }, [fetchMetricsData]);

  // Fetch transactions on page or status filter change
  useEffect(() => {
    fetchTxnsData(page, statusFilter, searchTerm);
  }, [fetchTxnsData, page, statusFilter]);

  // Metric Auto-refresh every 60s
  useEffect(() => {
    const metricInterval = setInterval(() => {
      fetchMetricsData();
    }, 60000);
    return () => clearInterval(metricInterval);
  }, [fetchMetricsData]);

  // Table Auto-refresh every 30s
  useEffect(() => {
    const txnInterval = setInterval(() => {
      fetchTxnsData(page, statusFilter, searchTerm);
    }, 30000);
    return () => clearInterval(txnInterval);
  }, [fetchTxnsData, page, statusFilter, searchTerm]);

  // 3. SSE Stream Connection with Bearer Token - stable on [token]
  useEffect(() => {
    if (!token) return;

    abortControllerRef.current = new AbortController();
    const streamUrl = `${apiClient.defaults.baseURL || 'http://localhost:8080'}/api/v1/analyst/dashboard/stream`;

    const startStream = async () => {
      try {
        const response = await fetch(streamUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
          signal: abortControllerRef.current.signal,
        });

        if (!response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop(); // keep last incomplete chunk

          for (const line of lines) {
            const dataMatch = line.match(/^data:\s*(.+)$/m);
            if (dataMatch) {
              try {
                const event = JSON.parse(dataMatch[1]);
                if (event && event.transactionId) {
                  // Trigger visual flash
                  setFlashingTxnId(event.transactionId);
                  setTimeout(() => setFlashingTxnId(null), 3000);

                  // Refresh table and metrics using current state ref
                  stateRef.current.fetchTxnsData(
                    stateRef.current.page,
                    stateRef.current.statusFilter,
                    stateRef.current.searchTerm
                  );
                  stateRef.current.fetchMetricsData();

                  if (event.status === 'PENDING_REVIEW') {
                    stateRef.current.toast.warning(
                      `High risk transaction ${event.transactionId.substring(0, 8)} flagged for review!`,
                      'SSE Review Alert'
                    );
                  }
                }
              } catch {
                // Ignore parsing non-JSON heartbeat
              }
            }
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          // Silent stream reconnect
        }
      }
    };

    startStream();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [token]);

  const handleFilterChange = (status) => {
    setStatusFilter(status);
    setPage(0);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    fetchTxnsData(0, statusFilter, searchTerm);
  };

  const formatCurrency = (amt) => {
    if (amt === undefined || amt === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(amt);
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const now = Date.now();
      const diffSec = Math.floor((now - new Date(dateStr).getTime()) / 1000);

      if (diffSec < 60) return 'just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}h ago`;
      const diffDays = Math.floor(diffHour / 24);
      return `${diffDays}d ago`;
    } catch {
      return dateStr;
    }
  };

  const columns = [
    {
      header: 'Txn ID',
      accessor: 'id',
      render: (row) => (
        <div className="flex items-center gap-1 font-mono text-xs text-slate-300">
          <span>{row.id ? row.id.substring(0, 8) : 'N/A'}</span>
          <CopyButton text={row.id} label="Copy full UUID" />
        </div>
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (row) => (
        <span className="font-mono font-semibold text-slate-100 text-sm">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      header: 'Risk Score',
      accessor: 'riskScore',
      render: (row) => <RiskScorePill score={row.riskScore} size="sm" />,
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      header: 'IP Address',
      accessor: 'ipAddress',
      render: (row) => (
        <span className="font-mono text-xs text-slate-400">{row.ipAddress || '127.0.0.1'}</span>
      ),
    },
    {
      header: 'Country',
      accessor: 'ipCountry',
      render: (row) => <CountryFlag countryCode={row.ipCountry} />,
    },
    {
      header: 'Time',
      accessor: 'createdAt',
      render: (row) => (
        <span className="text-xs text-slate-400 font-mono">
          {formatRelativeTime(row.createdAt)}
        </span>
      ),
    },
    {
      header: 'Action',
      align: 'right',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedTxn(row);
          }}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-brand-500/20 text-slate-400 hover:text-brand-300 border border-slate-700 hover:border-brand-500/30 transition-all inline-flex items-center justify-center"
          title="Open Forensic Drawer"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>Analyst Monitoring Dashboard</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time fraud queue triage, velocity telemetry, and compliance investigation.
          </p>
        </div>

        <button
          onClick={() => {
            fetchMetricsData();
            fetchTxnsData(page, statusFilter, searchTerm);
          }}
          disabled={metricsLoading || txnsLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={clsx('w-3.5 h-3.5', (metricsLoading || txnsLoading) && 'animate-spin')} />
          <span>Sync Realtime</span>
        </button>
      </div>

      {/* METRIC CARDS ROW (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Volume */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs uppercase tracking-wider font-semibold">Total Volume</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-brand-400 border border-indigo-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          {metricsLoading ? (
            <div className="h-8 w-28 bg-slate-800 animate-pulse rounded my-1" />
          ) : (
            <div className="text-2xl font-bold font-mono text-white">
              {formatCurrency(metrics?.totalVolumeToday)}
            </div>
          )}
          <span className="text-[11px] text-slate-500 font-medium">Today's transactions aggregate</span>
        </div>

        {/* Card 2: Blocked */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-red-500/30 shadow-xl backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs uppercase tracking-wider font-semibold text-red-300">Blocked</span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          {metricsLoading ? (
            <div className="h-8 w-16 bg-slate-800 animate-pulse rounded my-1" />
          ) : (
            <div className="text-2xl font-bold font-mono text-red-400">
              {metrics?.blockedCount ?? 0}
            </div>
          )}
          <span className="text-[11px] text-red-400/80 font-medium">
            Auto-block rate: {metrics?.autoBlockRate || '0.0%'}
          </span>
        </div>

        {/* Card 3: Pending Review */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-amber-500/30 shadow-xl backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase tracking-wider font-semibold text-amber-300">Pending Review</span>
              {(metrics?.pendingCount || 0) > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          {metricsLoading ? (
            <div className="h-8 w-16 bg-slate-800 animate-pulse rounded my-1" />
          ) : (
            <div className="text-2xl font-bold font-mono text-amber-400">
              {metrics?.pendingCount ?? 0}
            </div>
          )}
          <span className="text-[11px] text-amber-400/80 font-medium">Awaiting manual adjudication</span>
        </div>

        {/* Card 4: Approved */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-xl backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-300">Approved</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          {metricsLoading ? (
            <div className="h-8 w-16 bg-slate-800 animate-pulse rounded my-1" />
          ) : (
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {metrics?.approvedCount ?? 0}
            </div>
          )}
          <span className="text-[11px] text-emerald-400/80 font-medium">Clean automated clearances</span>
        </div>
      </div>

      {/* TRANSACTION STREAM */}
      <div className="space-y-4">
        {/* Filters & Search Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'ALL', label: 'All' },
              {
                id: 'PENDING_REVIEW',
                label: 'Pending',
                count: metrics?.pendingCount,
              },
              { id: 'BLOCKED', label: 'Blocked' },
              { id: 'APPROVED', label: 'Approved' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleFilterChange(tab.id)}
                className={clsx(
                  'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5',
                  statusFilter === tab.id
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60'
                )}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-400 text-slate-950 font-bold">
                    ●{tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search IP or Txn ID prefix..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </form>
        </div>

        {/* Live Stream Table */}
        <PagedTable
          columns={columns}
          data={transactions}
          page={page}
          totalPages={totalPages}
          onPageChange={(p) => fetchTxnsData(p, statusFilter, searchTerm)}
          onRowClick={(row) => setSelectedTxn(row)}
          loading={txnsLoading}
          rowClassName={(row) =>
            clsx(
              row.id === flashingTxnId && 'animate-flash-amber',
              row.status === 'PENDING_REVIEW' && 'bg-amber-950/10'
            )
          }
          emptyTitle="No transactions match this filter"
          emptyMessage="New transactions evaluated in real time will appear here automatically."
          emptyIcon={SlidersHorizontal}
        />
      </div>

      {/* Forensic Drawer */}
      <ForensicDrawer
        transaction={selectedTxn}
        isOpen={Boolean(selectedTxn)}
        onClose={() => setSelectedTxn(null)}
        onAdjudicated={() => {
          fetchTxnsData(page, statusFilter, searchTerm);
          fetchMetricsData();
        }}
      />
    </div>
  );
};

export default AnalystDashboard;
