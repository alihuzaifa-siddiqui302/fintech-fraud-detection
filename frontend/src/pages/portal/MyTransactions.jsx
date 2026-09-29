import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, RefreshCw, ShoppingBag } from 'lucide-react';
import { getMyTransactions } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import PagedTable from '../../components/PagedTable';
import StatusBadge from '../../components/StatusBadge';
import RiskScorePill from '../../components/RiskScorePill';
import CopyButton from '../../components/CopyButton';

export const MyTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const toast = useToast();
  const navigate = useNavigate();

  const fetchTransactions = useCallback(async (targetPage = 0) => {
    setLoading(true);
    try {
      const data = await getMyTransactions(targetPage, 10);
      setTransactions(data.content || []);
      setPage(data.page || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      toast.error('Unable to fetch your transaction history');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTransactions(0);
  }, [fetchTransactions]);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    if (amount === undefined || amount === null) return '$0.00';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    } catch {
      return `${currency} ${amount}`;
    }
  };

  const columns = [
    {
      header: 'Date & Time',
      accessor: 'createdAt',
      render: (row) => (
        <span className="text-xs text-slate-300 font-medium">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (row) => (
        <span className="font-mono font-semibold text-slate-100 text-sm">
          {formatCurrency(row.amount, row.currency)}
        </span>
      ),
    },
    {
      header: 'Decision',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      header: 'Risk Score',
      accessor: 'riskScore',
      render: (row) => <RiskScorePill score={row.riskScore} size="sm" />,
    },
    {
      header: 'Transaction ID',
      accessor: 'id',
      render: (row) => (
        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400">
          <span>{row.id ? row.id.substring(0, 10) + '...' : 'N/A'}</span>
          <CopyButton text={row.id} label="Copy Transaction ID" />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <History className="w-6 h-6 text-brand-400" />
            <span>My Transactions</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Complete compliance ledger of your evaluated payment transactions.
          </p>
        </div>

        <button
          onClick={() => fetchTransactions(page)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Table */}
      <PagedTable
        columns={columns}
        data={transactions}
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => fetchTransactions(p)}
        loading={loading}
        emptyTitle="No transactions yet"
        emptyMessage="Try the checkout simulator to generate your first transaction and test fraud defense rules."
        emptyIcon={History}
      />

      {transactions.length === 0 && !loading && (
        <div className="flex justify-center">
          <button
            onClick={() => navigate('/portal/checkout')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Go to Checkout Simulator</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default MyTransactions;
