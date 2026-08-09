"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, authStorage } from "@/shared/api/client";
import { ChatMessageResponse, SourceChunk } from "@/shared/api/types";

export interface ExtendedMessage extends ChatMessageResponse {
  isStreaming?: boolean;
}

export function useSSEStream(documentId: string) {
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);

  const loadHistory = useCallback(async () => {
    if (!documentId) return;
    setLoadingHistory(true);
    try {
      const { items, next_cursor } = await apiClient.chat.getMessages(documentId);
      setMessages(items);
      setNextCursor(next_cursor);
      setHasMore(!!next_cursor);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load chat history");
    } finally {
      setLoadingHistory(false);
    }
  }, [documentId]);

  const loadMore = useCallback(async () => {
    if (!documentId || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { items, next_cursor } = await apiClient.chat.getMessages(documentId, nextCursor);
      // Prepend older messages
      setMessages((prev) => [...items, ...prev]);
      setNextCursor(next_cursor);
      setHasMore(!!next_cursor);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load older messages");
    } finally {
      setLoadingMore(false);
    }
  }, [documentId, nextCursor, loadingMore]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || isStreaming) return;

    setError(null);
    const userMsg: ExtendedMessage = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: question,
      created_at: new Date().toISOString(),
    };

    const assistantTempId = `temp-assistant-${Date.now()}`;
    const assistantMsg: ExtendedMessage = {
      id: assistantTempId,
      role: "assistant",
      content: "",
      isStreaming: true,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    try {
      // 1. Save user message to PostgreSQL
      const savedUserMsg = await apiClient.chat.createMessage(
        documentId,
        "user",
        question
      );
      setMessages((prev) =>
        prev.map((msg) => (msg.id === userMsg.id ? savedUserMsg : msg))
      );

      // 2. Stream SSE answer
      const token = authStorage.getToken();
      const API_BASE =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";

      const response = await fetch(`${API_BASE}/query/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          question,
          document_ids: [documentId],
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Stream error: HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let accumulatedContent = "";
      let finalSources: SourceChunk[] = [];

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunkString = decoder.decode(value, { stream: !done });
          const lines = chunkString.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.token) {
                  accumulatedContent += parsed.token;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantTempId
                        ? { ...msg, content: accumulatedContent }
                        : msg
                    )
                  );
                }
                if (parsed.sources) {
                  finalSources = parsed.sources;
                }
                if (parsed.done) {
                  done = true;
                }
              } catch (e) {
                // partial JSON or parse error, continue reading
              }
            }
          }
        }
      }

      // 3. Save assistant answer and citations to PostgreSQL
      const savedAssistantMsg = await apiClient.chat.createMessage(
        documentId,
        "assistant",
        accumulatedContent || "No response generated.",
        finalSources
      );

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantTempId
            ? {
                ...savedAssistantMsg,
                isStreaming: false,
              }
            : msg
        )
      );
    } catch (err: any) {
      setError(err.message || "An error occurred during streaming.");
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantTempId
            ? {
                ...msg,
                content:
                  msg.content + "\n\n[Error: Failed to finish generating response]",
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const clearHistory = async () => {
    try {
      await apiClient.chat.clear(documentId);
      setMessages([]);
    } catch (err: any) {
      setError(err.message || "Failed to clear chat history");
    }
  };

  return {
    messages,
    isStreaming,
    loadingHistory,
    loadingMore,
    hasMore,
    error,
    sendMessage,
    clearHistory,
    reloadHistory: loadHistory,
    loadMore,
  };
}
