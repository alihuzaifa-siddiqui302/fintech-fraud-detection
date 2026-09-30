import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import PrivateRoute from './components/PrivateRoute';

import Login from './pages/Login';
import CustomerPortal from './pages/portal/CustomerPortal';
import Checkout from './pages/portal/Checkout';
import MyTransactions from './pages/portal/MyTransactions';

import AnalystCockpit from './pages/admin/AnalystCockpit';
import AnalystDashboard from './pages/admin/AnalystDashboard';
import RulesManager from './pages/admin/RulesManager';
import Blacklists from './pages/admin/Blacklists';
import FraudGraph from './pages/admin/FraudGraph';
import AuditLog from './pages/admin/AuditLog';

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />

            {/* Customer Portal */}
            <Route
              path="/portal"
              element={
                <PrivateRoute requiredRole="ROLE_CUSTOMER">
                  <CustomerPortal />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="/portal/checkout" replace />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="transactions" element={<MyTransactions />} />
            </Route>

            {/* Analyst Cockpit */}
            <Route
              path="/admin"
              element={
                <PrivateRoute requiredRole="ROLE_ANALYST">
                  <AnalystCockpit />
                </PrivateRoute>
              }
            >
              <Route index element={<AnalystDashboard />} />
              <Route path="rules" element={<RulesManager />} />
              <Route path="blacklists" element={<Blacklists />} />
              <Route path="graph" element={<FraudGraph />} />
              <Route path="audit" element={<AuditLog />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
