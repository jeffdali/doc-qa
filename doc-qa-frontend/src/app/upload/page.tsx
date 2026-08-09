"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/shared/context/auth-context";
import { apiClient } from "@/shared/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadCloud, FileText, AlertCircle, Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function StandaloneUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a document to upload.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      // Use optimal static values for best RAG performance without exposing complexity to the user
      formData.append("strategy", "recursive");
      formData.append("chunk_size", "1000");
      formData.append("chunk_overlap", "150");

      const res = await apiClient.ingest.upload(formData);
      router.push(`/chat/${res.document_id}`);
    } catch (err: any) {
      setError(err.message || "Failed to upload document. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg relative">
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2 text-text-secondary hover:text-text-primary">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Knowledge Base</span>
            </Button>
          </Link>
        </div>

        <Card className="relative border-border-default bg-elevated">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500/10 border border-primary-500/20 text-primary-400 mb-2">
              <UploadCloud className="h-6 w-6 text-primary-400" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-text-primary">
              Upload Document
            </CardTitle>
            <CardDescription className="text-text-secondary">
              Upload text, markdown, or PDF files to your document library.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-danger-text/30 bg-danger-bg p-3 text-xs text-danger-text animate-in fade-in-50">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Drag and Drop Box */}
              <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-default bg-subtle/50 p-8 transition-colors hover:border-primary-500/50 hover:bg-subtle cursor-pointer">
                <input
                  type="file"
                  onChange={handleFileChange}
                  disabled={loading}
                  className="absolute inset-0 z-10 h-full w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  accept=".txt,.md,.pdf,.csv,.json"
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="h-12 w-12 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{file.name}</p>
                      <p className="text-xs text-text-secondary">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <UploadCloud className="h-10 w-10 text-text-tertiary" />
                    <p className="text-sm font-medium text-text-primary">
                      Click or drag file to this area to upload
                    </p>
                    <p className="text-xs text-text-tertiary">
                      Supports TXT, MD, PDF, CSV up to 10MB
                    </p>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="pt-4">
              <Button
                type="submit"
                disabled={loading || !file}
                className="w-full h-11 bg-primary-500 hover:bg-primary-400 text-primary-900 text-sm font-semibold gap-2"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-900 border-t-transparent" />
                    <span>Uploading and Processing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Upload & Start Chatting</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
