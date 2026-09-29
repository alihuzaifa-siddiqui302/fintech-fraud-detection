import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Shield, ShoppingBag, History, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import clsx from 'clsx';

export const CustomerPortal = () => {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.info('You have been logged out.');
    navigate('/login', { replace: true });
  };

  const getInitials = (name) => {
    if (!name) return 'CU';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const navItems = [
    { to: '/portal/checkout', label: 'Checkout', icon: ShoppingBag },
    { to: '/portal/transactions', label: 'My Transactions', icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between flex-shrink-0">
        <div>
          {/* Logo & Header */}
          <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-brand-400">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-white block">FraudGuard</span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Portal</span>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Customer
            </span>
          </div>

          {/* Nav links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                    )
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-semibold text-xs flex items-center justify-center select-none">
              {getInitials(user?.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Customer'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-slate-100 text-xs font-medium transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-slate-950 min-h-screen overflow-y-auto p-4 sm:p-6 lg:p-10">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default CustomerPortal;
