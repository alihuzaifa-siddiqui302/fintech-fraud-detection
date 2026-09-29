import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import ToastContainer from '../components/Toast';

export const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type, message, title) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    setToasts((prev) => {
      // Prevent stacking duplicate toasts with identical message and type
      if (prev.some((t) => t.message === message && t.type === type)) {
        return prev;
      }
      return [...prev, { id, type, message, title }];
    });

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);

    return id;
  }, [removeToast]);

  const toast = useMemo(() => ({
    success: (message, title = 'Success') => addToast('success', message, title),
    error: (message, title = 'Error') => addToast('error', message, title),
    warning: (message, title = 'Warning') => addToast('warning', message, title),
    info: (message, title = 'Info') => addToast('info', message, title),
  }), [addToast]);

  const contextValue = useMemo(() => ({ toast, addToast, removeToast }), [toast, addToast, removeToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
};

export default useToast;
