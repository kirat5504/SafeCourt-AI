import { useState, useRef } from 'react';
import { useVault } from '../hooks/useVault';
import { useSession } from '../contexts/SessionContext';
import { useDetokenizer } from '../hooks/useDetokenizer';
import { getApiClient, generateProcessingId, DebateTranscriptItem } from '../utils/api';
import { DebateResult } from '../components/DebateResult';
import type { VaultStats } from '../utils/types';

interface TestState {
  lastError: string | null;
  lastSuccess: string | null;
}

interface TextTestResult {
  original: string;
  sanitized: string;
  detokenized: string;
  tokenCount: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  detokenized?: string;
  processingId?: string;
}

interface PdfTestResult {
  fileName: string;
  fileSize: number;
  pages: number;
  tokenCount: number;
  processingTime: number;
  geminiCalls: number;
  success: boolean;
  error?: string;
}

export function TestSecurityVaultPage() {
  const { vault, ready: vaultReady, wipe: wipeVault, storeFromTokenMap } = useVault();
  const { session, initializeSession: initGlobalSession } = useSession();
  const { detokenize } = useDetokenizer();
  const apiClient = getApiClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [testState, setTestState] = useState<TestState>({
    lastError: null,
    lastSuccess: null,
  });

  const [vaultStats, setVaultStats] = useState<VaultStats | null>(null);
  const [textTestResult, setTextTestResult] = useState<TextTestResult | null>(null);
  const [pdfTestResult, setPdfTestResult] = useState<PdfTestResult | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [debateTranscript, setDebateTranscript] = useState<DebateTranscriptItem[]>([]);
  const [maskedContent, setMaskedContent] = useState<string | null>(null);
  const [debateLoading, setDebateLoading] = useState(false);
  const [debateError, setDebateError] = useState<string | null>(null);

  const handleInitializeSession = async () => {
    setLoading(true);
    try {
      const sessionResponse = await apiClient.createSession();
      await initGlobalSession(sessionResponse.session_id, sessionResponse.challenge);
      setTestState({
        lastSuccess: `Session created: ${sessionResponse.session_id.substring(0, 8)}...`,
        lastError: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setTestState((prev) => ({
        ...prev,
        lastError: `Session creation failed: ${errorMessage}`,
        lastSuccess: null,
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleTextSanitization = async (inputText: string) => {
    if (!session.id) {
      setTestState((prev) => ({ ...prev, lastError: 'Session not initialized' }));
      return;
    }

    setLoading(true);
    try {
      const processingId = generateProcessingId();
      const response = await apiClient.sanitizeText(session.id, processingId, inputText);

      if (Object.keys(response.tokens).length > 0) {
        await storeFromTokenMap(response.tokens);
      }

      const detokenizedText = await detokenize(response.sanitized_text);

      setTextTestResult({
        original: inputText,
        sanitized: response.sanitized_text,
        detokenized: detokenizedText,
        tokenCount: Object.keys(response.tokens).length,
      });

      if (vault) {
        const stats = await vault.getStats();
        setVaultStats(stats);
      }

      setTestState((prev) => ({
        ...prev,
        lastSuccess: `Text sanitized: ${Object.keys(response.tokens).length} tokens created`,
        lastError: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setTestState((prev) => ({ ...prev, lastError: `Text sanitization failed: ${message}`, lastSuccess: null }));
    } finally {
      setLoading(false);
    }
  };

  const handlePdfUpload = async (file: File) => {
    if (!session.id) {
      setTestState((prev) => ({ ...prev, lastError: 'Session not initialized' }));
      return;
    }

    if (!file || file.type !== 'application/pdf') {
      setTestState((prev) => ({ ...prev, lastError: 'Please select a valid PDF file' }));
      return;
    }

    setLoading(true);
    try {
      const processingId = generateProcessingId();
      const response = await apiClient.sanitizePdf(session.id, processingId, file);

      if (Object.keys(response.tokens).length > 0) {
        await storeFromTokenMap(response.tokens);
      }

      setPdfTestResult({
        fileName: file.name,
        fileSize: file.size,
        pages: response.pages,
        tokenCount: Object.keys(response.tokens).length,
        processingTime: response.processing_time_sec,
        geminiCalls: response.gemini_calls,
        success: true,
      });

      if (vault) {
        const stats = await vault.getStats();
        setVaultStats(stats);
      }

      setTestState((prev) => ({
        ...prev,
        lastSuccess: `PDF processed: ${response.pages} pages, ${Object.keys(response.tokens).length} tokens`,
        lastError: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setPdfTestResult({
        fileName: file.name,
        fileSize: file.size,
        pages: 0,
        tokenCount: 0,
        processingTime: 0,
        geminiCalls: 0,
        success: false,
        error: message,
      });
      setTestState((prev) => ({ ...prev, lastError: `PDF processing failed: ${message}`, lastSuccess: null }));
    } finally {
      setLoading(false);
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || !session.id) return;

    setLoading(true);
    try {
      const processingId = generateProcessingId();
      const userMessage = chatInput.trim();

      setChatMessages((prev) => [...prev, { role: 'user', content: userMessage, processingId }]);

      const response = await apiClient.sendChat(session.id, processingId, userMessage);
      const detokenizedAssistant = await detokenize(response.response);

      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.response, detokenized: detokenizedAssistant, processingId },
      ]);

      if (vault) {
        const stats = await vault.getStats();
        setVaultStats(stats);
      }

      setChatInput('');

      setTestState((prev) => ({
        ...prev,
        lastSuccess: `Chat processed: ${Object.keys(response.tokens).length} tokens created`,
        lastError: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setTestState((prev) => ({ ...prev, lastError: `Chat failed: ${message}`, lastSuccess: null }));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVaultStats = async () => {
    if (vault) {
      const stats = await vault.getStats();
      setVaultStats(stats);
    }
  };

  const handleWipeVault = async () => {
    if (!window.confirm('Wipe all vault data?')) return;

    setLoading(true);
    try {
      await wipeVault();
      setVaultStats(null);
      setTextTestResult(null);
      setPdfTestResult(null);
      setChatMessages([]);
      setChatInput('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTestState((prev) => ({ ...prev, lastSuccess: 'Vault wiped', lastError: null }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setTestState((prev) => ({ ...prev, lastError: `Wipe failed: ${message}` }));
    } finally {
      setLoading(false);
    }
  };

  const handleRunDebate = async () => {
    if (!session.id) return;

    setDebateLoading(true);
    setDebateError(null);
    setMaskedContent(null);
    try {
      const response = await apiClient.runDebate(session.id);
      setDebateTranscript(response.transcript);
      if (response.masked_content) setMaskedContent(response.masked_content);

      setTestState((prev) => ({
        ...prev,
        lastSuccess: `Debate completed: ${response.transcript.length} exchanges`,
        lastError: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDebateError(message);
      setTestState((prev) => ({ ...prev, lastError: `Debate failed: ${message}` }));
    } finally {
      setDebateLoading(false);
    }
  };

  const s = {
    container: { minHeight: '100vh', background: 'linear-gradient(to bottom right, #0f172a, #1e293b)', padding: '1.5rem' } as React.CSSProperties,
    grid: { maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' } as React.CSSProperties,
    card: { background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', padding: '1.5rem', marginBottom: '1.5rem' } as React.CSSProperties,
    h2: { fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' } as React.CSSProperties,
    label: { color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem', display: 'block' } as React.CSSProperties,
    valueBox: { padding: '0.75rem', background: '#0f172a', borderRadius: '0.375rem', color: '#cbd5e1', fontSize: '0.875rem', wordBreak: 'break-word' } as React.CSSProperties,
    btn: (enabled: boolean, color: string) => ({
      width: '100%', padding: '0.5rem 1rem', borderRadius: '0.375rem', fontWeight: '600',
      border: 'none', cursor: enabled ? 'pointer' : 'not-allowed', background: enabled ? color : '#475569',
      color: 'white', opacity: enabled ? 1 : 0.5,
    } as React.CSSProperties),
  };

  return (
    <div style={s.container}>
      <div style={s.grid}>
        <div>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
              VaultSim Security Test
            </h1>
            <p style={{ color: '#cbd5e1' }}>AES-256-GCM Encrypted Vault & Detokenization System</p>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.5rem' }}>
              Status: {vaultReady ? '✓ Vault Ready' : '○ Not Initialized'} |
              {session.id ? ` Session: ${session.id.substring(0, 8)}...` : ' No Session'}
            </p>
          </div>

          {testState.lastSuccess && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(20, 83, 45, 0.4)', border: '1px solid rgba(34, 197, 94, 0.5)', borderRadius: '0.375rem', color: '#86efac' }}>
              ✓ {testState.lastSuccess}
            </div>
          )}
          {testState.lastError && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(127, 29, 29, 0.4)', border: '1px solid rgba(239, 68, 68, 0.5)', borderRadius: '0.375rem', color: '#fca5a5' }}>
              ✗ {testState.lastError}
            </div>
          )}

          {/* 1. Session */}
          <div style={s.card}>
            <h2 style={s.h2}>1. Session Initialization</h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '1rem' }}>Start session and derive encryption key</p>
            <button onClick={handleInitializeSession} disabled={loading || vaultReady} style={s.btn(!loading && !vaultReady, '#2563eb')}>
              {loading ? 'Initializing...' : vaultReady ? 'Session Active' : 'Initialize Session'}
            </button>
          </div>

          {/* 2. Text Sanitization */}
          <div style={s.card}>
            <h2 style={s.h2}>2. Text Sanitization</h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '1rem' }}>Sanitize text containing PII</p>
            <textarea
              id="textInput"
              defaultValue="My name is John Doe and my email is john@example.com. Call me at (555) 123-4567."
              disabled={loading || !vaultReady}
              style={{ width: '100%', height: '6rem', padding: '0.75rem', background: '#0f172a', color: 'white', border: '1px solid #334155', borderRadius: '0.375rem', marginBottom: '0.75rem', fontSize: '0.875rem', fontFamily: 'monospace', boxSizing: 'border-box' }}
            />
            <button
              onClick={() => {
                const el = document.getElementById('textInput') as HTMLTextAreaElement;
                handleTextSanitization(el.value);
              }}
              disabled={loading || !vaultReady}
              style={s.btn(!loading && vaultReady, '#16a34a')}
            >
              {loading ? 'Processing...' : 'Sanitize Text'}
            </button>

            {textTestResult && (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={s.label}>Original</label>
                  <div style={s.valueBox}>{textTestResult.original}</div>
                </div>
                <div>
                  <label style={s.label}>Sanitized ({textTestResult.tokenCount} tokens)</label>
                  <div style={s.valueBox}>{textTestResult.sanitized}</div>
                </div>
                <div>
                  <label style={s.label}>Detokenized</label>
                  <div style={{ ...s.valueBox, background: 'rgba(20, 83, 45, 0.2)', color: '#86efac', border: '1px solid #16a34a' }}>{textTestResult.detokenized}</div>
                </div>
              </div>
            )}
          </div>

          {/* 3. PDF Upload */}
          <div style={s.card}>
            <h2 style={s.h2}>3. PDF Upload & Processing</h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '1rem' }}>Upload PDF documents for PII detection and redaction</p>
            <input type="file" accept=".pdf" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); }} disabled={loading || !vaultReady} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current?.click()} disabled={loading || !vaultReady} style={{ ...s.btn(!loading && vaultReady, '#7c3aed'), marginBottom: '0.75rem' }}>
              {loading ? 'Processing PDF...' : 'Select PDF File'}
            </button>

            {pdfTestResult && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ padding: '0.75rem', background: pdfTestResult.success ? 'rgba(20, 83, 45, 0.2)' : 'rgba(127, 29, 29, 0.2)', borderRadius: '0.375rem', border: `1px solid ${pdfTestResult.success ? '#16a34a' : '#dc2626'}` }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: pdfTestResult.success ? '#86efac' : '#fca5a5', marginBottom: '0.5rem' }}>
                    {pdfTestResult.success ? '✓ PDF Processed Successfully' : '✗ PDF Processing Failed'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                    <div>File: {pdfTestResult.fileName}</div>
                    <div>Size: {(pdfTestResult.fileSize / 1024).toFixed(1)} KB</div>
                    {pdfTestResult.success && (
                      <>
                        <div>Pages: {pdfTestResult.pages}</div>
                        <div>Tokens: {pdfTestResult.tokenCount}</div>
                        <div>Processing Time: {pdfTestResult.processingTime.toFixed(2)}s</div>
                        <div>Gemini Calls: {pdfTestResult.geminiCalls}</div>
                      </>
                    )}
                    {pdfTestResult.error && <div style={{ color: '#fca5a5', marginTop: '0.25rem' }}>Error: {pdfTestResult.error}</div>}
                  </div>
                </div>
              </div>
            )}

            {pdfTestResult?.success && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #334155' }}>
                <button
                  onClick={() => window.location.href = '/debate'}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.375rem', fontWeight: 'bold', border: '1px solid #d97706', cursor: 'pointer', background: 'rgba(217, 119, 6, 0.1)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                >
                  <span style={{ fontSize: '1.25rem' }}>⚖️</span> Access AI Security Debate
                </button>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', textAlign: 'center', marginTop: '0.5rem' }}>
                  Adversarial testing unlocked based on processed document
                </p>
              </div>
            )}
          </div>

          {/* 4. AI Security Debate */}
          <div style={s.card}>
            <h2 style={s.h2}>4. AI Security Debate</h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Evaluate session robustness through adversarial testing between AI agents.
              They will try to extract sensitive context from your tokenized data.
            </p>
            <button
              onClick={handleRunDebate}
              disabled={debateLoading || !vaultReady}
              style={{ ...s.btn(!debateLoading && vaultReady, '#d97706'), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {debateLoading ? (
                <>
                  <div style={{ width: '1rem', height: '1rem', border: '2px solid white', borderBottomColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  Agents Debating...
                </>
              ) : (
                <><span style={{ fontSize: '1.125rem' }}>⚖️</span> Start Security Debate</>
              )}
            </button>

            {debateError && (
              <div style={{ marginTop: '0.75rem', padding: '1rem', background: 'rgba(127, 29, 29, 0.4)', border: '1px solid rgba(239, 68, 68, 0.5)', borderRadius: '0.375rem', color: '#fca5a5', fontSize: '0.875rem' }}>
                Error: {debateError}
              </div>
            )}

            {debateTranscript.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <DebateResult transcript={debateTranscript} maskedContent={maskedContent} />
              </div>
            )}
          </div>

          {/* 5. Secure Chat */}
          <div style={s.card}>
            <h2 style={s.h2}>5. Secure Chat</h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '1rem' }}>Chat with AI using privacy-protected messages</p>

            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {chatMessages.length === 0 ? (
                <p style={{ color: '#475569', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>No messages yet. Start a conversation!</p>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} style={{ padding: '0.75rem', background: msg.role === 'user' ? 'rgba(37, 99, 235, 0.2)' : '#0f172a', borderRadius: '0.375rem', border: `1px solid ${msg.role === 'user' ? 'rgba(37, 99, 235, 0.4)' : '#334155'}` }}>
                    <div style={{ fontSize: '0.75rem', color: msg.role === 'user' ? '#93c5fd' : '#94a3b8', marginBottom: '0.25rem', fontWeight: '600' }}>
                      {msg.role === 'user' ? 'You' : 'Assistant'}
                    </div>
                    <div style={{ color: '#e2e8f0', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    {msg.detokenized && msg.detokenized !== msg.content && (
                      <details style={{ marginTop: '0.5rem' }}>
                        <summary style={{ color: '#818cf8', fontSize: '0.75rem', cursor: 'pointer' }}>🔓 Show detokenized</summary>
                        <div style={{ marginTop: '0.25rem', color: '#86efac', fontSize: '0.75rem', padding: '0.5rem', background: 'rgba(20, 83, 45, 0.2)', borderRadius: '0.25rem' }}>{msg.detokenized}</div>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChatMessage(); } }}
                placeholder="Type a message..."
                disabled={loading || !vaultReady}
                style={{ flex: 1, padding: '0.5rem 0.75rem', background: '#0f172a', color: 'white', border: '1px solid #334155', borderRadius: '0.375rem', fontSize: '0.875rem' }}
              />
              <button onClick={handleSendChatMessage} disabled={loading || !vaultReady || !chatInput.trim()} style={{ padding: '0.5rem 1rem', background: vaultReady && chatInput.trim() ? '#4f46e5' : '#475569', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: vaultReady && chatInput.trim() ? 'pointer' : 'not-allowed', fontSize: '0.875rem', fontWeight: '600' }}>
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Vault Stats */}
        <div>
          <div style={{ ...s.card, position: 'sticky', top: '1.5rem' }}>
            <h2 style={s.h2}>Vault Status</h2>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Initialized</span>
                <span style={{ color: vaultReady ? '#86efac' : '#fca5a5', fontSize: '0.875rem', fontWeight: '600' }}>
                  {vaultReady ? '✓ Yes' : '✗ No'}
                </span>
              </div>
              {session.id && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Session</span>
                  <span style={{ color: '#cbd5e1', fontSize: '0.75rem', fontFamily: 'monospace' }}>{session.id.substring(0, 8)}...</span>
                </div>
              )}
            </div>

            {vaultStats ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {[
                  { label: 'Tokens Stored', value: vaultStats.tokenCount },
                  { label: 'Cache Size', value: vaultStats.cacheSize },
                  { label: 'Encrypted Size', value: `${vaultStats.encryptedSize} bytes` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '0.75rem', background: '#0f172a', borderRadius: '0.375rem', border: '1px solid #1e3a5f' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.25rem' }}>{label}</div>
                    <div style={{ color: '#38bdf8', fontSize: '1.125rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '1rem' }}>No vault stats available</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button onClick={handleUpdateVaultStats} disabled={!vaultReady} style={s.btn(vaultReady, '#0369a1')}>
                Refresh Stats
              </button>
              <button onClick={handleWipeVault} disabled={!vaultReady} style={s.btn(vaultReady, '#dc2626')}>
                Wipe Vault
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
