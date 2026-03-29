import { useState, useRef } from 'react';
import { useSession } from '../contexts/SessionContext';
import { useVault } from '../hooks/useVault';
import { getApiClient, generateProcessingId } from '../utils/api';

export function Sanitisation() {
  const { session, isSessionValid } = useSession();
  const { vault, ready: vaultReady } = useVault();
  const apiClient = getApiClient();

  const [mode, setMode] = useState<'text' | 'pdf'>('text');
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasSession = session.isActive && isSessionValid();

  const handleSanitise = async () => {
    if (!hasSession) { setError('Create a session first.'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const processingId = generateProcessingId();
      if (mode === 'text') {
        const res = await apiClient.sanitizeText(session.id!, processingId, inputText);
        setResult(res);
      } else if (selectedFile) {
        const res = await apiClient.sanitizePdf(session.id!, processingId, selectedFile);
        if (res.tokens && Object.keys(res.tokens).length > 0 && vault && vaultReady) {
          await vault.storeFromTokenMap(res.tokens);
        }
        setResult({ tokens: res.tokens, pages: res.pages, processing_time_sec: res.processing_time_sec, pdf_bytes: res.pdf_bytes });
      }
    } catch (err: any) {
      setError(err.message || 'Sanitisation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1
          className="font-black uppercase leading-none mb-2"
          style={{ fontSize: '2.8rem', color: '#2a2520', letterSpacing: '-0.01em' }}
        >
          SANITISATION
        </h1>
        <p className="text-sm" style={{ color: '#888888' }}>
          Detect and tokenize PII in text or PDF documents.
        </p>
      </div>

      <div
        className="rounded-2xl overflow-hidden shadow-sm"
        style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)' }}
      >
        <div className="flex" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          {(['text', 'pdf'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setResult(null); setError(null); }}
              className="flex-1 py-3.5 text-xs font-bold tracking-widest uppercase transition-colors"
              style={{
                letterSpacing: '0.15em',
                background: mode === m ? '#111111' : 'transparent',
                color: mode === m ? 'white' : '#888888',
              }}
            >
              {m === 'text' ? '📝 TEXT INPUT' : '📄 PDF UPLOAD'}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {mode === 'text' ? (
            <textarea
              rows={7}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Paste text containing PII — names, SSNs, emails, phone numbers, addresses..."
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition-shadow focus:ring-2 focus:ring-amber-500/20"
              style={{ background: '#f8f6f2', border: '1px solid rgba(0,0,0,0.08)', color: '#333333', fontFamily: 'inherit' }}
            />
          ) : (
            <div>
              <div
                className="rounded-xl p-8 text-center cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: '#f8f6f2', border: '2px dashed rgba(0,0,0,0.12)' }}
                onClick={() => fileRef.current?.click()}
              >
                <p className="text-3xl mb-2">📄</p>
                <p className="text-sm font-medium" style={{ color: '#555555' }}>
                  {selectedFile ? selectedFile.name : 'Click to select a PDF'}
                </p>
                {selectedFile && (
                  <p className="text-xs mt-1" style={{ color: '#aaaaaa' }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
              <input type="file" ref={fileRef} className="hidden" accept=".pdf" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
            </div>
          )}

          {error && (
            <p className="text-sm rounded-lg px-4 py-2.5" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              {error}
            </p>
          )}

          <button
            onClick={handleSanitise}
            disabled={loading || !hasSession || (mode === 'text' ? !inputText.trim() : !selectedFile)}
            className="w-full py-3 rounded-xl text-sm font-bold tracking-widest uppercase transition-all disabled:opacity-40"
            style={{ background: '#111111', color: 'white', letterSpacing: '0.12em' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                Processing...
              </span>
            ) : 'SANITISE'}
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-6 space-y-4 animate-fade-in">
          {result.sanitized_text && (
            <div
              className="rounded-2xl p-5 shadow-sm"
              style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)' }}
            >
              <p className="text-xs font-bold tracking-widest mb-3 uppercase" style={{ color: '#888888', letterSpacing: '0.15em' }}>
                Sanitised Output
              </p>
              <p className="text-sm font-mono leading-relaxed" style={{ color: '#333333' }}>
                {result.sanitized_text}
              </p>
            </div>
          )}

          {result.tokens && Object.keys(result.tokens).length > 0 && (
            <div
              className="rounded-2xl p-5 shadow-sm"
              style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)' }}
            >
              <p className="text-xs font-bold tracking-widest mb-3 uppercase" style={{ color: '#888888', letterSpacing: '0.15em' }}>
                {Object.keys(result.tokens).length} Token{Object.keys(result.tokens).length !== 1 ? 's' : ''} Secured
              </p>
              <div className="space-y-2">
                {Object.entries(result.tokens).map(([token, original]) => (
                  <div key={token} className="flex items-center gap-3 text-xs">
                    <code
                      className="px-2 py-1 rounded font-mono"
                      style={{ background: '#fef9ee', border: '1px solid #f5e0a0', color: '#b45309' }}
                    >
                      {token}
                    </code>
                    <span style={{ color: '#cccccc' }}>→</span>
                    <span style={{ color: '#555555' }}>{String(original)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.pages && (
            <div
              className="rounded-2xl p-4 text-xs"
              style={{ background: '#f8f6f2', border: '1px solid rgba(0,0,0,0.06)', color: '#888888' }}
            >
              PDF processed: {result.pages} page{result.pages !== 1 ? 's' : ''} · {result.processing_time_sec?.toFixed(2)}s
            </div>
          )}
        </div>
      )}
    </div>
  );
}
