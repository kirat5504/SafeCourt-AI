import { useState, useEffect, useRef } from 'react';
import { useSession } from '../contexts/SessionContext';
import { useVault } from '../hooks/useVault';
import { getApiClient, generateProcessingId } from '../utils/api';
import { DebateResult } from '../components/DebateResult';

export function Dashboard() {
  const { session, isSessionValid } = useSession();
  const { vault, ready: vaultReady, getStats } = useVault();
  const [vaultStats, setVaultStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const apiClient = getApiClient();

  // Demo Mode state
  const [demoText, setDemoText] = useState('');
  const [demoResult, setDemoResult] = useState<any>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  // Upload Case state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [caseFile, setCaseFile] = useState<File | null>(null);
  const [pipelineResult, setPipelineResult] = useState<any>(null);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      if (vaultReady && vault && isSessionValid()) {
        try {
          const stats = await getStats();
          setVaultStats(stats);
        } catch (error) {
          console.error('Failed to load vault stats:', error);
        } finally {
          setStatsLoading(false);
        }
      } else {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, [vaultReady, vault, isSessionValid, getStats]);

  // Demo Mode: sanitize text only
  const handleDemoSanitize = async () => {
    if (!demoText.trim() || !session.id) return;
    setDemoLoading(true);
    setDemoError(null);
    setDemoResult(null);
    try {
      const processingId = generateProcessingId();
      const response = await apiClient.sanitizeText(session.id, processingId, demoText);
      setDemoResult(response);
    } catch (err: any) {
      setDemoError(err.message || 'Sanitization failed');
    } finally {
      setDemoLoading(false);
    }
  };

  // Upload Case: full pipeline (sanitize + debate)
  const handleCaseUpload = async () => {
    if (!caseFile || !session.id) return;
    setPipelineLoading(true);
    setPipelineError(null);
    setPipelineResult(null);
    try {
      let result: any;
      if (caseFile.type === 'application/pdf') {
        const formData = new FormData();
        formData.append('file', caseFile);
        const response = await fetch('/api/pipeline/run/pdf', {
          method: 'POST',
          headers: { 'X-Session-ID': session.id },
          body: formData,
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || `Pipeline failed: ${response.status}`);
        }
        result = await response.json();
      } else {
        const text = await caseFile.text();
        const response = await fetch('/api/pipeline/run/text', {
          method: 'POST',
          headers: { 'X-Session-ID': session.id, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
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

      setPipelineResult(result);
      setCaseFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setPipelineError(err.message || 'Upload failed');
    } finally {
      setPipelineLoading(false);
    }
  };

  if (!session.isActive) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Active Session</h2>
        <p className="text-gray-600 mb-8">Please start a session to access the dashboard.</p>
        <button
          onClick={() => window.location.href = '/test'}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Go to Test Lab
        </button>
      </div>
    );
  }

  if (!isSessionValid()) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Session Expired</h2>
        <p className="text-gray-600 mb-8">Your session has expired. Please start a new session.</p>
        <button
          onClick={() => window.location.href = '/test'}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Start New Session
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Monitor your privacy vault and run case analysis</p>
      </div>

      {/* Vault stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow flex items-center space-x-4">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-600">🔐</span>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Vault Status</h3>
            <p className="text-sm text-gray-500">{vaultReady ? 'Ready' : 'Not Ready'}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow flex items-center space-x-4">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600">👤</span>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Session</h3>
            <p className="text-sm text-gray-500">{session.id?.substring(0, 8)}...</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow flex items-center space-x-4">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-purple-600">🔑</span>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Tokens</h3>
            <p className="text-sm text-gray-500">
              {statsLoading ? 'Loading...' : vaultStats?.tokenCount || '0'} stored
            </p>
          </div>
        </div>
      </div>

      {/* Demo Mode */}
      <div className="bg-white p-6 rounded-lg shadow border border-indigo-100">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Demo Mode</h2>
        <p className="text-sm text-gray-500 mb-4">
          Paste any text below to see PII detection and tokenization in real time.
        </p>
        <textarea
          value={demoText}
          onChange={e => setDemoText(e.target.value)}
          rows={4}
          placeholder="e.g. My name is Jane Doe, email jane@example.com, SSN 123-45-6789..."
          className="w-full border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
        />
        {demoError && (
          <p className="mt-2 text-sm text-red-600">{demoError}</p>
        )}
        <button
          onClick={handleDemoSanitize}
          disabled={!demoText.trim() || demoLoading}
          className="mt-3 px-5 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
        >
          {demoLoading ? 'Sanitizing...' : 'Sanitize Text'}
        </button>

        {demoResult && (
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Sanitized Output</p>
              <div className="p-3 bg-gray-50 rounded border border-gray-200 text-sm font-mono break-all">
                {demoResult.sanitized_text}
              </div>
            </div>
            {Object.keys(demoResult.tokens || {}).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {Object.keys(demoResult.tokens).length} Token(s) Secured in Vault
                </p>
                <div className="space-y-1">
                  {Object.entries(demoResult.tokens).map(([token, original]) => (
                    <div key={token} className="flex items-center text-xs gap-2">
                      <code className="bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded text-yellow-800">{token}</code>
                      <span className="text-gray-400">→</span>
                      <span className="text-gray-700">{String(original)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Case → Full Pipeline */}
      <div className="bg-white p-6 rounded-lg shadow border border-amber-100">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Upload Case</h2>
        <p className="text-sm text-gray-500 mb-4">
          Upload a PDF or text file to run the full pipeline: PII masking → AI debate → Verdict.
        </p>

        <div className="flex items-center gap-4 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.text"
            onChange={e => {
              const file = e.target.files?.[0] || null;
              setCaseFile(file);
              setPipelineResult(null);
              setPipelineError(null);
            }}
            className="text-sm text-gray-700 border border-gray-300 rounded-lg p-2 bg-gray-50 cursor-pointer"
            disabled={pipelineLoading}
          />
          <button
            onClick={handleCaseUpload}
            disabled={!caseFile || pipelineLoading || !vaultReady}
            className="px-6 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
          >
            {pipelineLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>⚖️ Upload & Run Debate</>
            )}
          </button>
        </div>

        {pipelineError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {pipelineError}
          </div>
        )}

        {pipelineResult && (
          <div className="mt-6 space-y-6">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sanitized Case Text</p>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm font-mono max-h-48 overflow-y-auto whitespace-pre-wrap">
                {pipelineResult.sanitized_text || '(No text extracted)'}
              </div>
            </div>

            {Object.keys(pipelineResult.token_map || {}).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {Object.keys(pipelineResult.token_map).length} PII Token(s) Masked
                </p>
                <div className="space-y-1">
                  {Object.entries(pipelineResult.token_map).slice(0, 10).map(([token, original]) => (
                    <div key={token} className="flex items-center text-xs gap-2">
                      <code className="bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded text-yellow-800">{token}</code>
                      <span className="text-gray-400">→</span>
                      <span className="text-gray-700">{String(original)}</span>
                    </div>
                  ))}
                  {Object.keys(pipelineResult.token_map).length > 10 && (
                    <p className="text-xs text-gray-400">...and {Object.keys(pipelineResult.token_map).length - 10} more</p>
                  )}
                </div>
              </div>
            )}

            {pipelineResult.debate_transcript && pipelineResult.debate_transcript.length > 0 && (
              <DebateResult
                transcript={pipelineResult.debate_transcript}
                maskedContent={pipelineResult.sanitized_text}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
