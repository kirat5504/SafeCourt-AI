interface ProcessingIndicatorProps {
  active: boolean;
}

export function ProcessingIndicator({ active }: ProcessingIndicatorProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 shrink-0"
      style={{ width: '80px' }}
    >
      <div className="relative w-12 h-12">
        <svg
          viewBox="0 0 48 48"
          className="w-12 h-12"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx="24" cy="24" r="20"
            fill="none"
            stroke="rgba(0,0,0,0.08)"
            strokeWidth="2"
          />
          <circle
            cx="24" cy="24" r="20"
            fill="none"
            stroke={active ? '#c8923a' : 'rgba(0,0,0,0.15)'}
            strokeWidth="2"
            strokeDasharray="30 96"
            strokeLinecap="round"
            style={{
              transition: 'stroke 0.4s ease',
              animation: active ? 'spin 1.4s linear infinite' : 'none',
            }}
          />
        </svg>

        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ fontSize: '16px' }}
        >
          🔐
        </div>
      </div>

      <p
        className="text-xs font-bold tracking-widest text-center"
        style={{
          color: active ? '#c8923a' : 'rgba(0,0,0,0.2)',
          letterSpacing: '0.12em',
          transition: 'color 0.4s ease',
        }}
      >
        {active ? 'ENCRYPTING' : '· · ·'}
      </p>

      <style>{`
        @keyframes spin {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -126; }
        }
      `}</style>
    </div>
  );
}
