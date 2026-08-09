"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/shared/context/auth-context";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, Sparkles, User as UserIcon } from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-default bg-elevated/80 backdrop-blur-xl transition-all duration-300">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
        <Link
          href="/dashboard"
          className="group flex items-center gap-2.5 transition-transform duration-200 active:scale-95"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-default bg-subtle p-0.5">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-base">
              <BookOpen className="h-5 w-5 text-primary-400 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-text-primary">
              DocQ&A
            </span>
            
          </div>
        </Link>

        {user ? (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-border-default bg-subtle px-3 py-1.5 backdrop-blur-md">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-primary-900">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold leading-none text-text-primary">
                  {user.full_name}
                </span>
                <span className="text-[10px] text-text-secondary leading-tight">
                  {user.email}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="flex items-center gap-1.5 border-border-default hover:border-danger-text/50 hover:bg-danger-bg hover:text-danger-text transition-all duration-200"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Sign Out</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-text-secondary hover:text-text-primary hover:bg-subtle">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-primary-500 hover:bg-primary-400 text-primary-900 font-medium">
                Get Started
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
