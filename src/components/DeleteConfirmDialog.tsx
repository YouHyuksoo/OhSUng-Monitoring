/**
 * @file src/components/DeleteConfirmDialog.tsx
 * @description
 * 데이터 삭제 확인 다이얼로그 컴포넌트
 * - 삭제할 데이터의 요약 정보 표시
 * - 확인/취소 버튼 제공
 * - 모달 배경 클릭 시 닫기
 */

import { AlertTriangle, X } from "lucide-react";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DeleteConfirmDialog({
  isOpen,
  title,
  message,
  itemCount,
  onConfirm,
  onCancel,
  isLoading = false,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="bg-card border border-border rounded-lg shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-4">
          <p className="text-muted-foreground">{message}</p>

          {/* 삭제할 항목 수 */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
            <p className="text-sm">
              <span className="font-semibold text-red-600">
                {itemCount.toLocaleString()}개
              </span>
              <span className="text-muted-foreground ml-2">의 데이터가 삭제됩니다.</span>
            </p>
          </div>

          {/* 경고 메시지 */}
          <p className="text-xs text-muted-foreground bg-amber-500/5 border border-amber-500/20 rounded p-2">
            ⚠️ 이 작업은 취소할 수 없습니다. 신중하게 진행하세요.
          </p>
        </div>

        {/* 푸터 */}
        <div className="flex items-center gap-3 p-6 border-t border-border bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-border rounded-lg font-medium text-foreground hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                삭제 중...
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                삭제
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
