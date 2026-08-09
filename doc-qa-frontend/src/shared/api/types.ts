export interface UserResponse {
  id: string;
  full_name: string;
  email: string;
  created_at?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

export interface DocumentResponse {
  id: string;
  document_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  chunk_count: number;
  created_at?: string;
}

export interface SourceChunk {
  document_id: string;
  filename: string;
  chunk_index: number;
  score: number;
  text: string;
  text_preview?: string;
}

export interface RAGResponse {
  answer: string;
  question: string;
  sources: SourceChunk[];
  chunks_retrieved: number;
  chunks_used_in_prompt: number;
  estimated_prompt_tokens: number;
  model: string;
}

export interface ChatMessageResponse {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceChunk[];
  created_at?: string;
}

export interface IngestResponse {
  document_id: string;
  filename: string;
  chunks_created: number;
  chunking_strategy: string;
  message: string;
}

export interface PaginatedChatMessageResponse {
  items: ChatMessageResponse[];
  next_cursor: string | null;
}
