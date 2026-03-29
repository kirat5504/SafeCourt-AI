import { useState } from 'react';
import { useSession } from '../contexts/SessionContext';
import { useVault } from '../hooks/useVault';
import { getApiClient, generateProcessingId } from '../utils/api';
import { InputPanel } from '../components/sanitisation/InputPanel';
import { OutputPanel } from '../components/sanitisation/OutputPanel';
import { ProcessingIndicator } from '../components/sanitisation/ProcessingIndicator';

type Status = 'idle' | 'encrypting' | 'done' | 'error';

export function Sanitisation() {
  const { session, isSessionValid } = useSession();
  const { vault, ready: vaultReady } = useVault();
  const apiClient = getApiClient();

  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sanitizedText, setSanitizedText] = useState<string | null>(null);
  const [tokens, setTokens] = useState<{ token: string; original: string }[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const hasSession = session.isActive && isSessionValid();
  const loading = status === 'encrypting';

  const statusLabel = {
    idle: 'AWAITING SANITIZATION',
    encrypting: 'ENCRYPTING...',
    done: 'SANITIZED',
    error: 'ERROR',
  }[status];

  const statusDotColor = {
    idle: '#f59e0b',
    encrypting: '#c8923a',
    done: '#16a34a',
    error: '#dc2626',
  }[status];

  const handleSanitise = async () => {
    if (!hasSession) { setError('Create a session first.'); setStatus('error'); return; }
    setStatus('encrypting');
    setError(null);
    setSanitizedText(null);
    setTokens([]);

    try {
      const processingId = generateProcessingId();

      if (selectedFile?.name.endsWith('.pdf')) {
        const res = await apiClient.sanitizePdf(session.id!, processingId, selectedFile);
        if (res.tokens && Object.keys(res.tokens).length > 0 && vault && vaultReady) {
          await vault.storeFromTokenMap(res.tokens);
        }
        const tokenList = Object.entries(res.tokens || {}).map(([token, original]) => ({
          token,
          original: String(original),
        }));
        setTokens(tokenList);
        setSanitizedText(`PDF processed: ${res.pages} page${res.pages !== 1 ? 's' : ''} · ${res.processing_time_sec?.toFixed(2)}s · ${tokenList.length} token${tokenList.length !== 1 ? 's' : ''} secured`);
      } else {
        const res = await apiClient.sanitizeText(session.id!, processingId, inputText);
        const tokenList = Object.entries(res.tokens || {}).map(([token, original]) => ({
          token,
          original: String(original),
        }));
        setTokens(tokenList);
        setSanitizedText(res.sanitized_text);
      }

      setStatus('done');
    } catch (err: any) {
      setError(err.message || 'Sanitisation failed');
      setStatus('error');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setError(null);
    setSanitizedText(null);
    setTokens([]);
    setInputText('');
    setSelectedFile(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: statusDotColor, transition: 'background 0.4s ease' }}
          />
          <span
            className="text-xs font-bold tracking-widest"
            style={{ color: '#666666', letterSpacing: '0.2em' }}
          >
            {statusLabel}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {status === 'done' && (
            <button
              onClick={handleReset}
              className="text-xs hover:opacity-60 transition-opacity"
              style={{ color: '#aaaaaa', letterSpacing: '0.12em' }}
            >
              RESET
            </button>
          )}
          <span
            className="text-xs font-mono"
            style={{ color: '#aaaaaa', letterSpacing: '0.08em' }}
          >
            {hasSession && session.id
              ? `SESSION ID: ${session.id.substring(0, 8)}`
              : 'SESSION ID: —'}
          </span>
        </div>
      </div>

      <div className="flex-1 flex items-stretch gap-0 min-h-0">
        <InputPanel
          text={inputText}
          onChange={setInputText}
          onSanitise={handleSanitise}
          loading={loading}
          hasSession={hasSession}
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
        />

        <div className="flex items-center justify-center px-2">
          <ProcessingIndicator active={loading} />
        </div>

        <OutputPanel
          loading={loading}
          sanitizedText={sanitizedText}
          tokens={tokens}
          error={error}
        />
      </div>
    </div>
  );
}
