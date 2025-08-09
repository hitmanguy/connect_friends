"use client";

import React, { createContext, useContext, useState } from "react";

type ToastVariant = "default" | "success" | "destructive";

interface ToastProps {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toast: (props: ToastProps) => void;
  toasts: ToastProps[];
  dismissToast: (index: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const toast = (props: ToastProps) => {
    const newToast = { ...props, duration: props.duration || 5000 };
    setToasts((prevToasts) => [...prevToasts, newToast]);

    // Auto-dismiss after duration
    setTimeout(() => {
      setToasts((prevToasts) =>
        prevToasts.filter((_, i) => i !== toasts.length)
      );
    }, newToast.duration);
  };

  const dismissToast = (index: number) => {
    setToasts((prevToasts) => prevToasts.filter((_, i) => i !== index));
  };

  return (
    <ToastContext.Provider value={{ toast, toasts, dismissToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const context = useContext(ToastContext);
  if (!context) return null;

  return (
    <div className="fixed bottom-0 right-0 p-4 space-y-2 z-50">
      {context.toasts.map((toast, index) => (
        <div
          key={index}
          className={`p-4 rounded-lg shadow-lg ${
            toast.variant === "success"
              ? "bg-green-100 text-green-800 border-green-200"
              : toast.variant === "destructive"
              ? "bg-red-100 text-red-800 border-red-200"
              : "bg-white text-gray-800 border-gray-200"
          } border flex items-start`}
        >
          <div className="flex-1">
            {toast.title && <h4 className="font-medium">{toast.title}</h4>}
            {toast.description && (
              <p className="text-sm mt-1">{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => context.dismissToast(index)}
            className="ml-2 text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
