import { useState, useEffect, useCallback } from 'react';
import { useSession } from '../../contexts/SessionContext';
import { getApiClient, VerdictItem } from '../../utils/api';

const SAVE_PREF_KEY = 'sc_save_verdicts';

export function Sidebar() {
  const { session, initializeSession, clearSession, isSessionValid } = useSession();
  const [creating, setCreating] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [verdicts, setVerdicts] = useState<VerdictItem[]>([]);
  const [saveEnabled, setSaveEnabled] = useState<boolean>(() => {
    return localStorage.getItem(SAVE_PREF_KEY) === 'true';
  });
  const [loadingVerdicts, setLoadingVerdicts] = useState(false);
  const apiClient = getApiClient();

  const hasSession = session.isActive && isSessionValid();

  const fetchVerdicts = useCallback(async () => {
    setLoadingVerdicts(true);
    try {
      const res = await apiClient.getVerdicts();
      setVerdicts(res.verdicts);
    } catch {
    } finally {
      setLoadingVerdicts(false);
    }
  }, [apiClient]);

  useEffect(() => {
    fetchVerdicts();
  }, [fetchVerdicts]);

  useEffect(() => {
    const handler = () => fetchVerdicts();
    window.addEventListener('verdict-saved', handler);
    return () => window.removeEventListener('verdict-saved', handler);
  }, [fetchVerdicts]);

  const toggleSave = () => {
    const next = !saveEnabled;
    setSaveEnabled(next);
    localStorage.setItem(SAVE_PREF_KEY, next ? 'true' : 'false');
  };

  const handleCreateSession = async () => {
    setCreating(true);
    setSessionError(null);
    try {
      const res = await apiClient.createSession();
      await initializeSession(res.session_id, res.challenge);
    } catch {
      setSessionError('Failed to create session');
    } finally {
      setCreating(false);
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true,
      });
    } catch {
      return '';
    }
  };

  return (
    <div
      className="fixed left-0 top-0 h-full w-52 flex flex-col"
      style={{ backgroundColor: '#111111', zIndex: 40 }}
    >
      <div className="p-5 flex-1 flex flex-col overflow-hidden">
        <h1
          className="text-white font-black text-xl tracking-widest mb-6 mt-2"
          style={{ letterSpacing: '0.2em' }}
        >
          SIDE BAR
        </h1>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <p
              className="text-xs font-semibold tracking-widest"
              style={{ color: '#666666', letterSpacing: '0.15em' }}
            >
              VERDICT HISTORY
            </p>
            {loadingVerdicts && (
              <span style={{ color: '#444444', fontSize: '9px' }}>···</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5" style={{ scrollbarWidth: 'none' }}>
            {verdicts.length === 0 ? (
              <p
                className="text-xs leading-relaxed"
                style={{ color: '#444444', fontStyle: 'italic', lineHeight: '1.6' }}
              >
                No verdicts generated yet. Your case outcomes will appear here.
              </p>
            ) : (
              verdicts.map(v => (
                <div
                  key={v.id}
                  className="rounded px-2 py-2 transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                  }}
                >
                  <p
                    className="text-xs leading-snug mb-0.5"
                    style={{
                      color: '#cccccc',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      fontSize: '10px',
                      lineHeight: '1.5',
                    }}
                  >
                    {v.preview}
                  </p>
                  <p style={{ color: '#444444', fontSize: '9px', letterSpacing: '0.05em' }}>
                    {formatTime(v.created_at)}
                  </p>
                </div>
              ))
            )}
          </div>

          <div
            className="flex items-center justify-between mt-3 px-2 py-2 rounded"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <span style={{ color: '#666666', fontSize: '9px', letterSpacing: '0.08em', fontWeight: 600 }}>
              SAVE VERDICTS
            </span>
            <button
              onClick={toggleSave}
              style={{
                width: 28,
                height: 15,
                borderRadius: 8,
                background: saveEnabled ? '#c8923a' : '#333333',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
              title={saveEnabled ? 'Verdicts are being saved' : 'Verdicts are not being saved'}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  left: saveEnabled ? 15 : 2,
                  width: 11,
                  height: 11,
                  borderRadius: '50%',
                  background: 'white',
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </div>
        </div>

        <div className="space-y-3 mt-4">
          {sessionError && (
            <p className="text-xs text-red-400 text-center">{sessionError}</p>
          )}

          {hasSession ? (
            <button
              onClick={clearSession}
              className="w-full py-2.5 rounded text-sm font-bold tracking-widest transition-colors"
              style={{
                background: 'white',
                color: '#111111',
                letterSpacing: '0.12em',
              }}
            >
              END SESSION
            </button>
          ) : (
            <button
              onClick={handleCreateSession}
              disabled={creating}
              className="w-full py-2.5 rounded text-sm font-bold tracking-widest transition-opacity disabled:opacity-50"
              style={{
                background: 'white',
                color: '#111111',
                letterSpacing: '0.12em',
              }}
            >
              {creating ? 'CREATING...' : 'CREATE SESSION'}
            </button>
          )}

          <div>
            <p
              className="text-xs font-semibold tracking-widest mb-1.5 text-center"
              style={{ color: '#555555', letterSpacing: '0.15em' }}
            >
              SESSION ID
            </p>
            <div
              className="w-full py-2 px-3 rounded text-xs font-mono text-center border"
              style={{
                background: '#1a1a1a',
                borderColor: '#333333',
                color: hasSession ? '#aaaaaa' : '#555555',
              }}
            >
              {hasSession && session.id
                ? session.id.substring(0, 16) + '...'
                : 'NO ACTIVE SESSION'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
