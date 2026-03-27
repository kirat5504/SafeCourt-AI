import type { VaultStats } from './types';

const vaultEvents = new EventTarget();

class Vault {
  private key: CryptoKey | null = null;
  private storage: Map<string, string> = new Map();
  private cache: Map<string, string> = new Map();
  private sessionId: string | null = null;
  private _ready = false;

  async initialize(sessionId: string, challenge: string): Promise<void> {
    const encoder = new TextEncoder();

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(sessionId + challenge),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    this.key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(sessionId),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    this.sessionId = sessionId;
    this._ready = true;
    vaultEvents.dispatchEvent(new Event('ready'));
  }

  isReady(): boolean {
    return this._ready && this.key !== null;
  }

  async store(token: string, value: string): Promise<void> {
    if (!this.key) throw new Error('Vault not initialized');

    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.key,
      encoder.encode(value)
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    const base64 = btoa(String.fromCharCode(...combined));
    this.storage.set(token, base64);
    this.cache.delete(token);
  }

  async storeFromTokenMap(tokenMap: Record<string, string>): Promise<void> {
    for (const [token, value] of Object.entries(tokenMap)) {
      await this.store(token, value);
    }
  }

  async retrieve(token: string): Promise<string | null> {
    if (this.cache.has(token)) {
      return this.cache.get(token)!;
    }

    const encrypted = this.storage.get(token);
    if (!encrypted || !this.key) return null;

    try {
      const binaryStr = atob(encrypted);
      const combined = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        combined[i] = binaryStr.charCodeAt(i);
      }

      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.key,
        data
      );

      const value = new TextDecoder().decode(decrypted);
      this.cache.set(token, value);
      return value;
    } catch {
      return null;
    }
  }

  async retrieveBatch(tokens: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    for (const token of tokens) {
      const value = await this.retrieve(token);
      if (value !== null) {
        result[token] = value;
      }
    }
    return result;
  }

  async wipe(): Promise<void> {
    this.storage.clear();
    this.cache.clear();
    this.key = null;
    this.sessionId = null;
    this._ready = false;
    vaultEvents.dispatchEvent(new Event('wiped'));
  }

  async getStats(): Promise<VaultStats> {
    const encryptedSize = [...this.storage.values()].reduce(
      (sum, v) => sum + v.length,
      0
    );
    return {
      tokenCount: this.storage.size,
      cacheSize: this.cache.size,
      encryptedSize,
      sessionId: this.sessionId || 'unknown',
    };
  }
}

let vaultInstance: Vault | null = null;

export function getVault(): Vault {
  if (!vaultInstance) {
    vaultInstance = new Vault();
  }
  return vaultInstance;
}

export { vaultEvents };
export type { Vault };
