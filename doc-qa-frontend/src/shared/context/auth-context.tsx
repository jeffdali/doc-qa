"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiClient, authStorage } from "../api/client";
import { UserResponse } from "../api/types";

interface AuthContextType {
  user: UserResponse | null;
  loading: boolean;
  login: (token: string, user: UserResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ["/login", "/signup", "/"];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initAuth = async () => {
      const token = authStorage.getToken();
      if (!token) {
        setLoading(false);
        if (!PUBLIC_PATHS.includes(pathname)) {
          router.replace("/login");
        }
        return;
      }
      try {
        const profile = await apiClient.auth.me();
        setUser(profile);
      } catch (error) {
        authStorage.removeToken();
        setUser(null);
        if (!PUBLIC_PATHS.includes(pathname)) {
          router.replace("/login");
        }
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, [pathname, router]);

  const login = (token: string, newUser: UserResponse) => {
    authStorage.setToken(token);
    setUser(newUser);
    router.push("/dashboard");
  };

  const logout = () => {
    authStorage.removeToken();
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
