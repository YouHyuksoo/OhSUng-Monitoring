/**
 * @file src/lib/auth-context.tsx
 * @description
 * 관리자 인증 Context
 * - 간단한 비밀번호 기반 인증
 * - localStorage에 토큰 저장
 * - 관리자 페이지 보호
 */

"use client";

import { createContext, useContext, useEffect, useState } from "react";

const DEFAULT_ADMIN_PASSWORD = "admin123"; // 기본 비밀번호 (프로덕션에서는 변경 필요)

interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  setPassword: (newPassword: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // 초기 로드: localStorage에서 토큰 확인
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const savedPassword = localStorage.getItem("admin_password");

    // 토큰이 있으면 인증됨 상태로 설정
    if (token && token === "authenticated") {
      setIsAuthenticated(true);
    }

    // 저장된 비밀번호가 없으면 기본값 저장
    if (!savedPassword) {
      localStorage.setItem("admin_password", DEFAULT_ADMIN_PASSWORD);
    }

    setIsLoaded(true);
  }, []);

  const login = (password: string): boolean => {
    const savedPassword = localStorage.getItem("admin_password") || DEFAULT_ADMIN_PASSWORD;

    if (password === savedPassword) {
      localStorage.setItem("admin_token", "authenticated");
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    setIsAuthenticated(false);
  };

  const setPassword = (newPassword: string) => {
    if (newPassword && newPassword.length >= 4) {
      localStorage.setItem("admin_password", newPassword);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, setPassword }}>
      {isLoaded ? children : null}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
