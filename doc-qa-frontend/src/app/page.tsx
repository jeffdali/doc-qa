"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/shared/context/auth-context";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, Zap, Shield, Cpu, ArrowRight, Layers } from "lucide-react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 sm:px-8 py-12 relative overflow-hidden">
      <div className="w-full max-w-5xl text-center space-y-8 relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-border-default bg-subtle px-4 py-1.5 text-xs font-semibold text-primary-400">
          <Sparkles className="h-3.5 w-3.5 text-primary-400" />
          <span>Next-Gen Semantic Document Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight text-text-primary">
          Interrogate Your Documents with{" "}
          <span className="text-primary-400">
            Precision RAG
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-text-secondary leading-relaxed">
          Ingest raw documents into a secure local vector store, perform semantic vector searches, and stream grounded AI answers with real-time source citations.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/signup" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto bg-primary-500 hover:bg-primary-400 text-primary-900 gap-2 text-base font-bold">
              <span>Get Started Free</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 text-base border-border-default hover:bg-subtle">
              <span>Sign In to Workspace</span>
            </Button>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
          <div className="rounded-2xl border border-border-default bg-elevated p-6 hover:border-border-strong transition-all duration-300">
            <div className="h-12 w-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-primary-400" />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Real-Time Streaming</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Experience instant answer generation powered by Server-Sent Events (SSE) and Ollama local LLMs.
            </p>
          </div>

          <div className="rounded-2xl border border-border-default bg-elevated p-6 hover:border-border-strong transition-all duration-300">
            <div className="h-12 w-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4">
              <Layers className="h-6 w-6 text-primary-400" />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Grounded Citations</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Every answer provides verifiable source chunks, similarity scores, and text previews from your documents.
            </p>
          </div>

          <div className="rounded-2xl border border-border-default bg-elevated p-6 hover:border-border-strong transition-all duration-300">
            <div className="h-12 w-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary-400" />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Tenant Isolation</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Cryptographically enforced document ownership with PostgreSQL and scoped ChromaDB vector indexing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
