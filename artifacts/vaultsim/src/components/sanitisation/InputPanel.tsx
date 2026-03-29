import { useRef } from 'react';

interface InputPanelProps {
  text: string;
  onChange: (val: string) => void;
  onSanitise: () => void;
  loading: boolean;
  hasSession: boolean;
  selectedFile: File | null;
  onFileSelect: (f: File | null) => void;
}

export function InputPanel({
  text, onChange, onSanitise, loading, hasSession, selectedFile, onFileSelect,
}: InputPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="flex-1 flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: '#111111',
        border: '1px solid #222222',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        minHeight: '380px',
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid #222222' }}
      >
        <div className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#c8923a" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
            <path d="M14 2v6h6" fill="none" stroke="#c8923a" strokeWidth="2" />
          </svg>
          <span
            className="text-xs font-bold tracking-widest"
            style={{ color: '#c8923a', letterSpacing: '0.2em' }}
          >
            ORIGINAL INPUT
          </span>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="text-xs transition-opacity hover:opacity-70"
          style={{ color: '#555555', letterSpacing: '0.1em' }}
          title="Attach PDF"
        >
          + PDF
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0] || null;
            onFileSelect(f);
            if (f && !f.name.endsWith('.pdf')) {
              const reader = new FileReader();
              reader.onload = ev => onChange(ev.target?.result as string || '');
              reader.readAsText(f);
            }
          }}
        />
      </div>

      <div className="flex-1 relative">
        {selectedFile?.name.endsWith('.pdf') ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
            <div className="text-4xl mb-3">📄</div>
            <p className="text-sm font-medium text-center" style={{ color: '#cccccc' }}>
              {selectedFile.name}
            </p>
            <p className="text-xs mt-1" style={{ color: '#555555' }}>
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
            <button
              onClick={() => onFileSelect(null)}
              className="mt-4 text-xs hover:opacity-60 transition-opacity"
              style={{ color: '#666666', letterSpacing: '0.1em' }}
            >
              REMOVE
            </button>
          </div>
        ) : (
          <textarea
            value={text}
            onChange={e => onChange(e.target.value)}
            placeholder="Paste or type document text here..."
            disabled={loading}
            className="absolute inset-0 w-full h-full resize-none outline-none p-5 text-sm leading-relaxed"
            style={{
              background: 'transparent',
              color: '#e8e3da',
              fontFamily: "'Courier New', Courier, monospace",
              caretColor: '#c8923a',
            }}
          />
        )}
      </div>

      <div className="px-5 py-4" style={{ borderTop: '1px solid #1a1a1a' }}>
        <button
          onClick={onSanitise}
          disabled={loading || !hasSession || (!text.trim() && !selectedFile)}
          className="w-full py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase transition-all disabled:opacity-30 hover:opacity-80"
          style={{ background: '#c8923a', color: '#111111', letterSpacing: '0.15em' }}
        >
          {loading ? 'PROCESSING...' : 'SANITISE →'}
        </button>
        {!hasSession && (
          <p className="text-xs text-center mt-2" style={{ color: '#444444' }}>
            Create a session first
          </p>
        )}
      </div>
    </div>
  );
}
