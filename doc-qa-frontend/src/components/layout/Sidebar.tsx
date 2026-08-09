"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/shared/context/auth-context";
import { apiClient } from "@/shared/api/client";
import { DocumentResponse } from "@/shared/api/types";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  LogOut,
  MessageSquare,
  Plus,
  Layers,
  LayoutDashboard,
  UploadCloud,
  FileText,
  Menu,
  X,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    try {
      const docs = await apiClient.documents.list();
      setDocuments(docs);
    } catch (err) {
      console.error("Failed to fetch documents for sidebar:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDocuments();
    setMobileOpen(false); // Close mobile menu on navigation
  }, [fetchDocuments, pathname]);

  if (!user) return null;

  const sidebarContent = (
    <div className="flex flex-col h-full w-full bg-elevated select-none">
      {/* Top Brand & Actions */}
      <div className="p-4 border-b border-border-default flex flex-col gap-3 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-default bg-subtle p-0.5 shrink-0">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-base">
              <BookOpen className="h-4 w-4 text-primary-400" />
            </div>
          </div>
          <span className="text-base font-bold tracking-tight text-text-primary">
            DocQ&A Engine
          </span>
        </Link>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <Button
            size="sm"
            variant={pathname === "/dashboard" ? "default" : "outline"}
            onClick={() => router.push("/dashboard")}
            className={`w-full justify-start gap-2 text-xs font-medium h-9 ${
              pathname === "/dashboard"
                ? "bg-primary-500 hover:bg-primary-400 text-primary-900 font-bold"
                : "border-border-default hover:bg-subtle text-text-secondary hover:text-text-primary"
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
            <span>Dashboard</span>
          </Button>

          <Button
            size="sm"
            variant={pathname === "/upload" ? "default" : "outline"}
            onClick={() => router.push("/upload")}
            className={`w-full justify-start gap-2 text-xs font-medium h-9 ${
              pathname === "/upload"
                ? "bg-primary-500 hover:bg-primary-400 text-primary-900 font-bold"
                : "border-border-default hover:bg-subtle text-text-secondary hover:text-text-primary"
            }`}
          >
            <UploadCloud className="h-3.5 w-3.5 shrink-0" />
            <span>Upload</span>
          </Button>
        </div>
      </div>

      {/* Conversations List Header */}
      <div className="px-4 py-3 flex items-center justify-between text-[11px] font-bold text-text-tertiary uppercase tracking-wider shrink-0">
        <span>Your Conversations</span>
        <span className="bg-subtle px-1.5 py-0.5 rounded text-[10px] text-text-secondary font-mono">
          {documents.length}
        </span>
      </div>

      {/* Conversations Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1 py-1 min-h-0">
        {loading && documents.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 px-4 text-xs text-text-tertiary bg-subtle/30 rounded-xl border border-dashed border-border-default mx-1">
            <FileText className="h-6 w-6 text-text-disabled mx-auto mb-2 opacity-50" />
            <p className="font-medium text-text-secondary">No documents indexed</p>
            <p className="mt-0.5 text-[11px]">Upload a file to start RAG chat</p>
          </div>
        ) : (
          documents.map((doc) => {
            const isActive = pathname === `/chat/${doc.document_id}`;
            return (
              <div
                key={doc.document_id}
                onClick={() => router.push(`/chat/${doc.document_id}`)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                  isActive
                    ? "bg-primary-500/15 border border-primary-500/30 text-text-primary"
                    : "hover:bg-subtle text-text-secondary hover:text-text-primary border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <MessageSquare
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? "text-primary-400 font-bold" : "text-text-tertiary group-hover:text-text-secondary"
                    }`}
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span
                      className={`text-xs truncate leading-tight ${
                        isActive ? "font-semibold text-text-primary" : "font-medium"
                      }`}
                    >
                      {doc.filename}
                    </span>
                    <span className="text-[10px] text-text-tertiary flex items-center gap-1 mt-0.5">
                      <Layers className="h-2.5 w-2.5 text-primary-400" />
                      {doc.chunk_count} chunks
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom User / Logout Footer */}
      <div className="p-3.5 border-t border-border-default bg-base/50 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-primary-900 shrink-0">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-bold text-text-primary truncate leading-tight">
              {user.full_name}
            </span>
            <span className="text-[10px] text-text-tertiary truncate leading-tight mt-0.5">
              {user.email}
            </span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          title="Sign Out"
          className="h-8 w-8 p-0 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 shrink-0 transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside className="hidden md:flex w-64 lg:w-72 border-r border-border-default flex-col h-screen shrink-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Top Header & Drawer Toggle */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-elevated border-b border-border-default shrink-0 z-40">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-default bg-subtle p-0.5">
            <BookOpen className="h-4 w-4 text-primary-400" />
          </div>
          <span className="font-bold text-sm tracking-tight text-text-primary">
            DocQ&A
          </span>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 h-8 w-8 text-text-secondary hover:text-text-primary"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-elevated h-full shadow-2xl z-10">
            <div className="absolute top-3 right-3 z-20">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileOpen(false)}
                className="h-8 w-8 p-0 rounded-full text-text-secondary hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
