"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/shared/context/auth-context";
import { apiClient } from "@/shared/api/client";
import { DocumentResponse } from "@/shared/api/types";
import { useSSEStream } from "@/features/chat/useSSEStream";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  ArrowDown,
  Send,
  MessageSquareX,
  FileText,
  Sparkles,
  Bot,
  User,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Layers,
  Plus,
} from "lucide-react";

export default function ChatPage() {
  const params = useParams();
  const documentId = params?.documentId as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [doc, setDoc] = useState<DocumentResponse | null>(null);
  const [question, setQuestion] = useState("");
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const {
    messages,
    isStreaming,
    loadingHistory,
    loadingMore,
    hasMore,
    error,
    sendMessage,
    clearHistory,
    loadMore,
  } = useSSEStream(documentId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const prevScrollHeight = useRef<number>(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    const fetchDocInfo = async () => {
      try {
        const docs = await apiClient.documents.list();
        const found = docs.find((d) => d.document_id === documentId);
        if (found) setDoc(found);
      } catch {
        // ignore error, title will fallback to ID
      }
    };
    if (user && documentId) {
      fetchDocInfo();
    }
  }, [user, authLoading, router, documentId]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // If user scrolled up by more than 80px from bottom, disable autoscroll
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 80;
    setAutoScroll(isNearBottom);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loadingHistory) {
          if (scrollContainerRef.current) {
             prevScrollHeight.current = scrollContainerRef.current.scrollHeight;
          }
          loadMore();
        }
      },
      { root: scrollContainerRef.current, threshold: 0.1 }
    );
    if (topRef.current) {
      observer.observe(topRef.current);
    }
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadingHistory, loadMore]);

  // Adjust scroll position when older messages are loaded
  useEffect(() => {
    if (scrollContainerRef.current && prevScrollHeight.current > 0 && !loadingMore && !loadingHistory) {
      const currentScrollHeight = scrollContainerRef.current.scrollHeight;
      const heightDifference = currentScrollHeight - prevScrollHeight.current;
      
      // If messages were added at the top, adjust scroll position to stay exactly where we were
      if (heightDifference > 0 && !autoScroll) {
        scrollContainerRef.current.scrollTop += heightDifference;
      }
      prevScrollHeight.current = 0;
    }
  }, [messages, loadingMore, loadingHistory, autoScroll]);

  useEffect(() => {
    if (autoScroll && scrollContainerRef.current && !loadingHistory) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isStreaming, autoScroll, loadingHistory]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim() || isStreaming) return;
    sendMessage(question);
    setQuestion("");
    setAutoScroll(true);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleSources = (msgId: string) => {
    setExpandedSources((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  if (authLoading || loadingHistory) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          <p className="text-sm font-medium text-text-secondary">Loading RAG conversation history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col h-full max-w-5xl mx-auto w-full px-4 sm:px-6 overflow-hidden relative">
      {/* Minimal Top Bar in Chat Area */}
      <div className="flex items-center justify-between py-3 border-b border-border-default shrink-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="h-8 w-8 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4 text-primary-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-text-primary leading-tight truncate">
              {doc ? doc.filename : `Document ${documentId.slice(0, 8)}...`}
            </h2>
            {doc && (
              <span className="text-[10px] text-text-tertiary flex items-center gap-1 mt-0.5">
                <Layers className="h-2.5 w-2.5 text-primary-400" />
                {doc.chunk_count} Chunks Indexed
              </span>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (confirm("Clear all messages for this document?")) {
              clearHistory();
            }
          }}
          disabled={isStreaming || messages.length === 0}
          className="gap-1.5 text-xs h-8 px-3 border-border-default hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 shrink-0"
        >
          <MessageSquareX className="h-3.5 w-3.5" />
          <span>Clear Chat</span>
        </Button>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-6 space-y-6 pr-2 relative min-h-0"
      >
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 text-center">
            {error}
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 max-w-md mx-auto">
            <div className="h-16 w-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4 border border-primary-500/20">
              <Sparkles className="h-8 w-8 text-primary-400" />
            </div>
            <h3 className="text-lg font-bold text-text-primary">Ask anything about this document</h3>
            <p className="text-xs text-text-secondary mt-1 mb-6 leading-relaxed">
              Your question will be embedded, matched against relevant document chunks in ChromaDB, and answered by your local AI model.
            </p>
            <div className="grid grid-cols-1 gap-2 w-full">
              <button
                type="button"
                onClick={() => sendMessage("Summarize the main key points of this document.")}
                className="text-left text-xs p-3 rounded-xl border border-border-default bg-elevated hover:border-border-strong text-text-secondary hover:text-text-primary transition-colors flex items-center justify-between group"
              >
                <span>&quot;Summarize the main key points...&quot;</span>
                <Send className="h-3 w-3 text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button
                type="button"
                onClick={() => sendMessage("What are the primary conclusions or findings?")}
                className="text-left text-xs p-3 rounded-xl border border-border-default bg-elevated hover:border-border-strong text-text-secondary hover:text-text-primary transition-colors flex items-center justify-between group"
              >
                <span>&quot;What are the primary conclusions?&quot;</span>
                <Send className="h-3 w-3 text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {hasMore && (
              <div ref={topRef} className="py-2 text-center text-xs text-text-tertiary">
                {loadingMore ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                    Loading older messages...
                  </div>
                ) : (
                  "Scroll up to load more"
                )}
              </div>
            )}
            {messages.map((msg) => {
            const isUser = msg.role === "user";
            const sources = msg.sources || [];
            const isExpanded = !!expandedSources[msg.id];

            return (
              <div
                key={msg.id}
                className={`flex gap-4 max-w-3xl ${isUser ? "ml-auto justify-end" : "mr-auto justify-start"}`}
              >
                {!isUser && (
                  <div className="h-9 w-9 rounded-xl bg-primary-500 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-5 w-5 text-primary-900" />
                  </div>
                )}

                <div className={`flex flex-col space-y-2 max-w-[85%] sm:max-w-[75%]`}>
                  <div
                    className={`rounded-2xl p-4 text-sm leading-relaxed ${
                      isUser
                        ? "bg-primary-500 text-primary-900 rounded-br-none font-medium"
                        : "bg-elevated border border-border-default text-text-primary rounded-bl-none"
                    }`}
                  >
                    <div className="break-words">
                      {msg.content ? (
                        <div className="space-y-2">
                          <ReactMarkdown
                            components={{
                              h1: ({ children }) => <h1 className={`text-base font-bold ${isUser ? "text-primary-950" : "text-text-primary"} mt-3 mb-1`}>{children}</h1>,
                              h2: ({ children }) => <h2 className={`text-sm font-bold ${isUser ? "text-primary-950" : "text-text-primary"} mt-2.5 mb-1`}>{children}</h2>,
                              h3: ({ children }) => <h3 className={`text-xs font-bold ${isUser ? "text-primary-950" : "text-primary-400"} mt-2 mb-1`}>{children}</h3>,
                              p: ({ children }) => <p className="leading-relaxed mb-2 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5 my-2">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1.5 my-2">{children}</ol>,
                              li: ({ children }) => <li className="pl-1 leading-relaxed">{children}</li>,
                              strong: ({ children }) => <strong className={`font-semibold ${isUser ? "text-primary-950 font-bold" : "text-text-primary"}`}>{children}</strong>,
                              code: ({ children }) => (
                                <code className={`${isUser ? "bg-primary-400 text-primary-950" : "bg-subtle text-primary-300"} px-1.5 py-0.5 rounded font-mono text-[11px]`}>
                                  {children}
                                </code>
                              ),
                              blockquote: ({ children }) => (
                                <blockquote className={`border-l-2 ${isUser ? "border-primary-950 text-primary-900" : "border-primary-500 text-text-secondary"} pl-3 my-2 italic`}>
                                  {children}
                                </blockquote>
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                          {msg.isStreaming && (
                            <span className="inline-block w-2 h-4 ml-1 bg-primary-400 align-middle animate-pulse" />
                          )}
                        </div>
                      ) : msg.isStreaming ? (
                        <div className="flex items-center gap-2.5 py-0.5 text-text-secondary">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-400 border-t-transparent shrink-0" />
                          <span className="text-xs font-medium">Retrieving relevant chunks & generating response...</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Sources / Citations Accordion */}
                  {!isUser && sources.length > 0 && (
                    <div className="rounded-xl border border-border-default bg-subtle overflow-hidden text-xs">
                      <button
                        type="button"
                        onClick={() => toggleSources(msg.id)}
                        className="w-full flex items-center justify-between px-3.5 py-2 bg-subtle hover:bg-elevated transition-colors text-text-secondary font-semibold"
                      >
                        <span className="flex items-center gap-1.5 text-primary-400">
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Grounded Citations ({sources.length} sources)</span>
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 text-text-secondary" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-text-secondary" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="p-3 space-y-2.5 divide-y divide-border-default max-h-60 overflow-y-auto">
                          {sources.map((src, idx) => (
                            <div key={`${msg.id}-src-${idx}`} className={idx > 0 ? "pt-2.5" : ""}>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="font-mono font-semibold text-text-secondary truncate">
                                  {src.filename} (Chunk #{src.chunk_index})
                                </span>
                                <Badge variant="secondary" className="text-[10px] py-0 bg-primary-500/20 text-primary-300 border-0 shrink-0">
                                  Match: {(src.score * 100).toFixed(0)}%
                                </Badge>
                              </div>
                              <p className="text-[11px] text-text-secondary line-clamp-3 bg-base p-2 rounded-lg font-sans italic border border-border-default">
                                &quot;{src.text_preview || src.text}&quot;
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <span className={`text-[10px] text-text-tertiary px-1 ${isUser ? "text-right" : "text-left"}`}>
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </span>
                </div>

                {isUser && (
                  <div className="h-9 w-9 rounded-xl bg-subtle border border-border-default flex items-center justify-center shrink-0 mt-1">
                    <User className="h-5 w-5 text-text-primary" />
                  </div>
                )}
              </div>
            );
          })}
          </>
        )}
        <div ref={messagesEndRef} />
        {!autoScroll && isStreaming && (
          <div className="sticky bottom-2 flex justify-center pointer-events-none z-10">
            <button
              type="button"
              onClick={() => {
                setAutoScroll(true);
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                }
              }}
              className="pointer-events-auto bg-elevated border border-border-default hover:border-primary-500 text-text-primary text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Resume autoscroll</span>
              <ArrowDown className="h-3 w-3 text-primary-400" />
            </button>
          </div>
        )}
      </div>

      {/* Input Footer */}
      <div className="py-4 shrink-0 bg-base z-30">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-3 bg-elevated border border-border-default hover:border-border-strong focus-within:border-primary-500/50 rounded-[28px] px-4 py-2 transition-all"
          >
            <button
              type="button"
              className="h-9 w-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-subtle transition-colors shrink-0"
              title="Add attachment"
            >
              <Plus className="h-5 w-5" />
            </button>
            <div className="flex-1 py-1">
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder="Ask a question about this document..."
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                }}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
                style={{ minHeight: "28px", maxHeight: "140px" }}
                className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-sm text-text-primary placeholder:text-text-tertiary resize-none leading-relaxed block py-1"
              />
            </div>
            <Button
              type="submit"
              disabled={!question.trim() || isStreaming}
              className={`h-9 w-9 rounded-full p-0 flex items-center justify-center shrink-0 transition-all ${
                question.trim() && !isStreaming
                  ? "bg-primary-500 hover:bg-primary-400 text-primary-900"
                  : "bg-subtle text-text-disabled cursor-not-allowed"
              }`}
            >
              {isStreaming ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-400 border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
