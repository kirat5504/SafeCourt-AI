import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { getApiClient } from '../utils/api';

interface TranscriptItem {
  agent: string;
  text: string;
}

const AGENT_CONFIG: Record<string, {
  label: string; icon: string;
  color: string; bg: string; border: string;
}> = {
  DefenseCounsel: {
    label: 'DEFENSE COUNSEL',
    icon: '🛡',
    color: '#166534',
    bg: '#f0fdf4',
    border: '#86efac',
  },
  ProsecutionCounsel: {
    label: 'PROSECUTION',
    icon: '⚔',
    color: '#991b1b',
    bg: '#fef2f2',
    border: '#fca5a5',
  },
  Judge: {
    label: 'JUDGE — FINAL VERDICT',
    icon: '⚖',
    color: '#92400e',
    bg: '#111111',
    border: '#333333',
  },
};

export function Trial() {
  const location = useLocation();
  const { session, isSessionValid } = useSession();
  const apiClient = getApiClient();

  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [sanitizedText, setSanitizedText] = useState<string | null>(null);
  const [tokenMap, setTokenMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasResult, setHasResult] = useState(false);

  const [showVerdict, setShowVerdict] = useState(false);
  const verdictRef = useRef<HTMLDivElement>(null);

  const hasSession = session.isActive && isSessionValid();

  useEffect(() => {
    const state = location.state as { pipelineResult?: any } | null;
    if (state?.pipelineResult) {
      const r = state.pipelineResult;
      if (r.debate_transcript?.length) {
        setTranscript(r.debate_transcript);
        setSanitizedText(r.sanitized_text || null);
        setTokenMap(r.token_map || {});
        setHasResult(true);
        setShowVerdict(false);
      }
    }
  }, [location.state]);

  const handleRunDebate = async () => {
    if (!hasSession) { setError('Create a session first.'); return; }
    setLoading(true);
    setError(null);
    setShowVerdict(false);
    try {
      const res = await apiClient.runDebate(session.id!);
      setTranscript(res.transcript || []);
      setSanitizedText(res.masked_content || null);
      setHasResult(true);
    } catch (err: any) {
      setError(err.message || 'Debate failed. Make sure you have sanitised a document first.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevealVerdict = () => {
    setShowVerdict(true);
    setTimeout(() => {
      verdictRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const judgeItem = transcript.find(t => t.agent === 'Judge');
  const debateItems = transcript.filter(t => t.agent !== 'Judge');

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1
          className="font-black uppercase leading-none mb-2"
          style={{ fontSize: '2.8rem', color: '#2a2520', letterSpacing: '-0.01em' }}
        >
          TRIAL
        </h1>
        <p className="text-sm" style={{ color: '#888888' }}>
          Multi-agent legal debate over the sanitised case document.
        </p>
      </div>

      {!hasResult && (
        <div
          className="rounded-2xl p-10 text-center mb-6"
          style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)' }}
        >
          <p className="text-5xl mb-4">⚖️</p>
          <p className="font-bold text-sm mb-1" style={{ color: '#333333' }}>No active trial</p>
          <p className="text-xs mb-6" style={{ color: '#888888' }}>
            {hasSession
              ? 'Upload a document from the home page, or run a debate on your last sanitised document.'
              : 'Create a session in the sidebar first.'}
          </p>
          {hasSession && (
            <button
              onClick={handleRunDebate}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold tracking-widest transition-all hover:opacity-80 disabled:opacity-40"
              style={{ background: '#111111', color: 'white', letterSpacing: '0.12em' }}
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                  DELIBERATING...
                </>
              ) : '⚖ RUN TRIAL'}
            </button>
          )}
        </div>
      )}

      {error && (
        <p
          className="text-sm rounded-xl px-4 py-3 mb-4 animate-fade-in"
          style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
        >
          {error}
        </p>
      )}

      {hasResult && (
        <div className="space-y-4 animate-fade-in">
          {sanitizedText && (
            <div
              className="rounded-2xl p-5"
              style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)' }}
            >
              <p
                className="text-xs font-bold tracking-widest mb-2 uppercase"
                style={{ color: '#888888', letterSpacing: '0.15em' }}
              >
                Case Document (Sanitised)
              </p>
              <p className="text-xs font-mono leading-relaxed max-h-28 overflow-y-auto" style={{ color: '#555555' }}>
                {sanitizedText}
              </p>
              {Object.keys(tokenMap).length > 0 && (
                <p className="text-xs mt-2" style={{ color: '#c8923a' }}>
                  {Object.keys(tokenMap).length} PII token{Object.keys(tokenMap).length !== 1 ? 's' : ''} masked
                </p>
              )}
            </div>
          )}

          {debateItems.map((item, i) => {
            const cfg = AGENT_CONFIG[item.agent] || {
              label: item.agent, icon: '🤖',
              color: '#555555', bg: '#f9f9f9', border: '#e5e5e5',
            };
            return (
              <div
                key={i}
                className="rounded-2xl p-5"
                style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ fontSize: '16px' }}>{cfg.icon}</span>
                  <span
                    className="text-xs font-bold tracking-widest"
                    style={{ color: cfg.color, letterSpacing: '0.15em' }}
                  >
                    {cfg.label}
                  </span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#444444' }}>
                  {item.text}
                </p>
              </div>
            );
          })}

          {judgeItem && !showVerdict && (
            <div className="flex justify-center pt-4 pb-2">
              <button
                onClick={handleRevealVerdict}
                className="group relative inline-flex items-center gap-3 px-8 py-3.5 rounded-full font-bold text-sm tracking-widest transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                  color: 'white',
                  letterSpacing: '0.15em',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05) inset',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: '#c8923a' }}
                />
                REVEAL VERDICT
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: '#c8923a', animationDelay: '0.5s' }}
                />
              </button>
            </div>
          )}

          {judgeItem && showVerdict && (
            <div
              ref={verdictRef}
              className="rounded-2xl p-7 animate-fade-in"
              style={{
                background: '#111111',
                border: '1px solid #2a2a2a',
                boxShadow: '0 8px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(200,146,58,0.15)',
              }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                  style={{ background: 'rgba(200,146,58,0.15)', border: '1px solid rgba(200,146,58,0.3)' }}
                >
                  ⚖
                </div>
                <div>
                  <p
                    className="text-xs font-black tracking-widest"
                    style={{ color: '#c8923a', letterSpacing: '0.25em' }}
                  >
                    FINAL VERDICT
                  </p>
                  <p className="text-xs" style={{ color: '#555555' }}>
                    Presiding Judge — VaultSim Court
                  </p>
                </div>
              </div>

              <div
                className="w-full h-px mb-5"
                style={{ background: 'linear-gradient(90deg, rgba(200,146,58,0.4), transparent)' }}
              />

              <p
                className="text-base leading-relaxed font-medium"
                style={{ color: '#e8e3da', letterSpacing: '0.01em' }}
              >
                {judgeItem.text}
              </p>

              <div
                className="w-full h-px mt-5"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(200,146,58,0.4))' }}
              />
            </div>
          )}

          <div className="pt-4 flex justify-center">
            <button
              onClick={() => {
                setHasResult(false);
                setTranscript([]);
                setSanitizedText(null);
                setTokenMap({});
                setShowVerdict(false);
              }}
              className="text-xs tracking-widest hover:opacity-60 transition-opacity"
              style={{ color: '#aaaaaa', letterSpacing: '0.15em' }}
            >
              CLEAR TRIAL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
