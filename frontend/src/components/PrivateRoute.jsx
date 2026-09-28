import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const PrivateRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    if (user?.role === 'ROLE_ANALYST') {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/portal/checkout" replace />;
    }
  }

  return children;
};

export default PrivateRoute;
