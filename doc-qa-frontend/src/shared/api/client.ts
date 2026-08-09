import {
  ChatMessageResponse,
  DocumentResponse,
  IngestResponse,
  PaginatedChatMessageResponse,
  RAGResponse,
  TokenResponse,
  UserResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";

const TOKEN_KEY = "docqa_access_token";

export const authStorage = {
  getToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken: (token: string): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, token);
  },
  removeToken: (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
  },
};

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = "An unexpected error occurred.";
    try {
      const data = await res.json();
      errorDetail = data.detail || JSON.stringify(data);
    } catch {
      errorDetail = await res.text();
    }
    throw new Error(errorDetail || `HTTP error ${res.status}`);
  }
  if (res.status === 204) {
    return undefined as unknown as T;
  }
  return res.json();
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = authStorage.getToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
  return handleResponse<T>(response);
}

export const apiClient = {
  auth: {
    signup: (data: Record<string, string>) =>
      apiFetch<TokenResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    login: (data: Record<string, string>) =>
      apiFetch<TokenResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    me: () => apiFetch<UserResponse>("/auth/me"),
  },
  documents: {
    list: () => apiFetch<DocumentResponse[]>("/documents"),
    delete: (id: string) =>
      apiFetch<void>(`/documents/${id}`, { method: "DELETE" }),
  },
  ingest: {
    upload: (formData: FormData) => {
      if (!formData.has("document_id")) {
        formData.append(
          "document_id",
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : "doc-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9)
        );
      }
      return apiFetch<IngestResponse>("/ingest", {
        method: "POST",
        body: formData,
      });
    },
  },
  chat: {
    getMessages: (documentId: string, cursor?: string, limit: number = 50) => {
      const params = new URLSearchParams();
      if (cursor) params.append("cursor", cursor);
      params.append("limit", limit.toString());
      const query = params.toString() ? `?${params.toString()}` : "";
      return apiFetch<PaginatedChatMessageResponse>(`/chat/${documentId}/messages${query}`);
    },
    createMessage: (documentId: string, role: string, content: string, sources?: any[]) =>
      apiFetch<ChatMessageResponse>(`/chat/${documentId}/messages`, {
        method: "POST",
        body: JSON.stringify({ role, content, sources: sources || [] }),
      }),
    clear: (documentId: string) =>
      apiFetch<void>(`/chat/${documentId}/messages`, { method: "DELETE" }),
  },
  query: {
    ask: (question: string, documentIds: string[]) =>
      apiFetch<RAGResponse>("/query", {
        method: "POST",
        body: JSON.stringify({ question, document_ids: documentIds }),
      }),
  },
};
