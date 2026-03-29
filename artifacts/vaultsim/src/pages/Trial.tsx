import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { getApiClient } from '../utils/api';
import { GlossaryTooltip } from '../components/trial/GlossaryTooltip';

interface TranscriptItem { agent: string; text: string; }

type Phase = 'idle' | 'fetching' | 'running' | 'complete' | 'revealed';

interface TimelineNode {
  id: string;
  label: string;
  subLabel?: string;
  timestamp?: string;
  status: 'pending' | 'active' | 'done';
}

interface DisplayedMessage {
  agent: string;
  label: string;
  dotColor: string;
  text: string;
}

const AGENT_META: Record<string, { label: string; dotColor: string; phaseLabel: string }> = {
  DefenseCounsel:    { label: 'DEFENSE LAWYER',     dotColor: '#c8923a', phaseLabel: 'INTELLIGENCE' },
  ProsecutionCounsel:{ label: 'PROSECUTION LAWYER', dotColor: '#dc2626', phaseLabel: 'OPPOSITION'   },
  Judge:             { label: 'JUDGE',              dotColor: '#c8923a', phaseLabel: 'VERDICT'       },
};

function getTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

const TYPING_SPEED_MS = 45;
const PAUSE_BETWEEN_MS = 1400;

export function Trial() {
  const location = useLocation();
  const { session, isSessionValid } = useSession();
  const apiClient = getApiClient();

  const hasSession = session.isActive && isSessionValid();

  const [phase, setPhase]           = useState<Phase>('idle');
  const [error, setError]           = useState<string | null>(null);

  const [fullTranscript, setFullTranscript] = useState<TranscriptItem[]>([]);
  const [tokenMap, setTokenMap]             = useState<Record<string, string>>({});
  const [sanitizedText, setSanitizedText]   = useState<string | null>(null);

  const [timelineNodes, setTimelineNodes] = useState<TimelineNode[]>([
    { id: 'session', label: 'Trial Session', subLabel: 'Initiate adversarial simulation.', status: 'active' },
  ]);
  const [displayedMessages, setDisplayedMessages] = useState<DisplayedMessage[]>([]);
  const [currentMsgIdx, setCurrentMsgIdx] = useState(0);
  const [typingText, setTypingText]       = useState('');
  const [isTyping, setIsTyping]           = useState(false);
  const [showVerdict, setShowVerdict]     = useState(false);
  const [verdictTyping, setVerdictTyping] = useState('');
  const [verdictDone, setVerdictDone]     = useState(false);

  const [isSimplified, setIsSimplified]       = useState(false);
  const [simplifiedVerdict, setSimplifiedVerdict] = useState<string | null>(null);
  const [isSimplifying, setIsSimplifying]     = useState(false);

  const typingRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const verdictRef = useRef<HTMLDivElement>(null);

  const debateItems = fullTranscript.filter(t => t.agent !== 'Judge');
  const judgeItem   = fullTranscript.find(t => t.agent === 'Judge');

  const phaseLabel: string = (() => {
    if (phase === 'idle')     return 'TRIAL';
    if (phase === 'fetching') return 'LOADING';
    if (phase === 'complete' || phase === 'revealed') return 'TIMELINE';
    if (phase === 'running' && currentMsgIdx < debateItems.length) {
      const a = debateItems[currentMsgIdx]?.agent;
      return AGENT_META[a]?.phaseLabel ?? 'TRIAL';
    }
    return 'TRIAL';
  })();

  const addTimelineNode = useCallback((node: Omit<TimelineNode, 'timestamp'>) => {
    setTimelineNodes(prev => [
      ...prev.map(n => n.status === 'active' ? { ...n, status: 'done' as const } : n),
      { ...node, timestamp: getTime(), status: 'active' },
    ]);
  }, []);

  useEffect(() => {
    const state = location.state as { pipelineResult?: any } | null;
    if (state?.pipelineResult) {
      const r = state.pipelineResult;
      if (r.debate_transcript?.length) {
        setFullTranscript(r.debate_transcript);
        setSanitizedText(r.sanitized_text || null);
        setTokenMap(r.token_map || {});
      }
    }
  }, [location.state]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedMessages, typingText]);

  useEffect(() => {
    if (!verdictDone || !judgeItem) return;
    const saveEnabled = localStorage.getItem('sc_save_verdicts') === 'true';
    if (!saveEnabled) return;
    apiClient.saveVerdict(judgeItem.text, session.id ?? undefined).then(() => {
      window.dispatchEvent(new Event('verdict-saved'));
    }).catch(() => {});
  }, [verdictDone]);

  const startTyping = useCallback((text: string, onDone: () => void) => {
    const words = text.split(' ');
    let idx = 0;
    setIsTyping(true);
    setTypingText('');
    if (typingRef.current) clearInterval(typingRef.current);
    typingRef.current = setInterval(() => {
      idx++;
      setTypingText(words.slice(0, idx).join(' '));
      if (idx >= words.length) {
        if (typingRef.current) clearInterval(typingRef.current);
        setIsTyping(false);
        onDone();
      }
    }, TYPING_SPEED_MS);
  }, []);

  useEffect(() => {
    if (phase !== 'running') return;
    if (currentMsgIdx >= debateItems.length) {
      setTimeout(() => {
        addTimelineNode({ id: 'vault-system', label: 'SafeCourt System', status: 'active' });
        setPhase('complete');
      }, 800);
      return;
    }

    const item = debateItems[currentMsgIdx];
    const meta = AGENT_META[item.agent] ?? { label: item.agent, dotColor: '#888', phaseLabel: 'TRIAL' };

    addTimelineNode({ id: `step-${currentMsgIdx}`, label: meta.label, status: 'active' });
    setTypingText('');

    startTyping(item.text, () => {
      setTimeout(() => {
        setDisplayedMessages(prev => [...prev, { agent: item.agent, label: meta.label, dotColor: meta.dotColor, text: item.text }]);
        setTypingText('');
        setCurrentMsgIdx(prev => prev + 1);
      }, PAUSE_BETWEEN_MS);
    });

    return () => { if (typingRef.current) clearInterval(typingRef.current); };
  }, [phase, currentMsgIdx]);

  const handleFetchAndStart = async () => {
    if (!hasSession) { setError('Create a session first.'); return; }
    setError(null);
    setPhase('fetching');
    try {
      const res = await apiClient.runDebate(session.id!);
      const t = res.transcript || [];
      setFullTranscript(t);
      setSanitizedText(res.masked_content || null);
      setDisplayedMessages([]);
      setCurrentMsgIdx(0);
      setTypingText('');
      setShowVerdict(false);
      setVerdictTyping('');
      setVerdictDone(false);
      setIsSimplified(false);
      setSimplifiedVerdict(null);
      setIsSimplifying(false);
      setTimelineNodes([{ id: 'session', label: 'Trial Session', subLabel: 'Initiate adversarial simulation.', timestamp: getTime(), status: 'done' }]);
      setPhase('running');
    } catch (err: any) {
      setError(err.message || 'Debate failed. Sanitise a document first.');
      setPhase('idle');
    }
  };

  const handleStartDebate = () => {
    if (debateItems.length > 0) {
      setDisplayedMessages([]);
      setCurrentMsgIdx(0);
      setTypingText('');
      setShowVerdict(false);
      setVerdictTyping('');
      setVerdictDone(false);
      setIsSimplified(false);
      setSimplifiedVerdict(null);
      setIsSimplifying(false);
      setTimelineNodes([{ id: 'session', label: 'Trial Session', subLabel: 'Initiate adversarial simulation.', timestamp: getTime(), status: 'done' }]);
      setPhase('running');
    } else {
      handleFetchAndStart();
    }
  };

  const handleRevealVerdict = () => {
    if (!judgeItem) return;
    setShowVerdict(true);
    addTimelineNode({ id: 'verdict', label: 'FINAL VERDICT', status: 'active' });
    setPhase('revealed');

    const words = judgeItem.text.split(' ');
    let idx = 0;
    const iv = setInterval(() => {
      idx++;
      setVerdictTyping(words.slice(0, idx).join(' '));
      if (idx >= words.length) {
        clearInterval(iv);
        setVerdictDone(true);
      }
    }, TYPING_SPEED_MS);

    setTimeout(() => verdictRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
  };

  const handleReset = () => {
    if (typingRef.current) clearInterval(typingRef.current);
    setPhase('idle');
    setFullTranscript([]);
    setDisplayedMessages([]);
    setCurrentMsgIdx(0);
    setTypingText('');
    setShowVerdict(false);
    setVerdictTyping('');
    setVerdictDone(false);
    setIsSimplified(false);
    setSimplifiedVerdict(null);
    setIsSimplifying(false);
    setTokenMap({});
    setSanitizedText(null);
    setError(null);
    setTimelineNodes([{ id: 'session', label: 'Trial Session', subLabel: 'Initiate adversarial simulation.', status: 'active' }]);
  };

  const handleToggleSimplify = async () => {
    if (!judgeItem || !session.id) return;
    const next = !isSimplified;
    setIsSimplified(next);
    if (next && !simplifiedVerdict) {
      setIsSimplifying(true);
      try {
        const res = await apiClient.simplifyVerdict(judgeItem.text, session.id);
        setSimplifiedVerdict(res.simplified);
      } catch {
        setSimplifiedVerdict('Unable to simplify verdict. Please try again.');
      } finally {
        setIsSimplifying(false);
      }
    }
  };

  const currentTypingAgent = phase === 'running' && currentMsgIdx < debateItems.length
    ? debateItems[currentMsgIdx] : null;
  const currentTypingMeta = currentTypingAgent ? (AGENT_META[currentTypingAgent.agent] ?? { label: currentTypingAgent.agent, dotColor: '#888' }) : null;
  const tokenList = Object.entries(tokenMap).map(([t, o]) => ({ token: t, original: String(o) }));

  return (
    <div
      className="animate-fade-in"
      style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <div
        className="font-black uppercase select-none mb-3 leading-none"
        style={{
          fontSize: '2.2rem',
          color: '#c8923a',
          letterSpacing: '-0.02em',
          fontStyle: 'italic',
          textShadow: '2px 2px 0 rgba(0,0,0,0.12)',
          transition: 'all 0.5s ease',
        }}
      >
        {phaseLabel}
      </div>

      <div className="flex gap-0 flex-1 overflow-hidden">
        <div
          className="flex flex-col pt-1"
          style={{ width: '160px', minWidth: '160px' }}
        >
          <p
            className="text-xs font-bold tracking-widest mb-4 pb-2"
            style={{ color: '#aaaaaa', letterSpacing: '0.18em', borderBottom: '1px solid rgba(0,0,0,0.08)' }}
          >
            TIMELINE
          </p>
          <div className="relative flex-1">
            <div
              className="absolute left-2 top-0 bottom-0 w-px"
              style={{ background: 'rgba(0,0,0,0.1)' }}
            />
            <div className="space-y-5 relative">
              {timelineNodes.map((node, i) => (
                <div key={node.id} className="flex items-start gap-3 animate-fade-in">
                  <div
                    className="w-4 h-4 rounded-full shrink-0 mt-0.5 transition-all duration-500 relative z-10"
                    style={{
                      background: node.status === 'active' ? '#c8923a' : node.status === 'done' ? '#888888' : 'rgba(0,0,0,0.15)',
                      border: node.status === 'active' ? '2px solid rgba(200,146,58,0.4)' : '2px solid transparent',
                      boxShadow: node.status === 'active' ? '0 0 8px rgba(200,146,58,0.5)' : 'none',
                    }}
                  />
                  <div>
                    {node.timestamp && (
                      <p className="text-xs leading-none mb-0.5" style={{ color: '#bbbbbb', fontSize: '10px' }}>
                        {node.timestamp}
                      </p>
                    )}
                    <p
                      className="text-xs font-bold leading-tight"
                      style={{
                        color: node.status === 'active' ? '#c8923a' : node.status === 'done' ? '#888888' : '#cccccc',
                        letterSpacing: '0.05em',
                        fontSize: '11px',
                        transition: 'color 0.4s',
                      }}
                    >
                      {node.label}
                    </p>
                    {node.subLabel && (
                      <p className="text-xs leading-tight mt-0.5" style={{ color: '#aaaaaa', fontSize: '10px' }}>
                        {node.subLabel}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden mx-4">
          <p
            className="text-xs font-bold tracking-widest mb-4 pb-2"
            style={{ color: '#aaaaaa', letterSpacing: '0.18em', borderBottom: '1px solid rgba(0,0,0,0.08)' }}
          >
            SANITISED CHANNEL
          </p>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {phase === 'idle' && (
              <div
                className="rounded-2xl p-5 shadow-sm animate-fade-in"
                style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#c8923a' }} />
                    <span className="text-sm font-bold" style={{ color: '#333333' }}>Trial Session</span>
                  </div>
                </div>
                <p className="text-sm mb-4" style={{ color: '#888888' }}>
                  Initiate adversarial simulation.
                </p>
                {error && (
                  <p className="text-xs mb-3 rounded-lg px-3 py-2" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                    {error}
                  </p>
                )}
                {hasSession ? (
                  <button
                    onClick={handleStartDebate}
                    className="px-5 py-2 rounded-full text-xs font-bold tracking-widest transition-all hover:opacity-80"
                    style={{ background: '#333333', color: 'white', letterSpacing: '0.12em' }}
                  >
                    {debateItems.length > 0 ? '▶ REPLAY DEBATE' : '▶ START DEBATE'}
                  </button>
                ) : (
                  <p className="text-xs" style={{ color: '#aaaaaa' }}>Create a session to begin.</p>
                )}
              </div>
            )}

            {phase === 'fetching' && (
              <div
                className="rounded-2xl p-5 shadow-sm animate-fade-in"
                style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full inline-block animate-pulse" style={{ background: '#c8923a' }} />
                  <span className="text-sm font-bold" style={{ color: '#333333' }}>Trial Session</span>
                  <span
                    className="ml-auto px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: '#f0f0f0', color: '#888888' }}
                  >
                    Running...
                  </span>
                </div>
                <p className="text-sm" style={{ color: '#888888' }}>Initiate adversarial simulation.</p>
              </div>
            )}

            {displayedMessages.map((msg, i) => (
              <div
                key={i}
                className="rounded-2xl p-5 shadow-sm animate-fade-in"
                style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: msg.dotColor }} />
                    <span className="text-sm font-bold" style={{ color: '#222222' }}>{msg.label}</span>
                  </div>
                  <span
                    className="text-xs tracking-widest"
                    style={{ color: '#cccccc', letterSpacing: '0.15em', fontSize: '10px' }}
                  >
                    SANITISED INPUT
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#444444' }}>
                  <GlossaryTooltip text={msg.text} />
                </p>
              </div>
            ))}

            {phase === 'running' && currentTypingMeta && typingText && (
              <div
                className="rounded-2xl p-5 shadow-sm animate-fade-in"
                style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: currentTypingMeta.dotColor }} />
                    <span className="text-sm font-bold" style={{ color: '#222222' }}>{currentTypingMeta.label}</span>
                  </div>
                  <span
                    className="text-xs tracking-widest"
                    style={{ color: '#cccccc', letterSpacing: '0.15em', fontSize: '10px' }}
                  >
                    SANITISED INPUT
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#444444' }}>
                  <GlossaryTooltip text={typingText} />
                  <span
                    className="inline-block w-0.5 h-4 ml-0.5 align-middle"
                    style={{ background: currentTypingMeta.dotColor, animation: 'blink 0.8s step-end infinite' }}
                  />
                </p>
              </div>
            )}

            {(phase === 'complete' || phase === 'revealed') && (
              <div
                className="rounded-2xl p-5 shadow-sm animate-fade-in"
                style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#c8923a' }} />
                    <span className="text-sm font-bold" style={{ color: '#222222' }}>SAFECOURT SYSTEM</span>
                  </div>
                  <span
                    className="text-xs tracking-widest"
                    style={{ color: '#cccccc', letterSpacing: '0.15em', fontSize: '10px' }}
                  >
                    SANITISED INPUT
                  </span>
                </div>
                <p className="text-sm" style={{ color: '#666666' }}>
                  Debate ended: Prosecution reached final agreement.
                </p>
              </div>
            )}

            {phase === 'complete' && judgeItem && (
              <div className="flex justify-center py-3 animate-fade-in">
                <button
                  onClick={handleRevealVerdict}
                  className="inline-flex items-center gap-2.5 px-7 py-3 rounded-full font-bold text-sm tracking-widest transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: '#111111',
                    color: 'white',
                    letterSpacing: '0.15em',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.25), 0 0 0 1px rgba(200,146,58,0.12)',
                  }}
                >
                  <span className="w-4 h-4 rounded-full border border-white/30 flex items-center justify-center" style={{ fontSize: '9px' }}>○</span>
                  REVEAL VERDICT
                </button>
              </div>
            )}

            {phase === 'revealed' && showVerdict && judgeItem && (
              <div
                ref={verdictRef}
                className="rounded-2xl p-6 animate-fade-in"
                style={{
                  background: '#111111',
                  border: '1px solid #2a2a2a',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(200,146,58,0.1)',
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(200,146,58,0.15)', border: '1px solid rgba(200,146,58,0.3)', fontSize: '13px' }}
                  >
                    ⚖
                  </div>
                  <div>
                    <p className="text-xs font-black tracking-widest" style={{ color: '#c8923a', letterSpacing: '0.22em' }}>
                      FINAL VERDICT
                    </p>
                    <p className="text-xs" style={{ color: '#555555' }}>Presiding Judge — SafeCourt AI</p>
                  </div>
                </div>
                <div className="h-px mb-4" style={{ background: 'linear-gradient(90deg, rgba(200,146,58,0.4), transparent)' }} />

                {isSimplified && simplifiedVerdict ? (
                  <>
                    <p className="text-sm leading-relaxed" style={{ color: '#e8e3da' }}>
                      <GlossaryTooltip text={simplifiedVerdict} />
                    </p>
                    {verdictDone && (
                      <p className="text-xs mt-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
                        Original: <GlossaryTooltip text={judgeItem.text} />
                      </p>
                    )}
                  </>
                ) : isSimplified && isSimplifying ? (
                  <div className="flex items-center gap-2 py-1">
                    <div className="w-3 h-3 rounded-full border border-amber-400/40 border-t-amber-400 animate-spin" />
                    <span className="text-xs" style={{ color: '#888888' }}>Simplifying verdict…</span>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed" style={{ color: '#e8e3da' }}>
                    <GlossaryTooltip text={verdictTyping} />
                    {!verdictDone && (
                      <span
                        className="inline-block w-0.5 h-4 ml-0.5 align-middle"
                        style={{ background: '#c8923a', animation: 'blink 0.8s step-end infinite' }}
                      />
                    )}
                  </p>
                )}

                {verdictDone && (
                  <>
                    <div className="h-px mt-4" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,146,58,0.4))' }} />
                    <div className="flex items-center justify-end gap-2.5 mt-3">
                      <span className="text-xs" style={{ color: '#666666', letterSpacing: '0.08em' }}>
                        Simplify Verdict
                      </span>
                      <button
                        onClick={handleToggleSimplify}
                        disabled={isSimplifying}
                        style={{
                          width: '36px',
                          height: '20px',
                          borderRadius: '10px',
                          background: isSimplified ? '#c8923a' : 'rgba(255,255,255,0.12)',
                          border: isSimplified ? 'none' : '1px solid rgba(255,255,255,0.15)',
                          position: 'relative',
                          cursor: isSimplifying ? 'wait' : 'pointer',
                          transition: 'background 0.25s ease',
                          flexShrink: 0,
                        }}
                        title={isSimplified ? 'Show legal language' : 'Show plain English'}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            top: '2px',
                            left: isSimplified ? '18px' : '2px',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: 'white',
                            transition: 'left 0.25s ease',
                            display: 'block',
                          }}
                        />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {(phase === 'complete' || phase === 'revealed') && (
              <div className="flex justify-center pt-2 pb-1">
                <button
                  onClick={handleReset}
                  className="text-xs tracking-widest hover:opacity-60 transition-opacity"
                  style={{ color: '#bbbbbb', letterSpacing: '0.15em' }}
                >
                  CLEAR TRIAL
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        <div className="flex flex-col overflow-hidden" style={{ width: '196px', minWidth: '196px' }}>
          <p
            className="text-xs font-bold tracking-widest mb-4 pb-2 pt-1"
            style={{ color: '#aaaaaa', letterSpacing: '0.18em', borderBottom: '1px solid rgba(0,0,0,0.08)' }}
          >
            VAULT / DETOKENISED
          </p>

          <div className="flex-1 overflow-y-auto space-y-3">
            {(phase === 'idle' || phase === 'fetching') && (
              <p className="text-xs" style={{ color: '#cccccc', letterSpacing: '0.08em' }}>
                System Ready
              </p>
            )}

            {(phase === 'running' || phase === 'complete' || phase === 'revealed') && (
              <div
                className="rounded-xl p-3 animate-fade-in"
                style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.07)' }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span style={{ color: '#c8923a', fontSize: '11px' }}>⚠</span>
                  <span
                    className="text-xs font-bold tracking-widest"
                    style={{ color: '#c8923a', letterSpacing: '0.12em', fontSize: '10px' }}
                  >
                    VAULT DETOKENIZATION
                  </span>
                </div>
                {tokenList.length > 0 ? (
                  <div className="space-y-1.5">
                    {tokenList.map(({ token, original }) => (
                      <div key={token} className="text-xs">
                        <span
                          className="font-mono inline-block rounded px-1 mb-0.5"
                          style={{ background: '#fef9ee', border: '1px solid #f5e0a0', color: '#b45309', fontSize: '9px' }}
                        >
                          {token}
                        </span>
                        <br />
                        <span style={{ color: '#777777', fontSize: '10px' }}>{original}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: '#aaaaaa' }}>No PII tokens detected.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
