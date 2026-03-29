interface Token {
  token: string;
  original: string;
}

interface OutputPanelProps {
  loading: boolean;
  sanitizedText: string | null;
  tokens: Token[];
  error: string | null;
}

export function OutputPanel({ loading, sanitizedText, tokens, error }: OutputPanelProps) {
  return (
    <div
      className="flex-1 flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: 'white',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
        minHeight: '380px',
      }}
    >
      <div
        className="flex items-center gap-2 px-5 py-3.5"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: sanitizedText ? '#16a34a' : loading ? '#c8923a' : '#d1d5db' }}
        />
        <span
          className="text-xs font-bold tracking-widest"
          style={{
            color: sanitizedText ? '#16a34a' : loading ? '#c8923a' : '#aaaaaa',
            letterSpacing: '0.2em',
            transition: 'color 0.4s ease',
          }}
        >
          SANITIZED OUTPUT
        </span>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <p className="text-sm text-center" style={{ color: '#dc2626' }}>{error}</p>
          </div>
        )}

        {!error && loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 animate-fade-in">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'rgba(0,0,0,0.12)', borderTopColor: '#c8923a' }}
            />
            <p
              className="text-xs font-bold tracking-widest"
              style={{ color: '#bbbbbb', letterSpacing: '0.2em' }}
            >
              PROCESSING...
            </p>
          </div>
        )}

        {!error && !loading && !sanitizedText && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <p className="text-xs text-center" style={{ color: '#cccccc', letterSpacing: '0.1em' }}>
              Sanitized document will appear here
            </p>
          </div>
        )}

        {!error && !loading && sanitizedText && (
          <div className="absolute inset-0 overflow-y-auto p-5 animate-fade-in">
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: '#333333', fontFamily: "'Courier New', Courier, monospace" }}
            >
              {sanitizedText}
            </p>
          </div>
        )}
      </div>

      {!loading && tokens.length > 0 && (
        <div
          className="px-5 py-4 space-y-1.5"
          style={{ borderTop: '1px solid rgba(0,0,0,0.06)', maxHeight: '140px', overflowY: 'auto' }}
        >
          <p
            className="text-xs font-bold tracking-widest mb-2"
            style={{ color: '#16a34a', letterSpacing: '0.15em' }}
          >
            {tokens.length} TOKEN{tokens.length !== 1 ? 'S' : ''} SECURED
          </p>
          {tokens.map(({ token, original }) => (
            <div key={token} className="flex items-center gap-2 text-xs">
              <code
                className="px-1.5 py-0.5 rounded font-mono shrink-0"
                style={{ background: '#fef9ee', border: '1px solid #f5e0a0', color: '#b45309', fontSize: '10px' }}
              >
                {token}
              </code>
              <span style={{ color: '#cccccc' }}>→</span>
              <span className="truncate" style={{ color: '#666666' }}>{original}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
