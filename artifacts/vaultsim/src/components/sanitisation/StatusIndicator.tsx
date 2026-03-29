type IndicatorState = 'idle' | 'loading' | 'complete' | 'error';

interface StatusIndicatorProps {
  state: IndicatorState;
}

export function StatusIndicator({ state }: StatusIndicatorProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 shrink-0"
      style={{ width: '80px' }}
    >
      <div className="relative w-12 h-12">

        {(state === 'idle' || state === 'loading') && (
          <>
            <svg
              viewBox="0 0 48 48"
              className="w-12 h-12"
              style={{ transform: 'rotate(-90deg)' }}
            >
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="2" />
              <circle
                cx="24" cy="24" r="20"
                fill="none"
                stroke={state === 'loading' ? '#c8923a' : 'rgba(0,0,0,0.15)'}
                strokeWidth="2"
                strokeDasharray="30 96"
                strokeLinecap="round"
                style={{
                  transition: 'stroke 0.4s ease',
                  animation: state === 'loading' ? 'si-spin 1.4s linear infinite' : 'none',
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center" style={{ fontSize: '16px' }}>
              🔐
            </div>
          </>
        )}

        {state === 'complete' && (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: '#16a34a',
              boxShadow: '0 0 0 4px rgba(22,163,74,0.15), 0 4px 14px rgba(22,163,74,0.35)',
              animation: 'si-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
            }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}

        {state === 'error' && (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: '#dc2626',
              boxShadow: '0 0 0 4px rgba(220,38,38,0.15)',
              animation: 'si-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
        )}
      </div>

      <p
        className="text-xs font-bold tracking-widest text-center transition-all duration-300"
        style={{
          color: state === 'loading'  ? '#c8923a'
               : state === 'complete' ? '#16a34a'
               : state === 'error'    ? '#dc2626'
               : 'rgba(0,0,0,0.18)',
          letterSpacing: '0.12em',
        }}
      >
        {state === 'loading'  && 'ENCRYPTING'}
        {state === 'complete' && 'COMPLETE'}
        {state === 'error'    && 'FAILED'}
        {state === 'idle'     && '· · ·'}
      </p>

      {state === 'complete' && (
        <p
          className="text-center leading-tight"
          style={{
            color: '#16a34a',
            fontSize: '9px',
            letterSpacing: '0.1em',
            fontWeight: 700,
            animation: 'si-fade 0.5s ease 0.2s both',
          }}
        >
          SANITIZATION<br />COMPLETE
        </p>
      )}

      <style>{`
        @keyframes si-spin {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -126; }
        }
        @keyframes si-pop {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes si-fade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
