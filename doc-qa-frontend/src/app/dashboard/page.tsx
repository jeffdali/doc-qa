"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/shared/context/auth-context";
import { apiClient } from "@/shared/api/client";
import { DocumentResponse } from "@/shared/api/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadModal } from "@/features/documents/UploadModal";
import {
  FileText,
  UploadCloud,
  Trash2,
  MessageSquare,
  MessageSquareX,
  Sparkles,
  Search,
  Database,
  Calendar,
  Layers,
} from "lucide-react";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);
  const router = useRouter();

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const docs = await apiClient.documents.list();
      setDocuments(docs);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch knowledge base.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (user) {
      fetchDocuments();
    }
  }, [user, authLoading, router, fetchDocuments]);

  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this document from your vector store? This action cannot be undone.")) {
      return;
    }
    setDeletingId(docId);
    try {
      await apiClient.documents.delete(docId);
      setDocuments((prev) => prev.filter((d) => d.document_id !== docId));
    } catch (err: any) {
      alert("Error deleting document: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearChat = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!confirm("Clear all chat messages and history for this document?")) {
      return;
    }
    setClearingId(docId);
    try {
      await apiClient.chat.clear(docId);
      alert("Chat history cleared successfully.");
    } catch (err: any) {
      alert("Error clearing chat history: " + err.message);
    } finally {
      setClearingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          <p className="text-sm font-medium text-text-secondary">Loading knowledge base...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 flex-1 flex flex-col gap-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-default pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              Knowledge Base
            </h1>
            <Badge variant="default" className="gap-1">
              <Database className="h-3 w-3" />
              <span>{documents.length} Docs Uploaded</span>
            </Badge>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Manage your uploaded documents and start chat sessions.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            onClick={() => setUploadOpen(true)}
            className="w-full sm:w-auto bg-primary-500 hover:bg-primary-400 text-primary-900 font-semibold gap-2"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload Document</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-danger-text/30 bg-danger-bg p-4 text-sm text-danger-text flex items-center gap-3">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchDocuments} className="ml-auto text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Document Grid */}
      {documents.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-border-default bg-elevated/50 p-12 text-center my-auto">
          <div className="h-16 w-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4 border border-primary-500/20">
            <FileText className="h-8 w-8 text-primary-400" />
          </div>
          <h3 className="text-lg font-bold text-text-primary">No documents indexed yet</h3>
          <p className="max-w-sm text-sm text-text-secondary mt-1 mb-6">
            Upload your first document to slice, embed, and interrogate with local AI intelligence.
          </p>
          <Button
            onClick={() => setUploadOpen(true)}
            size="lg"
            className="bg-primary-500 hover:bg-primary-400 text-primary-900 gap-2 font-semibold"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload First Document</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <Card
              key={doc.document_id}
              onClick={() => router.push(`/chat/${doc.document_id}`)}
              className="group relative cursor-pointer border-border-default bg-elevated hover:border-border-strong hover:bg-subtle transition-all duration-300 flex flex-col justify-between overflow-hidden"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileText className="h-6 w-6 text-primary-400" />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => handleClearChat(e, doc.document_id)}
                      disabled={clearingId === doc.document_id}
                      title="Clear Chat History"
                      className="h-8 w-8 rounded-lg border border-border-default bg-subtle flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-border-default hover:border-border-strong transition-colors"
                    >
                      {clearingId === doc.document_id ? (
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-text-primary border-t-transparent" />
                      ) : (
                        <MessageSquareX className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, doc.document_id)}
                      disabled={deletingId === doc.document_id}
                      title="Delete Document"
                      className="h-8 w-8 rounded-lg border border-border-default bg-subtle flex items-center justify-center text-text-secondary hover:text-danger-text hover:bg-danger-bg hover:border-danger-text/30 transition-colors"
                    >
                      {deletingId === doc.document_id ? (
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-danger-text border-t-transparent" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <CardTitle className="text-lg font-bold text-text-primary mt-4 line-clamp-1 group-hover:text-primary-400 transition-colors">
                  {doc.filename}
                </CardTitle>
              </CardHeader>

              <CardContent className="pb-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default" className="text-[10px] py-0.5 gap-1">
                    <Layers className="h-2.5 w-2.5" />
                    <span>{doc.chunk_count} Chunks</span>
                  </Badge>
                  <span className="text-xs text-text-tertiary font-mono">
                    {(doc.file_size / 1024).toFixed(1)} KB
                  </span>
                </div>

                {doc.created_at && (
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
                    <span>Indexed {new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>

              <CardFooter className="pt-0 border-t border-border-default bg-base/50 px-6 py-3 mt-auto">
                <div className="flex items-center justify-between w-full text-xs font-semibold text-primary-400 group-hover:text-primary-300">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Interrogate Document</span>
                  </span>
                  <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <UploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={(docId) => router.push(`/chat/${docId}`)}
      />
    </div>
  );
}
