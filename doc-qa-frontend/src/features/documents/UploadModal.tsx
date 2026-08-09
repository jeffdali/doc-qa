"use client";

import React, { useState } from "react";
import { apiClient } from "@/shared/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UploadCloud, FileText, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (documentId: string) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
      onOpenChange(false);
      onSuccess(res.document_id);
    } catch (err: any) {
      setError(err.message || "Failed to upload document. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border-default bg-elevated">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500/10 border border-primary-500/20 text-primary-400 mb-2">
            <UploadCloud className="h-6 w-6 text-primary-400" />
          </div>
          <DialogTitle className="text-xl font-bold text-text-primary">
            Upload Document
          </DialogTitle>
          <DialogDescription className="text-text-secondary text-xs">
            Upload text, markdown, or PDF files to your document library.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-danger-text/30 bg-danger-bg p-3 text-xs text-danger-text animate-in fade-in-50">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag and Drop Box */}
          <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-default bg-subtle/50 p-6 transition-colors hover:border-primary-500/50 hover:bg-subtle cursor-pointer">
            <input
              type="file"
              onChange={handleFileChange}
              disabled={loading}
              className="absolute inset-0 z-10 h-full w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              accept=".txt,.md,.pdf,.csv,.json"
            />
            {file ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="h-10 w-10 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{file.name}</p>
                  <p className="text-xs text-text-secondary">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <UploadCloud className="h-8 w-8 text-text-tertiary" />
                <p className="text-sm font-medium text-text-primary">
                  Click or drag file to this area to upload
                </p>
                <p className="text-xs text-text-tertiary">
                  Supports TXT, MD, PDF, CSV up to 10MB
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !file}
              className="bg-primary-500 hover:bg-primary-400 text-primary-900 text-xs h-9 font-semibold gap-1.5"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-900 border-t-transparent" />
                  <span>Ingesting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Index & Start Q&A</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
