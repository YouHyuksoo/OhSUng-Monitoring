/**
 * @file src/components/ui/toast.tsx
 * @description
 * 커스텀 토스트/메시지 박스 컴포넌트
 * PLC 연결 테스트 결과 등을 표시하는 데 사용됩니다.
 */

"use client";

import { useEffect } from "react";
import { X, CheckCircle, XCircle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  type: ToastType;
  title: string;
  message?: string;
  onClose: () => void;
  duration?: number;
}

export function Toast({
  type,
  title,
  message,
  onClose,
  duration = 5000,
}: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-6 h-6 text-green-500" />,
    error: <XCircle className="w-6 h-6 text-red-500" />,
    info: <Info className="w-6 h-6 text-blue-500" />,
  };

  const backgrounds = {
    success:
      "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
    error: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
    info: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800",
  };

  const textColors = {
    success: "text-green-800 dark:text-green-300",
    error: "text-red-800 dark:text-red-300",
    info: "text-blue-800 dark:text-blue-300",
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-5 fade-in duration-300">
      <div
        className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg min-w-[320px] max-w-md ${backgrounds[type]}`}
      >
        <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
        <div className="flex-1">
          <h3 className={`font-semibold text-sm ${textColors[type]}`}>
            {title}
          </h3>
          {message && (
            <p className={`text-sm mt-1 ${textColors[type]} opacity-90`}>
              {message}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className={`flex-shrink-0 ${textColors[type]} hover:opacity-70 transition-opacity`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
