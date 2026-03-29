import { getVault } from '../utils/Vault';
import { createProcessingId } from './generateProcessingId';

export interface SessionCreateResponse {
  session_id: string;
  challenge: string;
  expires_in: number;
}

export interface SessionStatusResponse {
  session_id: string;
  session_data: {
    created_at: string;
    last_active: string;
    requests: number;
  };
  pipeline_status: 'idle' | 'running' | 'error';
  ttl_seconds: number;
  active: boolean;
}

export interface SanitizeTextRequest {
  text: string;
}

export interface SanitizeTextResponse {
  sanitized_text: string;
  tokens: Record<string, string>;
  engine: string;
}

export interface SanitizePdfResponse {
  pdf_bytes: ArrayBuffer;
  tokens: Record<string, string>;
  pages: number;
  processing_time_sec: number;
  gemini_calls: number;
}

export interface SanitizedOutput {
  session_id: string;
  input_type: 'text' | 'pdf';
  tokenized_content: string;
  engine: string;
  created_at: string;
}

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  response: string;
  sanitized_response?: string;
  tokens: Record<string, string>;
  engine: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
}

export interface DebateTranscriptItem {
  agent: string;
  text: string;
}

export interface DebateResponse {
  session_id: string;
  transcript: DebateTranscriptItem[];
  masked_content?: string;
}

export interface HistoricalDebatesResponse {
  session_id: string;
  debates: {
    id: string;
    session_id: string;
    transcript: DebateTranscriptItem[];
    created_at: string;
  }[];
}

class ApiClient {
  private apiUrl: string;

  constructor() {
    if (import.meta.env.VITE_API_URL) {
      this.apiUrl = import.meta.env.VITE_API_URL.replace(/\/api$/, '');
    } else if (import.meta.env.PROD) {
      this.apiUrl = '';
    } else {
      this.apiUrl = '';
    }
  }

  private async request<T>(
    method: string,
    endpoint: string,
    options?: {
      body?: Record<string, unknown> | FormData;
      headers?: Record<string, string>;
      sessionId?: string;
      processingId?: string;
    }
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    const headers: Record<string, string> = options?.headers || {};

    if (options?.sessionId) {
      headers['X-Session-ID'] = options.sessionId;
    }

    if (options?.processingId) {
      headers['X-Processing-ID'] = options.processingId;
    }

    if (options?.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (options?.body) {
      if (options.body instanceof FormData) {
        fetchOptions.body = options.body;
      } else {
        fetchOptions.body = JSON.stringify(options.body);
      }
    }

    console.log(`[API] Fetching: ${method} ${url}`);

    try {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        console.error(`[API] HTTP Error: ${response.status}`, { url, method });
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      if (endpoint.includes('/sanitize/pdf')) {
        return response.arrayBuffer() as Promise<T>;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      console.error(`[API] Fetch failed for ${url}:`, error);
      throw error;
    }
  }

  async createSession(): Promise<SessionCreateResponse> {
    const response = await this.request<SessionCreateResponse>(
      'POST',
      '/api/auth/session'
    );
    console.log('[API] Session created:', {
      sessionId: response.session_id,
      expiresIn: response.expires_in,
    });
    return response;
  }

  async getSessionStatus(sessionId: string): Promise<SessionStatusResponse> {
    return this.request<SessionStatusResponse>(
      'GET',
      `/api/auth/session`,
      { sessionId }
    );
  }

  async terminateSession(sessionId: string): Promise<void> {
    await this.request<{ message: string }>(
      'DELETE',
      `/api/auth/session`,
      { sessionId }
    );
  }

  async sanitizeText(
    sessionId: string,
    processingId: string,
    text: string
  ): Promise<SanitizeTextResponse> {
    const response = await this.request<SanitizeTextResponse>(
      'POST',
      '/api/sanitize/text',
      {
        body: { text },
        sessionId,
        processingId,
      }
    );

    if (response.tokens && Object.keys(response.tokens).length > 0) {
      const vault = getVault();
      if (vault.isReady()) {
        try {
          await vault.storeFromTokenMap(response.tokens);
          console.log(`[API] Stored ${Object.keys(response.tokens).length} tokens from text sanitization`);
        } catch (error) {
          console.error('[API] Token storage failed:', error);
          throw new Error('Failed to secure tokens');
        }
      }
    }

    return response;
  }

  async sanitizePdf(
    sessionId: string,
    processingId: string,
    file: File
  ): Promise<SanitizePdfResponse> {
    const formData = new FormData();
    formData.append('file', file);

    console.log(`[API] Sanitizing PDF: ${file.name} (${file.size} bytes)`);

    const response = await fetch(`${this.apiUrl}/api/sanitize/pdf`, {
      method: 'POST',
      headers: {
        'X-Session-ID': sessionId,
        'X-Processing-ID': processingId,
      },
      body: formData,
    });

    if (!response.ok) {
      console.error(`[API] PDF Sanitization Failed: ${response.status}`);
      throw new Error(`PDF sanitization failed: ${response.status}`);
    }

    const pdfBytes = await response.arrayBuffer();

    const tokensHeader = response.headers.get('X-Tokens') || '';
    const tokenIds = tokensHeader ? tokensHeader.split(',').filter(t => t) : [];
    const pages = parseInt(response.headers.get('X-Pages') || '0', 10);
    const processingTime = parseFloat(response.headers.get('X-Processing-Time') || '0');
    const geminiCalls = parseInt(response.headers.get('X-Gemini-Calls') || '0', 10);

    console.log(`[API] PDF processing: ${pages} pages, ${tokenIds.length} tokens, ${geminiCalls} Gemini calls`);

    let tokens: Record<string, string> = {};
    if (tokenIds.length > 0) {
      try {
        const outputResponse = await this.getSanitizedOutputsByProcessingId(processingId, sessionId);
        const pdfOutput = outputResponse.outputs.find(o => o.input_type === 'pdf');
        if (pdfOutput && pdfOutput.tokenized_content) {
          try {
            tokens = JSON.parse(pdfOutput.tokenized_content);
          } catch (e) {
            console.error('[API] Failed to parse PDF token mapping:', e);
            for (const id of tokenIds) tokens[id] = '[PARSING_ERROR]';
          }
        } else {
          for (const id of tokenIds) tokens[id] = '[VAULT_FETCH_EMPTY]';
        }
      } catch (e) {
        console.error('[API] Failed to fetch real tokens for PDF:', e);
        for (const id of tokenIds) tokens[id] = '[VAULT_FETCH_ERROR]';
      }
    }

    return {
      pdf_bytes: pdfBytes,
      tokens,
      pages,
      processing_time_sec: processingTime,
      gemini_calls: geminiCalls,
    };
  }

  async getSanitizedOutputsByProcessingId(
    processingId: string,
    sessionId?: string
  ): Promise<{ processing_id: string; outputs: SanitizedOutput[] }> {
    return this.request(
      'GET',
      `/api/sanitize/outputs/${processingId}`,
      { sessionId }
    );
  }

  async getSanitizedOutputsBySession(
    sessionId: string
  ): Promise<{ session_id: string; outputs: SanitizedOutput[] }> {
    return this.request(
      'GET',
      `/api/sanitize/outputs`,
      { sessionId }
    );
  }

  async sendChat(
    sessionId: string,
    processingId: string,
    message: string
  ): Promise<ChatResponse> {
    const response = await this.request<ChatResponse>(
      'POST',
      '/api/chat',
      {
        body: { message },
        sessionId,
        processingId,
      }
    );

    if (response.tokens && Object.keys(response.tokens).length > 0) {
      const vault = getVault();
      if (vault.isReady()) {
        try {
          await vault.storeFromTokenMap(response.tokens);
          console.log(`[API] Stored ${Object.keys(response.tokens).length} tokens from chat response`);
        } catch (error) {
          console.error('[API] Token storage failed:', error);
          throw new Error('Failed to secure chat tokens');
        }
      }
    }

    return response;
  }

  async runDebate(sessionId: string): Promise<DebateResponse> {
    return this.request<DebateResponse>(
      'POST',
      `/api/debate/run/${sessionId}`,
      { sessionId }
    );
  }

  async simplifyVerdict(text: string, sessionId: string): Promise<{ simplified: string }> {
    return this.request<{ simplified: string }>(
      'POST',
      '/api/pipeline/simplify-verdict',
      { sessionId, body: { text } }
    );
  }

  async getHistoricalDebates(sessionId: string): Promise<HistoricalDebatesResponse> {
    return this.request<HistoricalDebatesResponse>(
      'GET',
      `/api/debate/session/${sessionId}`,
      { sessionId }
    );
  }

  async healthCheck(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>(
      'GET',
      '/api/health'
    );
  }
}

let apiClient: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!apiClient) {
    apiClient = new ApiClient();
  }
  return apiClient;
}

export function generateProcessingId(): string {
  return createProcessingId();
}
