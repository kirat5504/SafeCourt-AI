import { useState } from 'react';
import { useSession } from '../../contexts/SessionContext';
import { getApiClient } from '../../utils/api';

interface Verdict {
  id: string;
  label: string;
  time: string;
}

interface SidebarProps {
  verdicts?: Verdict[];
}

export function Sidebar({ verdicts = [] }: SidebarProps) {
  const { session, initializeSession, clearSession, isSessionValid } = useSession();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiClient = getApiClient();

  const handleCreateSession = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await apiClient.createSession();
      await initializeSession(res.session_id, res.challenge);
    } catch (err: any) {
      setError('Failed to create session');
    } finally {
      setCreating(false);
    }
  };

  const hasSession = session.isActive && isSessionValid();

  return (
    <div
      className="fixed left-0 top-0 h-full w-52 flex flex-col"
      style={{ backgroundColor: '#111111', zIndex: 40 }}
    >
      <div className="p-5 flex-1 flex flex-col">
        <h1
          className="text-white font-black text-xl tracking-widest mb-6 mt-2"
          style={{ letterSpacing: '0.2em' }}
        >
          SIDE BAR
        </h1>

        <div className="flex-1">
          <p
            className="text-xs font-semibold tracking-widest mb-3"
            style={{ color: '#666666', letterSpacing: '0.15em' }}
          >
            CHAT HISTORY
          </p>

          {verdicts.length === 0 ? (
            <p
              className="text-sm italic"
              style={{ color: '#555555' }}
            >
              No saved verdicts yet.
            </p>
          ) : (
            <div className="space-y-2">
              {verdicts.map(v => (
                <div
                  key={v.id}
                  className="text-xs rounded px-2 py-1.5 cursor-pointer hover:bg-white/10 transition-colors"
                  style={{ color: '#999999' }}
                >
                  <p className="truncate text-white/80">{v.label}</p>
                  <p style={{ color: '#666666' }}>{v.time}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 mt-4">
          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
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
