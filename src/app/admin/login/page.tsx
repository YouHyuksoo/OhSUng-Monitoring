/**
 * @file src/app/admin/login/page.tsx
 * @description
 * 관리자 로그인 페이지
 * - 비밀번호 입력
 * - 인증 토큰 저장
 * - 관리자 대시보드 접근 제어
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Lock, ArrowLeft, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!password) {
        setError("비밀번호를 입력해주세요.");
        setIsLoading(false);
        return;
      }

      if (login(password)) {
        // 성공적으로 로그인됨
        router.push("/admin");
      } else {
        setError("비밀번호가 올바르지 않습니다.");
        setPassword("");
      }
    } catch (err) {
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 돌아가기 버튼 */}
        <button
          onClick={() => router.push("/")}
          className="mb-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">돌아가기</span>
        </button>

        {/* 로그인 카드 */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 backdrop-blur-sm">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-500/20 rounded-lg mx-auto mb-4">
              <Lock className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">관리자 로그인</h1>
            <p className="text-sm text-slate-400">
              관리자 대시보드에 접근하려면 비밀번호를 입력해주세요.
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* 로그인 폼 */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력해주세요"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={isLoading}
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-2">
                💡 기본 비밀번호: admin123 (설정에서 변경 가능)
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !password}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          {/* 안내 문구 */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-400">
              <strong>📌 주의:</strong> 이것은 기본 인증 시스템입니다. 프로덕션 환경에서는
              강력한 암호화와 보안 인증 시스템을 사용해주세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
