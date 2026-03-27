export interface VaultStats {
  tokenCount: number;
  cacheSize: number;
  encryptedSize: number;
  sessionId: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: string;
}
