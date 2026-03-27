import type { ValidationResult } from './types';

export class InputValidator {
  static validateSessionId(sessionId: string): ValidationResult {
    if (!sessionId || typeof sessionId !== 'string') {
      return { isValid: false, error: 'Session ID is required' };
    }
    const trimmed = sessionId.trim();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmed)) {
      return { isValid: false, error: 'Session ID must be a valid UUID' };
    }
    return { isValid: true, sanitized: trimmed };
  }

  static validateChallenge(challenge: string): ValidationResult {
    if (!challenge || typeof challenge !== 'string') {
      return { isValid: false, error: 'Challenge is required' };
    }
    const trimmed = challenge.trim();
    if (trimmed.length < 8) {
      return { isValid: false, error: 'Challenge is too short' };
    }
    if (trimmed.length > 1024) {
      return { isValid: false, error: 'Challenge is too long' };
    }
    return { isValid: true, sanitized: trimmed };
  }

  static validateText(text: string): ValidationResult {
    if (!text || typeof text !== 'string') {
      return { isValid: false, error: 'Text is required' };
    }
    if (text.length > 100000) {
      return { isValid: false, error: 'Text exceeds maximum length' };
    }
    return { isValid: true, sanitized: text };
  }
}
