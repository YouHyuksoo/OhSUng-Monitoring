/**
 * @file src/components/ui/confirm-dialog.tsx
 * @description
 * 커스텀 확인 다이얼로그 컴포넌트
 * 브라우저 기본 confirm() 대신 사용하는 스타일이 적용된 확인 창입니다.
 */

"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning" | "info";
}

export function ConfirmDialog({
  title,
  message,
  confirmText = "확인",
  cancelText = "취소",
  onConfirm,
  onCancel,
  variant = "warning",
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const variantStyles = {
    danger: "bg-red-600 hover:bg-red-700",
    warning: "bg-yellow-600 hover:bg-yellow-700",
    info: "bg-blue-600 hover:bg-blue-700",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* 다이얼로그 */}
      <div className="relative bg-card border rounded-lg shadow-lg max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {mounted && <X className="w-5 h-5" />}
          </button>
        </div>

        {/* 내용 */}
        <div className="p-4">
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        {/* 버튼 */}
        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border rounded-md hover:bg-accent transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm text-white rounded-md transition-colors ${variantStyles[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
