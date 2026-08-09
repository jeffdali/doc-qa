"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/shared/context/auth-context";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  const isAuthOrLanding = pathname === "/" || pathname === "/login" || pathname === "/signup";

  // If loading auth, show simple spinner
  if (loading) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  // If not logged in or on landing/auth pages, show Navbar layout
  if (!user || isAuthOrLanding) {
    return (
      <div className="min-h-screen flex flex-col flex-1 bg-background text-foreground">
        <Navbar />
        <main className="flex-1 flex flex-col min-h-0 relative">{children}</main>
      </div>
    );
  }

  const isChatPage = pathname?.startsWith("/chat/");

  // When logged in, show sleek left Sidebar instead of the top Navbar
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main
        className={`flex-1 flex flex-col min-w-0 h-screen relative ${
          isChatPage ? "overflow-hidden" : "overflow-y-auto"
        }`}
      >
        {children}
      </main>
    </div>
  );
};
