import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { useVault } from '../hooks/useVault';

const DEMO_CASE = `CASE FILE — CIVIL MATTER NO. 2024-CV-00847

Plaintiff: Jane Morrison, residing at 412 Elmwood Drive, Austin, TX 78701
Date of Birth: March 15, 1982
SSN: 512-34-7890
Email: jane.morrison@email.com

Defendant: NexaCorp Industries LLC
Represented by: Robert T. Haines, Bar No. TX-48821

SUMMARY OF CLAIMS:
Plaintiff alleges breach of contract dated January 14, 2024, claiming $175,000 in compensatory damages arising from Defendant's failure to deliver software services as contracted. Defendant's senior engineer, Marcus Webb (Employee ID: NXC-00293), is cited as responsible party.`;

export function Home() {
  const navigate = useNavigate();
  const { session, isSessionValid } = useSession();
  const { vault, ready: vaultReady } = useVault();

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const hasSession = session.isActive && isSessionValid();

  const handleDemoCase = () => {
    setInputText(DEMO_CASE);
    setSelectedFile(null);
    setError(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setSelectedFile(file);
      setInputText(`📄 ${file.name}`);
    }
  };

  const handleSubmit = async () => {
    if (!hasSession) return;
    if (!inputText.trim() && !selectedFile) return;

    setIsLoading(true);
    setError(null);

    try {
      let result: any;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const response = await fetch('/api/pipeline/run/pdf', {
          method: 'POST',
          headers: { 'X-Session-ID': session.id! },
          body: formData,
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || `Pipeline failed: ${response.status}`);
        }
        result = await response.json();
      } else {
        const response = await fetch('/api/pipeline/run/text', {
          method: 'POST',
          headers: { 'X-Session-ID': session.id!, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: inputText }),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || `Pipeline failed: ${response.status}`);
        }
        result = await response.json();
      }

      if (result.token_map && Object.keys(result.token_map).length > 0 && vault && vaultReady) {
        await vault.storeFromTokenMap(result.token_map);
      }

      navigate('/trial', { state: { pipelineResult: result } });
    } catch (err: any) {
      setError(err.message || 'Processing failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-140px)]">
      <div className="text-center max-w-3xl w-full animate-fade-in">
        <h1
          className="font-black uppercase leading-none mb-3 select-none"
          style={{
            fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
            color: '#2a2520',
            letterSpacing: '-0.01em',
          }}
        >
          ENCRYPTED CHAT WITH
        </h1>

        <p
          className="font-bold uppercase tracking-widest mb-10"
          style={{
            fontSize: 'clamp(0.75rem, 2vw, 1rem)',
            color: '#c8923a',
            letterSpacing: '0.35em',
          }}
        >
          MULTI AGENT LEGAL SYSTEM
        </p>

        <div className="relative flex items-center w-full max-w-2xl mx-auto mb-3">
          <div
            className="flex items-center w-full rounded-full shadow-sm px-5 py-3.5 gap-3"
            style={{ background: 'white', border: '1px solid rgba(0,0,0,0.1)' }}
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 hover:opacity-70 transition-opacity"
              title="Attach PDF"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.txt" onChange={handleFileSelect} />

            <input
              type="text"
              value={inputText}
              onChange={e => { setInputText(e.target.value); if (error) setError(null); }}
              onKeyDown={handleKeyDown}
              placeholder="Type or upload a PDF to sanitise..."
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: '#333333' }}
              disabled={isLoading}
            />

            <button
              onClick={handleSubmit}
              disabled={isLoading || (!inputText.trim() && !selectedFile)}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
              style={{ background: '#111111' }}
              title="Submit"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div
            className="animate-fade-in mb-4 rounded-2xl px-5 py-4 text-left w-full max-w-2xl mx-auto"
            style={{ background: '#fff8f8', border: '1px solid #fecaca' }}
          >
            <div className="flex items-start gap-3">
              <span style={{ color: '#dc2626', fontSize: '16px', marginTop: '1px', flexShrink: 0 }}>✕</span>
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: '#b91c1c' }}>
                  Invalid Case Input
                </p>
                <p className="text-xs leading-relaxed" style={{ color: '#666666' }}>
                  {error}
                </p>
                <p className="text-xs mt-2 italic" style={{ color: '#aaaaaa' }}>
                  Example: "Plaintiff Jane Doe alleges breach of employment contract against NexaCorp Ltd, 
                  claiming wrongful termination and seeking $80,000 in compensatory damages. 
                  Defendant disputes liability, citing documented performance issues."
                </p>
              </div>
            </div>
          </div>
        )}

        <p
          className="text-xs tracking-widest mb-6"
          style={{ color: '#aaaaaa', letterSpacing: '0.18em' }}
        >
          ENCRYPTED SESSION • SAFECOURT AI · Where legal reasoning meets secure AI
        </p>

        <button
          onClick={handleDemoCase}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold tracking-widest transition-all hover:opacity-80 active:scale-95"
          style={{ background: '#111111', color: 'white', letterSpacing: '0.15em' }}
        >
          <span style={{ color: '#c8923a', fontSize: '8px' }}>●</span>
          ADD DEMO CASE
        </button>

        {!hasSession && (
          <p
            className="text-xs mt-4 opacity-60"
            style={{ color: '#666666' }}
          >
            Create a session in the sidebar to start processing documents.
          </p>
        )}
      </div>
    </div>
  );
}
