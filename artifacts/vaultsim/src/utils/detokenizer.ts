import { getVault } from './Vault';

interface DetokenizationResult {
  text: string;
  tokensFound: string[];
  tokensDetokenized: string[];
  tokensMissing: string[];
}

class Detokenizer {
  private readonly tokenPattern = /TOKEN_[a-zA-Z0-9]+/g;
  private readonly singleTokenPattern = /^TOKEN_[a-zA-Z0-9]+$/;

  hasTokens(text: string): boolean {
    return this.tokenPattern.test(text);
  }

  extractTokens(text: string): string[] {
    const tokens = text.match(this.tokenPattern) || [];
    return [...new Set(tokens)];
  }

  async process(text: string): Promise<string> {
    if (!text) return '';

    const vault = getVault();
    if (!vault.isReady()) {
      console.warn('[Detokenizer] Vault not ready - returning text with tokens visible');
      return text;
    }

    try {
      const tokens = this.extractTokens(text);
      if (tokens.length === 0) {
        return text;
      }

      const values = await vault.retrieveBatch(tokens);

      let processed = text;
      for (const token of tokens) {
        const value = values[token];
        if (value) {
          processed = processed.split(token).join(value);
        }
      }

      return processed;
    } catch (error) {
      console.error('[Detokenizer] Processing failed, returning original text');
      return text;
    }
  }

  async processArray(texts: string[]): Promise<string[]> {
    const results: string[] = [];
    for (const text of texts) {
      results.push(await this.process(text));
    }
    return results;
  }

  async processStream(
    chunk: string,
    buffer: string = ''
  ): Promise<{ processed: string; buffer: string }> {
    const combined = buffer + chunk;

    const lastPotentialToken = combined.lastIndexOf('TOKEN_');
    if (lastPotentialToken === -1) {
      return { processed: combined, buffer: '' };
    }

    const afterToken = combined.substring(lastPotentialToken + 6);
    const incompleteTokenMatch = afterToken.match(/^[a-zA-Z0-9]*/);
    const incompleteTokenLength = incompleteTokenMatch ? incompleteTokenMatch[0].length : 0;

    if (lastPotentialToken + 6 + incompleteTokenLength < combined.length) {
      return { processed: await this.process(combined), buffer: '' };
    } else {
      const safeToProcess = combined.substring(0, lastPotentialToken);
      const remainingBuffer = combined.substring(lastPotentialToken);
      return { processed: await this.process(safeToProcess), buffer: remainingBuffer };
    }
  }

  async processDetailed(text: string): Promise<DetokenizationResult> {
    if (!text) {
      return { text: '', tokensFound: [], tokensDetokenized: [], tokensMissing: [] };
    }

    const vault = getVault();
    if (!vault.isReady()) {
      return {
        text,
        tokensFound: this.extractTokens(text),
        tokensDetokenized: [],
        tokensMissing: this.extractTokens(text),
      };
    }

    try {
      const tokensFound = this.extractTokens(text);
      if (tokensFound.length === 0) {
        return { text, tokensFound: [], tokensDetokenized: [], tokensMissing: [] };
      }

      const values = await vault.retrieveBatch(tokensFound);

      const tokensDetokenized: string[] = [];
      const tokensMissing: string[] = [];

      let processed = text;
      for (const token of tokensFound) {
        const value = values[token];
        if (value) {
          tokensDetokenized.push(token);
          processed = processed.split(token).join(value);
        } else {
          tokensMissing.push(token);
        }
      }

      return { text: processed, tokensFound, tokensDetokenized, tokensMissing };
    } catch (error) {
      return {
        text,
        tokensFound: this.extractTokens(text),
        tokensDetokenized: [],
        tokensMissing: this.extractTokens(text),
      };
    }
  }

  isValidToken(token: string): boolean {
    return this.singleTokenPattern.test(token);
  }
}

let detokenizerInstance: Detokenizer | null = null;

export function getDetokenizer(): Detokenizer {
  if (!detokenizerInstance) {
    detokenizerInstance = new Detokenizer();
  }
  return detokenizerInstance;
}

export type { DetokenizationResult };
