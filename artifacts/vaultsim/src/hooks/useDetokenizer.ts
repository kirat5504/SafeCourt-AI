import { useCallback } from 'react';
import { getDetokenizer } from '../utils/detokenizer';

export function useDetokenizer() {
  const detokenizer = getDetokenizer();

  const detokenize = useCallback(async (text: string): Promise<string> => {
    return detokenizer.process(text);
  }, [detokenizer]);

  const detokenizeArray = useCallback(async (texts: string[]): Promise<string[]> => {
    return detokenizer.processArray(texts);
  }, [detokenizer]);

  const hasTokens = useCallback((text: string): boolean => {
    return detokenizer.hasTokens(text);
  }, [detokenizer]);

  const extractTokens = useCallback((text: string): string[] => {
    return detokenizer.extractTokens(text);
  }, [detokenizer]);

  return {
    detokenize,
    detokenizeArray,
    hasTokens,
    extractTokens,
    detokenizer,
  };
}
